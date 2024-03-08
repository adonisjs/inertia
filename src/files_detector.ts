/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { locatePath } from 'locate-path'
import { Application } from '@adonisjs/core/app'

export class FilesDetector {
  constructor(protected app: Application<any>) {}

  /**
   * Try to locate the entrypoint file based
   * on the conventional locations
   */
  async detectEntrypoint(defaultPath: string) {
    const possiblesLocations = [
      './inertia/app/app.ts',
      './inertia/app/app.tsx',
      './resources/app.ts',
      './resources/app.tsx',
      './resources/app.jsx',
      './resources/app.js',
      './inertia/app/app.jsx',
    ]

    const path = await locatePath(possiblesLocations, { cwd: this.app.appRoot })
    return this.app.makePath(path || defaultPath)
  }

  /**
   * Try to locate the SSR entrypoint file based
   * on the conventional locations
   */
  async detectSsrEntrypoint(defaultPath: string) {
    const possiblesLocations = [
      './inertia/app/ssr.ts',
      './inertia/app/ssr.tsx',
      './resources/ssr.ts',
      './resources/ssr.tsx',
      './resources/ssr.jsx',
      './resources/ssr.js',
      './inertia/app/ssr.jsx',
    ]

    const path = await locatePath(possiblesLocations, { cwd: this.app.appRoot })
    return this.app.makePath(path || defaultPath)
  }

  /**
   * Try to locate the SSR bundle file based
   * on the conventional locations
   */
  async detectSsrBundle(defaultPath: string) {
    const possiblesLocations = ['./ssr/ssr.js', './ssr/ssr.mjs']

    const path = await locatePath(possiblesLocations, { cwd: this.app.appRoot })
    return this.app.makePath(path || defaultPath)
  }
}
