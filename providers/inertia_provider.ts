/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference types="@adonisjs/vite/vite_provider" />

import { BriskRoute, type Route } from '@adonisjs/core/http'
import type { ApplicationService } from '@adonisjs/core/types'

import { InertiaManager } from '../src/inertia_manager.ts'
import type {
  AsPageProps,
  ComponentProps,
  InertiaConfig,
  InertiaPages,
  SharedProps,
} from '../src/types.js'

declare module '@adonisjs/core/http' {
  export interface BriskRoute {
    /**
     * Render an inertia page without defining an explicit route handler
     *
     * This method allows you to render Inertia pages directly from route definitions
     * without creating separate controller methods.
     *
     * @param component - The name of the Inertia component to render
     * @param props - Props to pass to the component
     * @param viewProps - Additional props to pass to the root view template
     * @returns The route instance for method chaining
     *
     * @example
     * ```js
     * // Basic usage
     * router.get('/dashboard', []).renderInertia('Dashboard', {
     *   user: auth.user
     * })
     *
     * // With view props
     * router.get('/home', []).renderInertia('Home', {
     *   posts: posts
     * }, {
     *   title: 'Welcome Home'
     * })
     * ```
     */
    renderInertia<Page extends keyof InertiaPages>(
      component: Page,
      props: InertiaPages[Page] extends ComponentProps
        ? AsPageProps<Omit<InertiaPages[Page], keyof SharedProps>>
        : never,
      viewProps?: Record<string, any>
    ): Route
  }
}

/**
 * AdonisJS service provider for Inertia.js integration
 *
 * This provider handles the registration and configuration of Inertia.js
 * within an AdonisJS application. It sets up the middleware, Edge.js plugin,
 * and route macros needed for Inertia functionality.
 *
 * @example
 * ```js
 * // Automatically registered when package is installed
 * // Configuration in config/inertia.ts:
 *
 * import { defineConfig } from '@adonisjs/inertia'
 *
 * export default defineConfig({
 *   rootView: 'inertia_layout',
 *   ssr: { enabled: true }
 * })
 * ```
 */
export default class InertiaProvider {
  /**
   * Creates a new InertiaProvider instance
   *
   * @param app - The AdonisJS application service instance
   */
  constructor(protected app: ApplicationService) {}

  /**
   * Registers the Inertia Edge.js plugin when Edge.js is available
   *
   * This method conditionally registers the Edge plugin that provides
   * @inertia and @inertiaHead tags for rendering Inertia pages.
   *
   * @example
   * ```edge
   * {{-- Templates can then use --}}
   * @inertia(page)
   * @inertiaHead(page)
   * ```
   */
  protected async registerEdgePlugin() {
    const edgeExports = await import('edge.js')
    const { edgePluginInertia } = await import('../src/plugins/edge/plugin.js')
    edgeExports.default.use(edgePluginInertia())
  }

  /**
   * Registers the InertiaManager as a singleton in the IoC container
   *
   * This method sets up the core Inertia manager with the application's
   * configuration and Vite integration. The manager handles page rendering,
   * asset management, and SSR functionality.
   *
   * @example
   * ```js
   * // The manager is automatically available for injection:
   * const inertiaManager = await app.container.make(InertiaManager)
   * ```
   */
  async register() {
    this.app.container.singleton(InertiaManager, async (resolver) => {
      const config = this.app.config.get<InertiaConfig>('inertia', {})
      const vite = await resolver.make('vite')
      return new InertiaManager(config, vite)
    })
  }

  /**
   * Boot the provider by registering Edge plugin and route macros
   *
   * This method completes the Inertia setup by registering the Edge plugin
   * and adding the renderInertia macro to BriskRoute for convenient route definitions.
   *
   * @example
   * ```js
   * // Routes can now use the renderInertia macro
   * router.get('/dashboard', []).renderInertia('Dashboard', {
   *   user: getCurrentUser()
   * })
   * ```
   */
  async boot() {
    await this.registerEdgePlugin()
    BriskRoute.macro('renderInertia', function (this: BriskRoute, template, props, viewProps) {
      return this.setHandler(({ inertia }) => {
        return inertia.render(template, props as any, viewProps)
      })
    })
  }
}
