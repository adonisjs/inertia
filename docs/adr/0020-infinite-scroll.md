# 0020 — Infinite scroll

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** AdonisJS core team

## Context and Problem Statement

Infinite scroll layers continuous pagination on top of the keyed/directional
merge primitive ([ADR 0019](0019-keyed-and-directional-merges.md)). The client's
`<InfiniteScroll>` component issues a partial reload per scroll, sending an
`X-Inertia-Infinite-Scroll-Merge-Intent` header, and reads a `scrollProps` map
off the page object to know which page to request next. This is the
[`planning/06`](../../planning/06-infinite-scroll.md) protocol feature, unblocked
by the v3 client upgrade ([ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md)).

The questions: what public API expresses a scroll prop; how the adapter derives
the pagination cursor; how the prop's array is labelled for merging given the
client's actual merge mechanics; and how to keep the whole thing type-safe
against what the client component declares.

## Decision Drivers

- Full protocol coverage of `scrollProps` + the merge-intent header, verified
  against the real client (the [ADR 0013](0013-protocol-coverage-planning-method.md)
  drift lesson).
- Consistency with the existing wrapper API (`merge`/`defer`/`once`) and the
  top-level-only resolution rule from [ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md).
- End-to-end type safety: the server obligation should be driven by the client
  component's declared prop shape, as `optional`/`defer` already are.
- Parity with `inertia-laravel`, the reference adapter, where it is correct.

## Decision Outcome

A dedicated `inertia.scroll(value, scrollProps?)` helper that auto-derives the
cursor from a transformer paginator (or takes a provider callback), labels the
value's `data` array for keyed/directional merging, and is required by a typed
`Scroll<Item>` marker on the client side.

### Rationale and resolved sub-decisions

