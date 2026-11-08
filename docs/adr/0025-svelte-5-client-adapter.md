# 0025 — Bundle Svelte 5 client adapter with Inertia v3

- **Status:** Accepted
- **Date:** 2026-11-08
- **Deciders:** AdonisJS core team

## Context and Problem Statement

Following [ADR 0008](0008-bundled-client-adapters.md), this package ships client-side
helpers (router, link, form, context, and useHttp) for React and Vue. With the adoption
of Svelte 5 in the frontend ecosystem and the availability of `@inertiajs/svelte` v3,
AdonisJS developers require first-class, idiomatic Svelte 5 support.

Svelte 5 introduces fundamental architectural changes compared to Svelte 4:
- Runes (`$state`, `$derived`, `$props`) replace legacy let-declarations and Svelte stores.
- Snippets (`{#snippet ...}`) replace legacy slots.
- Modern mounting (`mount`, `hydrate` from `svelte`) and server rendering (`render` from `svelte/server`) replace legacy component instantiation (`new Component({ target })`).
- Universal reactive modules (`*.svelte.js` / `*.svelte.ts`) run outside component boundaries.

We need to provide an idiomatic, complete, and type-safe Svelte 5 integration alongside
React and Vue in `@adonisjs/inertia`.

## Decision Drivers

- Maintain consistency with existing React and Vue adapters under `@adonisjs/inertia`.
- Full compatibility with Svelte 5 runes, snippets, and SSR rendering pipelines.
- Complete support for official Inertia v3 protocol features.
- Seamless integration with Tuyau for type-safe route navigation and form submissions.
- Support both Vite development SSR (via Vite module runner) and production SSR (via manifest).
- Zero runtime overhead or bundling of Svelte dependencies in React or Vue applications.

## Decision Outcome

Chosen option: **Add a first-class `./svelte` export subpath** in `@adonisjs/inertia`,
implementing components using Svelte 5 runes and snippets, and shipping uncompiled
`.svelte` components with generated TypeScript declarations.

### Architecture and Implementation

1. **Exports & Peer Dependencies:**
   - Package export: `"./svelte": "./build/src/client/svelte/index.js"` with types `"./build/src/client/svelte/index.d.ts"`.
   - Peer dependencies: `svelte: ^5.0.0` and `@inertiajs/svelte: ^3.4.0` marked as optional peer dependencies.

2. **Component Architecture:**
   - `<Link>`: Svelte 5 component wrapping `@inertiajs/svelte`'s Link. Uses `$derived.by` to resolve Tuyau routes and params into `href` and `method`. Supports snippets via forwarded children.
   - `<Form>`: Svelte 5 component wrapping `@inertiajs/svelte`'s Form. Exposes imperative methods via `bind:this` (`getFormData`, `getData`, `submit`, `reset`, `cancel`, `clearErrors`, `setError`, etc.).
   - `useRouter()`: Enhanced type-safe navigation hook delegating to Inertia's `router`. Must be invoked during component initialization to bind to Svelte context.
   - `useHttp()`: Enhanced standalone HTTP hook supporting route binding, automatic normalization of AdonisJS validation errors, and `withAllErrors()` chained error preservation.
   - `TuyauProvider` & Context helpers: `setTuyau`, `provideTuyau`, and `tuyauContext` using a globally registered Symbol `Symbol.for('Tuyau')` for robust cross-module context agreement.

3. **Compilation & Packaging:**
   - The package ships `.svelte` SFCs directly to `build/`, allowing consuming applications' `@sveltejs/vite-plugin-svelte` to compile components matching the application's Vite environment.
   - DTS emission for `.svelte` components is handled via `scripts/emit_svelte_dts.mjs`.

4. **SSR Pipeline:**
   - `createInertiaApp` uses `render` from `svelte/server`.
   - `render(Component, options)` returns an object with `{ html, head, body }` where getters lazily evaluate the render tree.
   - Vite dev SSR requires resolving under `conditions: ['svelte']` to resolve `@inertiajs/svelte` exports and compile `*.svelte.js` universal modules with `svelte/compiler` `compileModule`.

### Consequences

- **Good:** Complete parity across React, Vue, and Svelte in `@adonisjs/inertia`.
- **Good:** Fully idiomatic Svelte 5 integration leveraging runes, snippets, and modern SSR.
- **Good:** Type-safe Tuyau routing and form submission for Svelte users.
- **Good:** Zero impact or bundle pollution for React and Vue users.
