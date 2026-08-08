/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Vite } from '@adonisjs/vite'

import debug from './debug.ts'
import type { PageObject, RenderInertiaSsrApp, InertiaConfig } from './types.js'

/**
 * Server-side renderer for Inertia.js applications.
 *
 * Resolves the SSR entrypoint through `vite.loadServerModule` so the same
 * code path works in dev (Vite module runner) and in production (pre-built
 * SSR bundle on disk). The entry must be declared under `serverEntryPoints`
 * on the AdonisJS Vite plugin so it gets bundled for production.
 *
 * @example
 * ```typescript
 * const renderer = new ServerRenderer(config, vite)
 * const { head, body } = await renderer.render(pageObject)
 * ```
 */
export class ServerRenderer {
  /**
   * Inertia configuration object containing SSR settings
   */
  #config: InertiaConfig

  /**
   * Vite instance used to load the SSR entrypoint module
   */
  #vite: Vite

  constructor(config: InertiaConfig, vite: Vite) {
    this.#config = config
    this.#vite = vite
  }

  /**
   * Renders an Inertia page on the server.
   *
   * @param pageObject - The Inertia page object containing component, props, and metadata
   * @returns Promise resolving to an object with rendered head and body HTML
   */
  async render(pageObject: PageObject<any>) {
    debug('rendering page through SSR entrypoint %s', this.#config.ssr.entrypoint)

    const mod = await this.#vite.loadServerModule<{ default: RenderInertiaSsrApp }>(
      this.#config.ssr.entrypoint
    )

    const result = await mod.default(pageObject)
    debug('SSR bundle %o', result)
    return { head: result.head, body: result.body }
  }
}
