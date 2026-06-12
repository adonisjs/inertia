# 0003 — Lazy, ordered shared-state providers

- **Status:** Accepted
- **Date:** 2026-06-12 (documented retroactively)
- **Deciders:** AdonisJS core team

## Context and Problem Statement

Shared props (see [ADR 0002](0002-shared-props-via-middleware-base-class.md)) may
be registered from more than one place — the middleware's `share()`, plus any
`inertia.share()` calls made inside a controller — and they frequently involve
async work (a DB lookup for the user). They should not be computed on requests
that never render an Inertia page, and they must merge predictably with
page-specific props.

How does `Inertia` store and resolve shared state?

## Decision Drivers

- Avoid paying for shared-prop computation on non-Inertia requests.
- Support multiple registration sites, additively.
- Deterministic precedence: page props should win over shared props on key
  conflicts.
- Support both plain objects and (async) functions as providers.

## Considered Options

- **Eager merged object** — maintain one `sharedState` object, merging on each
  `share()` call.
- **Lazy provider list** — `share()` pushes the value/thunk onto an array;
  resolve and merge it only when building a page.

## Decision Outcome

Chosen option: **Lazy provider list**, resolved at page-build time.

### Rationale

`share()` appends to a `#sharedStateProviders` array; nothing is evaluated until
`#buildPageProps` runs, at which point all providers are resolved together with
`Promise.all` (functions invoked, plain objects passed through) and reduced
left-to-right into a single shared object. The page's own props are then spread
**on top** (`{ ...sharedState, ...pageProps }`), giving page props precedence.

Laziness matters because the middleware registers `share()` as a thunk
(`ctx.inertia.share(() => this.share(ctx))`) on every request, including ones
that never render Inertia — deferring evaluation means those requests pay
nothing. Ordering via an array (rather than eager merge) keeps registration
additive and makes precedence a single, obvious spread at the end.

### Consequences

- **Good:** zero cost on non-rendering requests; providers run concurrently.
- **Good:** later-registered shared props override earlier ones; page props
  override all shared props — one clear rule.
- **Bad / cost:** every render re-resolves all providers; there is no memoization
  across renders within a request (rare, but possible with multiple renders).
- **Neutral:** a provider may be a value or an `AsyncOrSync` function; both are
  handled uniformly.

## More Information

- Source: `Inertia#share` and `Inertia#buildPageProps` in `src/inertia.ts`
- Related: [0002](0002-shared-props-via-middleware-base-class.md)
