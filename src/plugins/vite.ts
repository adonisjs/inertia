/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference types="@vavite/multibuild" />

import type { PluginOption } from 'vite'

export type InertiaPluginOptions = {
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
    | { enabled: false }
}

/**
 * Inertia plugin for Vite that is tailored for AdonisJS
 */
export default function inertia(options?: InertiaPluginOptions): PluginOption {
  return {
    name: 'vite-plugin-inertia',
    config: (_, { command }) => {
      if (!options?.ssr?.enabled) return {}

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
        buildSteps: [
          {
            name: 'build-client',
            description: 'build inertia client bundle',
            config: { build: { outDir: 'build/public/assets/' } },
          },
          {
            name: 'build-ssr',
            description: 'build inertia server bundle',
            config: {
              build: {
                ssr: true,
                outDir: options.ssr.output || 'build/ssr',
                rollupOptions: { input: options.ssr.entrypoint },
              },
            },
          },
        ],
      }
    },
  }
}
