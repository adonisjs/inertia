/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { configProvider } from '@adonisjs/core'
import type { ConfigProvider } from '@adonisjs/core/types'

import { VersionCache } from './version_cache.js'
import type { InertiaConfig, ResolvedConfig } from './types.js'

/**
 * Define the Inertia configuration
 */
export function defineConfig(config: InertiaConfig): ConfigProvider<ResolvedConfig> {
  return configProvider.create(async (app) => {
    const versionCache = new VersionCache(app.appRoot, config.assetsVersion)
    await versionCache.computeVersion()

    return {
      rootView: config.rootView ?? 'root',
      sharedData: config.sharedData || {},
      versionCache,
      ssr: {
        enabled: config.ssr?.enabled ?? false,
        pages: config.ssr?.pages,
        entrypoint: config.ssr?.entrypoint ?? app.makePath('resources/ssr.ts'),
        bundle: config.ssr?.bundle ?? app.makePath('ssr/ssr.js'),
      },
    }
  })
}
