# 0006 — Asset versioning via a Vite manifest hash

- **Status:** Accepted
- **Date:** 2026-06-12 (documented retroactively)
- **Deciders:** AdonisJS core team

## Context and Problem Statement

The Inertia protocol uses an opaque **asset version** string to detect when a
client is running against stale assets. The client echoes the version it has; if
the server's version differs on a GET, the server forces a full reload. The
adapter must produce a version token that changes whenever the built assets
change.

## Decision Drivers

- The token must change exactly when assets change — no more, no less.
- Zero configuration for the common case.
- Cheap to compute (it runs per request, though cached).

## Considered Options

- **A user-supplied build id / git SHA** — accurate but requires wiring.
- **mtime of the build directory** — fragile across deploys and CI.
- **Hash of the Vite manifest** — the manifest already enumerates every built
  asset and their hashed filenames.

## Decision Outcome

Chosen option: **md5 hash of the Vite manifest**, with an explicit
`assetsVersion` config override and a `'1'` fallback when no manifest exists.

### Rationale

The protocol only needs **an opaque token that is stable per build and changes
when assets change**. The Vite manifest is exactly that signal already: it lists
every built file with its content-hashed name, so any asset change changes the
manifest, and hashing it (md5 of `JSON.stringify(manifest)`) yields a stable
per-build token with no extra configuration. The hash is computed once and cached
on the instance (`#cachedVersion`).

When there is no manifest (dev without a build), the version falls back to `'1'`;
when the app wants an explicit token it can set `assetsVersion` in config, which
short-circuits the hashing entirely. md5 is chosen for being cheap and
non-cryptographic-strength-irrelevant here — the value is a change-detector, not
a security primitive.

### Consequences

- **Good:** correct cache-busting with zero config; opt-in override available.
- **Good:** cached per instance, so the cost is paid at most once per request.
- **Bad / cost:** in dev with no manifest, every build looks like version `'1'`,
  so asset-version reloads are effectively disabled there (acceptable — dev uses
  HMR).
- **Neutral:** the version is consumed both on the page object and in
  middleware `dispose()` for the version-mismatch reload
  (see [ADR 0007](0007-redirect-and-version-semantics.md)).

## More Information

- Source: `Inertia#getVersion` in `src/inertia.ts`
- Protocol: <https://inertiajs.com/the-protocol#asset-versioning>
