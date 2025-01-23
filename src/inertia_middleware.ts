/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference types="@adonisjs/session/session_middleware" />

import type { Vite } from '@adonisjs/vite'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { Inertia } from './inertia.js'
import { InertiaHeaders } from './headers.js'
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

  /**
   * Resolves the validation errors to be shared with Inertia
   */
  #resolveValidationErrors(ctx: HttpContext) {
    const { session, request } = ctx

    // If the session middleware wasn't executed
    // (on routes that are not in the router, for instance),
    // then the session object will be undefined.
    if (!session) {
      return {}
    }

    /**
     * If not a Vine Validation error, then return the entire error bag
     */
    if (!session.flashMessages.has('errorsBag.E_VALIDATION_ERROR')) {
      return session.flashMessages.get('errorsBag')
    }

    /**
     * Otherwise, resolve the validation errors. We only keep the first
     * error message for each field
     */
    const errors = Object.entries(session.flashMessages.get('inputErrorsBag')).reduce(
      (acc, [field, messages]) => {
        acc[field] = Array.isArray(messages) ? messages[0] : messages
        return acc
      },
      {} as Record<string, string>
    )

    /**
     * Also, nest the errors under the error bag key if asked
     * See https://inertiajs.com/validation#error-bags
     */
    const errorBag = request.header(InertiaHeaders.ErrorBag)
    return errorBag ? { [errorBag]: errors } : errors
  }

  /**
   * Share validation and flashed errors with Inertia
   */
  #shareErrors(ctx: HttpContext) {
    ctx.inertia.share({ errors: ctx.inertia.always(() => this.#resolveValidationErrors(ctx)) })
  }

  async handle(ctx: HttpContext, next: NextFn) {
    const { response, request } = ctx

    ctx.inertia = new Inertia(ctx, this.config, this.vite)
    this.#shareErrors(ctx)

    await next()

    const isInertiaRequest = !!request.header(InertiaHeaders.Inertia)
    if (!isInertiaRequest) return

    response.header('Vary', InertiaHeaders.Inertia)

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
    if (method === 'GET' && request.header(InertiaHeaders.Version, '') !== version) {
      response.removeHeader(InertiaHeaders.Inertia)
      response.header(InertiaHeaders.Location, request.url())
      response.status(409)
    }
  }
}
