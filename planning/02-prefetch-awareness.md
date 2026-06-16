# Prefetch Awareness

> **Inertia version:** prefetch is a **generic browser/HTTP concern**, not an
> Inertia protocol feature. The v2 client (`2.3.23`, the line this adapter
> targets) sets `Purpose: prefetch` on prefetch visits. Modern browsers also use
> the Speculation-Rules `Sec-Purpose` header. Last verified 2026-06-13.

## Overview

Clients may issue **prefetch** requests to warm their local cache ahead of an actual user navigation. A prefetched response is stored client-side; the user may or may not navigate to that URL. Servers should be able to detect prefetch requests so they can avoid one-shot side effects.

## Wire format

Prefetch requests carry the standard HTTP `Purpose` header:

```
Purpose: prefetch
```

This header is set by the client on the same request that already includes `X-Inertia: true`. No new response header is required for prefetch handling.

## Server behavior

When a prefetch is detected, the server SHOULD treat the request as speculative:

- The handler MUST still produce a **complete, valid** Inertia response. Clients store it and replay it on actual navigation. Read-only data (including deferred and once props) is computed normally.
- Application handlers SHOULD avoid side effects gated on a real visit: analytics, "last seen"/view counters, lazy writes, single-use token rotation.

**On flash:** the obligation is to **expose the prefetch flag** so app code can guard its own one-shot logic — not to auto-protect flash. Flash is action-driven: it is set by a mutating request and consumed by the immediately-following request, which in the normal redirect flow is the real navigation (the browser following a `303`), never a prefetch. Reference implementations do **not** special-case flash for prefetch; a prefetch can only consume pending flash in narrow windows (async/concurrent races, multi-tab, or apps that persist flash across multiple requests).

## Observable surface

Frameworks should expose the prefetch flag to user code, so application handlers can branch on it when they own logic that should not run during prefetch.
