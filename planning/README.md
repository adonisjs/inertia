# Planning — Inertia Protocol Coverage

Protocol documents for the Inertia features the integration must implement to reach 100% protocol coverage. Each document describes the wire format, server behavior, and client expectation. The protocol body stays framework-neutral; each doc now also carries a **version-applicability banner** stating which Inertia line the feature lives in and whether the client this adapter targets supports it.

## Version baseline

- **Latest Inertia:** `@inertiajs/core` **3.4.0** (`latest`).
- **Legacy line:** **2.3.x** (`legacy`, currently 2.3.26).
- **This adapter targets v2** (`peerDependencies: ^2.3.8`; installed `2.3.23`).

All specs were fact-checked against the latest protocol and the installed `2.3.23` client on **2026-06-13**.

## Version applicability (the gating fact)

| # | Feature | Inertia line | In `2.3.23` (what we target)? |
| - | ------- | ------------ | ----------------------------- |
| 01 | Multiple errors per field      | v2 + v3 | ✅ yes |
| 02 | Prefetch awareness             | generic HTTP (client sets `Purpose`) | ✅ yes |
| 03 | Once props                     | v2 + v3 | ✅ yes |
| 04 | Rescued deferred props         | **v3 only** | ❌ no — blocked on v3 upgrade |
| 05 | Keyed and directional merges   | v2 + v3 | ✅ yes |
| 06 | Infinite scroll                | v2 + v3 | ✅ yes (builds on 05) |
| 07 | Fragment-preserving redirects  | **v3 only** | ❌ no — blocked on v3 upgrade |
| 08 | Shared props tracking          | **v3 only** | ❌ no — blocked on v3 upgrade |
| 09 | Flash messages (first-class)   | v2.3.0+ and v3 | ✅ yes |

> **04, 07, and 08 require a v2→v3 client upgrade first** — implementing them
> server-side against the v2 client would emit data it silently ignores. The
> v2→v3 upgrade is therefore an upstream prerequisite, not captured by the
> original linear order below.

## Suggested order (revised)

Prioritize features already supported by the targeted client:

1. [Multiple errors per field](./01-multiple-errors-per-field.md) — small, opt-in, non-breaking.
2. [Once props](./03-once-props.md) — spec verified accurate.
3. [Keyed and directional merges](./05-keyed-and-directional-merges.md).
4. [Infinite scroll](./06-infinite-scroll.md) — depends on (3).
5. [Flash messages](./09-flash-messages.md) — adopt the first-class `flash` field.
6. [Prefetch awareness](./02-prefetch-awareness.md) — mostly a generic-HTTP flag; see banner.

Gated on a v3 client upgrade:

7. [Rescued deferred props](./04-rescued-deferred-props.md)
8. [Fragment-preserving redirects](./07-fragment-preserving-redirects.md)
9. [Shared props tracking](./08-shared-props-tracking.md)
