# Planning — Inertia Protocol Coverage

Protocol documents for the Inertia features the integration must implement to reach 100% protocol coverage. Each document describes the wire format, server behavior, and client expectation. The protocol body stays framework-neutral; each doc now also carries a **version-applicability banner** stating which Inertia line the feature lives in and whether the client this adapter targets supports it.

## Version baseline

- **Latest Inertia:** `@inertiajs/core` **3.4.0** (`latest`).
- **Legacy line:** **2.3.x** (`legacy`, currently 2.3.26).
- **This adapter now targets v3** (`peerDependencies: ^3.4.0`; installed `3.4.0`),
  as of [ADR 0014](../docs/adr/0014-upgrade-bundled-client-to-inertia-v3.md). The
  former v2 gating no longer applies — every feature below is now supported by the
  targeted client.

Specs were fact-checked against the protocol on **2026-06-13** (against the
then-installed `2.3.23`); the v3 upgrade landed **2026-06-16**. The applicability
table below is kept for historical context — the "blocked on v3 upgrade" rows are
now **unblocked**.

## Version applicability (historical — all features now supported on v3)

| #   | Feature                       | Inertia line                         | Status after v3 upgrade     |
| --- | ----------------------------- | ------------------------------------ | --------------------------- |
| 01  | Multiple errors per field     | v2 + v3                              | ✅ supported                |
| 02  | Prefetch awareness            | generic HTTP (client sets `Purpose`) | ✅ supported                |
| 03  | Once props                    | v2 + v3                              | ✅ supported                |
| 04  | Rescued deferred props        | v3 only                              | ✅ unblocked (was v3-gated) |
| 05  | Keyed and directional merges  | v2 + v3                              | ✅ supported                |
| 06  | Infinite scroll               | v2 + v3                              | ✅ supported (builds on 05) |
| 07  | Fragment-preserving redirects | v3 only                              | ✅ unblocked (was v3-gated) |
| 08  | Shared props tracking         | v3 only                              | ✅ unblocked (was v3-gated) |
| 09  | Flash messages (first-class)  | v2.3.0+ and v3                       | ✅ supported                |

## Suggested order

With the v3 upgrade done, the original linear order applies; the previously
v3-gated features (04, 07, 08) can be slotted wherever their dependencies allow.

1. [Multiple errors per field](./01-multiple-errors-per-field.md) — ✅ implemented ([ADR 0015](../docs/adr/0015-multiple-errors-per-field.md)).
2. [Once props](./03-once-props.md) — ✅ implemented ([ADR 0017](../docs/adr/0017-once-props.md)).
3. [Keyed and directional merges](./05-keyed-and-directional-merges.md) — ✅ implemented ([ADR 0019](../docs/adr/0019-keyed-and-directional-merges.md)).
4. [Infinite scroll](./06-infinite-scroll.md) — ✅ implemented ([ADR 0020](../docs/adr/0020-infinite-scroll.md)); depends on (3).
5. [Flash messages](./09-flash-messages.md) — ✅ implemented ([ADR 0021](../docs/adr/0021-first-class-flash-messages.md)).
6. [Prefetch awareness](./02-prefetch-awareness.md) — mostly a generic-HTTP flag; see banner.
7. [Rescued deferred props](./04-rescued-deferred-props.md) — ✅ implemented ([ADR 0018](../docs/adr/0018-rescued-deferred-props.md)).
8. [Fragment-preserving redirects](./07-fragment-preserving-redirects.md) — now unblocked.
9. [Shared props tracking](./08-shared-props-tracking.md) — ✅ implemented ([ADR 0022](../docs/adr/0022-shared-props-tracking.md)).

> **Scope limit (ADR 0014):** prop resolution is **top-level only** — resolving
> wrappers at any nesting depth and dot-notation partial-reload paths are
> **deliberately out of scope** (cost of the per-render tree walk; matches
> `@hono/inertia`). The features above are implemented against top-level props;
> wrappers nested inside plain objects are unsupported by design.
