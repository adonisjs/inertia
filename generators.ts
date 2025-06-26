/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { fileURLToPath } from 'node:url'
import Configure from '@adonisjs/core/commands/configure'
import { InertiaPageTypesGenerator, PagesLocation } from './src/type_generator/index.js'

const defaultOptions = {
  pages: [
    {
      root: './inertia/pages',
      pages: [
        './inertia/pages/**/*.tsx',
        './inertia/pages/**/*.ts',
        './inertia/pages/**/*.jsx',
        './inertia/pages/**/*.js',
        './inertia/pages/**/*.vue',
        './inertia/pages/**/*.svelte',
      ],
    },
  ],
}

export function generateInertiaPages(options: { pages: PagesLocation[] } = defaultOptions) {
  return async ({ command }: { command: Configure }) => {
    const appRoot = fileURLToPath(command.app.appRoot)

    await new InertiaPageTypesGenerator(appRoot).generate(options.pages)
  }
}