| # | Decision | Outcome |
|---|----------|---------|
| A | API entry point | A dedicated `scroll()` helper (and `inertia.scroll` instance method), sibling of `merge`/`defer`/`once` — not a `merge()` chain, since scroll carries its own pagination metadata |
| B | Value shapes | Exactly two: an `@adonisjs/core` **transformer paginator** (`Transformer.paginate(...)`, `$type === 'paginator'`) or a plain `{ data, … }` object — each directly or via a callback. Only `data` is type-checked |
| C | The value is a callback | The primary form is `scroll(() => …)`. The callback re-runs per request so pagination reads the current request's page param; it also lets the value stay unresolved when the prop is deferred or filtered out. This is **orthogonal to `defer`** (which decides *whether* the first page is sent) |
| D | Cursor derivation | Auto-derived from a transformer paginator's `.metaData` (the Lucid `getMeta()` shape: `pageName`/`currentPage`/`lastPage`/`firstPage`), mirroring `inertia-laravel`'s `ScrollMetadata::fromPaginator`. Everything — including `pageName` — comes off the metadata; no URL parsing |
| E | Manual cursor | For non-paginator values, a **provider callback** `(resolvedValue) => ScrollProps` — never a static object, because the cursor changes every request and must derive from the resolved value. Runs only when the prop resolves |
| F | Fail loud | Not a derivable paginator **and** no provider → throw, instructing the user to pass the provider (mirrors `fromPaginator`'s `InvalidArgumentException`) |
| G | Merge labels | The client merges by prop path; for `{ data, … }` the array lives at `<key>.data`, so the adapter emits `"<key>.data"` into `mergeProps`/`prependProps` (per intent) and `"<key>.data.<matchOn>"` into `matchPropsOn`. See the spec-correction note below |
| H | Direction | From the `X-Inertia-Infinite-Scroll-Merge-Intent` header (`prepend` → `prependProps`, else `mergeProps`); absent ⇒ append |
| I | Keyed dedup | `.matchOn(key)` is opt-in with **no default**, matching `inertia-laravel` (overlapping pages plain-concat unless a key is given) |
| J | Deferral | `ScrollProp` is self-deferrable via `.deferred(group?)` — a method on the scroll prop, mirroring `inertia-laravel`'s `ScrollProp use DefersProps` (`->defer()`), **not** `defer().scroll()` wrapping. A deferred scroll prop emits `deferredProps` + merge labels on the standard visit but **no `scrollProps`** — the cursor is emitted only when it resolves (partial reload), verified against Laravel's `excludeDeferredProp` vs `collectScrollMetadata` |
| J2 | Deferred ⇒ optional (type-level) | A deferred prop is absent on the initial load, so it must only satisfy an **optional** client prop. `.deferred()` returns `ScrollProp<Item, true>` (a type-only `[SCROLL_DEFERRED]` phantom flag, never set at runtime); `AsPageProps` accepts the deferred variant only in its optional branch, so `scroll(...).deferred()` on a required `Scroll<Item>` is a compile error — the same guarantee `defer()` gives via `MergeableProp<DeferProp<…>>` |
| K | Reset | `scrollProps[<key>].reset` is derived from the `X-Inertia-Reset` header, not user code; a reset prop is emitted unlabeled (client replaces) with `reset: true` |
| L | Type safety | A `Scroll<Item>` marker (a `{ data: Item[] }` shape with an unconstructable phantom brand). On the client a component declares `users: Scroll<User>`; on the server `AsPageProps` then accepts only `scroll()` for that key, because every other union member needs the unconstructable marker. Non-marked keys resolve to `ScrollProp<never>`, which rejects `scroll()` |
| M | `scrollProps` emission | Always emitted (`{}` when none), consistent with the always-emit convention for the merge family ([ADR 0019](0019-keyed-and-directional-merges.md) sub-decision F) |

### Spec correction (planning/06)

[`planning/06`](../../planning/06-infinite-scroll.md) described the scroll prop as
a `{ data, meta }` wrapper merged via `mergeProps`/`prependProps`. Verified
against `@inertiajs/core@3.4.0` (`mergeProps`, dist `~L2636`), those two cannot
both hold: `mergeProps`/`prependProps` only merge **arrays** directionally; for an
**object** value the client does a shallow `{ ...current, ...incoming }`, which
clobbers `data` instead of concatenating. `deepMergeProps` merges the nested
array but has **no direction**. The adapter therefore targets the array directly
with a dotted label `"<key>.data"` — the client's last-dot split resolves it to
the `data` array (directional + keyed), and the fresh `metadata` rides along on
the top-level object. This keeps the top-level-only rule intact: the wrapper key
is static config, so no per-render tree walk is needed.

### Consequences

- **Good:** zero-config infinite scroll for transformer paginators; provider
  escape hatch for cursor/custom sources; full type safety driven by the client
  marker; composes with `.deferred()` and `.matchOn()`.
- **Good:** the server stays a thin labeller + cursor emitter — the merge
  mechanics live entirely in the client, so the two cannot drift.
- **Neutral:** every response carries one more (usually empty) `scrollProps`
  object, per the adapter's always-emit convention.
- **Neutral:** only the transformer-paginator path auto-derives; Lucid paginators
  integrate through it (`Transformer.paginate(rows, paginator.getMeta())`), and
  cursor paginators / custom shapes use the provider.

## More Information

- Source: `src/props.ts` (`scroll`, `isScrollProp`, `isTransformerPaginator`,
  `extractScrollPropsFromPaginatorMetaData`, `paginatorScrollPropsProvider` (the
  default provider), `scrollMergeLabels`, and the scroll branch + inline
  resolution in both builders), `src/inertia.ts` (`mergeIntent`,
  `scrollProps` emission,
  `scroll` instance method), `src/types.ts` (`Scroll`, `ScrollProp`, `ScrollProps`,
  `ScrollPropsProvider`, `ScrollMetaData`, `PaginationMeta`, `AsPageProps`),
  `src/symbols.ts` (`SCROLL_PROP`, `SCROLL_DEFERRED`),
  `src/headers.ts` (`InfiniteScrollMergeIntent`)
- Tests: `tests/scroll.spec.ts`; type-level coverage in
  `tests/types/to_page_props.spec.ts` and `tests/types/to_component_props.spec.ts`;
  shared fixtures in `tests/helpers.ts`
- Verification baseline: `@inertiajs/core@3.4.0` (`MERGE_INTENT_HEADER`,
  `useInfiniteScrollData`, `ScrollProp`, `mergeProps`, dist `~L2636`/`~L3953`)
- Reference: `inertiajs/inertia-laravel` `src/ScrollProp.php`,
  `src/ScrollMetadata.php`, `src/PropsResolver.php`
- Related spec: [`planning/06-infinite-scroll.md`](../../planning/06-infinite-scroll.md)
- Unblocked by: [ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md);
  builds on [ADR 0019](0019-keyed-and-directional-merges.md)
