# 0017 — Once props

- **Status:** Accepted
- **Date:** 2026-06-17
- **Deciders:** AdonisJS core team

## Context and Problem Statement

The Inertia v3 protocol lets a server mark a prop as **once**: computed on first
encounter, cached by the client across visits, and **skipped** on later visits
where the client reports it already holds a fresh value (via the
`X-Inertia-Except-Once-Props` request header). The server always echoes an
`onceProps` metadata map so the client can keep using its cached copy. This is
the [`planning/03`](../../planning/03-once-props.md) protocol feature, unblocked
by the v3 client upgrade ([ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md)).

The adapter already supports a family of prop wrappers — `defer`, `optional`,
`always`, `merge`, `deepMerge` — each handled as a mutually-exclusive branch
while building the response. The question: how do we add once props **including
full composition** with the existing wrappers (a once prop may also be deferred,
optional, or mergeable), and the optional surface the spec allows (custom keys,
expiry, force-fresh), without an explosion of per-combination branches?

## Decision Drivers

- Full protocol coverage: custom keys, expiry, force-fresh, and composition with
  `defer` / `optional` / `merge` / `deepMerge`.
- Consistency with the existing wrapper API and the top-level-only resolution
  rule established in [ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md).
- Avoid duplicating (and drifting) the classification logic that already lives in
  both the standard-visit and partial-reload builders.

## Considered Options

- **Once as a flat, mutually-exclusive wrapper** like the others — simple, but
  cannot compose; every `once × {defer, optional, merge}` pairing would need its
  own branch.
- **Once as orthogonal metadata + a chaining API, modelled as a nesting envelope**
  — once wraps an inner value/wrapper; a shared classifier resolves the inner.
- **Standalone `once(wrapper)` factory only** — composition reads
  `once(defer(...))`, which is not how this codebase composes (it chains).

## Decision Outcome

Chosen option: **once as an orthogonal resolution gate**, with the data modelled
as a **nesting envelope** (`OnceProp.inner`) and the public API as **method
chaining** (`defer(fn).once()`, `optional(fn).once()`, `merge(v).once()`, plus
the standalone `inertia.once(value, opts)` for plain values).

### Rationale

Every other wrapper answers *when/how* a prop is included; once answers *should I
recompute it given the client cache* — a gate that fires **at the moment a value
would be unpacked**, regardless of the prop's classification. Modelling it as a
gate-before-classification keeps it independent of the other wrappers.

To compose without a combinatorial branch explosion, the per-key classification
chain (previously inlined and duplicated in `buildStandardVisitProps` and
`buildPartialRequestProps`) was extracted into a single `classify` closure per
builder. When the loop meets a once envelope it (1) records the `onceProps`
metadata entry, (2) applies the gate, and (3) on resolve, **unwraps `inner` and
re-runs it through the same `classify`** — so `defer`/`optional`/`merge`/plain
inners reuse the exact existing logic.

The API is chaining because that is this codebase's only existing composition
idiom (`defer(fn).merge()` already returns a `MergeableProp` whose `.value` is a
`DeferProp`). `.once()` follows the same trick — it calls `once(this, opts)` —
producing the nested structure the builder reads. The data model is nesting; the
surface is chaining.

**Gate rule (verified against `@inertiajs/core@3.4.0` and `inertia-laravel@3.x`).**
The client only lists a key in `X-Inertia-Except-Once-Props` when it holds a value
that is **present and not expired** (`getHeaders`, dist `~L2930`). So the server
trusts the list and does not re-check expiry for the skip decision:

```
skip = exceptOnceProps.has(onceKey) && !fresh
```

On skip the value is omitted from `props`; on resolve it is included with a
freshly computed `expiresAt`. The `onceProps` entry is emitted either way.

**The gate applies to standard (full) Inertia visits only — never to partial
reloads.** This matches `inertia-laravel`'s `PropsResolver`, where the once-cache
check lives in `excludeFromInitialResponse`, called only when the request is *not*
partial (`if (! $this->isPartial && $this->excludeFromInitialResponse(...))`). A
partial reload that explicitly requests a once prop always resolves it (the client
asked for it by name); the `onceProps` entry is still emitted. So
`X-Inertia-Except-Once-Props` is meaningful on full responses only — its job is to
prune already-cached once props from a response that would otherwise send
everything, which a partial never does. This is encoded in the signatures:
`buildStandardVisitProps` takes the full `OnceContext` (cache + clock), while
`buildPartialRequestProps` takes only the reference clock, so the except-once set
is constructed solely for the standard path.

