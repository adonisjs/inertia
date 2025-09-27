/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { pathToFileURL } from 'node:url'
import { type Vite } from '@adonisjs/vite'
import type { ModuleRunner } from 'vite/module-runner'

import type { PageObject, RenderInertiaSsrApp, InertiaConfig } from './types.js'
import debug from './debug.ts'

/**
 * Server-side renderer for Inertia.js applications.
 *
 * Handles rendering Inertia pages on the server using either Vite's development
 * runtime API or production SSR bundles.
 *
 * @example
 * ```typescript
 * const renderer = new ServerRenderer(config, vite)
 * const { head, body } = await renderer.render(pageObject)
 * ```
 */
export class ServerRenderer {
  /**
   * Shared module runner instance for Vite's runtime API.
   * Used in development mode to execute SSR entry points.
   */
  #runtime?: ModuleRunner

  /**
   * Inertia configuration object containing SSR settings
   */
  #config: InertiaConfig

  /**
   * Vite instance for development mode rendering and asset management
   */
  #vite: Vite

  /**
   * Creates a new ServerRenderer instance.
   *
   * @param config - Inertia configuration object containing SSR settings
   * @param vite - Vite instance for development mode rendering and asset management
   *
   * @example
   * ```js
   * const renderer = new ServerRenderer(config, vite)
   * ```
   */
  constructor(config: InertiaConfig, vite: Vite) {
    this.#config = config
    this.#vite = vite
  }

  /**
   * Renders an Inertia page on the server.
   *
   * In development mode, uses Vite's Runtime API to execute the SSR entrypoint.
   * In production mode, imports and uses the pre-built SSR bundle.
   *
   * @param pageObject - The Inertia page object containing component, props, and metadata
   * @returns Promise resolving to an object with rendered head and body HTML
   *
   * @example
   * ```typescript
   * const pageObject = {
   *   component: 'Home',
   *   props: { user: { name: 'John' } },
   *   url: '/dashboard',
   *   version: '1.0.0'
   * }
   *
   * const { head, body } = await renderer.render(pageObject)
   * ```
   */
  async render(pageObject: PageObject<any>) {
    let render: { default: RenderInertiaSsrApp }
    const devServer = this.#vite.getDevServer()

    /**
     * Use the Vite Runtime API to execute the entrypoint
     * if we are in development mode
     */
    if (devServer) {
      debug('creating SSR bundle using dev-server')
      this.#runtime ??= await this.#vite.createModuleRunner()
      this.#runtime.clearCache()
      render = await this.#runtime.import(this.#config.ssr.entrypoint!)
    } else {
      /**
       * Otherwise, just import the SSR bundle
       */
      debug('creating SSR bundle using production build')
      render = await import(pathToFileURL(this.#config.ssr.bundle).href)
    }

    /**
     * Call the render function and return head and body
     */
    const result = await render.default(pageObject)
    debug('SSR bundle %o', result)
    return { head: result.head, body: result.body }
  }
}
