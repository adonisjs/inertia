# 0015 — Multiple errors per field

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** AdonisJS core team

## Context and Problem Statement

Inertia delivers validation errors to the client under the reserved `errors`
page-prop key. The protocol allows the value of each field to be either a single
string or an array of strings, but the choice is **mode-wide per response** — a
response is either all strings (first message only) or all arrays (every
message), never a mix. This is the [`planning/01`](../../planning/01-multiple-errors-per-field.md)
protocol feature, available in both the v2 and v3 clients.

Unlike the other planning items, this is **not a wire-protocol mechanism**. There
is no header, no request/response negotiation, and no client code to ship. The
shape of `errors` is decided entirely by what the server serializes. In this
adapter, errors are not a free-form shared prop either: the base middleware owns
a helper, [`BaseInertiaMiddleware#getValidationErrors()`](../../src/inertia_middleware.ts),
that apps call inside `share()` to read AdonisJS's flashed `inputErrorsBag` and
format it for Inertia. That session bag **already stores every message per field
as a `string[]`** — the helper deliberately collapsed each field to its first
message (`messages[0]`).

So the entire feature reduces to one question: how does an app opt the built-in
helper into emitting the full array instead of the first message?

## Decision Drivers

- The default wire format must not change — existing apps keep first-message
  strings.
- The opt-in must produce the **uniform** shape the protocol requires (every
  field an array in array mode, single-message fields as one-element arrays),
  not a per-field mix.
- Keep the surface small: we do not own the client type, and there is no protocol
  handshake to implement.
- The mode is a per-response decision, so the control must sit where the response
  is assembled.

## Considered Options

- **Documentation only.** Close the slot without code: document that an app
  wanting array errors overrides `getValidationErrors()` (or shares its own
  `errors` key) in its middleware. Zero adapter surface.
- **Options argument on the helper.** Add `getValidationErrors(ctx, { allMessages: true })`,
  returning `string[]` per field. The app passes it from `share()` per response.
- **Constructor / class-property toggle.** A `protected allMessages = true` field
  (or constructor flag) on the middleware subclass, making the mode an instance
  default rather than a per-call choice.

## Decision Outcome

Chosen option: **options argument on the helper** —
`getValidationErrors(ctx, { allMessages: true })`.

The helper now takes an optional `{ allMessages?: boolean }`. In the default mode
each field collapses to its first message (`string`), unchanged. In all-messages
mode every field is emitted as a `string[]`, including single-message fields
(`'name is required'` → `['name is required']`), and the same shape applies under
the error-bag key when `X-Inertia-Error-Bag` is present. The return type is
expressed with overloads so the mode picks the precise value type (`string` vs
`string[]`) at the call site rather than a lossy `string | string[]` union.

The matching client side is a single declaration the app adds when it runs in
all-messages mode, typing `errors.<field>` as `string[]` everywhere:

```ts
declare module '@inertiajs/core' {
  interface InertiaConfig { errorValueType: string[] }
}
```

### Rationale

The **documentation-only** option was genuinely on the table — the feature is
that thin, and the data is already available to userland. We rejected it because
the helper is already first-class adapter surface: it reads an AdonisJS-specific
session bag, handles the error-bag header, and is the seam every generated
middleware calls. Pushing apps to re-implement that (correctly handling the bag
header and the uniform-shape rule) to flip one boolean is worse than owning the
boolean. A one-line opt-in keeps the bag handling in one place and guarantees the
uniform shape the protocol requires.

We chose the **options argument** over a **constructor/class-property toggle**
because the mode is a property of the *response*, not of the middleware instance.
A class-level flag implies a global per-app default, which both overstates the
feature (it is opt-in, niche) and makes per-route variation awkward. Passing the
option from `share()` keeps the decision next to where the response props are
assembled, mirrors how the helper is already invoked, and adds no instance state.

The client type is **not** something we ship. `@inertiajs/core` resolves
`errors`' value type through its own `errorValueType` config knob (default
`string`); the value type is deliberately a standalone scalar, not derived from
`sharedPageProps`, so it cannot collide with the built-in `errors: Errors &
ErrorBag` member on `Page['props']`. Our obligation is limited to documenting the
one-line declaration, which lives in the AdonisJS docs site.

### Consequences

- **Good:** opt-in is one argument; default wire format and existing behaviour are
  untouched.
- **Good:** the uniform-shape guarantee and error-bag handling stay owned by the
  adapter, in one place.
- **Good:** overloaded return type gives callers the exact value type per mode,
  which is the shape `errorValueType` expects on the client.
- **Neutral:** the client type story (`errorValueType`) is upstream's; we only
  document it. No adapter type is exported for it.
- **Neutral:** the all-messages mode is a per-call choice; an app wanting it
  everywhere passes the option from `share()` on every response (a one-liner),
  rather than setting a global default.
- **Neutral:** user-facing documentation lives in the separate AdonisJS docs site.

## More Information

- Source: `src/inertia_middleware.ts` (`getValidationErrors` overloads +
  `allMessages` mode)
- Tests: `tests/middleware.spec.ts` (all-messages mode emits one-element arrays
  for single-message fields and full arrays for multi-message fields; bag scoping
  in all-messages mode; default mode unchanged)
- Related: [ADR 0002](0002-shared-props-via-middleware-base-class.md) (`share()`
  middleware base class, where the helper is called)
- Related spec: [`planning/01-multiple-errors-per-field.md`](../../planning/01-multiple-errors-per-field.md)
