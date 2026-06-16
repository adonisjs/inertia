# Rescued Deferred Props

> **Inertia version:** **v3 only (latest).** The `rescuedProps` page-object
> field and the `<Deferred>` `rescue` slot exist in `@inertiajs/core` `3.4.0`
> but are **absent from `2.3.23`** (the line this adapter currently targets).
> Implementing this server-side is **blocked on a v2→v3 client upgrade** —
> output would be silently ignored by the installed client. Verified 2026-06-13.

## Overview

A deferred prop's resolution can fail (database error, upstream timeout, exception in user code). Without explicit handling, the partial-reload request that resolves the deferred prop errors out, and the client is left in a perpetual loading state.

A **rescued deferred prop** opts into graceful failure: if resolution throws, the server catches the error, **omits the prop from the response**, and reports it as "rescued" so the client can render a fallback (rescue) state instead of a loading state.

## Wire format

The page object carries a top-level `rescuedProps` field (v3) listing prop paths whose resolution failed and was rescued:

```jsonc
{
  "props": { "user": { "id": 1, "name": "Jane" } },
  "rescuedProps": ["stats"]
}
```

| Field          | Type       | Description |
| -------------- | ---------- | --- |
| `rescuedProps` | `string[]` | Prop paths whose deferred resolution threw and was caught. |

The failed prop is **omitted from `props`** (it is *not* emitted as `null`) — the client keeps showing the rescue UI for that path.

## Server behavior

When resolving a deferred prop marked rescuable (opt-in, `rescue: true`):

1. Wrap the resolution in try/catch.
2. On success: emit the resolved value at the prop path; do not touch `rescuedProps`.
3. On failure:
   - **Omit** the prop from `props` (do not emit a value).
   - Append the prop path to `rescuedProps`.
   - Report the error via the framework's exception handler (it MUST NOT propagate into the Inertia response pipeline).

Rescue is **opt-in per deferred prop** — this matches Inertia's design (`Inertia::defer(..., rescue: true)`). Deferred props not marked rescuable continue to surface errors normally.

## Composition

- Group membership (`deferredProps[group]`) is unchanged.
- Mergeable variants compose; a rescued prop simply contributes nothing (the client treats the omission as a no-op against existing cached data).

## Client expectation

- Read `rescuedProps` on each response; for any listed path, the `<Deferred>` component renders its `rescue` slot (which receives a `reloading` boolean for retry UI) instead of a loading indicator.
- The rescue state persists until the prop is successfully reloaded (e.g. via partial reload), which removes the path from `rescuedProps`.

## Sources

- https://inertiajs.com/deferred-props (rescue: opt-in `rescue: true`, prop **omitted**, `<Deferred>` rescue slot)
- `@inertiajs/core` `3.4.0` `types/types.d.ts` (`rescuedProps: string[]`); absent in `2.3.23`
