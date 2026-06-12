# 0002 — Shared props via an abstract middleware base class

- **Status:** Accepted
- **Date:** 2026-06-12 (documented retroactively)
- **Deciders:** AdonisJS core team

## Context and Problem Statement

Most Inertia apps expose a set of props on every page — the authenticated user,
flash messages, CSRF data. The adapter needs a place for applications to declare
these "shared" props, and that place needs request-scoped access (the current
user comes from `ctx.auth`, flash from `ctx.session`).

Where should the application define shared props, and how does the adapter invoke
that definition per request?

## Decision Drivers

- Shared props are request-dependent — they need `HttpContext` and the IoC
  container, not just static config.
- Validation errors and flash must be wired in on every request, around the
  user's own sharing logic.
- The integration point should be typed, discoverable, and consistent with how
  AdonisJS apps expose other per-request hooks.

## Considered Options

- **Static config callback** — `defineConfig({ share: (ctx) => ({...}) })`.
- **Container binding / decorator** the user registers.
- **Abstract middleware base class** — the app's Inertia middleware extends
  `BaseInertiaMiddleware` and implements `share(ctx)`.

## Decision Outcome

Chosen option: **Abstract middleware base class**, because shared props are
fundamentally a per-request concern and a middleware already owns the request
lifecycle where they must run.

### Rationale

The deciding driver was **per-request dependency access**. `share()` runs inside
the request, with full `HttpContext` and container access, so it can read
`ctx.auth.user`, `ctx.session`, etc. A static config callback can be handed the
context too, but it has no natural home for the surrounding lifecycle work the
middleware must also do.

Making it a middleware class means one object owns the whole request integration:
`init()` resolves the per-request `Inertia` instance (see
[ADR 0004](0004-per-request-instance-via-manager.md)) and registers the user's
`share()` as a lazy provider (see
[ADR 0003](0003-lazy-shared-state-providers.md)); `dispose()` applies redirect and
version-mismatch handling (see [ADR 0007](0007-redirect-and-version-semantics.md));
and `getValidationErrors()` lifts session flash errors into the Inertia error-bag
shape. A class is also the idiomatic AdonisJS middleware shape — typed,
IDE-navigable, and familiar.

### Consequences

- **Good:** `share()` has everything it needs with zero plumbing; lifecycle and
  sharing live together.
- **Good:** matches framework conventions — users subclass a middleware they
  already scaffold.
- **Bad / cost:** sharing is coupled to the middleware being registered in the
  kernel; an app that bypasses it gets no shared props or error handling.
- **Neutral:** `share()` is declared `abstract share?(ctx)` — optional, so a
  middleware with no shared props is valid.

## More Information

- Source: `src/inertia_middleware.ts`
- Related: [0003](0003-lazy-shared-state-providers.md),
  [0004](0004-per-request-instance-via-manager.md),
  [0007](0007-redirect-and-version-semantics.md)
