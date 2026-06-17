# 0019 — Keyed and directional merges

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** AdonisJS core team

## Context and Problem Statement

The adapter already supports mergeable props: `merge(v)` appends an incoming
array to the cached one (`mergeProps`), and `deepMerge(v)` recursively merges
(`deepMergeProps`). The Inertia protocol allows two more dimensions on top of
this, both client-side behaviours driven by page-object fields the server emits:

- **Directional merges** — `prependProps` prepends incoming array items instead
  of appending them.
- **Keyed merges** — `matchPropsOn` lists `"<propPath>.<keyField>"` entries; the
  client dedupes/replaces array items by the key field rather than concatenating.

There is also the `X-Inertia-Reset` **request** header, which the adapter parsed
into `requestInfo.resetProps` but never consumed. This is the
[`planning/05`](../../planning/05-keyed-and-directional-merges.md) protocol
feature.

The question: what public API expresses prepend and match-key, and what is the
server's exact obligation for each of the four wire fields and the reset header —
without coupling the adapter to client-side merge mechanics it does not perform?

## Decision Drivers

- Full protocol coverage: `mergeProps`, `prependProps`, `deepMergeProps`,
  `matchPropsOn`, and honouring `X-Inertia-Reset`.
- Consistency with the existing wrapper API (chaining) and the top-level-only
  resolution rule from [ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md).
- The wire shape must match what the real client parses, not our assumptions —
  the [ADR 0013](0013-protocol-coverage-planning-method.md) drift lesson.

## Considered Options

- **Chained modifiers on the existing wrappers** — `merge(v).prepend()`,
  `merge(v).matchOn('id')`, mirroring the already-present `.once()` / `.merge()`
  chaining.
- **New top-level helpers** — e.g. `inertia.prepend(v)` as a sibling of `merge`.
  Doubles the surface and splits "shallow array merge" across two entry points.

## Decision Outcome

Chosen option: **chained modifiers on the existing `merge`/`deepMerge`
wrappers** — `prepend()`, `append()`, and `matchOn(key)`, each mutating the
wrapper's config and returning it for further chaining.

### Rationale

Chaining is this codebase's composition idiom (`defer(fn).merge()`,
`merge(v).once()`). `prepend`/`append`/`matchOn` follow it, so direction and key
are modifiers on a mergeable rather than new prop kinds. Because
`DeferProp.merge()`/`.deepMerge()` already return a `MergeableProp`, they inherit
the new methods for free — `defer(fn).merge().matchOn('id')` composes with no
extra code.

**Config lives under symbols, not plain fields.** `prepend`/`matchOn` are both
method *and* concept names, so storing the resolved values as `prepend: boolean`
/ `matchOn: string` would collide with the methods on the same object. The
existing `[DEEP_MERGE]` symbol set the precedent for symbol-keyed merge config,
so direction and key are stored as `[MERGE_PREPEND]` and `[MERGE_MATCH_ON]`. The
wrapper object is never serialized (only its `.value` is unpacked), so this
config never reaches the wire.

**The server only labels; the client merges.** For each mergeable prop the
builder emits the value at its path and records *one* direction label
(`deepMergeProps` if deep, else `prependProps` if prepended, else `mergeProps`)
plus, when a key is configured, a `matchPropsOn` entry. The actual append /
prepend / dedupe / deep-merge all happen client-side against cached state.

**Keyed matching is a string the client parses — so it needs no tree walk.**
Verified against `@inertiajs/core@3.4.0` (`mergeOrMatchItems`, dist `~L2757`):
the client finds the matching entry by `key.split('.').slice(0,-1).join('.')`
(prop path) and dedupes by `key.split('.').pop()` (key field) — splitting on the
**last** dot. The adapter therefore only emits `` `${propPath}.${matchOn}` `` and
lets the client do the matching. This keeps keyed merges fully consistent with
the **top-level-only** scope of [ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md):
`propPath` is always a top-level key, and a dotted `matchOn` (e.g. `'list.id'`
for an array nested inside a `deepMerge`) is concatenated verbatim — the client's
last-dot split still resolves it correctly, with no per-render tree walk on the
server.

**Reset drops the label.** `X-Inertia-Reset` (built from the client's `reset:`
visit option) lists props whose cached arrays the client discards before merging.
The server's obligation is to *not* mark a reset prop as mergeable, so the client
replaces it (`{ ...cached, ...incoming }`) rather than merging into a stale
array. A prop named in the reset set is emitted **unlabeled** — its value is
still sent, it simply appears in none of the four merge arrays. This finally
consumes the previously-dead `resetProps`. The client already includes reset
props in its `only` list, so no extra cherry-pick folding is needed server-side.

### Resolved sub-decisions

| # | Decision | Outcome |
|---|----------|---------|
| A | API shape | Chained `.prepend()` / `.append()` / `.matchOn(key)` on `merge`/`deepMerge` (and on `defer().merge()`); no new top-level helpers |
| B | Config storage | Symbol-keyed (`[MERGE_PREPEND]`, `[MERGE_MATCH_ON]`), matching the `[DEEP_MERGE]` precedent and avoiding method/field name collisions |
| C | Direction on deep merges | Ignored — the client deep-merge path has no direction. `deepMerge().prepend()` lands in `deepMergeProps`, never `prependProps` |
| D | `matchOn` value | The match path **relative to the prop**, emitted as `"<propPath>.<matchOn>"`. Usually the bare item key (`'id'`); a dotted value addresses an array nested in a `deepMerge` |
| E | Reset semantics | A reset prop is emitted unlabeled (value sent, no merge label), so the client replaces rather than merges; mirrors `inertia-laravel` |
| F | Empty `prependProps` / `matchPropsOn` | Always emitted (as `[]`), consistent with how the adapter already emits `mergeProps`/`deepMergeProps` unconditionally |

### Consequences

- **Good:** full directional + keyed merge coverage that composes with `defer`
  and `once`, reusing the existing mergeable classification branch.
- **Good:** the server stays a thin labeller — no client merge mechanics are
  duplicated, so the two cannot drift.
- **Good:** `X-Inertia-Reset` is now honoured instead of being parsed and dropped.
- **Neutral:** every response now carries two more (usually empty) arrays. This
  follows the adapter's always-emit convention for the merge family; it diverges
  from `inertia-laravel`, which omits empty metadata.
- **Neutral:** `prepend()` on a deep merge is silently inert by design; documented
  rather than rejected, since the client ignores direction for deep merges.

## More Information

- Source: `src/props.ts` (`merge`, `deepMerge`, `createMergeableProp`, the
  mergeable branch in both builders), `src/inertia.ts` (`resetProps`,
  page-object emission), `src/types.ts` (`MergeableProp`,
  `PageObject.prependProps`/`matchPropsOn`), `src/symbols.ts`
  (`MERGE_PREPEND`, `MERGE_MATCH_ON`), `src/headers.ts` (`Reset`)
- Tests: `tests/merges.spec.ts`, plus updated snapshots in
  `tests/inertia_page.spec.ts` / `tests/inertia.spec.ts`
- Verification baseline: `@inertiajs/core@3.4.0` (`mergeProps`,
  `mergeOrMatchItems`, `appendWithMatching`, `prependWithMatching`, dist
  `~L2628–2802`)
- Related spec: [`planning/05-keyed-and-directional-merges.md`](../../planning/05-keyed-and-directional-merges.md)
- Unblocked by: [ADR 0014](0014-upgrade-bundled-client-to-inertia-v3.md)
