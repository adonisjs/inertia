/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import lodash from '@poppinss/utils/lodash'
import type { InertiaConfig, InertiaConfigInput } from './types.js'

/**
 * Define the Inertia configuration with default values
 *
 * This function merges user-provided configuration with sensible defaults
 * to create a complete Inertia configuration object.
 *
 * @param config - User configuration input to override defaults
 *
 * @example
 * ```js
 * const config = defineConfig({
 *   rootView: 'layouts/app',
 *   ssr: {
 *     enabled: true,
 *     bundle: 'build/ssr/ssr.js'
 *   }
 * })
 * ```
 *
 * @example
 * ```js
 * // Minimal configuration
 * const config = defineConfig({
 *   rootView: 'app'
 * })
 * ```
 */
export function defineConfig(config: InertiaConfigInput): InertiaConfig {
  return lodash.merge(
    {
      rootView: 'inertia_layout',
      history: {
        encrypt: false,
      },
      ssr: {
        enabled: false,
        bundle: 'ssr/ssr.js',
        entrypoint: 'inertia/ssr.tsx',
      },
    },
    config
  )
}
