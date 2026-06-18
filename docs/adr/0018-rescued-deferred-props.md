# 0018 — Rescued deferred props

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** AdonisJS core team

## Context and Problem Statement

A deferred prop only resolves on the partial reload the client fires after the
initial page load. If its `compute()` throws (a database error, an upstream
timeout, a bug in user code), the rejection propagates out of the resolution
`Promise.all` and the whole partial-reload response errors — leaving the client
stuck in a perpetual loading state for that prop.

The Inertia v3 protocol defines a **rescued deferred prop**: an opt-in graceful
failure where the server catches the resolution error, **omits the prop from the
response**, and reports the failed prop path in a top-level `rescuedProps: string[]`
field. The client's `<Deferred>` component renders its `rescue` slot (instead of a
loading indicator) for any listed path. This is the
[`planning/04`](../../planning/04-rescued-deferred-props.md) protocol feature,
unblocked by the v3 client upgrade ([ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md)).

The questions: how does a deferred prop opt into rescue, how is the swallowed
error surfaced to the application without leaking into the response, and how far
does the feature reach across the existing wrapper family (`merge`, `once`)?

## Decision Drivers

- Protocol correctness: omit (not `null`) the failed prop, emit `rescuedProps`,
  report the error out of band.
- Consistency with the existing wrapper API and the top-level-only resolution
  rule from [ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md).
- Don't introduce a new "this prop may be missing" type surface — deferred props
  are already modelled as possibly-absent.

## Considered Options

- **Opt-in via a `.rescue()` chaining method** — matches `.merge()`/`.once()`,
  but adds a third chaining verb for a boolean flag.
- **Opt-in via an options object on `defer`** — `defer(fn, { rescue: true })`;
  groups and rescue live together, but changes the current `(fn, group)` shape.
- **Report via a fixed channel (`ctx.logger` only)** — simplest, but gives the
  application no hook to route rescued errors to its own monitoring.
- **Report via a registrable static listener with a logger fallback** — mirrors
  Laravel's `Inertia::handleExceptionsUsing()`.

## Decision Outcome

Chosen: **opt in through an options object on `defer`** —
`defer(fn, { rescue: true })` — and **report rescued errors through a static,
app-registrable listener** (`Inertia.onRescue(...)`) that **defaults to
`ctx.logger.error`** when unset.

### Rationale

**Verified deferred-only scope.** Rescue is a deferred-prop concept, confirmed
against three sources before implementing:

- Inertia docs document `rescue: true` only on `Inertia::defer(...)`.
- The client reads `rescuedProps` **exclusively** in `<Deferred>`
  (`@inertiajs/react@…/dist`: `rescuedKeys = new Set(page.rescuedProps)` →
  renders the `rescue` slot); nothing else consumes it.
- `inertia-laravel`'s `PropsResolver::resolveValue` gates rescue on a generic
  `Rescuable` interface, but **only `DeferProp` implements it**. On throw: rethrow
  if not rescuable, else `report($e)`, push the path to `rescuedProps`, and **omit**
  the prop from output.

So this adapter scopes rescue to `defer` and models it as a plain `rescue: boolean`
on `DeferProp` — not a separate `Rescuable` interface — since there is no second
rescuable wrapper to share it with. `optional` also resolves on a partial reload
but is **out of scope** (the spec is specific to deferred).

**API shape.** Laravel uses positional args (`defer($cb, $group, $rescue)`). For
the adapter the second argument becomes `string | DeferOptions`: a bare string
keeps the existing `defer(fn, 'group')` call working (non-breaking), while
`defer(fn, { group?, rescue? })` adds rescue without a per-flag chaining verb.
`.merge()`/`.deepMerge()`/`.once()` chaining is unchanged — the `rescue` flag
rides along on the `DeferProp` object, so composition needs no extra branches.

