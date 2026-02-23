/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { PluginOption } from 'vite'

/**
 * Configuration options for the Inertia Vite plugin
 */
export type InertiaPluginOptions = {
  /**
   * Server-side rendering configuration
   */
  ssr?:
    | {
        /**
         * Whether or not to enable server-side rendering
         */
        enabled: true

        /**
         * The entrypoint for the server-side rendering
         */
        entrypoint: string

        /**
         * The output directory for the server-side rendering bundle
         */
        output?: string
      }
    | { enabled: false; entrypoint?: string; output?: string }
}

/**
 * Inertia plugin for Vite that is tailored for AdonisJS
 *
 * Configures Vite for Inertia.js development with proper build settings,
 * SSR support, and AdonisJS-specific optimizations.
 *
 * @param options - Configuration options for the plugin
 * @returns Vite plugin configuration object
 *
 * @example
 * ```js
 * // Basic configuration
 * import inertia from '@adonisjs/inertia/plugins/vite'
 *
 * export default defineConfig({
 *   plugins: [inertia()]
 * })
 * ```
 *
 * @example
 * ```js
 * // With SSR enabled
 * import inertia from '@adonisjs/inertia/plugins/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     inertia({
 *       ssr: {
 *         enabled: true,
 *         entrypoint: 'inertia/ssr.tsx',
 *         output: 'build/ssr'
 *       }
 *     })
 *   ]
 * })
 * ```
 */
export default function inertia(options?: InertiaPluginOptions): PluginOption {
  return {
    name: 'vite-plugin-inertia',
    config: (_, { command }) => {
      /**
       * We need to set the `NODE_ENV` to production when building
       * front-end assets. Otherwise, some libraries may behave
       * differently.
       *
       * For example `react` will use a `jsxDev` function
       * that is not available in production.
       * See https://github.com/remix-run/remix/issues/4081
       */
      if (command === 'build') {
        process.env.NODE_ENV = 'production'
      }

      return {
        builder: {
          buildApp: async (builder) => {
            await builder.build(builder.environments.client)
            if (options?.ssr?.enabled) {
              await builder.build(builder.environments.ssr)
            }
          },
        },
        build: { outDir: 'build/public/assets' },
        environments: {
          ...(options?.ssr?.enabled && {
            ssr: {
              build: {
                ssr: true,
                outDir: options.ssr.output || 'build/ssr',
                rollupOptions: { input: options.ssr.entrypoint },
              },
            },
          }),
        },
      }
    },
  }
}
