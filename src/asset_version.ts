/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { RequestInfo } from './types.js'

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
