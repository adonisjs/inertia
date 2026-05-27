# Fragment-Preserving Redirects

## Overview

Standard Inertia redirects use HTTP status `409` plus an `X-Inertia-Location` header to instruct the client to perform a full visit to a different URL. By default the URL fragment (`#section`) of the original request is **not** preserved across the redirect. Fragment-preserving redirects opt into carrying the fragment through.

## Wire format

### Response header

On a fragment-preserving redirect, the server emits both:

```
X-Inertia-Location: <absolute-url-without-fragment>
X-Inertia-Redirect: <absolute-url-without-fragment>
```

paired with HTTP status `409`. The presence of `X-Inertia-Redirect` (in addition to `X-Inertia-Location`) signals that the client SHOULD reattach the original request's fragment to the destination URL before navigating.

If the destination URL itself carries a fragment, that fragment is used as-is and the original-request fragment is ignored.

### Page object field

For Inertia responses (status 200) that are produced after a redirect was flagged for fragment preservation, the page object carries:

```jsonc
{
  "preserveFragment": true
}
```

This signals to the client that the next URL change derived from this response should retain the current fragment.

| Field              | Type    | Description |
| ------------------ | ------- | --- |
| `preserveFragment` | boolean | When true, the client preserves the existing URL fragment when applying the new URL. Absent or false means default behavior (fragment dropped). |

## Server behavior

Servers MUST provide a way for handlers to flag a response or redirect as fragment-preserving. The flag is per-response, not global.

When handling a redirect that has been flagged:

1. Compute the destination URL.
2. Set HTTP status `409`.
3. Set `X-Inertia-Location` to the destination.
4. Set `X-Inertia-Redirect` to the destination.

When producing a normal `200` response after a flagged operation (e.g. a redirect that resolves to an Inertia page render), the server emits `preserveFragment: true` on the page object.

The flag is one-shot: once consumed by emitting either the headers or the page-object field, it is cleared.

## Client expectation

- On `409` with `X-Inertia-Redirect` present, take the current URL's fragment and append it to the destination URL (unless the destination already carries one), then perform a hard navigation.
- On a `200` response with `preserveFragment: true`, when committing the new URL to history, retain the existing window-location fragment.
