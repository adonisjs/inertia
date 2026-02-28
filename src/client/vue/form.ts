/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue'
import type { PropType, SlotsType } from 'vue'
import { Form as InertiaForm } from '@inertiajs/vue3'

import { useTuyau } from './context.ts'
import type { RouteParams, RouteParamsFormats, Routes } from '../common.ts'

export type InertiaFormSlots = InstanceType<typeof InertiaForm>['$slots']
export type InertiaFormDefaultSlot = InertiaFormSlots['default']
export type InertiaFormSlotProps = InertiaFormDefaultSlot extends (...args: any[]) => any
  ? Parameters<InertiaFormDefaultSlot>[0]
  : never

/**
 * Parameters required for route navigation with proper type safety.
 */
export type FormParams<Route extends keyof Routes> = RouteParams<Route>

/**
 * Type-safe Form component for Inertia.js form submissions.
 *
 * Supports both route-based form submission with automatic URL resolution
 * and direct action for maximum flexibility.
 *
 * @example
 * ```vue
 * <!-- Route-based form -->
 * <Form route="users.store" v-slot="{ processing }">
 *   <input type="text" name="name" />
 *   <button :disabled="processing">Create</button>
 * </Form>
 *
 * <!-- Direct action form -->
 * <Form :action="{ url: '/users', method: 'post' }" v-slot="{ processing }">
 *   <input type="text" name="name" />
 *   <button :disabled="processing">Create</button>
 * </Form>
 * ```
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
      required: false,
    },
    params: {
      type: [Array, Object] as PropType<RouteParamsFormats<keyof Routes>>,
      required: false,
    },
    action: {
      type: Object as PropType<{ url: string; method: string }>,
      required: false,
    },
  },
  setup(props, { attrs, slots }) {
    const tuyau = useTuyau()

    return () => {
      // Check if using direct action
      if (props.action) {
        return h(
          InertiaForm as any,
          {
            ...attrs,
            action: props.action,
          },
          slots
        )
      }

      // Route-based navigation
      if (!props.route) {
        throw new Error('Either route or action prop is required for Form component')
      }

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
