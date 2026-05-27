# Prefetch Awareness

## Overview

Clients may issue **prefetch** requests to warm their local cache ahead of an actual user navigation. A prefetched response is stored client-side; the user may or may not navigate to that URL. Servers should be able to detect prefetch requests so they can avoid one-shot side effects.

## Wire format

Prefetch requests carry the standard HTTP `Purpose` header:

```
Purpose: prefetch
```

This header is set by the client on the same request that already includes `X-Inertia: true`. No new response header is required for prefetch handling.

## Server behavior

When `Purpose: prefetch` is present, the server SHOULD treat the request as speculative:

- Do **not** consume one-time session data (flash messages, single-use tokens) — the user has not actually arrived at the page yet, and consuming flash here would lose it for the real visit.
- Do **not** trigger side effects gated on a real visit (analytics events, "last seen" updates, write operations).
- Production of read-only response data proceeds normally, including computation of deferred and once props.

The handler MUST still produce a complete, valid Inertia response. Clients store the response and replay it on actual navigation.

## Observable surface

Frameworks should expose the prefetch flag to user code, so application handlers can branch on it when they own logic that should not run during prefetch.
