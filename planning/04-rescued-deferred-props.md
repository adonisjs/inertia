# Rescued Deferred Props

## Overview

A deferred prop's resolution can fail (database error, upstream timeout, exception in user code). Without explicit handling, the entire response either errors out or the client waits forever for a value that will never arrive.

A **rescued deferred prop** opts into graceful failure: if resolution throws, the server catches the error, substitutes a null value, and reports the prop as "rescued" so the client can render a fallback state instead of a loading state.

## Wire format

The page object carries a top-level `rescuedProps` field listing prop paths whose resolution failed and was rescued:

```jsonc
{
  "props": {
    "user": { "id": 1, "name": "Jane" },
    "stats": null
  },
  "rescuedProps": ["stats"]
}
```

Field shape:

| Field          | Type       | Description |
| -------------- | ---------- | --- |
| `rescuedProps` | `string[]` | Array of prop paths whose deferred resolution threw and was caught. |

The field MUST always be present in responses (default `[]`). It is **not** an optional field; clients depend on it being a defined array.

## Server behavior

When resolving a deferred prop that has been marked rescuable:

1. Wrap the resolution call in a try/catch.
2. On success: emit the resolved value at the prop path, do not modify `rescuedProps`.
3. On failure:
   - Emit `null` at the prop path.
   - Append the prop path to `rescuedProps`.
   - The error MAY be logged server-side, but MUST NOT propagate to the response pipeline.

The rescue flag is opt-in per deferred prop. Deferred props that are not marked rescuable continue to surface errors normally (response fails or framework error handler intervenes).

A deferred prop already partially resolved at the time of error MUST still report `null` for that prop — partial values are not emitted.

## Composition

A rescued deferred prop composes with other deferred-prop semantics:

- Group membership (`deferredProps[group]`) is unchanged.
- Mergeable variants (`merge` / `deepMerge`) of a rescued deferred prop emit the merge metadata as usual; the rescued prop simply contributes `null` to the merge, which the client SHOULD treat as a no-op against existing cached data.

## Client expectation

- Read `rescuedProps` on every response.
- For any path listed, render the application's fallback UI for that prop instead of a loading indicator.
- A subsequent successful reload of the same prop (e.g. via partial reload) removes the path from `rescuedProps`.
