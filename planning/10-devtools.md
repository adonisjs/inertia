# DevTools (Server-Side Recorder)

> **Inertia version:** the DevTools Chrome extension ships against
> `@inertiajs/core` **^3.6** (client half) and `inertiajs/inertia-laravel` **^3.2**
> (server half). This adapter installs `3.6.1`, so the client half is already
> satisfied. The server half — a request recorder plus two HTTP endpoints — is
> **adapter-specific and does not exist in `@adonisjs/inertia` today**. That is
> the work this spec describes.
>
> **Sources.** The contract is **specified and backend-agnostic**:
> <https://inertiajs.com/docs/v3/advanced/devtools-protocol> — "Any server-side
> Inertia adapter may integrate with it by implementing this protocol. The
> reference implementation is the Laravel adapter, and nothing in this
> specification is Laravel-specific." **The spec is the authority; read it before
> implementing.** Cross-checked against `inertiajs/inertia-laravel@3.x` `src/DevTools/*`
> (`DevTools`, `DevToolsHeader`, `DevToolsServiceProvider`, `RequestRecorder`,
> `IncomingEntryBuilder`, `Collector`, `PropClassifier`, `EntryStore`,
> `EntriesRepository`, `RedactsSensitiveData`, `Data/{IncomingEntry,PropType,RequestType}`,
> `Http/{EntriesController,Authorize}`) and `config/inertia.php`; extension side
> from `inertiajs/inertia-devtools@master` `src/{constants,guards,background/*}.ts`.
> Not read: `SourceLocator`, `RequestAttribute`, `Http/PreventPreviousUrlTracking`,
> and the recorder call sites in `Middleware.php` / `Response.php` /
> `ResponseFactory.php`. Verified 2026-07-29.

## Overview

Inertia DevTools is a Chrome DevTools panel that shows, per request: the props
(with their Inertia wrapper classification), request and response headers and
bodies, the route and controller that handled it, and the source location of the
`render()` / `share()` call.

It is **not** a passive listener. Its data flow has two halves:

1. **Client half** — `createInertiaApp({ dev: true })` calls `exposeInterceptors()`
   in `@inertiajs/core`, publishing `window.__inertia_interceptors__`. The
   extension registers visit request/response interceptors there to stamp
   correlation headers and snapshot client-side page state. Framework-agnostic;
   nothing for us to build.
2. **Server half** — the extension reads a discovery tag out of the initial HTML,
   then **fetches recorded entries back out of the app over HTTP**:

   ```ts
   // inertia-devtools/src/background/ingest.ts
   fetch(`${origin}/_inertia/devtools/entries/${encodeURIComponent(id)}`, {
     credentials: 'include',
     cache: 'no-store',
   })
   ```

   Entries outlive the request that produced them, so the server must record and
   **persist** them, then serve them from an endpoint.

Without the server half the panel is effectively empty: the extension can only
synthesize `cache-hit` and `client-visit` entries
(`src/background/synthesize.ts`), and even those piggyback on a real recorded
prefetch entry. Nothing breaks — the app itself is unaffected.

