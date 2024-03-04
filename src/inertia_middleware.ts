/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Vite } from '@adonisjs/vite'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { Inertia } from './inertia.js'
import type { ResolvedConfig } from './types.js'

/**
 * HttpContext augmentations
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    inertia: Inertia
  }
}

/**
 * Inertia middleware to handle the Inertia requests and
 * set appropriate headers/status
 */
export default class InertiaMiddleware {
  constructor(
    protected config: ResolvedConfig,
    protected vite?: Vite
  ) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const { response, request } = ctx

    ctx.inertia = new Inertia(ctx, this.config, this.vite)

    await next()

    const isInertiaRequest = !!request.header('x-inertia')
    if (!isInertiaRequest) return

    response.header('Vary', 'Accept')

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
    const version = this.config.versionCache.getVersion().toString()
    if (method === 'GET' && request.header('x-inertia-version', '') !== version) {
      response.header('x-inertia-location', request.url())
      response.status(409)
    }
  }
}