### Composition semantics

Metadata arrays (`deferredProps` / `mergeProps` / `deepMergeProps`) reflect
**classification**; `onceProps` reflects **caching**; **value presence** reflects
the **gate**. Because the gate `return`s before reaching the inner classification
when it skips, a skipped once prop is never listed in `mergeProps`/`deferredProps`
— there is nothing to merge or fetch.

The `once × defer` interaction was verified end-to-end against the client
(`updateCachedOncePropsFromCurrentPage`, dist `~L565`): the client restores a
cached once value into `props` and then **removes that prop from `deferredProps`**
so it does not re-fetch. This mirrors the server exactly — when the client holds a
deferred+once prop cached, the server skips the value *and* omits it from
`deferredProps`; when it does not, the server emits both and the client fetches it
via a partial reload (where the gate applies again). No special-casing required.

### Resolved sub-decisions

| # | Decision | Outcome |
|---|----------|---------|
| A | API shape | Chaining `.once()` on `defer`/`optional`/`merge`/`deepMerge` + standalone `inertia.once` |
| B | Expiry input | Relative `expiresIn` (ms or a `@poppinss/utils` duration string) **and** absolute `expiresAt` (`Date`/epoch-ms); absolute wins; normalized to epoch-ms at build time against the request's reference clock; default `null` |
| C | Duplicate once-key in one response | Last-wins + a `debug()` warning |
| D | Empty `onceProps` | Always emitted (as `{}`), consistent with how this adapter already emits `mergeProps`/`deferredProps`/`deepMergeProps` unconditionally. (This diverges from `inertia-laravel`, which omits empty metadata — but the adapter's existing convention is always-emit, and internal consistency wins.) |

### Scope: top-level only

Consistent with [ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md), once-keys
and `onceProps[key].prop` paths are **top-level only**. A once wrapper nested
inside a plain object is not detected. Wrappers live at the top level of the props
bag.

### Consequences

- **Good:** full once-prop coverage, composing with every existing wrapper, with
  no per-combination branches — the inner reuses one classifier.
- **Good:** the duplicated classification chains in the two builders are now a
  single closure each, reducing drift risk.
- **Good:** the gate trusts the client's expiry check, so the server stays a thin,
  stateless echo of caching metadata.
- **Bad / cost:** the `classify` closures are recursive and mutate shared
  accumulators; the once unwrap path must be read together with the inner branches
  to follow control flow.
- **Neutral:** a once prop explicitly requested in a partial `only` set is always
  resolved, even when the client reports it cached — the except-once gate is a
  standard-visit concern only. `fresh: true` forces resolution on a standard visit.
- **Neutral:** user-facing documentation for `inertia.once()` lives in the
  separate AdonisJS docs site and is not part of this package.

## More Information

- Source: `src/props.ts` (`once`, `isOnceProp`, `recordOnce`, `computeExpiresAt`,
  the `classify` closures), `src/inertia.ts` (`once` binding, `onceContext`,
  page-object emission), `src/types.ts` (`OnceProp`, `OnceOptions`, `OnceExpiry`,
  `OnceContext`, `IsOptionalPropValue`, `PageObject.onceProps`), `src/headers.ts`,
  `src/symbols.ts`
- Tests: `tests/once_props.spec.ts`, `tests/v3_client_contract.spec.ts`
- Verification baselines: `@inertiajs/core@3.4.0`
  (`getInitialPageFromDOM`, `getHeaders`, `mergeOncePropsIntoResponse`,
  `updateCachedOncePropsFromCurrentPage`, `getShortestOncePropTtl`);
  `inertia-laravel@3.x` (`PropsResolver` — `resolveProps`,
  `excludeFromInitialResponse`, `excludeIgnoredProp`, `collectOnceMetadata`,
  `wasAlreadyLoadedByClient`; `ResolvesOnce`, `Response::toResponse`)
- Related spec: [`planning/03-once-props.md`](../../planning/03-once-props.md)
- Unblocked by: [ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md)
