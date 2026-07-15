# Architecture Decision Records

This directory records the architectural decisions behind `@adonisjs/inertia` —
the official Inertia.js adapter for AdonisJS. Each ADR captures the context, the
options considered, the decision, and its consequences for one decision.

We use the [MADR](https://adr.github.io/madr/) format. See
[`0000-template.md`](0000-template.md) for the template.

## Conventions

- **Numbering:** zero-padded, monotonically increasing (`0001`, `0002`, …).
  A number is never reused, even if an ADR is later deprecated.
- **Status lifecycle:** `Proposed → Accepted → Deprecated | Superseded`.
  A reversed decision is **never edited in place** — write a new ADR and set the
  old one's status to `Superseded by NNNN`. This keeps the decision history
  auditable.
- **Audience:** core maintainers. ADRs assume working knowledge of AdonisJS and
  the [Inertia protocol](https://inertiajs.com/the-protocol); they focus on
  rationale and trade-offs, not onboarding.
- **Relationship to `planning/`:** the [`planning/`](../../planning) directory
  holds tech-agnostic Inertia **protocol specs** (the "what"). ADRs record the
  **adapter-specific design decisions** (the "how") and link back to the
  relevant spec. Specs remain the source of truth for wire format; ADRs do not
  duplicate them. See [ADR 0013](0013-protocol-coverage-planning-method.md).

## Accepted records

| #    | Title                                                                              | Status   |
| ---- | ---------------------------------------------------------------------------------- | -------- |
| 0001 | [Symbol-tagged plain objects for prop wrappers](0001-symbol-tagged-prop-wrappers.md) | Accepted |
| 0002 | [Shared props via an abstract middleware base class](0002-shared-props-via-middleware-base-class.md) | Accepted |
| 0003 | [Lazy, ordered shared-state providers](0003-lazy-shared-state-providers.md)        | Accepted |
| 0004 | [Per-request Inertia instance via a container-singleton manager](0004-per-request-instance-via-manager.md) | Accepted |
| 0005 | [Serialize props through `@adonisjs/core` transformers](0005-serialize-props-via-transformers.md) | Accepted |
| 0006 | [Asset versioning via a Vite manifest hash](0006-asset-versioning-via-manifest-hash.md) | Accepted |
| 0007 | [Inertia redirect and version-mismatch semantics in middleware](0007-redirect-and-version-semantics.md) | Accepted |
| 0008 | [Bundle React and Vue client adapters in one package](0008-bundled-client-adapters.md) | Accepted |
| 0009 | [Edge as the root-view rendering layer](0009-edge-root-view-layer.md)              | Accepted |
| 0010 | [SSR via a separate bundle/entrypoint with per-page opt-in](0010-ssr-separate-bundle-per-page-optin.md) | Accepted |
| 0011 | [Page-prop type safety via module augmentation + codegen](0011-typed-pages-via-module-augmentation.md) | Accepted |
| 0012 | [Japa `api_client` plugin for testing Inertia responses](0012-japa-api-client-plugin.md) | Accepted |
| 0013 | [Tech-agnostic protocol-coverage planning method](0013-protocol-coverage-planning-method.md) | Accepted |
| 0014 | [Upgrade the bundled client adapters to Inertia v3](0014-upgrade-bundled-client-to-inertia-v3.md) | Accepted |
| 0015 | [Multiple errors per field](0015-multiple-errors-per-field.md)                     | Accepted |
| 0017 | [Once props](0017-once-props.md)                                                   | Accepted |
| 0018 | [Rescued deferred props](0018-rescued-deferred-props.md)                           | Accepted |
| 0019 | [Keyed and directional merges](0019-keyed-and-directional-merges.md)               | Accepted |
| 0020 | [Infinite scroll](0020-infinite-scroll.md)                                         | Accepted |
| 0021 | [First-class flash messages](0021-first-class-flash-messages.md)                   | Accepted |
| 0022 | [Shared props tracking](0022-shared-props-tracking.md)                             | Accepted |
| 0023 | [Top-level-only prop resolution is permanent](0023-top-level-only-prop-resolution-permanent.md) | Accepted |
| 0024 | [No Precognition support](0024-no-precognition-support.md)                         | Accepted |

## Proposed (planned protocol features)

These are the planned protocol-coverage features from
[`planning/`](../../planning). Each will get a full ADR when it is implemented,
recording the adapter-specific design decision. Until then they are tracked here
as proposed slots referencing their spec. The v3 client upgrade
([ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md)) unblocks the v3-only
features (07, 08); rescued deferred props (04) shipped as
[ADR 0018](0018-rescued-deferred-props.md); flash messages (09) shipped as
[ADR 0021](0021-first-class-flash-messages.md); shared props tracking (08) shipped
as [ADR 0022](0022-shared-props-tracking.md); multiple errors per field (01)
shipped as [ADR 0015](0015-multiple-errors-per-field.md).

| Planned ADR | Feature | Spec |
| ----------- | ------- | ---- |
| 0016 | Prefetch awareness               | [`planning/02-prefetch-awareness.md`](../../planning/02-prefetch-awareness.md) |
| 0025 | Fragment-preserving redirects    | [`planning/07-fragment-preserving-redirects.md`](../../planning/07-fragment-preserving-redirects.md) |

> Prefetch awareness's observable surface — a request-level prefetch flag — now
> ships in `@adonisjs/http-server` as `request.prefetch()` (checks `Sec-Purpose`,
> `Purpose`, and `X-Moz`). The remaining slot covers only the adapter-side
> decision of whether anything beyond documentation is needed.

> The number assignment above is indicative. Assign the next free number when an
> ADR is actually written; do not let a placeholder block the sequence.
