/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Link as InertiaLink } from '@inertiajs/vue3'
import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import { useTuyau } from './context.ts'
import type { RouteParams, RouteParamsFormats, Routes } from '../common.ts'

/**
 * Parameters required for route navigation with proper type safety.
 */
export type LinkParams<Route extends keyof Routes> = RouteParams<Route>

/**
 * Type-safe Link component for Inertia.js navigation.
 */
export const Link = defineComponent({
  name: 'TuyauLink',
  inheritAttrs: false,
  props: {
    route: {
      type: String as PropType<keyof Routes>,
      required: true,
    },
    params: {
      type: [Array, Object] as PropType<RouteParamsFormats<keyof Routes>>,
      required: false,
    },
  },
  setup(props, { attrs, slots }) {
    const tuyau = useTuyau()

    return () => {
      const routeInfo = tuyau.getRoute(props.route, { params: props.params as any })

      return h(
        InertiaLink as any,
        {
          ...attrs,
          href: routeInfo.url,
          method: routeInfo.methods[0].toLowerCase() as any,
        },
        slots
      )
    }
  },
})