**Scope note:** Laravel's recorder observes **every response**, not just Inertia
pages — a non-Inertia response is recorded with `requestType: "http"`. See
[Phasing](#phasing); Phase 1 covers Inertia responses only.

## Contract

### Discovery tag

On the **initial (non-Inertia, 200, `text/html`) response of an Inertia page**,
inject immediately before the last `</body>`:

```html
<script data-inertia-devtools-id type="application/json">"01JX…ULID"</script>
```

The extension matches
`script[data-inertia-devtools-id][type="application/json"]`
(`inertia-devtools/src/constants.ts`) and uses it to learn (a) DevTools is
enabled server-side and (b) which entry to fetch first. Deliberately **not**
injected on plain (non-Inertia) HTML pages — the extension reads the tag as
"devtools is on here" and would then warn about a client interceptor registry
that was never going to appear.

### Response headers (we set)

| Header                          | Value                                                          |
| ------------------------------- | -------------------------------------------------------------- |
| `X-Inertia-Devtools-Id`         | ULID of the entry recorded for this response                    |
| `X-Inertia-Devtools-Parent-Out` | Batch root id the client should echo back on same-batch visits |

`Parent-Out` is the entry's own id for a prefetch or a fresh visit, and the
incoming batch id otherwise — this groups deferred/partial follow-ups (including
those crossing a redirect) under their originating visit.

### Request headers (we read)

| Header                        | Meaning                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `X-Inertia-Devtools-Tab`      | Extension-assigned per-tab UUID                                |
| `X-Inertia-Devtools-Visit`    | Client visit id, correlates entry ↔ client page-state snapshot |
| `X-Inertia-Devtools-Parent`   | Batch root id echoed from a previous `Parent-Out`              |
| `X-Inertia-Devtools-Deferred` | Set when the visit is a deferred-prop follow-up                |
| `X-Inertia-Devtools-Poll`     | Set when the visit is a poll tick                              |

The last two exist because a deferred fetch and a poll tick are indistinguishable
from a manual partial reload on the wire — the extension forwards the client's
intent for the recorder to read. **They also change prop classification**, not
just the request label; see below.

### Endpoints

```
GET /_inertia/devtools/entries       ?component= &type= &exclude= &offset= &limit=
GET /_inertia/devtools/entries/:id
```

`type` / `exclude` are comma-separated `requestType` lists. Unknown id → 404.

**Only the detail endpoint is required.** Per the spec, the list endpoint "is
the only endpoint the extension currently calls" is said of the *detail* one;
the list endpoint "the extension does not call it yet, so it is optional… A
minimal adapter may ignore [the filters] and return the full buffer." Defer it.

**The entry id need not be a ULID** — the spec says "any collision-resistant
string". Laravel's ULID validation is its own choice; the extension only
requires a bounded non-empty id.

**When we do build the list endpoint, it returns index rows, not full entries** — Laravel serves
`EntriesRepository::all()`, which reads a `_meta.json` index of `__meta` blocks
so the list never opens every entry file. Filters apply to `component` and
`requestType`, both `__meta` fields. Only the detail endpoint returns the whole
entry.

### `requestType`

`Inertia\DevTools\Data\RequestType`, resolved in
`IncomingEntryBuilder::resolveRequestType()` in this precedence order:

| Value           | Condition                                                              |
| --------------- | ---------------------------------------------------------------------- |
| `precognition`  | `Precognition` header present — **N/A for us** ([ADR 0024](../docs/adr/0024-no-precognition-support.md)) |
| `initial`       | no `X-Inertia` header **and** an Inertia page was rendered             |
| `http`          | no `X-Inertia` header and no Inertia page rendered                     |
| `deferred`      | `X-Inertia-Devtools-Deferred` present                                  |
| `poll`          | `X-Inertia-Devtools-Poll` present                                      |
| `partial`       | `X-Inertia-Partial-Component` present                                  |
| `prefetch`      | request is a prefetch (`Purpose: prefetch`)                            |
| `navigate`      | fallback                                                               |

`cache-hit` and `client-visit` appear in the panel but are **synthesized
client-side** by the extension — never emitted by a server adapter.

### Entry payload

The extension's validator (`src/guards.ts`) is loose:

```ts
export function isEntry(value: unknown): value is Entry {
  return isObject(value) && isObject(value.__meta) && isObject(value.props) && isObject(value.route)
}
```

Only `__meta`, `props`, and `route` must be objects. **This is what makes an
incremental rollout viable** — the panel renders whatever fields are present.
Full shape, from `Data\IncomingEntry::toArray()`:

```jsonc
{
  "__meta": {
    "id": "01JX…",              // ULID
    "tabUuid": "…|null",
    "batchId": "01JX…|null",
    "visitId": "…|null",
    "timestamp": "2026-07-29T10:11:12.345Z",
    "utime": 1785312672.345,     // float seconds
    "method": "GET",
    "url": "https://app.test/users/42",   // full URL
    "component": "Users/Show|null",
    "requestType": "navigate",
    "status": 200,
    "redirectLocation": null,    // X-Inertia-Location, else Location on a 3xx
    "serverTimingMs": 12.4
  },
  "http": {
    "requestHeaders": {},        // flattened to strings, redacted
    "responseHeaders": {},
    "requestBody":  { "status": "present", "value": {} },
    "responseBody": { "status": "present", "value": {} }
  },
  "props": {},                   // per-prop-path METADATA (see below)
  "propValues": {},              // values plucked per recorded prop path
  "route": { "name": null, "uri": "", "action": null, "actionSource": { "file": "", "line": 0 } },
  "renderSource": { "file": "", "line": 0 },
  "componentPath": "resources/js/Pages/Users/Show.tsx"
}
```

**Bodies are a tagged union**, not a bare value:

```jsonc
{ "status": "present", "value": … }
{ "status": "empty" }
{ "status": "omitted", "reason": "non-inertia-request" | "non-textual" | "streamed" | "too-large" | "binary" | "unserializable" }
```

Raw (non-Inertia) response bodies are captured only for textual content types
(`json`, `text/`, `xml`, `javascript`) under a 256 KB cap. Uploaded files are
replaced by `{ name, size, mimeType }` summaries. Unserializable leaves become
`"[UNSERIALIZABLE]"` rather than failing the whole entry.

**`props` metadata**, keyed by prop path (`Collector::addProp`). `shared` and
`inertiaType` are always present; everything else is omitted when falsy:

```jsonc
"auth": {
  "shared": true,
  "inertiaType": "always",              // always|defer|optional|merge|scroll|once|null
  "deferGroup": "…",
  "shareSource":  { "file": "…", "line": 12 },
  "renderSource": { "file": "…", "line": 34 },
  "reset": true, "once": true, "deepMerge": true, "rescued": true,
  "mergeDirection": "append" | "prepend"
}
```

Laravel prunes this map: every top-level path is kept, nested paths only when
they carry metadata of their own.

## Classification rules that are not obvious

`PropClassifier` encodes three behaviors that a naive implementation gets wrong:

1. **A deferred prop is only `defer` on a deferred delivery.** A `DeferProp`
   resolved on a *manual* partial reload drops both its `defer` type and its
   `deferGroup` and reads as a plain prop. The discriminator is the
   `X-Inertia-Devtools-Deferred` request header — so an extension-supplied header
   feeds prop classification, not just the request label.
2. **`deepMerge` is true for keyed merges too** — `shouldDeepMerge() || matchesOn() !== []`.
   Our `MERGE_MATCH_ON` props must report `deepMerge: true`.
3. **`mergeDirection` is read from the prop wrapper, never from the page-object
   arrays** — precisely because a deep merge lands in `deepMergeProps` with no
   direction recorded. This kills the shortcut of classifying from the arrays
   `#buildPageProps` already returns; classification must go through the
   wrappers/symbols.

## Implementation plan

### 1. Headers — `src/headers.ts`

Add a `InertiaDevtoolsHeaders` const alongside `InertiaHeaders`. Keep it
separate: these are extension-to-adapter headers, not Inertia protocol headers,
and `InertiaHeaders` is public API.

### 2. Config — `src/types.ts`, `src/define_config.ts`

```ts
devtools?: {
  enabled?: boolean          // default: app.inDev
  except?: string[]          // route patterns skipped — MUST default to ['_inertia/devtools*']
  storage?: { path?: string; ttl?: number /* h, 24 */; pruneInterval?: number /* s, 300 */; limit?: number /* per tab, 100 */ }
  redact?: { keys?: string[]; headers?: string[] }
  authorize?: (ctx: HttpContext) => boolean | Promise<boolean>
}
```

Port Laravel's `redact` defaults verbatim (`password`, `password_confirmation`,
`current_password`, `token`, `_token`, `access_token`, `refresh_token`, `secret`,
`client_secret`, `api_key`; headers `cookie`, `set-cookie`, `authorization`,
`proxy-authorization`, `x-xsrf-token`, `x-csrf-token`). `authorize` replaces
Laravel's `Gate` + `INERTIA_DEVTOOLS_GATE` pairing.

