/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference types="@adonisjs/vite/vite_provider" />

import { configProvider } from '@adonisjs/core'
import { RuntimeException } from '@poppinss/utils'
import { BriskRoute, Route } from '@adonisjs/core/http'
import type { ApplicationService } from '@adonisjs/core/types'

import InertiaMiddleware from '../src/inertia_middleware.js'
import type { InertiaConfig, ResolvedConfig } from '../src/types.js'

declare module '@adonisjs/core/http' {
  interface BriskRoute {
    /**
     * Render an inertia page without defining an
     * explicit route handler
     */
    renderInertia(
      component: string,
      props?: Record<string, any>,
      viewProps?: Record<string, any>
    ): Route
  }
}

/**
 * Inertia provider
 */
export default class InertiaProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Registers edge plugin when edge is installed
   */
  protected async registerEdgePlugin() {
    if (!this.app.usingEdgeJS) return

    const edgeExports = await import('edge.js')
    const { edgePluginInertia } = await import('../src/plugins/edge/plugin.js')
    edgeExports.default.use(edgePluginInertia())
  }

  /**
   * Register inertia middleware
   */
  async register() {
    this.app.container.singleton(InertiaMiddleware, async () => {
      const inertiaConfigProvider = this.app.config.get<InertiaConfig>('inertia')
      const config = await configProvider.resolve<ResolvedConfig>(this.app, inertiaConfigProvider)
      const vite = await this.app.container.make('vite')

      if (!config) {
        throw new RuntimeException(
          'Invalid "config/inertia.ts" file. Make sure you are using the "defineConfig" method'
        )
      }

      return new InertiaMiddleware(config, vite)
    })
  }

  /**
   * Register edge plugin and brisk route macro
   */
  async boot() {
    await this.registerEdgePlugin()

    /**
     * Adding brisk route to render inertia pages
     * without an explicit handler
     */
    BriskRoute.macro('renderInertia', function (this: BriskRoute, template, props, viewProps) {
      return this.setHandler(({ inertia }) => {
        return inertia.render(template, props, viewProps)
      })
    })
  }
}
