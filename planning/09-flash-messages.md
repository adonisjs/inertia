# Flash Messages (First-Class)

> **Inertia version:** first-class flash was added in **v2.3.0** and is present
> in `@inertiajs/core` `2.3.23` (the line this adapter targets) and v3 (latest):
> a top-level `flash` page-object field, `router.flash()`, the `onFlash` visit
> option, and the `inertia:flash` global event. **The AdonisJS adapter does not
> use it today** — it shares flash as a normal prop / builds the `errors` prop
> from session flash. Adopting the first-class field is the work this spec
> describes. Last verified 2026-06-13.

## Overview

Flash messages are short-lived, single-consumption values surfaced to the client outside the normal `props` channel — success notifications, transient ids, data available exactly once.

They differ from regular props in three ways:

1. They live in a **dedicated top-level field** (`page.flash`), not inside `props`.
2. They are **single-consumption**: cleared after being sent, so they do not reappear on later requests.
3. They are **not persisted** in browser history state (the client strips flash before `history.replaceState`).

## Wire format

```jsonc
{
  "component": "Users/Show",
  "props": { "user": { "id": 42, "name": "Jane" } },
  "flash": { "message": "User created successfully", "newUserId": 42 }
}
```

| Field   | Type                       | Description |
| ------- | -------------------------- | --- |
| `flash` | `Record<string, unknown>`  | Map of arbitrary JSON-serializable values; keys are application-defined. |

- The client normalizes `flash` to `{}` when absent, so component code can rely on a defined object. (This is a **client normalization**, not a documented server guarantee — a server-side contract that the field is always present is the adapter's own choice.)
- Values are standard JSON; no wrapper/marker types.
- The same key may appear in `flash` and in `props`; independent channels.
- **TypeScript:** `page.flash` is typed `FlashData = InertiaConfigFor<'flashDataType'>` (default `Record<string, unknown>`). This is a **DX-only** hook — apps narrow the shape via declaration merging (`interface InertiaConfig { flashDataType: {...} }`); it does not change wire behavior.

## Server behavior

### Producing and emitting

Handlers register key/value pairs; multiple registrations accumulate (later overwrites earlier). When building a 200 response: read the session flash bucket, emit it as `flash`, and clear it so subsequent requests do not re-observe it.

### Flash across redirects

The "flash → redirect → consume" lifecycle works because the **framework's session flash** survives one redirect — this is ordinary session-flash behavior, **not** an Inertia-mandated reflash rule. Inertia's docs state flash is cleared after being sent and is not itself persisted across arbitrary redirects at the Inertia layer.

### Asset-version mismatch (the one Inertia-documented reflash)

When a `409` reload is issued due to an asset-version mismatch, the server MUST reflash the bucket so the forced reload observes the original flash. This is the single reflash behavior Inertia's adapters document — and the AdonisJS adapter already does it (`session.reflash()` in the version-mismatch path).

### Prefetch interaction

**Undocumented in Inertia.** The protocol/flash docs say nothing about flash during a prefetch. Treat any "don't clear flash on prefetch" behavior as adapter-discretion, not a protocol requirement. (See `planning/02`: flash is action-driven and not generally consumed by prefetch.)

## Client-side flash

`router.flash(keyOrData, value)` lets app code write flash without a server round-trip. It sets `page.flash` locally and fires the `inertia:flash` global event; it is not transmitted to the server and does not persist in history.

## Client expectation

- Read `flash` on every response; surface entries via a hook, the `onFlash` visit callback, the `inertia:flash` global event, or a page accessor.
- Treat `flash` as ephemeral; do not persist across navigations.

## Sources

- https://inertiajs.com/docs/v2/data-props/flash-data
- https://inertiajs.com/the-protocol (409 reflash)
- `@inertiajs/core` `2.3.23` `types/types.d.ts` (`flash: FlashData`, `onFlash`), `dist` (`router.flash`, `inertia:flash`, history stripping)
- AdonisJS adapter today: `src/inertia_middleware.ts` (shares session flash as `errors`; `reflash()` on 409)
