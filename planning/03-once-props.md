# Once Props

> **Implemented:** this adapter ships once props as of
> [ADR 0017](../docs/adr/0017-once-props.md) — full spec, including custom keys,
> expiry, force-fresh, and composition with `defer`/`optional`/`merge`.

> **Inertia version:** available in **both v2 (legacy, 2.3.x) and v3 (latest)**.
> The `X-Inertia-Except-Once-Props` header and the `onceProps` page-object field
> are present in `@inertiajs/core` `2.3.23` (the line this adapter targets). This
> spec was verified accurate against the installed client. Last verified 2026-06-13.

## Overview

A **once prop** is a prop whose value is computed by the server, sent to the client on first encounter, and then **remembered by the client across subsequent visits to pages that include the same prop**. On follow-up requests, the client tells the server which once-keys it already has cached so the server can skip recomputation and omit the value from the response.

Once props are intended for stable data (lookup tables, immutable user info, expensive computations) that should not be re-resolved on every visit.

## Wire format

### Request header

The client communicates which once-keys it already holds via:

```
X-Inertia-Except-Once-Props: key1,key2,key3
```

Comma-separated list of once-keys currently cached and not expired on the client.

### Response field

The page object carries an `onceProps` field describing every once prop the server intends to be remembered:

```jsonc
{
  "onceProps": {
    "user": {
      "prop": "user",
      "expiresAt": 1736505600000,
    },
    "lookups": {
      "prop": "lookups",
      "expiresAt": null,
    },
  },
}
```

Field shape:

| Field       | Type             | Description                                                                                                  |
| ----------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `prop`      | string           | Path to the prop inside `props`. Usually equal to the once-key, but may differ if a custom key was assigned. |
| `expiresAt` | `number \| null` | Unix epoch milliseconds at which the cached value should be considered stale. `null` means no expiration.    |

The map is keyed by **once-key**, not by prop name. If no custom key is assigned, the once-key equals the prop path.

### Props field

When the server resolves a once prop (first time, expired, or forced refresh), the value lives at the path indicated by `onceProps[key].prop` inside the `props` object, like any normal prop.

When the server skips a once prop (key listed in `X-Inertia-Except-Once-Props` and not expired and not forced-fresh), the value is omitted from `props`. The `onceProps` entry is still emitted so the client can confirm the metadata (e.g. updated `expiresAt`) and continue using its cached copy.

## Server behavior

For each once prop encountered while building a response:

1. Determine the **once-key**: the custom key if assigned, else the prop path.
2. Decide whether to **skip resolution**:
   - Skip if the key is listed in `X-Inertia-Except-Once-Props` AND `expiresAt` (if set) is still in the future AND the prop is not marked "force fresh".
   - Otherwise, resolve the value normally.
3. Always emit an entry in `onceProps` describing the prop, even when the value is skipped.

A once prop MAY compose with other prop modifiers — it can be deferred, optional, or mergeable. The once-key check applies to the resolution step regardless of how the prop is otherwise classified.

### Custom keys

A once prop may be assigned a custom key (`as` semantics). The custom key is what the client uses to identify the cached value across pages, allowing the same cached value to satisfy multiple props on different pages.

### Expiration

Servers MAY attach an absolute expiration time. The client treats a cached value as valid until `Date.now() >= expiresAt`. Servers compute `expiresAt` from a TTL (seconds, duration, or absolute time) at response build time.

### Force refresh

A once prop MAY be marked "fresh" for a single response. When marked fresh, the server resolves the value and includes it in `props` regardless of the client's cached set. The next response returns to normal once-prop semantics.

### Globally shared once

A once prop that is shared globally (across every page render) is functionally identical to a per-render once prop with the same key. The protocol does not distinguish them — both produce identical wire output.

## Client expectation

- Send `X-Inertia-Except-Once-Props` listing all currently cached, non-expired once-keys.
- On response, merge incoming `onceProps` entries with the existing client cache.
- For any once-key whose value is missing from `props`, substitute the cached value at the path indicated by `onceProps[key].prop`.
- Discard cached once-keys not present in the incoming `onceProps` after navigation completes.
