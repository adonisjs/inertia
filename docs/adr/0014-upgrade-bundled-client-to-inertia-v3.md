# 0014 — Upgrade the bundled client adapters to Inertia v3

- **Status:** Accepted
- **Date:** 2026-06-16
- **Deciders:** AdonisJS core team

## Context and Problem Statement

The adapter targeted the Inertia **v2** line (`@inertiajs/core` `2.3.x`; peer
`^2.3.8`, installed `2.3.23`). Three planned protocol features —
[rescued deferred props](../../planning/04-rescued-deferred-props.md),
[fragment-preserving redirects](../../planning/07-fragment-preserving-redirects.md),
and [shared props tracking](../../planning/08-shared-props-tracking.md) — are
**v3-only**: their wire fields exist in `@inertiajs/core` `3.4.0` but are absent
from `2.3.23`, so implementing them server-side against the v2 client would emit
data the client silently ignores. [ADR 0013](0013-protocol-coverage-planning-method.md)
already flagged a v2→v3 client upgrade as the upstream prerequisite for those
features.

Inertia documents its breaking changes for the Laravel server adapter, not for
third-party adapters, and its release notes do not enumerate the wire/DOM
contract changes an adapter must honour. We therefore reverse-engineered the
adapter-facing changes from the `@inertiajs/core@3.4.0` source and the
`inertia-laravel` `v2.0.21..v3.0.0` server diff before committing.

## Decision Drivers

- Unblock the v3-only protocol features (04, 07, 08) so 100% protocol coverage is
  reachable.
- Stay aligned with the **latest** Inertia line; v2 is now the legacy line.
- Make the cut deliberately, with the adapter-facing breaking changes
  enumerated and verified, rather than discovering them in production.

## Considered Options

- **Stay on v2** — keep the legacy line; never ship 04/07/08.
- **Dual-support v2 and v3** — branch behaviour on the negotiated client version.
- **Move the bundled client to v3** — bump the peer/dev deps to `^3.x` and make
  the adapter speak the v3 wire/DOM contract.

## Decision Outcome

Chosen option: **Move the bundled client to v3**, because the whole point of the
adapter is to track the official client, and the v3 contract changes are small
and well-contained on the server side.

### Rationale

Dual-support was rejected: the v3 wire format is a strict superset that v2
clients ignore, so the only behaviour that genuinely differs is the **initial
page DOM markup**, and maintaining two markup paths (plus two test matrices)
buys nothing once the ecosystem is on v3. Staying on v2 forfeits a third of the
protocol-coverage roadmap permanently.

Verification before committing showed the server-side surface is small:
`tsc --noEmit` was clean after the bump, and the only **hard** runtime break is
the initial-page markup (below). The bulk of v3's headline breaking changes live
in **userland app code** (event renames, `router.cancel()`, progress exports,
arrow-function layouts) or in **dropped client deps** (Axios, `qs`, `lodash-es`),
none of which this package's runtime imports.

### What changed in this ADR's scope

1. **Dependencies** (`package.json`): `@inertiajs/react` and `@inertiajs/vue3`
   moved to `^3.4.0` in both `devDependencies` and `peerDependencies`.
2. **Edge root markup** (`src/plugins/edge/plugin.ts`) — the hard break. v3's
   `getInitialPageFromDOM(id)` reads the page payload **only** from
   `script[data-page="<id>"][type="application/json"]`; the v2 `data-page`
   *attribute* path on the root element is gone (`inertia-laravel` deleted it and
   the `use_script_element_for_initial_page` toggle). The `@inertia` global now
   emits `<script data-page="<id>" type="application/json">…</script>` plus a
   separate `<div id="<id>"></div>` mount node. The payload is escaped `/` → `\/`
   exactly as the client does (`JSON.stringify(page).replace(/\//g, '\\/')`); HTML
   entity encoding is **not** used, since the browser does not decode entities in
   a script element's text content and `JSON.parse` would fail on it.
3. **`clearHistory` / `encryptHistory`** (`src/inertia.ts#page`) — now omitted
   from the page object unless `true`, matching v3 (the client defaults both to
   `false` when absent).
4. **Contract test** (`tests/v3_client_contract.spec.ts`) — round-trips genuine
   server page objects through the **real** `@inertiajs/core@3.4.0`
   `getInitialPageFromDOM` to prove the v3 client reconstructs our output,
   including the `</script>`-breakout escaping.

### Adapter-facing breaking-change inventory (verified)

Sourced from `@inertiajs/core@3.4.0` and `inertia-laravel v2.0.21..v3.0.0`.