### 3. Recorder — `src/devtools/recorder.ts` (new)

Per-request collector, created in `BaseInertiaMiddleware.init()`, finalized in
`dispose()`. Three hook points in the existing render path:

- **`Inertia#page()`** (`src/inertia.ts:619`) — build the `props` metadata map.
  Classify from the **prop wrappers** via the symbol predicates in
  `src/props.ts` (`isDeferredProp`, `isMergeableProp`, `isOnceProp`,
  `isOptionalProp`, `isAlwaysProp`, `isScrollProp`), not from the page-object
  arrays — see rule 3 above. `sharedProps` (already returned) gives `shared`.
- **`Inertia#render()`** (`src/inertia.ts:723`) — component, `propValues`,
  response body. `requestInfo()` (`src/inertia.ts:467`) already distinguishes
  partial vs standard; layer `-Deferred` / `-Poll` / prefetch
  (`planning/02-prefetch-awareness.md`) on top per the precedence table.
- **`BaseInertiaMiddleware.dispose()`** (`src/inertia_middleware.ts:200`) —
  stamp both response headers, compute `serverTimingMs` from a start time
  captured in `init()`, capture status/redirect/headers, hand off to the store.
  **`dispose()` early-returns for non-Inertia requests
  (`src/inertia_middleware.ts:202`)** — the recorder must run before that
  return, since the initial HTML load is exactly the request needing the tag.

