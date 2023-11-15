/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { HttpContext } from '@adonisjs/core/http'
import type { ApplicationService } from '@adonisjs/core/types'

import { Inertia } from '../src/inertia.js'
import type { InertiaConfig } from '../src/types.js'
import { VersionCache } from '../src/version_cache.js'
import InertiaMiddleware from '../src/inertia_middleware.js'

/**
 * HttpContext augmentations
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    inertia: Inertia
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
    try {
      const edgeExports = await import('edge.js')
      let edge = edgeExports.default

      const { edgePluginInertia } = await import('../src/edge_plugin.js')
      edge.use(edgePluginInertia())
    } catch {}
  }

  /**
   * Register Inertia middleware, edge plugin, and add
   * `inertia` property to the HttpContext
   */
  async boot() {
    const appRoot = this.app.appRoot
    const config = this.app.config.get<InertiaConfig>('inertia', { view: 'app' })

    const versionCache = await new VersionCache(appRoot, config.assetsVersion).computeVersion()
    this.app.container.singleton(InertiaMiddleware, () => new InertiaMiddleware(versionCache))

    HttpContext.getter(
      'inertia',
      function inertia(this: HttpContext) {
        return new Inertia(this, config, versionCache.getVersion())
      },
      false
    )

    await this.registerEdgePlugin()
  }
}
