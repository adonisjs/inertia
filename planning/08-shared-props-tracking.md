# Shared Props Tracking

## Overview

A response's `props` may originate from two distinct sources:

- **Shared props** — values registered globally and merged into every render.
- **Page props** — values supplied by the specific handler producing the response.

The protocol exposes a list of which **top-level prop keys** came from the shared source so that clients can distinguish them. This enables features such as optimistic update reconciliation, where the client snapshots only non-shared props (since shared props represent global state that should always reflect the latest server-authoritative value).

## Wire format

The page object carries a `sharedProps` field:

```jsonc
{
  "props": {
    "user": { "id": 1, "name": "Jane" },
    "flash": { "message": "Saved" },
    "post": { "id": 42, "title": "Hello" }
  },
  "sharedProps": ["user", "flash"]
}
```

Field shape:

| Field         | Type       | Description |
| ------------- | ---------- | --- |
| `sharedProps` | `string[]` | Array of **top-level keys** in `props` that originated from the shared-state pipeline. |

Rules:

- Only top-level keys are listed. Nested paths from dotted shared keys collapse to their root segment (e.g. shared key `flash.message` contributes `flash` to the list, not `flash.message`).
- Order is insertion order of unique top-level keys.
- The list is deduplicated.
- Listed keys MUST be present in `props` for that response.
- Page-level props that happen to share a key with a shared prop are NOT listed; the page-level value takes precedence and is treated as page-owned.

## Server behavior

While building the response:

1. Resolve shared props first.
2. Track each top-level key produced by the shared-resolution step.
3. Apply page props on top, allowing page-level keys to override.
4. After merge, retain only those tracked keys that still hold shared-origin values in the final `props` (i.e. were not overridden by a page-level prop of the same key).
5. Emit the list as `sharedProps`.

The behavior MAY be globally disabled by configuration. When disabled, the field is omitted entirely (not emitted as `[]`), so clients can detect the disabled state.

## Client expectation

- For features that snapshot props (e.g. optimistic updates), exclude any key listed in `sharedProps` from the snapshot.
- For diagnostics, the list distinguishes globally-injected props from page-specific props.
- Absence of the field means the server has not opted into tracking; clients SHOULD treat all props as page-owned.