Wrap everything so recording can never turn the user's response into a 500 —
Laravel swallows `Throwable` for this reason. Route failures through `debug.ts`.

### 4. Discovery tag injection

`#renderClientSide` / `#renderWithSSR` (`src/inertia.ts:420-449`) return the
Edge-rendered HTML string. Inject there rather than in the middleware — we hold
the string and know it is an Inertia page render, which is exactly the
`isInitialHtmlResponse` condition Laravel reconstructs after the fact. Replace
the **last** `</body>`; no-op when absent.

### 5. Entry store — `src/devtools/entry_store.ts` (new)

Port the two-layer design; do not simplify it, each piece earns its place:

- One JSON file per entry under `app.tmpPath('inertia-devtools')`, written
  atomically (temp file + rename) so a reader never sees a half-written entry.
- **A `_meta.json` index** of `__meta` blocks, mutated under an exclusive file
  lock, so the list endpoint never opens every entry file. **Rebuild the index
  from the entry files when it is missing or corrupt** — the entry files are the
  source of truth, and a naive rewrite of a corrupt index silently drops every
  prior entry.
- A `_last_prune` marker so TTL pruning runs at most once per `pruneInterval`.
- Per-tab entry cap enforced on write (`storage.limit`).

**Retention is entirely write-triggered** — Laravel prunes in its `terminating`
callback, so cleanup only happens while new entries are still being recorded.
Three consequences we should not inherit unexamined:

1. **Disabling devtools freezes the store forever.** Laravel's terminating
   callback opens with `if (! DevTools::enabled()) return;`, so turning the
   feature off leaves everything already written on disk permanently. We should
   prune on boot when the directory exists, even when disabled — or ship a
   `inertia:devtools:clear` ace command. Laravel has neither.
2. **Initial page loads escape the per-tab cap.** `EntryStore::flush()` only
   calls `enforceTabLimit()` when `tabUuid !== null`, and `tabUuid` is null on
   every full page load (a document navigation never runs the client interceptor
   that stamps the header). In development that is the *most* common request —
   every refresh writes an uncapped entry bounded only by the 24h TTL. Apply a
   global cap alongside the per-tab one.
3. **The panel's Clear button cannot delete server-side entries** — the read API
   is two GETs, no DELETE. Users will expect Clear to free disk and it will not.
   Worth a docs line, and an argument for (1).
- Directory created `0700` containing a `.gitignore` of `*`.
- **A circuit breaker**: on a write failure, log once and suppress recording for
  30s. Without it a broken disk turns every request into a failed write plus a
  log line.

