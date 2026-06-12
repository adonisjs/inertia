# 0007 — Inertia redirect and version-mismatch semantics in middleware

- **Status:** Accepted
- **Date:** 2026-06-12 (documented retroactively)
- **Deciders:** AdonisJS core team

## Context and Problem Statement

The Inertia protocol imposes two HTTP-level behaviours that are not part of normal
request handling:

1. A redirect issued in response to a `PUT`/`PATCH`/`DELETE` must use **303**
   (not 302), so the browser follows it with a `GET`.
2. If a `GET` arrives with a stale asset version, the server must respond **409**
   with an `X-Inertia-Location` header so the client does a full reload — and any
   flashed data must survive that reload.

Where should these protocol mechanics live?

## Decision Drivers

- These rules are protocol obligations, not application logic — apps must not
  have to remember them.
- They depend on the final response (status, method, version), so they belong
  after the handler runs.
- Flash data must be preserved across the forced reload.

## Considered Options

- **Make controllers handle it** — error-prone, repeated everywhere.
- **Handle it centrally in the Inertia middleware's `dispose()`** — one place,
  applied to every Inertia request.

## Decision Outcome

Chosen option: **Centralize in middleware `dispose()`**, gated on the request
being an Inertia request.

### Rationale

`dispose()` runs after the route handler, so it can inspect the final response.
It first sets `Vary: X-Inertia`. Then:

- **Method-aware redirect:** if the status is `302` and the method is one of
  `PUT`/`PATCH`/`DELETE`, it upgrades the status to `303`, satisfying the
  protocol's GET-after-redirect requirement.
- **Version mismatch:** on a `GET` whose client version differs from the server
  version (see [ADR 0006](0006-asset-versioning-via-manifest-hash.md)), it
  `reflash()`es the session (so flash survives), removes the `X-Inertia` header,
  sets `X-Inertia-Location` to the current URL, and responds `409`.

Centralizing this means the protocol's wire mechanics are guaranteed for every
Inertia response and invisible to application code. The `location()` helper on
the `Inertia` instance applies the same 409 + `X-Inertia-Location` pattern for
explicit external/SPA redirects from within a handler.

### Consequences

- **Good:** protocol correctness is automatic and centralized; apps write normal
  redirects.
- **Good:** flash data is preserved across version-mismatch reloads via
  `session.reflash()`.
- **Bad / cost:** the behaviour is implicit — a maintainer debugging an
  unexpected 303/409 must know to look in `dispose()`.
- **Neutral:** all of this is a no-op for non-Inertia requests (early return).

## More Information

- Source: `BaseInertiaMiddleware#dispose` in `src/inertia_middleware.ts`;
  `Inertia#location` in `src/inertia.ts`
- Protocol: <https://inertiajs.com/redirects>
