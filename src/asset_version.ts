/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { createHash } from 'node:crypto'
import { type Vite } from '@adonisjs/vite'
import type { InertiaConfig, RequestInfo } from './types.js'

/**
 * Creates a function returning the assets version.
 *
 * An explicit `config.assetsVersion` wins. Otherwise the version is the
 * md5 hash of the Vite manifest, computed once and reused by every caller
 * of the returned function. The manifest is only read outside dev mode: the
 * dev server serves transformed assets directly, so a manifest left behind
 * by a previous build describes a stale build and `vite.manifest()` refuses
 * to read it. Without a usable manifest, the version is '1'.
 */
export function createAssetsVersionResolver(config: InertiaConfig, vite?: Vite): () => string {
  if (config.assetsVersion) {
    const version = String(config.assetsVersion)
    return () => version
  }

  let manifestHash: string | undefined
  return () => {
    if (!vite || vite.useDevServer || !vite.hasManifestFile) {
      return '1'
    }

    manifestHash ??= createHash('md5').update(JSON.stringify(vite.manifest())).digest('hex')
    return manifestHash
  }
}

/**
 * Returns whether an Inertia request must be replaced by an asset-version
 * reload. The middleware owns the reload response; page construction uses the
 * same predicate only to avoid consuming state before that response is issued.
 */
export function shouldReloadForAssetVersion(
  requestInfo: RequestInfo,
  requestMethod: string,
  serverVersion: string
) {
  return (
    requestInfo.isInertiaRequest &&
    requestMethod === 'GET' &&
    (requestInfo.version ?? '') !== serverVersion
  )
}
