# Multiple Errors Per Field

> **Inertia version:** available in **both v2 (legacy) and v3 (latest)**.
> Verified against `@inertiajs/core` `3.4.0` (latest) and `2.3.23` (installed —
> the line this adapter targets). The installed client supports it. Last
> verified 2026-06-13.

## Overview

Validation errors delivered to the client may carry **more than one message per field**. The protocol allows the value of each error entry to be either a single string or an array of strings — but the choice is **mode-wide per response**, not per field.

## Wire format

The `errors` prop on the page object is an object keyed by field path. The value type is **uniform across the whole response**, governed by whether the server opted into the all-messages mode:

- **Default mode:** every value is a single string (first message only).
- **All-messages mode:** every value is a `string[]` — including fields with exactly one message, which arrive as a one-element array.

```jsonc
// default mode
{ "errors": { "email": "Email is required", "password": "Must be at least 8 characters" } }
```

```jsonc
// all-messages mode (every field is an array, even single-message ones)
{
  "errors": {
    "email": ["Email is required"],
    "password": ["Must be at least 8 characters", "Must contain a number"],
  },
}
```

> The server does **not** mix shapes within one response (e.g. one field a string, another an array). Pick a mode; it applies to all fields.

When an error bag is in use (request carried `X-Inertia-Error-Bag: <name>`), the same shape applies under the bag key:

```jsonc
{ "errors": { "login": { "email": ["Email is required"] } } }
```

## Server behavior

Servers SHOULD expose an **opt-in** mode that emits the array form (mirrors Laravel's `$withAllErrors`). The default remains "first message only" for backward compatibility. When the array mode is on, every field is emitted as an array — single-message fields are **not** collapsed to a string.

## Client expectation

The client types `errors` as `Record<string, ErrorValue>`, where `ErrorValue = InertiaConfigFor<'errorValueType'>` — **`string` by default**. It is **not** a `string | string[]` union. An app that runs the server in all-messages mode opts the client type in **globally** via declaration merging:

```ts
declare module '@inertiajs/core' {
  interface InertiaConfig {
    errorValueType: string[]
  }
}
```

After that, `errors.field` is typed `string[]` everywhere (`usePage`, `useForm`, `<Form>`). See the analysis of how `ErrorValue` resolves at the component level (it is one global type, not per-field).

## Sources

- https://inertiajs.com/validation
- https://inertiajs.com/the-protocol
- `@inertiajs/core` `types/types.d.ts` (`Errors`, `ErrorValue`, `ErrorBag`)
