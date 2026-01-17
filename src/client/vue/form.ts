/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Form as InertiaForm } from '@inertiajs/vue3'
import { defineComponent, h } from 'vue'
import type { PropType, SlotsType } from 'vue'
import { useTuyau } from './context.ts'
import type { RouteParams, RouteParamsFormats, Routes } from '../common.ts'

type InertiaFormSlots = InstanceType<typeof InertiaForm>['$slots']
type InertiaFormDefaultSlot = InertiaFormSlots['default']
type InertiaFormSlotProps = InertiaFormDefaultSlot extends (...args: any[]) => any
  ? Parameters<InertiaFormDefaultSlot>[0]
  : never

/**
 * Parameters required for route navigation with proper type safety.
 */
export type FormParams<Route extends keyof Routes> = RouteParams<Route>

/**
 * Type-safe Form component for Inertia.js form submissions.
 */
export const Form = defineComponent({
  name: 'TuyauForm',
  inheritAttrs: false,
  slots: Object as SlotsType<{
    default: InertiaFormSlotProps
  }>,
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
        InertiaForm as any,
        {
          ...attrs,
          action: { url: routeInfo.url, method: routeInfo.methods[0].toLowerCase() as any },
        },
        slots
      )
    }
  },
})
