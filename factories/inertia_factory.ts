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
import { HttpContextFactory } from '@adonisjs/core/factories/http'

import { defineConfig } from '../index.js'
import { Inertia } from '../src/inertia.js'
import { InertiaHeaders } from '../src/headers.js'
import { ServerRenderer } from '../src/server_renderer.js'
import {
  type AssetsVersion,
  type InertiaConfig,
  type ComponentProps,
  type InertiaConfigInput,
} from '../src/types.js'

/**
 * Parameters for configuring the Inertia factory
 */
type FactoryParameters = {
  /** HTTP context for the request */
  ctx: HttpContext
  /** Inertia configuration object */
  config: InertiaConfig
}

/**
 * Inertia factory to quickly create a new instance of Inertia
 * for testing purposes
 *
 * @example
 * ```typescript
 * const factory = new InertiaFactory()
 * const inertia = factory
 *   .merge({ config: { ssr: { enabled: true } } })
 *   .withVersion('1.0.0')
 *   .create()
 * ```
 */
export class InertiaFactory<Pages extends Record<string, ComponentProps>> {
  /** Optional Vite instance for asset handling */
  #vite?: Vite

  /** Internal parameters for factory configuration */
  #parameters: FactoryParameters = {
    ctx: new HttpContextFactory().create(),
    config: defineConfig({}),
  }

  /**
   * Creates a new InertiaFactory instance with default Inertia headers
   *
   * @example
   * ```typescript
   * const factory = new InertiaFactory()
   * ```
   */
  constructor() {
    this.#parameters.ctx.request.request.headers[InertiaHeaders.Inertia] = 'true'
  }

  /**
   * Merges additional parameters into the factory configuration
   *
   * @param parameters - Partial factory parameters to merge
   *
   * @example
   * ```typescript
   * factory.merge({
   *   config: { ssr: { enabled: true } },
   *   ctx: customContext
   * })
   * ```
   */
  merge(
    parameters: Omit<Partial<FactoryParameters>, 'config'> & {
      config?: InertiaConfigInput
    }
  ) {
    if (parameters.ctx) {
      this.#parameters.ctx = parameters.ctx
    }
    if (parameters.config) {
      this.#parameters.config = defineConfig(parameters.config)
    }
    this.#parameters.ctx.request.request.headers[InertiaHeaders.Inertia] = 'true'
    return this
  }

  /**
   * Removes the X-Inertia header from the request headers
   *
   * @example
   * ```typescript
   * const inertia = factory.withoutInertia().create()
   * ```
   */
  withoutInertia() {
    delete this.#parameters.ctx.request.request.headers[InertiaHeaders.Inertia]
    return this
  }

  /**
   * Configures the factory for partial reloads of a specific component
   *
   * @param component - Name of the component to partially reload
   *
   * @example
   * ```typescript
   * const inertia = factory
   *   .partialReload('UserProfile')
   *   .only(['name', 'email'])
   *   .create()
   * ```
   */
  partialReload<Page extends keyof Pages & string>(component: Page) {
    const self = this
    const request = this.#parameters.ctx.request
    request.request.headers[InertiaHeaders.PartialComponent] = component

    return {
      /**
       * Specifies which props to include in the partial reload
       *
       * @param props - Array of property names to include
       */
      only(props: string[]) {
        request.request.headers[InertiaHeaders.PartialOnly] = props.join(',')
        return this
      },
      /**
       * Specifies which props to exclude from the partial reload
       *
       * @param props - Array of property names to exclude
       */
      except(props: string[]) {
        request.request.headers[InertiaHeaders.PartialExcept] = props.join(',')
        return this
      },
      /**
       * Specifies which props should be reset during the partial reload
       *
       * @param props - Array of property names to reset
       */
      reset(props: string[]) {
        request.request.headers[InertiaHeaders.Reset] = props.join(',')
        return this
      },
      /**
       * Creates the Inertia instance with partial reload configuration
       */
      create() {
        return self.create()
      },
    }
  }

  /**
   * Simulates a client that already has certain once props cached
   *
   * @param props - Array of once prop keys the client already has
   *
   * @example
   * ```typescript
   * const inertia = factory
   *   .withCachedOnceProps(['plans', 'roles'])
   *   .create()
   * ```
   */
  withCachedOnceProps(props: string[]) {
    this.#parameters.ctx.request.request.headers[InertiaHeaders.ExceptOnceProps] = props.join(',')
    return this
  }

  /**
   * Sets the assets version for cache busting
   *
   * @param version - Version string or function for asset versioning
   *
   * @example
   * ```typescript
   * factory.withVersion('1.0.0')
   * // or
   * factory.withVersion(() => Date.now().toString())
   * ```
   */
  withVersion(version: AssetsVersion) {
    this.#parameters.config = { ...this.#parameters.config, assetsVersion: version }
    return this
  }

  /**
   * Sets the Vite instance for asset handling
   *
   * @param options - Vite configuration object
   *
   * @example
   * ```typescript
   * factory.withVite(viteInstance)
   * ```
   */
  withVite(options: Vite) {
    this.#vite = options
    return this
  }

  /**
   * Creates a new Inertia instance with the configured parameters
   *
   * @example
   * ```typescript
   * const inertia = factory
   *   .merge({ config: customConfig })
   *   .withVersion('1.0.0')
   *   .create()
   * ```
   */
  create(): Inertia<Pages> {
    return new Inertia<Pages>(
      this.#parameters.ctx,
      this.#parameters.config,
      this.#vite,
      this.#vite ? new ServerRenderer(this.#parameters.config, this.#vite) : undefined
    )
  }
}
