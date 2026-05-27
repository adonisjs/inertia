# Flash Messages (First-Class)

## Overview

Flash messages are short-lived, single-consumption values surfaced to the client outside the normal `props` channel. Typical uses include success notifications after a write, transient identifiers (e.g. a newly created record id), or any data that should be available exactly once and then disappear.

Flash messages differ from regular props in three ways:

1. They live in a **dedicated top-level field** on the page object, not inside `props`.
2. They are **automatically reflashed** across redirects so the producing request can flash and the redirected target receives the data.
3. They are **not persisted** in browser history state — navigating back to a previous page does not re-surface previously consumed flash data.

## Wire format

The page object carries a `flash` field:

```jsonc
{
  "component": "Users/Show",
  "props": { "user": { "id": 42, "name": "Jane" } },
  "flash": {
    "message": "User created successfully",
    "newUserId": 42
  }
}
```

Field shape:

| Field   | Type                       | Description |
| ------- | -------------------------- | --- |
| `flash` | `Record<string, unknown>`  | Map of arbitrary JSON-serializable values. Keys are application-defined. |

Rules:

- The field is **always present** in responses, even when empty (`{}`). Clients depend on it being a defined object.
- Values are serialized as standard JSON; no special wrapper or marker types apply.
- The same key may appear in `flash` and in `props`; they are independent channels.

## Server behavior

### Producing flash data

Handlers register key/value pairs to be flashed on the next response. Multiple registrations within a single request accumulate; later registrations to the same key overwrite earlier ones.

Flash data is stored in a server-side, per-session bucket so that:

- A handler that flashes data and then issues a redirect does not lose the flash — it carries across the redirect to whichever request consumes it.
- Once consumed, the bucket is cleared.

### Emitting on the response

When building any Inertia response (status 200 page object):

1. Read the session flash bucket.
2. Emit the entire bucket as `flash` on the page object.
3. Clear the bucket so subsequent requests do not see the same flash.

### Reflashing across redirects

When the response is itself a redirect (302/303 to a follow-up handler), the server MUST reflash the flash bucket so the next request observes it. This is the standard "flash → redirect → consume" lifecycle.

### Prefetch interaction

When the request carries `Purpose: prefetch`, the server MUST NOT clear the flash bucket. Prefetch is speculative; consuming flash here would prevent the actual visit from seeing it. The server MAY still emit `flash: {}` on the prefetched response, or MAY emit the current bucket without clearing — both behaviors are protocol-conformant; the choice depends on whether the prefetched response is meant to preview flash data or not.

### Asset-version mismatch

When a 409 reload is issued due to an asset-version mismatch, the server MUST reflash the bucket so the forced reload observes the original flash data.

## Client-side flash

Clients MAY allow application code to write to the `flash` channel directly without a server round-trip. When the client writes flash data:

- The data is treated identically to server-emitted flash for rendering.
- It does not persist in history state.
- It is not transmitted to the server on subsequent requests.

This is purely a client-side convenience and has no protocol surface.

## Client expectation

- Read `flash` on every response.
- Surface flash entries via whatever mechanism the framework offers (subscription hook, event callback, page accessor).
- Treat `flash` as ephemeral — do not persist it across navigations.
- A per-visit callback MAY be invoked with the flash payload after the response is committed.
- A global event MAY be emitted whenever flash data arrives.
