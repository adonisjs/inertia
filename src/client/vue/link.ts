/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { PropType } from 'vue'
import { defineComponent, h } from 'vue'
import { Link as InertiaLink } from '@inertiajs/vue3'

import { useTuyau } from './context.ts'
import { buildRouteUrl, type RouteParams, type RouteParamsFormats, type Routes } from '../common.ts'

/**
 * Parameters required for route navigation with proper type safety.
 */
export type LinkParams<Route extends keyof Routes> = RouteParams<Route>

/**
 * Type-safe Link component for Inertia.js navigation.
 *
 * Supports both route-based navigation with automatic URL resolution
 * and direct href navigation for maximum flexibility.
 *
 * @example
 * ```vue
 * <!-- Route-based navigation -->
 * <Link route="users.index">Users</Link>
 * <Link route="users.show" :params="{ id: 1 }">View User</Link>
 *
 * <!-- Direct href navigation -->
 * <Link href="/about">About</Link>
 * <Link href="/logout" method="post">Logout</Link>
 * ```
 */
export const Link = defineComponent({
  name: 'TuyauLink',
  inheritAttrs: false,
  props: {
    route: {
      type: String as PropType<keyof Routes>,
      required: false,
    },
    params: {
      type: [Array, Object] as PropType<RouteParamsFormats<keyof Routes>>,
      required: false,
    },
    qs: {
      type: Object as PropType<Record<string, any>>,
      required: false,
    },
    href: {
      type: String,
      required: false,
    },
  },
  setup(props, { attrs, slots }) {
    const tuyau = useTuyau()

    return () => {
      // Check if using direct href
      if (props.href) {
        return h(
          InertiaLink as any,
          {
            ...attrs,
            href: props.href,
          },
          slots
        )
      }

      // Route-based navigation
      if (!props.route) {
        throw new Error('Either route or href prop is required for Link component')
      }

      const { methods } = tuyau.getRoute(props.route, { params: props.params })
      const href = buildRouteUrl(tuyau, props.route, props.params, props.qs)

      return h(
        InertiaLink as any,
        {
          ...attrs,
          href,
          method: methods[0].toLowerCase() as any,
        },
        slots
      )
    }
  },
})
