/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Tuyau } from '@tuyau/core/client'
import { router as InertiaRouter } from '@inertiajs/vue3'
import type { UserRegistry, InferRoutes } from '@tuyau/core/types'

import { useTuyau } from './context.ts'
import type { LinkParams } from './link.ts'
import { buildRouteUrl, type RoutesWithMethod } from '../common.ts'

/**
 * Parameters for route-based visit
 */
type VisitRouteParams<Route extends keyof InferRoutes<UserRegistry>> = LinkParams<Route> & {
  href?: never
}

/**
 * Parameters for direct href visit - supports all Inertia visit parameters
 */
type VisitHrefParams = {
  href: Parameters<typeof InertiaRouter.visit>[0]
  route?: never
}

/**
 * Union type for visit parameters - either route-based or direct href
 */
type VisitParams<Route extends keyof InferRoutes<UserRegistry> = keyof InferRoutes<UserRegistry>> =
  VisitRouteParams<Route> | VisitHrefParams

/**
 * Parameters for the method sugar: the method is fixed by the call, so the
 * override prop is not accepted.
 */
type MethodVisitParams<Route extends keyof InferRoutes<UserRegistry>> =
  Omit<VisitRouteParams<Route>, 'method'> | VisitHrefParams

/**
 * Resolves the target URL for a visit: the href when given, otherwise the
 * route URL with query string parameters serialized.
 */
function resolveUrl(tuyau: Tuyau<any>, props: MethodVisitParams<any>) {
  if ('href' in props && props.href !== undefined) {
    return props.href
  }
  const routeProps = props as VisitRouteParams<any>
  return buildRouteUrl(tuyau, routeProps.route, routeProps.routeParams, routeProps.qs)
}

/**
 * Composable providing type-safe navigation utilities for Inertia.js.
 *
 * Returns an enhanced router object with type-safe navigation methods
 * that automatically resolve route URLs and HTTP methods based on
 * your application's route definitions. Alternatively, you can use
 * direct href for navigation.
 *
 * @returns Router object with type-safe navigation methods
 */
export function useRouter() {
  const tuyau = useTuyau()

  return {
    /**
     * Navigate to a route with type-safe parameters and options, or use
     * direct href for navigation.
     *
     * When using route-based navigation, automatically resolves the route
     * URL and HTTP method based on the route definition. When using direct
     * href, passes through to Inertia's router.
     *
     * @param props - Route navigation parameters or direct href
     * @param options - Optional Inertia visit options for controlling navigation behavior
     *
     * @example
     * ```ts
     * const router = useRouter()
     *
     * // Navigate to a simple route
     * router.visit({ route: 'dashboard' })
     *
     * // Navigate with parameters
     * router.visit({ route: 'user.edit', params: { id: userId } })
     *
     * // Navigate with direct href
     * router.visit({ href: '/about' })
     *
     * // Navigate with direct href and method
     * router.visit({ href: '/logout' }, { method: 'post' })
     * ```
     */
    visit: <Route extends keyof InferRoutes<UserRegistry>>(
      props: VisitParams<Route>,
      options?: Parameters<typeof InertiaRouter.visit>[1]
    ) => {
      // Check if using direct href
      if ('href' in props && props.href !== undefined) {
        return InertiaRouter.visit(props.href, options)
      }

      // Route-based navigation. getRoute resolves the HTTP methods and urlFor
      // builds the URL, serializing query string parameters in one place.
      const { route, routeParams, qs, method } = props as VisitRouteParams<Route>
      const { methods } = tuyau.getRoute(route, { params: routeParams })
      const url = buildRouteUrl(tuyau, route, routeParams, qs)

      return InertiaRouter.visit(url, {
        ...options,
        method: method ?? (methods[0].toLowerCase() as any),
      })
    },

    /**
     * Method sugar mirroring the upstream router: each verb accepts only
     * routes registered for it, or a direct href.
     *
     * @example
     * ```ts
     * router.get({ route: 'users.index', qs: { page: 2 } })
     * router.post({ route: 'users.store' }, { name: 'Virk' })
     * router.delete({ route: 'users.destroy', routeParams: [1] })
     * ```
     */
    get: <Route extends RoutesWithMethod<'get'>>(
      props: MethodVisitParams<Route>,
      data?: Parameters<typeof InertiaRouter.get>[1],
      options?: Parameters<typeof InertiaRouter.get>[2]
    ) => InertiaRouter.get(resolveUrl(tuyau, props) as any, data, options),

    post: <Route extends RoutesWithMethod<'post'>>(
      props: MethodVisitParams<Route>,
      data?: Parameters<typeof InertiaRouter.post>[1],
      options?: Parameters<typeof InertiaRouter.post>[2]
    ) => InertiaRouter.post(resolveUrl(tuyau, props) as any, data, options),

    put: <Route extends RoutesWithMethod<'put'>>(
      props: MethodVisitParams<Route>,
      data?: Parameters<typeof InertiaRouter.put>[1],
      options?: Parameters<typeof InertiaRouter.put>[2]
    ) => InertiaRouter.put(resolveUrl(tuyau, props) as any, data, options),

    patch: <Route extends RoutesWithMethod<'patch'>>(
      props: MethodVisitParams<Route>,
      data?: Parameters<typeof InertiaRouter.patch>[1],
      options?: Parameters<typeof InertiaRouter.patch>[2]
    ) => InertiaRouter.patch(resolveUrl(tuyau, props) as any, data, options),

    delete: <Route extends RoutesWithMethod<'delete'>>(
      props: MethodVisitParams<Route>,
      options?: Parameters<typeof InertiaRouter.delete>[1]
    ) => InertiaRouter.delete(resolveUrl(tuyau, props) as any, options),
  }
}
