# 0011 — Page-prop type safety via module augmentation + codegen

- **Status:** Accepted
- **Date:** 2026-06-12 (documented retroactively)
- **Deciders:** AdonisJS core team

## Context and Problem Statement

`ctx.inertia.render('Users/Index', props)` should type-check the component name
against the set of real pages, and the `props` against that component's declared
props. The mapping from component name → component props lives in the frontend
(`.vue` / `.tsx` files), not in the controller. We must decide how the server
side learns those types.

## Decision Drivers

- `render()` / `renderInertia()` call sites should get full inference with no
  per-call generics.
- The page→props map must stay in sync with the actual page components.
- Consistent with how AdonisJS already extends types.

## Considered Options

- **Threaded generics** — callers pass `render<Props>(...)` explicitly.
- **A hand-maintained page map** the user keeps updated.
- **Global module augmentation of an `InertiaPages` interface**, populated by
  build-time codegen that scans page components.

## Decision Outcome

Chosen option: **Module augmentation of `InertiaPages`, fed by an assembler
codegen hook.**

### Rationale

The driver was **zero-ceremony inference**. The `Inertia` class is generic over a
`Pages` map, and `render()` / the `renderInertia` route macro derive the allowed
component names and per-page prop types from it. Apps don't thread generics
through call sites; they augment one interface, `InertiaPages`, and every call
site type-checks automatically. This is also exactly how AdonisJS extends
`HttpContext`, routes, etc., so it's idiomatic and discoverable.

To keep the interface in sync with reality, the `indexPages` assembler hook
(`src/index_pages.ts`) scans the pages directory (`**/*.vue` for Vue, `**/*.ts(x)`
for React), extracts each component's props with a framework-specific
`ExtractProps` helper, and generates `.adonisjs/server/pages.d.ts` that augments
`InertiaPages`. So the typing seam is hand-free module augmentation, but the
contents are generated — no manual map, and no codegen-specific call syntax.

### Consequences

- **Good:** fully-inferred `render()` with no generics at call sites; one
  augmentation point.
- **Good:** the page map regenerates from the real components on build.
- **Bad / cost:** the inference depends on the codegen hook running and on the
  generated `.d.ts` being present; without it, page types fall back to broad.
- **Neutral:** `ExtractProps` is framework-specific (Vue vs React), so each
  supported framework needs its own extraction helper.

## More Information

- Source: `src/index_pages.ts`; `Inertia#render` / `#page` in `src/inertia.ts`;
  `renderInertia` macro in `providers/inertia_provider.ts`; `InertiaPages` in
  `src/types.ts`
- Tuyau (`@tuyau/core`) can supplement the typed surface (optional peer dep).