| # | Change | Class | Status |
| - | ------ | ----- | ------ |
| 1 | Initial page payload via `<script type="application/json">` only; `data-page` attribute path removed | **Hard break** (in-package) | ✅ Fixed here |
| 2 | `clearHistory` / `encryptHistory` omitted unless `true` | Cosmetic / spec-correctness | ✅ Fixed here |
| 3 | Props resolve at **any nesting depth**; partial-reload metadata uses **dot-notation paths** (`auth.notifications`). Our resolver is top-level only | Deliberate divergence — see decision below | 🚫 Won't implement (top-level only) |
| 4 | New page-object fields: `prependProps`, `matchPropsOn`, `rescuedProps`, `sharedProps`, `preserveFragment`, first-class `flash` | Feature gap | ⛔ Backlog → planning 04/05/07/08/09 |
| 5 | New headers: `X-Inertia-Redirect`, `X-Inertia-Infinite-Scroll-Merge-Intent`, `X-Inertia-Except-Once-Props` | Feature gap (graceful no-op today) | ⛔ Backlog → planning 03/06/07 |
| 6 | Fragment-redirect middleware (`409` + `X-Inertia-Redirect` when `Location` has `#` and not a prefetch) | Additive feature | ⛔ Backlog → planning 07 |
| 7 | Runtime minimums (React 19 / Vue 3.5 / Svelte 5); event renames (`invalid`→`httpException`, `exception`→`networkError`); `router.cancel()`→`cancelAll()`; removed progress exports; arrow-function layouts; `createInertiaApp` `resolve` gains `initialPage` arg; Axios/`qs`/`lodash-es` dropped | Userland / starter-kit | 📋 Migration guide + starter kits |

Verified **non-breaks**: asset-version mismatch still `409` + `X-Inertia-Location`;
PUT/PATCH/DELETE redirect → `303` unchanged; SSR `{ head, body }` contract stable
(the `@inertiaHead` global just echoes client-produced head strings, now using
`data-inertia`); re-exported `Link` / `Form` / `router` still resolve (typecheck
clean). No page-object field this adapter currently emits was removed in v3.

### Decision: prop resolution stays top-level — no nested support

Item 3 above (resolving `defer` / `optional` / `merge` / `always` at any nesting
depth and emitting dot-notation paths) is **deliberately out of scope**. Prop
wrappers and partial-reload matching remain **top-level only**.

Rationale:

- **Cost.** Finding a wrapper nested anywhere in a plain object requires walking
  every plain node of the props tree on every render — a second full traversal on
  top of serialization. There is no short-circuit: you cannot know a wrapper is
  absent without looking. This is the same cost that led us to keep transformer
  serialization top-level only (see issue #83, nested transformers), so supporting
  nested wrappers while declining nested transformers would be inconsistent.
- **Precedent.** The new, v3-aware official `@hono/inertia` adapter resolves props
  **top-level only** — single `Object.entries` pass, `onlyKeys.includes(key)`
  matching, no recursion — even though it implements newer features (scroll,
  prepend, `matchOn`, deepMerge). Among the JS/TS adapters, top-level is the norm.
- **History.** inertia-laravel shipped dot-notation partial reloads (#620), could
  not stabilise the breakage, and **reverted** it (#641); it only landed properly
  in v3 behind a dedicated 681-line `PropsResolver`. We are not taking on that
  surface for a capability with no demonstrated AdonisJS demand.
- **Escape hatch.** Apps that want nesting in the output can author **dotted
  top-level keys** (e.g. `{ 'auth.invoices': inertia.optional(...) }`) and expand
  them at write time — which needs no tree walk and produces identical wire output
  — should we choose to add that later.

Consequence to document for users: a wrapper nested inside a plain object
(`{ auth: { invoices: optional() } }`) is **not detected** and will be serialized
as-is. The supported contract is: wrappers live at the **top level** of the props
bag.

### Consequences

- **Good:** 04/07/08 are unblocked; the adapter tracks the latest line.
- **Good:** the one contract that actually breaks (initial-page markup) is fixed
  and pinned by a test that exercises the real v3 client, not a hand-rolled
  assertion.
- **Bad / cost:** we deliberately diverge from v3 on nested/dot-notation
  resolution (item 3, decided above). Wrappers nested inside plain objects are
  unsupported by design; apps must keep wrappers at the top level. Accepted to
  avoid the per-render tree walk, matching `@hono/inertia`.
- **Bad / cost:** several v3 breaking changes live in userland; a published
  migration guide and starter-kit updates (item 7) are required and are **not**
  covered by this package's tests.
- **Neutral:** the existing test suite never renders against a real client or
  runs SSR end-to-end; the new contract test narrows that gap for the markup
  path, but a browser-level hydration smoke test is still future work.

## More Information

- Source: `src/plugins/edge/plugin.ts`, `src/inertia.ts`,
  `tests/plugins/edge.plugin.spec.ts`, `tests/v3_client_contract.spec.ts`,
  `package.json`
- Verification baselines: `@inertiajs/core@3.4.0`
  (`getInitialPageFromDOM`, `buildSSRBody`); `inertia-laravel` `v3.0.0`
  (`Directive.php`, `Support/Header.php`, `Middleware.php`, `PropsResolver.php`,
  `Response.php`)
- Related: [ADR 0009](0009-edge-root-view-layer.md) (root-view markup it amends),
  [ADR 0007](0007-redirect-and-version-semantics.md) (redirect semantics),
  [ADR 0013](0013-protocol-coverage-planning-method.md) (prerequisite this satisfies)
- Unblocks specs: `planning/04`, `planning/07`, `planning/08`
