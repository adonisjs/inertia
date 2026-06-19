# 0022 — Shared props tracking

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** AdonisJS core team

## Context and Problem Statement

A response's `props` come from two sources: **shared props** (registered globally
via `share()` and merged into every render) and **page props** (supplied by the
specific handler). Once merged, the wire format makes no distinction between them
— they are just keys in `props`.

Inertia v3 adds a top-level `sharedProps: string[]` field to the page object that
lists the top-level prop keys that came from the shared pipeline. This is the
[`planning/08`](../../planning/08-shared-props-tracking.md) protocol feature, and
the last of the v3-only features unblocked by the v3 client upgrade
([ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md)). The field is **absent
from the v2 client**, so it could not ship before that upgrade.

The purpose is narrow and specific. From the reference PR
([inertia-laravel#833](https://github.com/inertiajs/inertia-laravel/pull/833)):

> After merging shared and page-specific props … the distinction between the two
> was lost. The frontend had no way to know which props were shared … This is
> needed for **instant visits**, where the frontend swaps to the target component
> before the server responds and needs to know which props to carry over from the
> current page.

So `sharedProps` is **registration metadata for instant-visit carry-over**, not an
optimistic-update/snapshot mechanism. The question: how do we compute the field —
and in particular, does it track the *registered* shared keys or the *emitted*
subset of `props`?

## Decision Drivers

- Adopt the real protocol field with the semantics its only consumer (instant
  visits) expects.
- Parity with the reference implementation (inertia-laravel), the source of truth
  for behaviour the wire format leaves unspecified.
- Additive and non-breaking: unchanged default wire format for apps that do not
  use `share()`; no effect on the v2 client.
- Respect the adapter's existing **top-level-only** prop-resolution scope
  ([ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md)).

## Considered Options

- **Emit the registered shared keys (reference behaviour).** Collect
  `Object.keys(sharedState)` once, before resolution and partial filtering, and
  emit them verbatim — independent of what ends up in `props`.
- **Intersect with the emitted props.** List only shared keys whose value is
  present in this response's `props`, dropping deferred/optional shared props and
  partial-reload-filtered keys.

The protocol spec explicitly leaves ordering, dedup, and override-precedence as
**adapter choices**, so both were on the table.

## Decision Outcome

Chosen option: **emit the registered shared keys**, matching inertia-laravel.

`sharedProps` lists every top-level key registered through `share()` for the
response, in registration order, deduplicated. It is **not** a subset of the
emitted `props`:

- A shared prop skipped this visit (deferred/optional) is **still listed** — the
  client must keep treating it as shared so it carries the value over once loaded.
- A partial reload does **not** narrow it — cherry-picking filters `props`, not the
  shared-key list.
- A page prop overriding a shared key **keeps the key listed** — it is still a
  registered shared key (and the value is still present in `props`).
- The field is **omitted entirely when no shared keys exist**, so the default wire
  format is unchanged.

```jsonc
{
  "props": { "user": { "id": 1 }, "menu": ["home"], "post": { "id": 42 } },
  "sharedProps": ["user", "menu"]
}
```

### Rationale

The intersection option is intuitive — "only list keys you can actually carry
over" — but it is **wrong for the consumer**. Instant-visit carry-over is driven by
*registration*: when a shared prop is deferred and absent on the initial load, the
client still needs to know it is shared so it carries the value forward once a
later partial reload resolves it. Intersecting would under-report exactly that
case and silently break carry-over for deferred shared props.

Matching the reference is also the conservative choice for an unspecified corner of
the protocol: inertia-laravel collects the keys in `PropsResolver::resolveSharedProps()`
at the very top of `resolve()` — **before** `resolveProps()` applies partial
filtering and deferred/optional exclusion — and drops the field when empty via
`array_filter(count > 0)`. We mirror that exactly.

We deliberately did **not** port two reference details:

- **The `expose_shared_prop_keys` config toggle.** It shipped in the same PR with
  no tracked issue behind it — a pre-emptive opt-out, not a fix for a reported
  problem. Our field is already invisible to apps that do not use `share()`
  (omitted when empty), consistent with how our other v3 features (rescued props,
  flash) ship without an off-switch. It is a non-breaking addition if a real
  payload/disclosure concern surfaces later.
- **Dotted-key collapsing.** The reference collapses `"a.b"` shared keys to their
  top-level segment and dedupes. Nested/dotted props are out of scope for this
  adapter ([ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md)), so shared
  keys are already plain top-level names; `Object.keys()` is unique by construction.

### Wiring

`Inertia#buildPageProps()` already resolves the shared-state providers to merge
them into the props. We capture `sharedKeys = Object.keys(sharedState)` at that
point (registration order) and attach `sharedProps: sharedKeys` to the build
result for both the standard-visit and partial-reload paths — without threading it
through the prop builders, since it is independent of resolution. In `Inertia#page()`,
`sharedProps` is assigned to the page object **only when non-empty**.

### Consequences

- **Good:** adopts the real protocol field with the semantics instant visits
  require; deferred shared props carry over correctly.
- **Good:** parity with inertia-laravel for the unspecified behaviour (timing,
  override, empty-omission), avoiding surprising divergence.
- **Good:** additive and non-breaking — default wire format unchanged for apps not
  using `share()`; the v2 client is unaffected.
- **Neutral:** `sharedProps` may name a key absent from this response's `props`
  (a deferred shared prop, or one filtered by a partial reload). This is
  intentional — the field reports registration, not the emitted subset.
- **Neutral:** no config toggle and no dotted-key handling, by the decisions above.
- **Neutral:** user-facing documentation lives in the separate AdonisJS docs site.

## More Information

- Source: `src/inertia.ts` (`#buildPageProps` shared-key capture, `page()`
  emission), `src/types.ts` (`PageObject.sharedProps`)
- Tests: `tests/inertia.spec.ts` (emission, omission-when-empty, deferred shared
  prop listed, override kept, not narrowed by partial reload),
  `tests/v3_client_contract.spec.ts` (round-trips through the real v3 client)
- Reference: [inertia-laravel#833](https://github.com/inertiajs/inertia-laravel/pull/833)
  (`PropsResolver::resolveSharedProps`, `buildMetadata`), consumed by
  [inertiajs/inertia#2907](https://github.com/inertiajs/inertia/pull/2907)
  (instant visits)
- Related: [ADR 0002](0002-shared-props-via-middleware-base-class.md) (`share()`
  middleware base class), [ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md)
  (v3 upgrade, top-level-only scope), [ADR 0021](0021-first-class-flash-messages.md)
  (sibling top-level field precedent)
- Related spec: [`planning/08-shared-props-tracking.md`](../../planning/08-shared-props-tracking.md)
