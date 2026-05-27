# Keyed and Directional Merges

## Overview

The base **merge** prop modifier instructs the client to combine an incoming prop value with the existing cached value rather than replace it. The protocol extends this with two orthogonal controls:

- **Direction** — whether incoming array items are appended after, or prepended before, existing items.
- **Match key** — a key path used to dedupe items during merge so re-fetching an overlapping range does not produce duplicates.

These controls compose with deferred and once-prop modifiers and underpin features such as infinite scroll.

## Wire format

The page object carries four fields, all `string[]` of prop paths:

| Field            | Description |
| ---------------- | --- |
| `mergeProps`     | Props whose array values should be **appended** during merge (default direction). |
| `prependProps`   | Props whose array values should be **prepended** during merge. |
| `deepMergeProps` | Props that should be deep-merged (recursive object merge) instead of array-merged. |
| `matchPropsOn`   | Entries describing match-key configuration for keyed deduplication. |

A given prop path MUST appear in at most one of `mergeProps`, `prependProps`, `deepMergeProps`. A prop appearing in any of those three MAY also appear in `matchPropsOn`.

```jsonc
{
  "mergeProps": ["users"],
  "prependProps": ["activity"],
  "deepMergeProps": ["settings"],
  "matchPropsOn": ["users.id", "activity.uuid"]
}
```

### `matchPropsOn` entry shape

Each entry is a string. If the entry contains a dot, it is interpreted as `<propPath>.<keyField>`:

- `"users.id"` → for the `users` prop, dedupe items by their `id` field.
- `"items.uuid"` → for the `items` prop, dedupe items by `uuid`.

If the entry has no dot, it names the prop path and dedupe is by that field on the prop's items, by convention.

## Server behavior

When building a response:

1. For every mergeable prop, classify into one of `mergeProps`, `prependProps`, or `deepMergeProps`.
2. If a match key is configured for that prop, emit the corresponding entry in `matchPropsOn`.
3. Emit the resolved value at the prop path inside `props`.

The server does **not** perform the merge — it only labels the prop. Merging happens on the client against its existing cached state.

A mergeable prop MAY also be deferred or marked once. The merge metadata is emitted regardless of whether the value is included in the current response.

## Client expectation

For each prop path listed:

- `mergeProps`: replace the cached array with `[...cached, ...incoming]`.
- `prependProps`: replace the cached array with `[...incoming, ...cached]`.
- `deepMergeProps`: recursively merge incoming object into cached object.

If a corresponding `matchPropsOn` entry exists, apply deduplication after the merge so that any item in `incoming` whose key matches an existing item in `cached` replaces (rather than duplicates) the existing item. The order produced by the direction (append/prepend) is preserved for new keys.

A `reset` directive received via `X-Inertia-Reset` empties the cached array for the listed prop before merge.