**Error reporting.** Rescue must report the error somewhere but never propagate it
into the response. A single static `Inertia.onRescue(listener)` (shared across the
per-request instances) lets an application route rescued errors to its own
exception handler / monitoring — the AdonisJS analogue of Laravel's
`Inertia::handleExceptionsUsing()`. When no listener is registered we fall back to
the per-request logger (`ctx.logger.error`), so failures are never silent.

### Where rescue runs

Deferred props are skipped on a standard visit and only `compute()` on a partial
reload, so the try/catch lives solely in
[`buildPartialRequestProps`](../../src/props.ts). A rescuable entry that throws is
omitted from `props`, its key is pushed to `rescuedProps`, and the error is
collected for the caller to report. `buildStandardVisitProps` always returns
`rescuedProps: []` for a uniform shape and to match the always-present v3
`Page.rescuedProps` field — consistent with this adapter's always-emit convention
for metadata ([ADR 0017](0017-once-props.md) §D).

### Client merge contract (verified against `@inertiajs/core@3.4.0`)

The server is a thin per-response echo — it holds no rescue state. The client's
`mergeRescuedProps` drops any currently-rescued path that the partial request
*asked for*, then unions in the incoming `rescuedProps`. Net effect: a successful
re-resolution clears the rescue; a repeated failure keeps it. So the server simply
emits the paths rescued on *this* response and lets the client reconcile.

### Type-safety impact

No new component-facing prop type is introduced. `IsOptionalPropValue<DeferProp<any>>`
already resolves to `true`, so a deferred prop is typed as **possibly-absent**
(`?:`) on the component. A rescued (omitted) prop is type-identical to a
not-yet-loaded deferred prop, a case the types already model. Adding a non-generic
`rescue: boolean` field to `DeferProp<T>` does not affect the conditional types
that match `Value extends DeferProp<infer A>` (they infer `A` from `compute`), so
`ToComponentProps`/`GetOptionalPropValue` are unchanged. The only new types are
input/config surface: `DeferOptions`, `RescueListener`, and `PageObject.rescuedProps`.

### Consequences

- **Good:** full rescued-deferred-props coverage; the prop is omitted (not `null`),
  `rescuedProps` is emitted on every response, and the error is reported out of band.
- **Good:** composes with `.merge()`/`.once()` for free — `rescue` is a flag on the
  wrapper, read at the resolution point.
- **Good:** no new "may be missing" type surface; deferred props were already optional.
- **Good:** `Inertia.onRescue` gives apps a single hook to forward rescued errors
  to their monitoring, with a safe logger default.
- **Bad / cost:** the rescue listener is static (process-global). Tests that
  register one must reset it; documented in the spec's teardown.
- **Neutral:** `optional` is deliberately not rescuable; revisit if the protocol
  extends rescue beyond `<Deferred>`.

## More Information

- Source: `src/props.ts` (`defer`, the `rescue` branch in `buildPartialRequestProps`,
  the empty `rescuedProps` in `buildStandardVisitProps`), `src/inertia.ts`
  (`Inertia.onRescue`, `#rescueListener`, rescue reporting in `page()`,
  `pageObject.rescuedProps`), `src/types.ts` (`DeferProp.rescue`, `DeferOptions`,
  `RescueListener`, `PageObject.rescuedProps`, `UnpackEntry.rescue`)
- Tests: `tests/rescued_deferred_props.spec.ts`, `tests/v3_client_contract.spec.ts`,
  `tests/types/to_page_props.spec.ts`
- Verification baselines: `@inertiajs/core@3.4.0` (`Page.rescuedProps`,
  `mergeRescuedProps`, `getInitialPageFromDOM`); `@inertiajs/react@3.x`
  (`<Deferred>` `rescue` slot); `inertia-laravel@3.1.0+`
  (`PropsResolver::resolveValue`, `Rescuable`, `DeferProp`, PR #864)
- Related spec: [`planning/04-rescued-deferred-props.md`](../../planning/04-rescued-deferred-props.md)
- Unblocked by: [ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md)
