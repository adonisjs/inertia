# 0008 — Bundle React and Vue client adapters in one package

- **Status:** Accepted
- **Date:** 2026-06-12 (documented retroactively)
- **Deciders:** AdonisJS core team

## Context and Problem Statement

Beyond the server adapter, the package ships client-side helpers (router, link,
form, context) for both React and Vue. A common alternative is to split these
into per-framework packages (`@adonisjs/inertia-react`, `-vue`). We need to
decide whether the client adapters live in this package or separate ones.

## Decision Drivers

- Keep client and server protocol handling in lockstep — they must agree on the
  page-object shape.
- Minimize install/version surface for end users.
- Don't ship Vue code to a React app (or vice versa).

## Considered Options

- **Separate packages per framework** — independent versioning, smaller nominal
  surface each.
- **One package, per-framework export paths** — `@adonisjs/inertia/react`,
  `@adonisjs/inertia/vue`, with `react`/`vue` as optional peer deps.

## Decision Outcome

Chosen option: **One package with per-framework export paths** and optional
framework peer dependencies.

### Rationale

The driver was **single install / developer experience**. End users add one
dependency and reason about one version; the server adapter and the matching
client helpers can never drift apart across a release. The usual objection —
shipping both frameworks' code — does not apply here: `react`, `vue`,
`@inertiajs/react`, and `@inertiajs/vue3` are declared as **optional**
`peerDependencies`, and the client helpers are exposed under distinct export
subpaths (`./react`, `./vue`). A React app only ever imports
`@adonisjs/inertia/react`, so the Vue code is never pulled into its bundle, and
vice versa. Bundling therefore costs nothing at runtime while buying lockstep
versioning and one-package DX.

### Consequences

- **Good:** one install, one version; server/client protocol handling ships
  together and stays consistent.
- **Good:** per-framework imports keep bundles clean despite the shared package.
- **Bad / cost:** all framework adapters share one release cadence — a fix to the
  Vue adapter bumps the package version for React users too.
- **Neutral:** adding a new framework (e.g. Svelte, Solid) means a new export
  path and optional peer dep within the same package. This is the most likely
  future pressure point, but separation was explicitly not warranted today.

## More Information

- Source: `exports` map in `package.json`; `src/client/react/*`,
  `src/client/vue/*`, `src/client/common.ts`
