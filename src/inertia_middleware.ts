/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import type { VersionCache } from './version_cache.js'

/**
 * Inertia middleware to handle the Inertia requests and
 * set appropriate headers/status
 */
export default class InertiaMiddleware {
  constructor(protected version: VersionCache) {}

  async handle({ request, response }: HttpContext, next: NextFn) {
    await next()

    const isInertiaRequest = !!request.header('x-inertia')
    if (!isInertiaRequest) return

    response.header('Vary', 'Accept')
    response.header('X-Inertia', 'true')

    /**
     * When redirecting a PUT/PATCH/DELETE request, we need to change the
     * we must use a 303 status code instead of a 302 to force
     * the browser to use a GET request after redirecting.
     *
     * See https://inertiajs.com/redirects
     */
    const method = request.method()
    if (response.getStatus() === 302 && ['PUT', 'PATCH', 'DELETE'].includes(method)) {
      response.status(303)
    }

    /**
     * Handle version change
     *
     * See https://inertiajs.com/the-protocol#asset-versioning
     */
    const version = await this.version.getVersion()
    if (method === 'GET' && request.header('x-inertia-version', '') !== version) {
      response.header('x-inertia-location', request.url())
      response.status(409)
    }
  }
}
