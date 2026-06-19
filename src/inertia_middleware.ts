/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference types="@adonisjs/session/session_middleware" />

import type { HttpContext } from '@adonisjs/core/http'

import { type Inertia } from './inertia.js'
import { InertiaHeaders } from './headers.js'
import { InertiaManager } from './inertia_manager.ts'
import type { ComponentProps, FlashData, InertiaPages, PageProps } from './types.js'
import debug from './debug.ts'

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    inertia: Inertia<InertiaPages>
  }
}

/**
 * HTTP methods that require special redirect handling
 * These methods should use 303 status code for redirects
 */
const MUTATION_METHODS = ['PUT', 'PATCH', 'DELETE']

/**
 * Base middleware class for handling Inertia.js requests
 *
 * This middleware handles the initialization of the Inertia instance,
 * manages request headers, handles redirects for mutation methods,
 * and implements asset versioning.
 *
 * @example
 * ```ts
 * export default class InertiaMiddleware extends BaseInertiaMiddleware {
 *   async share() {
 *     return {
 *       user: ctx.auth?.user
 *     }
 *   }
 * }
 * ```
 */
export default abstract class BaseInertiaMiddleware {
  /**
   * Extract validation errors from the session and format them for Inertia
   *
   * Retrieves validation errors from the session flash messages and formats
   * them according to Inertia's error bag conventions. Supports both simple
   * error objects and error bags for multi-form scenarios.
   *
   * By default every field collapses to its **first** message (`string`),
   * matching Inertia's default error shape. Pass `{ allMessages: true }` to opt
   * into the all-messages mode, where every field is emitted as a `string[]` —
   * including single-message fields, which arrive as a one-element array. The
   * shape is uniform across the response: never a mix of strings and arrays. An
   * app running in all-messages mode types the client globally via
   * `declare module '@inertiajs/core' { interface InertiaConfig { errorValueType: string[] } }`.
   *
   * @param ctx - The HTTP context containing session data
   * @param options - When `allMessages` is true, emit every field as `string[]`
   * @returns Formatted validation errors, either as a simple object or error bags
   *
   * @example
   * ```js
   * const errors = middleware.getValidationErrors(ctx)
   * // Returns: { email: 'Email is required', password: 'Password too short' }
   * // Or with error bags: { login: { email: 'Email is required' } }
   *
   * const allErrors = middleware.getValidationErrors(ctx, { allMessages: true })
   * // Returns: { email: ['Email is required'], password: ['Too short', 'Needs a number'] }
   * ```
   */
  getValidationErrors(
    ctx: HttpContext
  ): Record<string, string> | { [errorBag: string]: Record<string, string> }
  getValidationErrors(
    ctx: HttpContext,
    options: { allMessages: true }
  ): Record<string, string[]> | { [errorBag: string]: Record<string, string[]> }
  getValidationErrors(
    ctx: HttpContext,
    options?: { allMessages?: boolean }
  ): Record<string, string | string[]> | { [errorBag: string]: Record<string, string | string[]> } {
    if (!ctx.session) {
      return {}
    }

    const allMessages = options?.allMessages === true
    const inputErrors = ctx.session.flashMessages.get('inputErrorsBag', {})
    const errors = Object.entries(inputErrors).reduce(
      (result, [field, messages]) => {
        if (allMessages) {
          result[field] = Array.isArray(messages) ? messages : [messages]
        } else {
          result[field] = Array.isArray(messages) ? messages[0] : messages
        }
        return result
      },
      {} as Record<string, string | string[]>
    )

    const errorBag = ctx.request.header(InertiaHeaders.ErrorBag)
    if (errorBag) {
      return { [errorBag]: errors }
    }
    return errors
  }

  /**
   * Share data with all Inertia pages
   *
   * This method should return an object containing data that will be
   * available to all Inertia pages as props.
   *
   * @param ctx - The HTTP context object
   * @returns Props to share across all pages
   *
   * @example
   * ```js
   * async share() {
   *   return {
   *     user: ctx.auth?.user,
   *     flash: ctx.session?.flashMessages.all()
   *   }
   * }
   * ```
   */
  abstract share?(ctx: HttpContext): PageProps | Promise<PageProps>

  /**
   * Provide the first-class flash bag sent to every Inertia page under the
   * top-level `flash` field (a sibling of `props`, not merged into them).
   *
   * Typically reads the framework's session flash messages. Optional — when the
   * method is not defined, no `flash` field is emitted. Type the return value to
   * get end-to-end type safety via `InferFlashData`.
   *
   * @param ctx - The HTTP context object
   * @returns The flash bag for the current response
   *
   * @example
   * ```js
   * flash(ctx) {
   *   return ctx.session.flashMessages.all()
   * }
   * ```
   */
  flash?(ctx: HttpContext): FlashData | Promise<FlashData>

  /**
   * Initialize the Inertia instance for the current request
   *
   * This method creates an Inertia instance and attaches it to the
   * HTTP context, making it available throughout the request lifecycle.
   *
   * @param ctx - The HTTP context object
   *
   * @example
   * ```ts
   * await middleware.init(ctx)
   * ```
   */
  async init(ctx: HttpContext) {
    debug('initiating inertia')
    const inertiaContainer = await ctx.containerResolver.make(InertiaManager)
    ctx.inertia =
      inertiaContainer.createForRequest<
        InertiaPages extends Record<string, ComponentProps> ? InertiaPages : never
      >(ctx)
    if (this.share) {
      ctx.inertia.share(() => this.share!(ctx))
    }
    if (this.flash) {
      ctx.inertia.flash(() => this.flash!(ctx))
    }
  }

  /**
   * Clean up and finalize the Inertia response
   *
   * This method handles the final processing of Inertia requests including:
   * - Setting appropriate response headers
   * - Handling redirects for mutation methods (PUT/PATCH/DELETE)
   * - Managing asset versioning conflicts
   *
   * @param ctx - The HTTP context object
   *
   * @example
   * ```ts
   * await middleware.dispose(ctx)
   * ```
   */
  dispose(ctx: HttpContext) {
    const requestInfo = ctx.inertia.requestInfo()
    if (!requestInfo.isInertiaRequest) {
      return
    }

    debug('disposing as inertia request')
    ctx.response.header('Vary', InertiaHeaders.Inertia)

    /**
     * When redirecting a PUT/PATCH/DELETE request, we must use a 303
     * status code instead of a 302 to force the browser to use a GET
     * request after redirecting.
     *
     * See https://inertiajs.com/redirects
     */
    const method = ctx.request.method()
    if (ctx.response.getStatus() === 302 && MUTATION_METHODS.includes(method)) {
      debug('upgrading response status from 302 to 303')
      ctx.response.status(303)
    }

    /**
     * Handle version change
     *
     * See https://inertiajs.com/the-protocol#asset-versioning
     */
    const version = ctx.inertia.getVersion()
    const clientVersion = requestInfo.version ?? ''
    if (method === 'GET' && clientVersion !== version) {
      debug('version mis-match. Reloading page')
      if (ctx.session) {
        ctx.session.reflash()
      }
      ctx.response.removeHeader(InertiaHeaders.Inertia)
      ctx.response.header(InertiaHeaders.Location, ctx.request.url(true))
      ctx.response.status(409)
    }
  }
}
