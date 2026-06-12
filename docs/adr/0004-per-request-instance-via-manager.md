# 0004 — Per-request Inertia instance via a container-singleton manager

- **Status:** Accepted
- **Date:** 2026-06-12 (documented retroactively)
- **Deciders:** AdonisJS core team

## Context and Problem Statement

An `Inertia` instance holds request-scoped mutable state: the resolved
`HttpContext`, shared-state providers, and flags like `clearHistory` /
`encryptHistory`. Configuration and the Vite instance, by contrast, are
process-wide and resolved once. We need both lifetimes without recomputing the
expensive parts per request.

## Decision Drivers

- Per-request isolation — no state bleed between concurrent requests.
- App-wide config and Vite (and the derived `ServerRenderer`) resolved once.
- Fit the AdonisJS IoC container lifecycle.

## Considered Options

- **Bind `Inertia` directly** as a container value, request-scoped.
- **Manager singleton + factory** — `InertiaManager` is a container singleton
  holding config/Vite/renderer; it mints a fresh `Inertia` per request via
  `createForRequest(ctx)`.

## Decision Outcome

Chosen option: **Manager singleton + per-request factory**.

### Rationale

`InertiaProvider.register()` binds `InertiaManager` as a container **singleton**,
constructed once with the app's `inertia` config and the resolved `vite` — and,
when Vite is present, a single `ServerRenderer`. The middleware's `init()`
resolves that singleton and calls `createForRequest(ctx)`, which constructs a new
`Inertia<Pages>` per request sharing the singleton's config/Vite/renderer.

This cleanly separates the two lifetimes: the heavy, immutable dependencies live
on the singleton; the light, mutable per-request state lives on the `Inertia`
instance. It also gives a clear factory seam (`createForRequest`) that the
middleware — and tests/factories — can use.

### Consequences

- **Good:** config, Vite, and the SSR renderer are built once and reused; each
  request gets an isolated `Inertia`.
- **Good:** the manager is an injectable singleton, easy to resolve and to fake.
- **Bad / cost:** two objects to understand instead of one; the indirection is
  only justified because per-request and app-wide state genuinely differ.
- **Neutral:** `ctx.inertia` is attached in middleware `init()` via module
  augmentation of `HttpContext`.

## More Information

- Source: `src/inertia_manager.ts`, `providers/inertia_provider.ts`,
  `src/inertia_middleware.ts`
