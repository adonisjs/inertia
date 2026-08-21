/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { getContext, setContext } from 'svelte'
import type { Tuyau } from '@tuyau/core/client'
import type { TuyauRegistry } from '@tuyau/core/types'

/**
 * Svelte context key holding the Tuyau client.
 *
 * Registered on the global symbol registry rather than created with a bare
 * `Symbol()`: the components are shipped as uncompiled `.svelte` files that
 * import this module through a separate entrypoint from the one the package
 * export subpath resolves, so the module can legitimately be instantiated
 * more than once. A registry symbol keeps every instance agreeing on the
 * same key, and is what the package already relies on for its prop markers.
 */
const TUYAU_CONTEXT = Symbol.for('Tuyau')

/**
 * Registers the Tuyau client on the current component's context.
 *
 * Prefer the `TuyauProvider` component; reach for this when the client is
 * seeded from a component you already own, such as the root component the
 * Inertia app is mounted with.
 *
 * @throws Error when called outside component initialisation
 */
export function setTuyau<Registry extends TuyauRegistry>(client: Tuyau<Registry>) {
  setContext(TUYAU_CONTEXT, client)
}

/**
 * Registers the Tuyau client on the context map `createInertiaApp` hands to
 * its `withApp` hook.
 *
 * This is the way to install the client in an Inertia app. Svelte has no
 * component wrapping the root of one — the app is mounted by
 * `createInertiaApp` itself — and letting it do that mounting is what makes
 * it hydrate server-rendered markup when SSR is on and mount from scratch
 * when it is not. `withApp` runs on both sides of that split, and builds a
 * fresh map per render on the server, so nothing leaks between requests.
 *
 * @example
 * ```ts
 * createInertiaApp({
 *   resolve: (name) => resolvePageComponent(`./pages/${name}.svelte`, pages),
 *   withApp(context) {
 *     provideTuyau(context, tuyau)
 *   },
 * })
 * ```
 */
export function provideTuyau<Registry extends TuyauRegistry>(
  context: Map<any, any>,
  client: Tuyau<Registry>
) {
  context.set(TUYAU_CONTEXT, client)
}

/**
 * Builds the context map accepted by Svelte's `mount()`, `hydrate()`, and
 * `render()`.
 *
 * Reach for this only when taking over mounting through `createInertiaApp`'s
 * `setup` option, which owns the map itself and so cannot be fed through
 * `provideTuyau`. Taking `setup` over means owning the CSR/SSR and
 * mount/hydrate split too — prefer `withApp` and `provideTuyau` unless that
 * is what you are after.
 *
 * @example
 * ```ts
 * createInertiaApp({
 *   resolve: (name) => resolvePageComponent(`./pages/${name}.svelte`, pages),
 *   setup({ el, App, props }) {
 *     mount(App, { target: el, props, context: tuyauContext(tuyau) })
 *   },
 * })
 * ```
 */
export function tuyauContext<Registry extends TuyauRegistry>(client: Tuyau<Registry>) {
  const context = new Map<any, any>()
  provideTuyau(context, client)

  return context
}

/**
 * Reads the Tuyau client from any component below a `TuyauProvider` (or
 * below a root mounted with `tuyauContext`).
 *
 * Provides type-safe access to route generation and navigation utilities.
 *
 * @returns The Tuyau client instance with full type safety
 * @throws Error if no client has been registered on the context
 */
export function useTuyau() {
  const context = getContext<Tuyau<any> | null>(TUYAU_CONTEXT)
  if (!context) throw new Error('You must wrap your app in a TuyauProvider')

  return context
}
