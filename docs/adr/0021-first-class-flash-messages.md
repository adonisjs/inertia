# 0021 — First-class flash messages

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** AdonisJS core team

## Context and Problem Statement

Inertia (v2.3+ and v3) defines a **first-class flash bag**: a top-level
`page.flash` field that is a sibling of `props`, not a member of it. The client
treats it as ephemeral — stripped from history state before `replaceState` and
surfaced via the `onFlash` visit callback and the `inertia:flash` global event.
This is the [`planning/09`](../../planning/09-flash-messages.md) protocol feature.

The adapter does **not** use this field today. Flash is plumbed entirely through
the normal `props` channel by userland: the app's `share()` returns
`{ flash: ctx.session.flashMessages.all() }`, so flash lands inside
`page.props.flash` like any other prop. Validation `errors` are a separate
concern, built from session flash by `getValidationErrors()` and also shared as a
prop — and they **stay** there (Inertia models `errors` as a prop; only the
general-purpose flash bag moves).

The question: how do we adopt the top-level `flash` field **without losing the
end-to-end type safety** AdonisJS apps get today? Because flash currently rides in
`props`, its shape flows automatically into `SharedProps` via
`InferSharedProps<InertiaMiddleware>` (it is inferred from the `share()` return
type). Moving flash out of `props` removes it from that pipeline, and Inertia's
own client typing (`FlashData = InertiaConfigFor<'flashDataType'>`) is a separate,
hand-declared global — a second source of truth that can drift from the server.

## Decision Drivers

- Adopt the real protocol field (`page.flash`), not a `props` look-alike.
- Preserve single-source-of-truth typing: the client flash type must derive from
  what the server actually produces, with no drift.
- Consistency with the existing `share()` mechanism and the
  [ADR 0002](0002-shared-props-via-middleware-base-class.md) middleware base
  class — per-request dependency access, idiomatic AdonisJS.
- Additive and non-breaking for existing apps.

## Considered Options

- **Keep flash as a regular shared prop (status quo)** — keeps today's typing for
  free, but never adopts the protocol field; the client gets none of the ephemeral
  semantics (`onFlash`, history stripping).
- **A typed producer API on the instance** (`ctx.inertia.flash({ success: '…' })`
  writing to a reserved session bucket, plus a hand-declared `FlashMessages`
  interface) — gives producer-side checking but introduces a new write API and a
  second declaration the app maintains by hand; flash has no single inferable
  producer because it is set ad hoc across controllers.
- **A `flash()` method on the middleware, mirroring `share()`** — the middleware
  reads the session bucket in one place and returns it; that return is emitted as
  the top-level field and is the single inferable source for the client type.

## Decision Outcome

Chosen option: **a `flash()` hook on the middleware, mirroring `share()`**, whose
return value is emitted as the top-level `page.flash` field, with client typing
derived from that method via `InferFlashData`.

```ts
class InertiaMiddleware extends BaseInertiaMiddleware {
  flash(ctx: HttpContext) {
    return ctx.session.flashMessages.all()
  }
}

// One bridge wires the server's flash() return into the client flash type:
declare module '@inertiajs/core' {
  interface InertiaConfig {
    flashDataType: InferFlashData<InertiaMiddleware>
  }
}
```

### Rationale

The earlier objection to inferred flash typing — "flash has no single producer, it
is set across many controllers" — dissolves once flash is read in **one place**.
The middleware's `flash()` reads the session bucket centrally, so it *is* a single
inferable producer, exactly like `share()`. That makes the same inference machine
([ADR 0011](0011-typed-pages-via-module-augmentation.md) /
[ADR 0002](0002-shared-props-via-middleware-base-class.md)) apply: infer the shape
from the method's return type, and the app augments one interface point.

Unlike shared props, flash is **plain JSON** with no branded prop wrappers, so
`InferFlashData` uses the method's `Awaited` return type as-is rather than running
it through `ToComponentProps`. The result is bridged into Inertia's own
`flashDataType` config so `page.flash`, the `onFlash` callback, and
`router.flash()` are all typed from the server's `flash()` return — one source of
truth, no drift. No new producer/writer API is introduced.

### Wiring

`flash()` is wired the same way `share()` is. In `init()`:

```ts
if (this.flash) {
  ctx.inertia.flash(() => this.flash!(ctx))
}
```

`Inertia#flash(provider)` stores a single lazy provider (last-wins). In
`Inertia#page()`, after the page object is built, the provider is resolved and
assigned to `pageObject.flash` **only when registered** — so the default wire
format is unchanged (the field is omitted, not emitted as `{}`, when no middleware
`flash()` exists). The resolved value is emitted as a sibling of `props`; it is
never merged into them and is untouched by partial-reload cherry-picking.

`flash` is declared on `BaseInertiaMiddleware` as an **optional method**
(`flash?(ctx): FlashData | Promise<FlashData>`), so existing middlewares that do
not define it keep compiling.

### Lifecycle and errors

- **Single-consumption / survives one redirect** comes from AdonisJS session
  flash, not Inertia — exactly as the spec notes (it is framework session-flash
  behavior, not an Inertia-mandated rule). The middleware's `flash()` reads the
  bucket; the framework clears it after the redirect cycle.
- **Validation `errors` are unchanged.** They remain a prop built by
  `getValidationErrors()`. Only the general-purpose flash bag moves to
  `page.flash`, keeping errors and old-input out of the flash field.
- **409 asset-version reflash** already calls `session.reflash()` in `dispose()`,
  which reflashes the whole bucket, so the forced reload re-observes flash for
  free — no change needed.

### Consequences

- **Good:** adopts the real protocol field with full client semantics
  (`onFlash`, `inertia:flash`, history stripping) while preserving
  single-source-of-truth typing inferred from the server.
- **Good:** mirrors `share()` exactly — one idiom, discoverable, per-request
  dependency access, no new writer API.
- **Good:** additive and non-breaking. Existing apps sharing `flash` as a prop in
  `share()` keep working untouched; adopting the first-class field is opt-in
  (define `flash()`, add the one-line `flashDataType` bridge, read `page.flash` on
  the client).
- **Neutral:** the typed guarantee covers flash produced through the middleware's
  `flash()`; raw `session.flash()` written elsewhere is not surfaced in
  `page.flash` — by design, so the bag stays clean.
- **Neutral:** the `flashDataType` bridge is a manual one-liner in the app (not
  codegen), because the source is server-declared rather than extracted from page
  components.
- **Neutral:** user-facing documentation lives in the separate AdonisJS docs site.

## More Information

- Source: `src/inertia_middleware.ts` (`flash?` hook, `init()` wiring),
  `src/inertia.ts` (`#flashProvider`, `flash()` registration, `page()` emission),
  `src/types.ts` (`FlashData`, `InferFlashData`, `PageObject.flash`)
- Tests: `tests/inertia.spec.ts` (emission, async provider, omission),
  `tests/middleware.spec.ts` (`Middleware | Flash`),
  `tests/types/shared_props.spec.ts` (`Infer flash data`)
- Related: [ADR 0002](0002-shared-props-via-middleware-base-class.md) (middleware
  base class / `share()`), [ADR 0011](0011-typed-pages-via-module-augmentation.md)
  (module-augmentation typing)
- Related spec: [`planning/09-flash-messages.md`](../../planning/09-flash-messages.md)
