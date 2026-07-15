# 0023 — Top-level-only prop resolution is permanent

- **Status:** Accepted
- **Date:** 2026-07-15
- **Deciders:** AdonisJS core team

## Context and Problem Statement

Inertia's v3 Laravel adapter resolves prop wrappers (`optional`, `defer`,
`merge`, `once`, …) at **any nesting depth** — inside closures, nested arrays,
and objects — and accepts **dot-notation paths** (`user.profile`) in partial
reload headers and merge metadata. This adapter resolves wrappers at the **top
level of the props object only**, a scope limit first recorded in
[ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md) and in the
[`planning/` README](../../planning/README.md).

ADR 0014 framed the limit as a scoping decision for the v3 upgrade. The open
question was whether nested resolution remains future work or is ruled out for
good.

## Decision Drivers

- Nested resolution requires a recursive walk over the entire props tree on
  **every render**, taxing the common case (top-level wrappers, the documented
  idiom) to serve a rare one.
- Dot-notation paths are ambiguous against user data whose keys legitimately
  contain dots; the protocol offers no escaping rule.
- Wrapper detection is symbol-tag based ([ADR 0001](0001-symbol-tagged-prop-wrappers.md));
  a deep walk would couple serialization ([ADR 0005](0005-serialize-props-via-transformers.md))
  to wrapper scanning and complicate the partial-reload cherry-pick logic.
- Every planned protocol feature (`planning/01`–`09`) is expressible with
  top-level props; nothing in the wire format requires nesting.
- Peer precedent: `@hono/inertia` ships the same top-level-only model.

## Considered Options

- **Implement nested resolution + dot-notation** — full Laravel-adapter parity.
- **Keep as deferred future work** — revisit if demand appears.
- **Rule it out permanently** — top-level-only is the contract, not a gap.

## Decision Outcome

Chosen option: **rule it out permanently**. Top-level-only prop resolution is a
deliberate, final design decision of this adapter, not a temporary limitation.
No future ADR should reopen it short of a protocol change that makes nesting
mandatory.

### Rationale

The per-render tree walk is a permanent tax on every response for a feature
with a trivial workaround: lift the wrapper to a top-level prop. Restructuring
props is cheaper, clearer, and type-safe under the module-augmentation typing
model ([ADR 0011](0011-typed-pages-via-module-augmentation.md)), which maps
**top-level** prop keys to component props anyway — nested wrappers would be
invisible to the generated types. Declaring the limit permanent lets the docs
state a firm contract instead of an apology, and lets internal code (partial
cherry-picking, merge metadata emission, once-prop gating) stay flat-map simple.

### Consequences

- **Good:** prop pipeline stays a single flat pass; no recursive scanning cost,
  no dot-escaping ambiguity.
- **Good:** documented contract — users coming from Laravel get a clear "lift it
  to the top level" rule rather than a partially-working nested mode.
- **Bad / cost:** a permanent parity gap with the Laravel adapter; dotted
  `X-Inertia-Partial-Data` paths sent by hand-written client code only match
  top-level keys.
- **Neutral:** wrappers nested inside plain objects pass through serialization
  untouched (they are never resolved); this is unsupported usage by definition.

## More Information

- Source: `src/props.ts` (flat resolution pipeline), `src/inertia.ts`
  (top-level cherry-pick)
- Related: [ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md) (where the
  limit was first scoped), [ADR 0001](0001-symbol-tagged-prop-wrappers.md),
  [ADR 0011](0011-typed-pages-via-module-augmentation.md)
- Related spec: [`planning/README.md`](../../planning/README.md) scope-limit note
