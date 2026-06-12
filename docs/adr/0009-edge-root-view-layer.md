# 0009 — Edge as the root-view rendering layer

- **Status:** Accepted
- **Date:** 2026-06-12 (documented retroactively)
- **Deciders:** AdonisJS core team

## Context and Problem Statement

On an initial (non-Inertia) page load, the server returns a full HTML document —
the "root view" — that bootstraps the SPA: it must embed the encoded page object
(`data-page`) and, when SSR is on, inject the server-rendered head and body. The
adapter must choose what renders that document and how the protocol-sensitive
markup is produced.

## Decision Drivers

- Apps need to control the document `<head>`, meta, and scripts.
- The `data-page` div and SSR head/body wiring are protocol-sensitive — users
  should not hand-write them.
- Reuse the framework's existing view story rather than inventing one.

## Considered Options

- **A framework-neutral HTML string/template** the adapter owns.
- **Edge templates** with dedicated Inertia tags.

## Decision Outcome

Chosen option: **Edge templates**, with `@inertia` and `@inertiaHead` tags.

### Rationale

The driver was simply that **Edge is the AdonisJS view layer**. AdonisJS apps
already use Edge, already have a Vite/asset-tag story there, and already author
their root document as an Edge template — so the root view is just another Edge
template (`rootView`, default `inertia_layout`), fully overridable by the app for
head/meta/scripts.

The protocol-sensitive parts are hidden behind two tags registered by the
provider via an Edge plugin: `@inertia()` emits the root element with the encoded
page data (customizable element/id/class), and `@inertiaHead()` outputs the
SSR-generated head tags. Users compose a normal HTML document and drop in two
tags rather than hand-writing the `data-page` payload or the SSR head wiring.

### Consequences

- **Good:** familiar templating; the app owns the document; asset/Vite tags work
  as everywhere else in Adonis.
- **Good:** protocol markup is encapsulated — the `data-page` encoding and SSR
  head/body injection are tag concerns, not user concerns.
- **Bad / cost:** the root-render path is coupled to Edge; a non-Edge setup has
  no first-class root-view path today.
- **Neutral:** the Edge plugin is registered conditionally in the provider's
  `boot()`, so Edge is only wired when present.

## More Information

- Source: `src/plugins/edge/tags.ts`, `src/plugins/edge/plugin.ts`,
  `providers/inertia_provider.ts`; rendering in `Inertia#render` /
  `#renderWithSSR` / `#renderClientSide` in `src/inertia.ts`
