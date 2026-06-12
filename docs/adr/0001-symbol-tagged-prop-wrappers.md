# 0001 — Symbol-tagged plain objects for prop wrappers

- **Status:** Accepted
- **Date:** 2026-06-12 (documented retroactively)
- **Deciders:** AdonisJS core team

## Context and Problem Statement

The Inertia protocol distinguishes several prop evaluation modes: props deferred
to a follow-up request, props only sent when explicitly requested, props that
must always be present, and props the client should merge rather than replace.
The adapter exposes these as factories — `defer()`, `optional()`, `always()`,
`merge()`, `deepMerge()` — and must later detect, at serialization time, which
mode a given prop carries.

The question is how to mark and detect a wrapped prop. Whatever we choose has to
survive object spreading (props bags are merged with `{ ...shared, ...page }`),
serialize cleanly, and let wrappers compose — e.g. `defer(...).merge()`.

## Decision Drivers

- Composition: `defer()` must chain into `.merge()` / `.deepMerge()` without a
  class hierarchy.
- Spread-safety: shared and page props are merged via object spread; markers
  must survive it.
- A small, tree-shakeable public surface (plain factory functions).
- Detection must be cheap and unambiguous at build-props time.

## Considered Options

- **Classes + `instanceof`** — `class DeferProp {}` etc., detected with
  `instanceof`.
- **A `__type` string discriminant** on plain objects.
- **Symbol-tagged plain objects** — factories return object literals carrying a
  module-private `Symbol` key, detected with `in`.

## Decision Outcome

Chosen option: **Symbol-tagged plain objects**, because it keeps the wrappers as
plain composable object literals while giving an unambiguous, collision-proof
marker.

### Rationale

The primary driver was **ergonomics and composition**. Wrappers are plain object
literals, so `defer()` can return an object whose `.merge()` method wraps `this`
into a `merge()` result, and the whole thing spreads into a props bag without
losing its identity. A class-based design would force a hierarchy (a mergeable
deferred prop is two behaviours at once) and carry prototype/method baggage
through the spread and serialization pipeline.

Symbols (`DEFERRED_PROP`, `OPTIONAL_PROP`, `ALWAYS_PROP`, `TO_BE_MERGED`,
`DEEP_MERGE` in `src/symbols.ts`) beat a string discriminant because they cannot
collide with user-supplied keys and are detected with a plain `in` check
(`isDeferredProp`, `isMergeableProp`, …). As a secondary benefit, `instanceof`
is unreliable when a package is duplicated across installs/realms; identity-based
symbol checks avoid that class of bug entirely.

### Consequences

- **Good:** wrappers compose freely; a mergeable-deferred prop is just a `merge`
  wrapper whose `.value` is a `defer` wrapper — handled explicitly in
  `buildStandardVisitProps` / `buildPartialRequestProps`.
- **Good:** factories stay tiny and tree-shakeable; no runtime class machinery.
- **Bad / cost:** detection is structural, not nominal — every new prop mode adds
  a symbol, a type guard, and a branch in both build-props paths. The two build
  paths must be kept in sync by hand.
- **Neutral:** symbols are module-private and never serialized, so they never
  leak into the wire payload.

## More Information

- Source: `src/props.ts`, `src/symbols.ts`, `src/types.ts`
- Consumers: `Inertia#buildPageProps` in `src/inertia.ts`
