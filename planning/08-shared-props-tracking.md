# Shared Props Tracking

> **Inertia version:** **v3 only (latest).** The `sharedProps` page-object field
> exists in `@inertiajs/core` `3.4.0` but is **absent from `2.3.23`** (the line
> this adapter targets — its `Page` interface has no such field). Server-side
> support here is **blocked on a v2→v3 client upgrade**; the v2 client would
> ignore the field. Verified 2026-06-13.

## Overview

A response's `props` come from two sources: **shared props** (registered globally via the server's `share()` and merged into every render) and **page props** (supplied by the specific handler). In v3, the protocol exposes the list of top-level prop keys that came from the shared source.

## Actual purpose (per the v3 protocol)

The official purpose is narrow and specific:

> `sharedProps` — Array of top-level prop keys registered via `Inertia::share()`. **Used by the client to carry shared props over during instant visits.**

That is, on client-side "instant" visits (where the server is not hit), the client knows which props are shared and should be carried forward. It is **not** an optimistic-update/snapshot mechanism, and there is no documented "exclude from snapshot" client behavior.

## Wire format (v3)

```jsonc
{
  "props": { "user": { "id": 1 }, "flash": { "message": "Saved" }, "post": { "id": 42 } },
  "sharedProps": ["user", "flash"],
}
```

| Field         | Type       | Description                                                                  |
| ------------- | ---------- | ---------------------------------------------------------------------------- |
| `sharedProps` | `string[]` | Top-level keys in `props` registered via the server's shared-state pipeline. |

> Ordering, dedup, dotted-key collapsing, and override-precedence rules are **not** specified by the protocol — they are adapter implementation choices and must not be presented as protocol guarantees. (Normally Inertia does not distinguish shared vs page props at all; shared data is simply merged into `props`, page props taking precedence on key collisions. `sharedProps` is the one narrow exception, for instant-visit carry-over.)

## Server behavior

1. Resolve shared props and page props; merge with page props taking precedence.
2. Emit the top-level keys that originated from the shared pipeline as `sharedProps`.

Whether to also drop keys that were overridden by a page prop of the same name, and how to handle dotted/namespaced shared keys, are adapter decisions — not dictated by the wire format.

## Client expectation

- Use `sharedProps` to carry shared prop values across instant (client-side) visits.
- Absence of the field (always the case on the v2 client) means no instant-visit carry-over info; it does **not** signal a "disabled tracking" mode.

## Sources

- https://inertiajs.com/the-protocol (v3: `sharedProps` — exact purpose quoted above)
- https://inertiajs.com/shared-data (shared/page merge semantics)
- `@inertiajs/core` `3.4.0` `types/types.d.ts` (`sharedProps?: string[]`); absent in `2.3.23` / `2.3.26`
