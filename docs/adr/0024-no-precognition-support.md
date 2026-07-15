# 0024 — No Precognition support

- **Status:** Accepted
- **Date:** 2026-07-15
- **Deciders:** AdonisJS core team

## Context and Problem Statement

The Inertia v3 protocol page documents a set of Precognition headers —
`Precognition`, `Precognition-Validate-Only` on requests; `Precognition`,
`Precognition-Success`, and `Vary: Precognition` on responses — used for
validation-only "dry-run" requests that stop before the handler's side effects.
Precognition is a **Laravel ecosystem feature** (`laravel/precognition`) that
surfaces in the Inertia docs because the first-party client integrates with it;
it is not part of the core Inertia navigation protocol (page objects, partial
reloads, versioning) and no core client behavior depends on it.

Should this adapter implement a Precognition-compatible mode?

## Decision Drivers

- Precognition's semantics — run a request's validation rules without executing
  the handler — depend on Laravel's form-request model. AdonisJS validation
  (VineJS) runs imperatively inside the handler; the framework has no "validate
  only, then halt" request lifecycle to hook into.
- A faithful implementation would be framework-level (bodyparser, validator,
  routing), not adapter-level; the Inertia adapter is the wrong owner.
- The core protocol is fully served without it; skipping Precognition costs no
  page-object or header compatibility.
- Live field-level validation is achievable in userland with a dedicated
  endpoint and the v3 client's `useHttp` — no protocol support required.

## Considered Options

- **Implement Precognition-compatible middleware** — emulate the headers and
  a validate-only lifecycle in AdonisJS.
- **Leave it open as a planned slot** — track it like the `planning/` features.
- **Declare it out of scope permanently** — record that it will not be built.

## Decision Outcome

Chosen option: **declare it out of scope permanently**. This adapter will never
implement Precognition. The headers are ignored; requests carrying them are
processed as ordinary Inertia (or plain HTTP) requests.

### Rationale

Precognition is Laravel-shaped: its value comes from reusing the exact
validation rules of the eventual mutating request, which Laravel derives from
form-request classes bound to routes. AdonisJS has no equivalent binding the
adapter could interrogate, so any implementation would be a new framework
feature wearing an Inertia costume — out of this package's charter. Tracking it
as "planned" would misrepresent the roadmap; recording a firm never-support
decision keeps the protocol-coverage story honest: coverage targets the core
Inertia protocol, and Precognition is not part of it.

### Consequences

- **Good:** no misleading roadmap entry; protocol-coverage claims stay scoped to
  the actual Inertia wire protocol.
- **Good:** zero adapter surface to maintain for a feature whose client
  (`laravel-precognition-*` packages) targets Laravel backends anyway.
- **Bad / cost:** apps porting from Laravel that relied on Precognition must
  rebuild live validation as an explicit endpoint (e.g. consumed via `useHttp`).
- **Neutral:** if AdonisJS core ever grows a validate-only request lifecycle,
  a new ADR may supersede this one; nothing in the adapter blocks that.

## More Information

- Related: Inertia v3 protocol page (Precognition headers),
  [`laravel/precognition`](https://github.com/laravel/precognition)
- Related: [ADR 0013](0013-protocol-coverage-planning-method.md)
  (protocol-coverage scope definition)