The store holds exactly **one** pending entry per request, flushed after the
response is sent. A file store (not in-memory) is required regardless: the
extension fetches entries on a *separate* HTTP request that may not hit the same
process.

### 6. Routes — `providers/inertia_provider.ts`

Register both routes in `boot()` when devtools is enabled, resolving `router`
from the container next to the existing `BriskRoute.macro` registration
(`providers/inertia_provider.ts:144`). Apply `authorize` as route middleware.
**Mirror Laravel's local bypass**: in development, allow unconditionally without
consulting `authorize`, so a broken callback cannot lock a developer out of
their own devtools. Outside development, deny with a 403 JSON body unless
`authorize` is configured and returns true. Do **not** attach the app's global
middleware stack (Laravel needs the `web` group to resolve a session user; our
`authorize` receives `ctx` and can do that itself).

### 7. Redaction — `src/devtools/redact.ts` (new)

Three passes, applied on the way **into** the store, matching
`RedactsSensitiveData`:

1. Recursive key redaction over the whole payload → `[REDACTED]`.
2. **Query-parameter redaction on `url` and `redirectLocation`** — a token in a
   query string is otherwise persisted verbatim. Unparseable URLs pass through
   unchanged; redaction must never break the recorder.
3. Header-bag redaction over `requestHeaders` / `responseHeaders`, then a final
   sweep replacing unserializable leaves with `[UNSERIALIZABLE]`.

## Deliberate divergences

- **Nested prop paths.** Laravel records metadata for nested paths (`auth.user`).
  Our prop resolution is top-level only and permanently so
  ([ADR 0023](../docs/adr/0023-top-level-only-prop-resolution-permanent.md)), so
  our `props` map is top-level only. `propValues` still carries the nested values,
  so the panel's value tree is unaffected — only the per-leaf type pills are.
- **`precognition`** request type will never be emitted
  ([ADR 0024](../docs/adr/0024-no-precognition-support.md)).
- **`http` entries** (non-Inertia responses). Laravel records every response;
  our recorder lives in the Inertia middleware and sees only what that middleware
  wraps. Deferring — see Phasing.

## Deferred work

- **`renderSource` for handler-based renders** — file:line of the
  `inertia.render()` call site. Needs `Error.stack` parsing plus source-map
  resolution to land on `.ts` rather than build output. High cost, and `null`
  satisfies the guard.
- **`renderSource` for route-defined renders is cheap, though** — Laravel's
  `Route::inertia()` macro stores its definition site in the route defaults at
  *registration* time, and `IncomingEntryBuilder::renderSourceFromRoute()` reads
  it back. Our `renderInertia` BriskRoute macro
  (`providers/inertia_provider.ts:146`) can do the same: one stack capture per
  route at boot, not per request. Worth doing early despite the bullet above.
- **`route.actionSource`** — same stack-parsing problem as `renderSource`.
  `route.name` / `uri` / `action` come free from `ctx.route`.
- **`componentPath`** — mirrors the resolution in `src/index_pages.ts`; cheap,
  not required for a first cut.
- **SSR.** The SSR render runs in a separate process (`src/server_renderer.ts`);
  nothing to record there beyond what the HTTP-side recorder already sees.

## Risks

- **No wire-level version negotiation** — but the format is specified, so this
  is minor. `Collector::build()` emits `schemaVersion: 1`, but
  `IncomingEntryBuilder::mergeCollectorPayload()` does not copy it into the entry
  and `IncomingEntry::toArray()` has no such field, so it never reaches the
  extension. Mitigating this: the spec commits to forward compatibility in both
  directions — "the extension ignores unknown fields rather than rejecting the
  entry", and an unknown `omitted` reason "falls back to a generic message, so
  new reasons are safe". The residual risk is a *renamed or retyped* required
  field, which fails silently as an empty panel rather than an error.
- **`credentials: 'include'`** on the extension's fetch means these endpoints are
  reachable by any page in the browser. The dev-only default and `authorize` are
  the whole defense; treat "enabled outside development without `authorize`" as
  a configuration error we refuse at boot, not a warning.
