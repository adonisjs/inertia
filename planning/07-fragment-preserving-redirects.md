# Fragment-Preserving Redirects

> **Inertia version:** **v3 only (latest).** The `X-Inertia-Redirect` header and
> the `preserveFragment` page-object field exist in `@inertiajs/core` `3.4.0`
> but are **absent from `2.3.23`** (the line this adapter targets). The v2 client
> has a *different*, automatic fragment behavior (see below) and will ignore
> `X-Inertia-Redirect` / `preserveFragment`. Server-side support here is
> **blocked on a v2→v3 client upgrade**. Verified 2026-06-13.

## Overview

A user navigates to a URL with a fragment (`/page#section`) and the server redirects. By default the fragment is lost. Fragment-preserving redirects carry the fragment through. **Note:** this is a distinct mechanism from external/location redirects.

## Two separate 409 mechanisms (do not conflate)

- **External / asset-version redirects** use `409` + **`X-Inertia-Location`** → the client does a full `window.location` visit to that URL.
- **Fragment-preserving redirects** (v3) use `409` + **`X-Inertia-Redirect`** → emitted **alone**, *not* together with `X-Inertia-Location`.

## Wire format (v3)

### Redirect response

```
HTTP/1.1 409 Conflict
X-Inertia-Redirect: https://app.test/page#section
```

- The header value is the **full redirect URL, including the fragment** — the server has already composed it. The client does **not** reattach the original request's fragment; it navigates to the URL as given.
- `X-Inertia-Location` is **not** set on this path.

### Page-object field (200 renders)

When the server was asked to preserve the fragment for a subsequent render, the page object carries:

```jsonc
{ "preserveFragment": true }
```

| Field              | Type    | Description |
| ------------------ | ------- | --- |
| `preserveFragment` | boolean | When true, the client retains the current URL fragment when applying the new URL. |

## Server behavior (v3, per inertia-laravel reference)

- A handler opts in per-response (e.g. `Inertia::preserveFragment()`), which sets a one-shot session flag.
- On a redirect whose `Location` contains `#`, **and the request is not a prefetch** (`! request.prefetch()` — see `planning/02`), the middleware replaces the response with `409` + `X-Inertia-Redirect: <full Location incl. fragment>`.
- On a `200` Inertia render, if the flag was set, emit `preserveFragment: true` on the page object. The flag is read-and-cleared (one-shot).

## Client expectation (v3)

- On `409` + `X-Inertia-Redirect`: hard-navigate to the header's URL (fragment already included).
- On `200` + `preserveFragment: true`: retain the existing window-location fragment when committing the new URL to history.

## v2 behavior (the installed client, for reference)

`2.3.23` has no `X-Inertia-Redirect` / `preserveFragment`. On the `409` + `X-Inertia-Location` path it auto-preserves the fragment via `setHashIfSameUrl`: if the origin URL had a hash, the destination has none, and they share the same path-without-hash, the origin hash is copied onto the destination. There is no opt-in and no page-object field in v2.

## Sources

- https://inertiajs.com/the-protocol (v3: `X-Inertia-Redirect`, `X-Inertia-Location`, `preserveFragment`, 409 semantics)
- https://inertiajs.com/redirects (v3: `preserveFragment()`)
- inertia-laravel `master`: `Middleware.php` (`onRedirectWithFragment`, `redirectHasFragment`, `! $request->prefetch()` guard), `Response.php`, `Support/Header.php`
- `@inertiajs/core` `2.3.23` `dist` (`setHashIfSameUrl`; no `X-Inertia-Redirect`/`preserveFragment`)
