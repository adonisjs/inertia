/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { UserRegistry, InferRoutes } from '@tuyau/core/types'
import { router as InertiaRouter } from '@inertiajs/vue3'

import { useTuyau } from './context.ts'
import type { LinkParams } from './link.ts'

/**
 * Composable providing type-safe navigation utilities for Inertia.js.
 */
export function useRouter() {
  const tuyau = useTuyau()

  return {
    /**
     * Navigate to a route with type-safe parameters and options.
     */
    visit: <Route extends keyof InferRoutes<UserRegistry>>(
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
