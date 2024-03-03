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
      './resources/app.ts',
      './resources/app.tsx',
      './resources/application/app.ts',
      './resources/application/app.tsx',
      './resources/app.jsx',
      './resources/app.js',
      './resources/application/app.jsx',
      './resources/application/app.js',
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
      './resources/ssr.ts',
      './resources/ssr.tsx',
      './resources/application/ssr.ts',
      './resources/application/ssr.tsx',
      './resources/ssr.jsx',
      './resources/ssr.js',
      './resources/application/ssr.jsx',
      './resources/application/ssr.js',
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
