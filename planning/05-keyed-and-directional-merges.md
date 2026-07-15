# Keyed and Directional Merges

> **Inertia version:** available in **both v2 (legacy) and v3 (latest)**.
> The wire fields (`mergeProps`, `prependProps`, `deepMergeProps`,
> `matchPropsOn`) and the `X-Inertia-Reset` request header are all present in
> `@inertiajs/core` `2.3.23` (the line this adapter targets). Verified 2026-06-13.

## Overview

Mergeable props let the client combine incoming prop values with existing cached values instead of replacing them. Beyond shallow vs deep merge, the protocol supports **directional** merges (append vs prepend) and **keyed** merges (dedupe/replace items by a key field).

## Wire format (page-object fields)

| Field            | Type       | Description                                                            |
| ---------------- | ---------- | ---------------------------------------------------------------------- |
| `mergeProps`     | `string[]` | Prop paths whose array value is **appended** to the existing array.    |
| `prependProps`   | `string[]` | Prop paths whose array value is **prepended** to the existing array.   |
| `deepMergeProps` | `string[]` | Prop paths whose value is recursively (deep) merged.                   |
| `matchPropsOn`   | `string[]` | Keyed-merge config; entries are `"<propPath>.<keyField>"` (see below). |

A given prop path appears in at most one of `mergeProps` / `prependProps` / `deepMergeProps`, and MAY also appear in `matchPropsOn`. (This is an adapter-level invariant — the wire does not enforce exclusivity; a prop listed in two direction fields is processed by the client twice.)

```jsonc
{
  "mergeProps": ["users"],
  "prependProps": ["activity"],
  "deepMergeProps": ["settings"],
  "matchPropsOn": ["users.id", "activity.uuid"],
}
```

### Keyed merges — `matchPropsOn` entry shape

Each entry encodes which field identifies items for dedup, as `propPath` + `.` + `keyField`. The client splits on the **last dot** — the part before is the prop path, the part after is the key field:

- `"users.id"` → for `users`, dedupe items by `id`.
- `"activity.uuid"` → for `activity`, dedupe items by `uuid`.

> The dot is **mandatory**. An entry with no dot does not match any prop path, so keyed dedup is silently disabled for it (the prop still appends/prepends, just without matching). There is **no** "no-dot fallback" convention.

## Resetting cached arrays — `X-Inertia-Reset`

`X-Inertia-Reset` is a **request header the client sends to the server** (derived from the client's `reset: [...]` visit option), listing comma-separated prop paths whose cached arrays should be discarded before merging. It is **not** a server-emitted directive received by the client. The reset props are also folded into the partial-reload `only` list.

## Server behavior

1. For each mergeable prop, classify into one of `mergeProps` / `prependProps` / `deepMergeProps`.
2. If a match key is configured, emit `"<propPath>.<keyField>"` in `matchPropsOn`.
3. Emit the resolved value at the prop path inside `props`.

The server only **labels** the prop; the merge happens client-side against cached state. A mergeable prop MAY also be deferred or once; the merge metadata is emitted regardless of whether the value is in the current response.

## Client expectation

For each prop path listed:

- `mergeProps`: `[...cached, ...incoming]`.
- `prependProps`: `[...incoming, ...cached]`.
- `deepMergeProps`: recursive object merge.

If a `matchPropsOn` entry exists, an incoming item whose key matches an existing item **replaces** it (rather than duplicating); direction order is preserved for new keys. If the prop is named in the request's `X-Inertia-Reset`, the cached array is discarded before merge.

## Sources

- https://inertiajs.com/the-protocol (page-object fields, `X-Inertia-Reset` request header)
- https://inertiajs.com/merging-props (`merge`/`deepMerge`/`prepend`/`append`/`matchOn`, `reset` request option)
- `@inertiajs/core` `2.3.23` `types/types.d.ts:103-106` and `dist` merge/match logic
