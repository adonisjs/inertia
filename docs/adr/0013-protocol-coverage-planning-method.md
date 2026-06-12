# 0013 — Tech-agnostic protocol-coverage planning method

- **Status:** Accepted
- **Date:** 2026-06-12 (documented retroactively)
- **Deciders:** AdonisJS core team

## Context and Problem Statement

Reaching 100% Inertia protocol coverage means implementing a series of features
(multiple errors per field, prefetch awareness, once props, keyed/directional
merges, infinite scroll, and more). We need a way to plan that work that keeps
the adapter provably aligned with the protocol rather than accidentally coupled
to AdonisJS conventions — and a way to relate that planning to these ADRs.

## Decision Drivers

- The adapter must be **protocol-complete and protocol-correct**, not
  "works for our app".
- Separate the protocol "what" from the adapter "how" so neither muddies the
  other.
- Have a durable, reviewable record before implementation begins.

## Considered Options

- **Plan inside implementation PRs** — design and code together, AdonisJS-shaped
  from the start.
- **Tech-agnostic protocol specs first** — write the wire format, server
  behaviour, and client expectation for each feature with no adapter API names,
  then implement against the spec and capture adapter decisions in ADRs.

## Decision Outcome

Chosen option: **Tech-agnostic protocol specs in `planning/`, then ADRs for the
adapter-specific decisions.**

### Rationale

The driver was **protocol-first correctness**. Each `planning/NN-*.md` document
pins down one feature purely in protocol terms — wire format, server behaviour,
client expectation — deliberately using no AdonisJS API names. This forces us to
understand the protocol obligation independently of how we'll implement it, so
the implementation can be checked against an external standard rather than
against our own assumptions.

These specs are the source of truth for **what** must be true on the wire; ADRs
record **how** the AdonisJS adapter satisfies it and the trade-offs taken. The
two stay separate on purpose: revisiting an implementation decision later does not
require re-litigating protocol facts, and the specs remain reusable reference for
any future adapter work. This ADR establishes that division; the forward-looking
ADRs (one per `planning/` feature) are authored as each feature is implemented
and link back to their spec.

### Consequences

- **Good:** implementations are verifiable against a protocol spec, not folklore;
  protocol facts and design decisions don't contaminate each other.
- **Good:** specs are framework-neutral and reusable as reference.
- **Bad / cost:** two documents per feature (spec + eventual ADR) and the
  discipline to keep them distinct.
- **Neutral:** the `planning/README.md` defines the intended implementation order;
  the ADR index tracks the corresponding proposed ADR slots.

## More Information

- Source: `planning/README.md` and `planning/01..09-*.md`
- Related: [ADR index](README.md) "Proposed" section
