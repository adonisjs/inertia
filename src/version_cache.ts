/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { readFile } from 'node:fs/promises'

import type { AssetsVersion } from './types.js'

/**
 * VersionCache is used to cache the version of the assets.
 *
 * If the user has provided a version, it will be used.
 * Otherwise, we will compute a hash from the manifest file
 * and cache it.
 */
export class VersionCache {
  #cachedVersion?: AssetsVersion

  constructor(
    protected appRoot: URL,
    protected assetsVersion?: AssetsVersion
  ) {
    this.#cachedVersion = assetsVersion
  }

  /**
   * Compute the hash of the manifest file and cache it
   */
  async #getManifestHash(): Promise<AssetsVersion> {
    try {
      const crc32 = await import('crc-32')
      const manifestPath = new URL('public/assets/manifest.json', this.appRoot)
      const manifestFile = await readFile(manifestPath, 'utf-8')
      this.#cachedVersion = crc32.default.str(manifestFile)
      return this.#cachedVersion
    } catch {
      /**
       * If the manifest file does not exist, it probably means that we are in
       * development mode
       */
      this.#cachedVersion = '1'
      return this.#cachedVersion
    }
  }

  /**
   * Pre-compute the version
   */
  async computeVersion() {
    if (!this.assetsVersion) await this.#getManifestHash()
    return this
  }

  /**
   * Returns the current assets version
   */
  getVersion() {
    if (!this.#cachedVersion) throw new Error('Version has not been computed yet')
    return this.#cachedVersion
  }

  /**
   * Set the assets version
   */
  async setVersion(version: AssetsVersion) {
    this.#cachedVersion = version
  }
}
