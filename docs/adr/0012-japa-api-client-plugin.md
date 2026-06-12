# 0012 — Japa `api_client` plugin for testing Inertia responses

- **Status:** Accepted
- **Date:** 2026-06-12 (documented retroactively)
- **Deciders:** AdonisJS core team

## Context and Problem Statement

Testing an Inertia endpoint means sending the right request headers (so the
server returns a JSON page object rather than HTML) and asserting on the returned
component and props. Doing this by hand in every test is verbose and couples
tests to header names. The adapter should provide first-class test ergonomics.

## Decision Drivers

- Tests should set Inertia headers and assert on the page object without knowing
  header internals.
- Reuse the project's existing test stack (Japa `api_client`).
- Keep the helpers typed against the app's real page map.

## Considered Options

- **No helpers** — tests set headers and read `response.body()` manually.
- **A standalone test utility** users import per assertion.
- **A Japa plugin** that augments `ApiRequest` / `ApiResponse` with Inertia
  methods.

## Decision Outcome

Chosen option: **A Japa plugin** (`inertiaApiClient`) extending the api-client.

### Rationale

Japa's api-client is the framework's HTTP testing tool, and it supports macros.
The plugin macros `ApiRequest` with `withInertia()` (sets `X-Inertia` and a
version header) and `withInertiaPartialReload(component, props)` (adds the
partial-reload headers), and adds `ApiResponse` getters (`inertiaComponent`,
`inertiaProps`) and assertions (`assertInertiaComponent`, `assertInertiaProps`,
`assertInertiaPropsContains`), each guarding that the response is actually an
Inertia response first.

Because the macros are typed against `InertiaPages` (see
[ADR 0011](0011-typed-pages-via-module-augmentation.md)),
`withInertiaPartialReload` constrains the component name and prop keys to real
pages. This gives readable, header-agnostic tests that ride on the existing test
infrastructure rather than a parallel utility.

### Consequences

- **Good:** concise, typed, header-free Inertia tests; assertions fail loudly if
  used on a non-Inertia response.
- **Good:** no new test runner — it's a Japa plugin alongside `assert`/`apiClient`.
- **Bad / cost:** couples test ergonomics to Japa + `@japa/api-client` (both
  optional peer deps); non-Japa users get no helpers.
- **Neutral:** the version header in `withInertia()` mirrors the
  `assetsVersion`/`'1'` logic from [ADR 0006](0006-asset-versioning-via-manifest-hash.md).

## More Information

- Source: `src/plugins/japa/api_client.ts`
