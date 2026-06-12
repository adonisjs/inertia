# 0005 — Serialize props through `@adonisjs/core` transformers

- **Status:** Accepted
- **Date:** 2026-06-12 (documented retroactively)
- **Deciders:** AdonisJS core team

## Context and Problem Statement

Page props are arbitrary application values — Lucid models, paginators, dates,
nested objects — that must be turned into JSON-safe data for the wire payload.
The adapter needs one consistent way to do that conversion, including resolving
any container-dependent serialization behaviour.

## Decision Drivers

- One serialization story shared with the rest of the framework, so a model
  serializes the same way in an Inertia prop as anywhere else.
- Container/request context available during serialization.
- Don't reinvent model/paginator handling.

## Considered Options

- **`JSON.stringify` / `structuredClone`** — naive, no model awareness.
- **A bespoke Inertia serializer** — full control, but a parallel implementation
  to maintain.
- **`@adonisjs/core` transformers** — subclass `BaseSerializer` and run prop
  values through it with the request's `containerResolver`.

## Decision Outcome

Chosen option: **`@adonisjs/core` transformers**, via a thin `InertiaSerializer`
subclass.

### Rationale

The driver was **consistency over control**. Reusing the framework's transformer
pipeline means props serialize exactly like model responses elsewhere in an
AdonisJS app, and serialization can resolve dependencies through the per-request
`containerResolver` that `unpackPropValue` threads in.

The adapter's only customization is to neutralize two transformer behaviours that
don't fit Inertia's flat props bag: `wrap` is set to `undefined` and
`definePaginationMetaData` returns the metadata as-is rather than restructuring
it. Beyond that, the framework owns the conversion. Building a bespoke serializer
would mean re-deriving model/paginator handling and keeping it in step with core.

### Consequences

- **Good:** props match framework-wide serialization semantics; container-aware.
- **Good:** minimal code — one subclass, two overrides.
- **Bad / cost:** the adapter inherits the transformer pipeline's behaviour and
  performance characteristics; changes in core serialization can affect Inertia
  payloads.
- **Neutral:** every unpacked prop value flows through one shared
  `inertiaSerializer` singleton.

## More Information

- Source: `InertiaSerializer` / `unpackPropValue` in `src/props.ts`
