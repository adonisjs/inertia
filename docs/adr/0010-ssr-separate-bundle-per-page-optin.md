# 0010 — SSR via a separate bundle/entrypoint with per-page opt-in

- **Status:** Accepted
- **Date:** 2026-06-12 (documented retroactively)
- **Deciders:** AdonisJS core team

## Context and Problem Statement

Inertia supports server-side rendering: the server runs the client app to produce
initial HTML for first paint and SEO. SSR needs a server-targeted build (no DOM,
different externals) and a render entrypoint distinct from the browser entry. We
must decide how SSR is built, executed, and enabled.

## Decision Drivers

- SSR has a real per-request cost and isn't needed for every page.
- The SSR build differs from the client build and must be isolated.
- Dev and production execution paths differ (Vite runtime vs. built bundle).

## Considered Options

- **Always-on SSR** for every page.
- **A single shared client/server bundle.**
- **Separate SSR bundle + entrypoint, enabled per page** via `ssr.pages`.

## Decision Outcome

Chosen option: **Separate SSR bundle/entrypoint with per-page opt-in.**

### Rationale

The driver was **cost**: SSR is expensive and not always worth it, so it is
opt-in. Config exposes `ssr.enabled`, an `entrypoint` (dev) and a built `bundle`
(prod), and `ssr.pages`, which may be a list of component names or a predicate
`(ctx, component) => boolean`. `Inertia#ssrEnabled` resolves this per render:
disabled → never; a function → call it; a list → membership; otherwise → all
pages. Apps pay for SSR only where first paint / SEO matters.

Execution is split by environment in `ServerRenderer`: in dev it uses Vite's
module-runner to import the SSR `entrypoint` live (recreating the runner when
Vite restarts and replaces the SSR environment); in prod it imports the prebuilt
`bundle`. Keeping SSR in its own entrypoint/bundle isolates the server build from
the client build, matching how the broader Inertia ecosystem structures SSR.

### Consequences

- **Good:** SSR cost is paid selectively; clean dev/prod execution split.
- **Good:** server build stays isolated from the client build.
- **Bad / cost:** two build outputs and two execution paths to maintain; the dev
  module-runner needs explicit handling for Vite dev-server restarts.
- **Neutral:** without a `ServerRenderer` (no Vite), `render()` cannot SSR and
  falls back to client-side rendering.

## More Information

- Source: `src/server_renderer.ts`; `Inertia#ssrEnabled` / `#renderWithSSR` in
  `src/inertia.ts`; `defineConfig` SSR defaults in `src/define_config.ts`
