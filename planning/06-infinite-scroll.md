# Infinite Scroll

## Overview

Infinite scroll layers on top of the keyed-and-directional-merge primitive to support continuously loading paginated data as the user scrolls. The server provides paginated values plus pagination metadata; the client decides direction (next page vs previous page) and informs the server of its merge intent on each follow-up request.

## Wire format

### Request header

On every follow-up scroll request, the client sends:

```
X-Inertia-Infinite-Scroll-Merge-Intent: append
```

or

```
X-Inertia-Infinite-Scroll-Merge-Intent: prepend
```

`append` is used when loading the next page (later items). `prepend` is used when loading the previous page (earlier items, e.g. reverse-mode timelines). Absence of the header is treated as `append`.

### Response field

The page object carries a `scrollProps` map keyed by prop path. Each entry describes the pagination cursor for that prop:

```jsonc
{
  "scrollProps": {
    "users": {
      "pageName": "page",
      "previousPage": null,
      "nextPage": 2,
      "currentPage": 1,
      "reset": false
    }
  }
}
```

Field shape per entry:

| Field          | Type                          | Description |
| -------------- | ----------------------------- | --- |
| `pageName`     | string                        | Query-string parameter the client should use when requesting the next or previous page (e.g. `page`, `users_page`, `cursor`). |
| `previousPage` | `number \| string \| null`    | Identifier for the previous page, or `null` if there is no previous page. |
| `nextPage`     | `number \| string \| null`    | Identifier for the next page, or `null` if there is no next page. |
| `currentPage` | `number \| string \| null`     | Identifier for the page currently in the response. |
| `reset`        | boolean                       | When true, instructs the client to discard cached items for this prop before merging. |

Identifiers are typed as numeric for offset paginators and string for cursor paginators.

### Merge metadata coupling

A scroll prop is implicitly mergeable. The server MUST emit the prop path in either `mergeProps` or `prependProps` based on the request's merge-intent header:

- Intent `append` (or absent) → list in `mergeProps`.
- Intent `prepend` → list in `prependProps`.

The server SHOULD also emit a `matchPropsOn` entry to dedupe overlap between adjacent pages.

### Wrapper convention

Paginated values are typically delivered as objects of shape `{ data: [...], meta?: ... }`. The wrapper field name is configurable per scroll prop and is the field whose array value gets merged. The client merges the wrapper's array, not the entire object.

## Server behavior

For each scroll prop:

1. Read `X-Inertia-Infinite-Scroll-Merge-Intent` to choose append vs prepend.
2. Resolve the paginator (or other paginated source).
3. Extract pagination metadata: page name, current/previous/next identifiers.
4. Emit the value at the prop path under the configured wrapper key.
5. Emit the prop path in `mergeProps` or `prependProps` per intent.
6. Emit a `scrollProps` entry with the metadata.
7. Optionally emit a `matchPropsOn` entry for dedup.

When a request resets pagination (e.g. filter change), the server emits `scrollProps[<prop>].reset = true` to instruct the client to drop cached items before merging.

### Multiple scroll containers

A single page MAY contain multiple independent scroll props. Each MUST use a distinct `pageName` so query-string parameters do not collide. Each emits its own `scrollProps` entry.

### Custom metadata

The metadata derivation MAY be supplied by user code when the data source is not a built-in paginator. The contract is the four metadata fields above plus `reset`; the server uses whatever source produces those values.

## Client expectation

- On reaching a sentinel near the end (or start, in reverse mode) of the cached items, issue a partial-reload request for the scroll prop, sending `X-Inertia-Infinite-Scroll-Merge-Intent` and the appropriate page-name query parameter derived from `nextPage` or `previousPage`.
- On response, merge the wrapper array per the direction, using `matchPropsOn` if present.
- Update internal cursor state from the new `scrollProps` entry.
- Update query string to reflect current page so the URL is shareable and refresh-safe.
- When `reset` is true, drop all cached items for the prop before merging.
