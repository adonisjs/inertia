/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { UserRegistry } from '@tuyau/core/types'
import { router as InertiaRouter } from '@inertiajs/react'

import { useTuyau } from './context.tsx'
import type { LinkParams } from './link.tsx'

/**
 * Custom hook providing type-safe navigation utilities for Inertia.js.
 *
 * Returns an enhanced router object with type-safe navigation methods
 * that automatically resolve route URLs and HTTP methods based on
 * your application's route definitions.
 *
 * @returns Router object with type-safe navigation methods
 */
export function useRouter() {
  const tuyau = useTuyau()

  return {
    /**
     * Navigate to a route with type-safe parameters and options.
     *
     * Automatically resolves the route URL and HTTP method based on the
     * route definition, then performs the navigation using Inertia's router.
     *
     * @param props - Route navigation parameters including route name and params
     * @param options - Optional Inertia visit options for controlling navigation behavior
     *
     * @example
     * ```tsx
     * // Navigate to a simple route
     * router.visit({ route: 'dashboard' })
     *
     * // Navigate with parameters
     * router.visit({ route: 'user.edit', params: { id: userId } })
     * ```
     */
    visit: <Route extends keyof UserRegistry>(
      props: LinkParams<Route>,
      options?: Parameters<typeof InertiaRouter.visit>[1]
    ) => {
      const routeInfo = tuyau.getRoute(props.route, { params: props.params })
      const url = routeInfo.url

      return InertiaRouter.visit(url, {
        ...options,
        method: routeInfo.methods[0].toLowerCase() as any,
      })
    },
  }
}
