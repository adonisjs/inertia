/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { router as InertiaRouter } from '@inertiajs/vue3'
import type { UserRegistry, InferRoutes } from '@tuyau/core/types'

import { useTuyau } from './context.ts'
import type { LinkParams } from './link.ts'

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
  | VisitRouteParams<Route>
  | VisitHrefParams

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
      if ('href' in props) {
        return InertiaRouter.visit(props.href, options)
      }

      // Route-based navigation
      const routeInfo = tuyau.getRoute((props as VisitRouteParams<Route>).route, {
        params: (props as VisitRouteParams<Route>).params,
      })
      const url = routeInfo.url

      return InertiaRouter.visit(url, {
        ...options,
        method: routeInfo.methods[0].toLowerCase() as any,
      })
    },
  }
}