- **Props are persisted twice, and the Inertia path is uncapped.** Every entry
  stores the resolved props under `propValues` *and* the whole page object
  (props included) under `http.responseBody`. Laravel's `RAW_BODY_LIMIT`
  (256 KB) applies only to `captureRawResponseBody()` — the non-Inertia path.
  `captureInertiaResponseBody()` has no size check beyond JSON-encodability, so
  a fat page payload lands on disk twice per request, up to `storage.limit`
  entries per tab. Consider capping the Inertia body too (emitting
  `{status: 'omitted', reason: 'too-large'}`, which the panel already renders)
  and, if we do, diverging from Laravel deliberately rather than by accident.
- **Entries contain real application data in plaintext on disk** — user records,
  whatever the props hold. This is what the dev-only default, redact list, TTL
  pruning, per-tab cap, `0700` directory and `.gitignore` of `*` collectively
  exist for. Treat any change that weakens one of them as a security change.
- **The recorder must exclude its own endpoints** — hence the mandatory
  `_inertia/devtools*` entry in `except`. Omitting it means every panel fetch
  records an entry, which the panel then displays, which triggers more fetches.

## Phasing

1. **Phase 1 — visible panel.** Headers, config, discovery tag, recorder with
   `__meta` + `route` + `propValues`, entry store (breaker, pruning, caps),
   the **detail endpoint only**, redaction. Inertia responses only. Panel lights
   up. Emit the spec's *required* fields — using the documented empty/null forms
   where a value is genuinely absent, never by omitting the key — and skip the
   optional tier (`actionSource`, `shareSource`, per-prop `renderSource`).
   The `_meta.json` index and the list endpoint can both wait for Phase 4.
2. **Phase 2 — prop metadata.** The `props` classification map off the wrapper
   symbols, including the three non-obvious rules above, plus `http` bodies with
   the tagged-union shape.
3. **Phase 3 — batching.** `Parent` / `Parent-Out` lineage, `-Deferred` /
   `-Poll` request typing, prefetch correlation. This is what makes the timeline
   group correctly instead of showing a flat list.
4. **Phase 4 — source locations and reach.** Route-macro `renderSource` (cheap,
   could be pulled forward), then `componentPath`, `actionSource`, handler-based
   `renderSource`, and `http`-type entries for non-Inertia responses.

## Testing

- **Unit** — prop classification against the existing wrapper fixtures
  (`tests/merges.spec.ts`, `tests/once_props.spec.ts`,
  `tests/rescued_deferred_props.spec.ts`, `tests/scroll.spec.ts` cover every
  wrapper). Explicitly assert the three non-obvious rules: deferred-only-on-
  deferred-delivery, `matchOn ⇒ deepMerge`, and direction-from-wrapper on a deep
  merge. Redaction including URL query params. Store: write/read/prune, per-tab
  cap, **index rebuild from a deleted and from a corrupt `_meta.json`**, and
  breaker engagement on write failure.
- **Contract** — `tests/devtools.spec.ts` asserting the emitted entry against the
  extension's `isEntry` guard transcribed as a local assertion, plus the body
  tagged-union shape. This is the test that catches shape drift.
- **Integration** — drive the middleware end to end via the existing Japa client
  (`tests/middleware.spec.ts` patterns): discovery tag present on initial HTML,
  absent on Inertia XHR and on non-Inertia HTML; both response headers; `GET
  /_inertia/devtools/entries/:id` returns the entry and the list endpoint returns
  meta rows; the devtools endpoints do not record themselves. Assert the recorder
  is fully inert when disabled — no headers, no tag, no routes, no writes.
- **Manual** — install the extension, run an example app from `~/code/examples`
  with `dev: import.meta.env.DEV`, confirm the timeline populates and groups.

## Docs

Separate from this package's code: the `dev: import.meta.env.DEV` flag on
`createInertiaApp()` is a user-facing step that is easy to miss and is required
even for the client-only half. It belongs in the docs regardless of whether the
server recorder ships.
