/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Vite } from '@adonisjs/vite'
import { type HttpContext } from '@adonisjs/core/http'

import { Inertia } from './inertia.ts'
import { ServerRenderer } from './server_renderer.ts'
import { type ComponentProps, type InertiaConfig } from './types.ts'

/**
 * Manager class for managing Inertia instances
 *
 * Acts as a factory for creating Inertia instances with shared configuration
 * and Vite integration.
 *
 * @example
 * ```js
 * const manager = new InertiaManager(config, vite)
 * const inertia = manager.createForRequest(ctx)
 * ```
 */
export class InertiaManager {
  /**
   * Optional Vite instance for asset management
   */
  #vite?: Vite

  /**
   * Inertia configuration object
   */
  #config: InertiaConfig
  #serverRenderer?: ServerRenderer

  /**
   * Creates a new InertiaManager instance
   *
   * @param config - Inertia configuration object
   * @param vite - Optional Vite instance for development mode and SSR
   *
   * @example
   * ```js
   * const manager = new InertiaManager({
   *   rootView: 'app',
   *   ssr: { enabled: true }
   * }, vite)
   * ```
   */
  constructor(config: InertiaConfig, vite?: Vite) {
    this.#config = config
    this.#vite = vite
    this.#serverRenderer = this.#vite ? new ServerRenderer(this.#config, this.#vite) : undefined
  }

  /**
   * Creates a new Inertia instance for a specific HTTP request
   *
   * @param ctx - HTTP context for the current request
   * @returns A new Inertia instance configured for the given request
   *
   * @example
   * ```js
   * const inertia = manager.createForRequest(ctx)
   * await inertia.render('Home', { user: ctx.auth.user })
   * ```
   */
  createForRequest<Pages extends Record<string, ComponentProps>>(ctx: HttpContext) {
    return new Inertia<Pages>(ctx, this.#config, this.#vite, this.#serverRenderer)
  }
}
