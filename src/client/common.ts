/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Tuyau } from '@tuyau/core/client'

import type {
  MethodVisitParams,
  RouteParams,
  RouterLike,
  RouterRequestBody,
  Routes,
  RoutesWithMethod,
  VisitParams,
} from './types.ts'

/**
 * Call signature of the client's urlFor builder. The wrappers hold a
 * generically erased client (Tuyau<any>), whose urlFor call signature
 * collapses to never, so calls go through this alias instead.
 */
type UrlForFn = (name: string, params?: unknown, options?: { qs?: Record<string, any> }) => string

/**
 * Builds the URL for a named route, serializing query string parameters
 * through the client's urlFor builder so serialization matches urlFor
 * everywhere.
 */
export function buildRouteUrl(
  tuyau: Tuyau<any>,
  route: string,
  params: unknown,
  qs?: Record<string, any>
): string {
  return (tuyau.urlFor as unknown as UrlForFn)(route, params, { qs })
}

/**
 * Normalizes AdonisJS validation errors to Inertia's field-keyed error format.
 */
export function normalizeValidationErrors(errors: unknown): unknown {
  if (typeof errors !== 'object' || errors === null) {
    return errors
  }

  const errorMessages = Object.values(errors)

  if (
    !errorMessages.every(
      (error) =>
        typeof error === 'object' &&
        error !== null &&
        'field' in error &&
        'message' in error &&
        typeof error.field === 'string' &&
        typeof error.message === 'string'
    )
  ) {
    return errors
  }

  const normalizedErrors: Record<string, string | string[]> = {}

  for (const error of errorMessages) {
    if (Array.isArray(errors)) {
      const messages = normalizedErrors[error.field]
      normalizedErrors[error.field] = Array.isArray(messages)
        ? [...messages, error.message]
        : [error.message]
    } else {
      normalizedErrors[error.field] ??= error.message
    }
  }

  return normalizedErrors
}

/**
 * Resolves the target URL for a visit: the href when given, otherwise the
 * route URL with query string parameters serialized.
 */
function resolveUrl(
  tuyau: Tuyau<any>,
  props: { href?: unknown; route?: string; routeParams?: unknown; qs?: Record<string, any> }
) {
  if (props.href !== undefined) {
    return props.href
  }
  return buildRouteUrl(tuyau, props.route!, props.routeParams, props.qs)
}

/**
 * Builds the route-aware router shared by the react and vue useRouter
 * hooks. Both packages re-export the same core Inertia router, so the
 * factory only needs the client for URL building and the router for the
 * actual visits; data and options types are derived from the given router.
 */
export function createRouter<R extends RouterLike>(tuyau: Tuyau<any>, inertiaRouter: R) {
  return {
    /**
     * Navigate to a route with type-safe parameters and options, or use
     * direct href for navigation.
     *
     * When using route-based navigation, automatically resolves the route
     * URL and HTTP method based on the route definition. When using direct
     * href, passes through to Inertia's router.
     *
     * @example
     * ```ts
     * router.visit({ route: 'dashboard' })
     * router.visit({ route: 'user.edit', routeParams: { id: userId } })
     * router.visit({ href: '/logout' }, { method: 'post' })
     * ```
     */
    visit: <Route extends keyof Routes>(
      props: VisitParams<R, Route>,
      options?: Parameters<R['visit']>[1]
    ): ReturnType<R['visit']> => {
      if (props.href !== undefined) {
        return inertiaRouter.visit(props.href, options)
      }

      const { route, routeParams, qs, method } = props as RouteParams<Route>
      const { methods } = tuyau.getRoute(route, { params: routeParams })
      const url = buildRouteUrl(tuyau, route, routeParams, qs)

      return inertiaRouter.visit(url, {
        ...options,
        method: method ?? methods[0].toLowerCase(),
      })
    },

    /**
     * Method sugar mirroring the upstream router: each verb accepts only
     * routes registered for it, or a direct href. The body-carrying verbs
     * type their data from the route's declared body in route mode.
     *
     * @example
     * ```ts
     * router.get({ route: 'users.index', qs: { page: 2 } })
     * router.post({ route: 'users.store' }, { name: 'Virk' })
     * router.delete({ route: 'users.destroy', routeParams: [1] })
     * ```
     */
    get: <Route extends RoutesWithMethod<'get'>>(
      props: MethodVisitParams<R, Route>,
      data?: Parameters<R['get']>[1],
      options?: Parameters<R['get']>[2]
    ): ReturnType<R['get']> => inertiaRouter.get(resolveUrl(tuyau, props), data, options),

    post: <Route extends RoutesWithMethod<'post'> = never>(
      props: MethodVisitParams<R, Route>,
      data?: RouterRequestBody<R, 'post', Route>,
      options?: Parameters<R['post']>[2]
    ): ReturnType<R['post']> => inertiaRouter.post(resolveUrl(tuyau, props), data, options),

    put: <Route extends RoutesWithMethod<'put'> = never>(
      props: MethodVisitParams<R, Route>,
      data?: RouterRequestBody<R, 'put', Route>,
      options?: Parameters<R['put']>[2]
    ): ReturnType<R['put']> => inertiaRouter.put(resolveUrl(tuyau, props), data, options),

    patch: <Route extends RoutesWithMethod<'patch'> = never>(
      props: MethodVisitParams<R, Route>,
      data?: RouterRequestBody<R, 'patch', Route>,
      options?: Parameters<R['patch']>[2]
    ): ReturnType<R['patch']> => inertiaRouter.patch(resolveUrl(tuyau, props), data, options),

    delete: <Route extends RoutesWithMethod<'delete'>>(
      props: MethodVisitParams<R, Route>,
      options?: Parameters<R['delete']>[1]
    ): ReturnType<R['delete']> => inertiaRouter.delete(resolveUrl(tuyau, props), options),
  }
}
