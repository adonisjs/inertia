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
import { FilesDetector } from './files_detector.js'
import type { InertiaConfig, ResolvedConfig } from './types.js'
import { slash } from '@poppinss/utils'

/**
 * Define the Inertia configuration
 */
export function defineConfig(config: InertiaConfig): ConfigProvider<ResolvedConfig> {
  return configProvider.create(async (app) => {
    const detector = new FilesDetector(app)
    const versionCache = new VersionCache(app.appRoot, config.assetsVersion)
    await versionCache.computeVersion()

    return {
      versionCache,
      rootView: config.rootView ?? 'inertia_layout',
      sharedData: config.sharedData || {},
      entrypoint: slash(
        config.entrypoint ?? (await detector.detectEntrypoint('inertia/app/app.ts'))
      ),
      ssr: {
        enabled: config.ssr?.enabled ?? false,
        pages: config.ssr?.pages,
        entrypoint:
          config.ssr?.entrypoint ?? (await detector.detectSsrEntrypoint('inertia/app/ssr.ts')),

        bundle: config.ssr?.bundle ?? (await detector.detectSsrBundle('ssr/ssr.js')),
      },
    }
  })
}
