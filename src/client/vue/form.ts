/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue'
import type { PropType, PublicProps, VNode } from 'vue'
import { Form as InertiaForm } from '@inertiajs/vue3'
// Inertia's declarations omit NodeNext-compatible extensions from internal type re-exports.
// @ts-ignore TypeScript resolves these exports correctly in client projects using Bundler resolution.
import type { FormComponentProps, FormComponentSlotProps } from '@inertiajs/core'

import { useTuyau } from './context.ts'
import type { ExtractRouteBody, RouteParams, RouteParamsFormats, Routes } from '../common.ts'

/**
 * Inertia form slot aliases kept for backward compatibility.
 */
export type InertiaFormSlots = InstanceType<typeof InertiaForm>['$slots']
export type InertiaFormDefaultSlot = InertiaFormSlots['default']
export type InertiaFormSlotProps<FormData extends Record<string, any> = Record<string, any>> =
  FormComponentSlotProps<FormData>

type RenameRouteParams<T> = T extends { routeParams: infer Params }
  ? Omit<T, 'routeParams'> & { params: Params }
  : T extends { routeParams?: infer Params }
    ? Omit<T, 'routeParams'> & { params?: Params }
    : T

/**
 * Parameters required for route navigation with proper type safety.
 */
export type FormParams<Route extends keyof Routes> = RenameRouteParams<RouteParams<Route>>

export type FormRouteProps<Route extends keyof Routes> = Omit<
  FormComponentProps<ExtractRouteBody<Route>>,
  'action' | 'method'
> &
  FormParams<Route> & {
    action?: never
  }

export type FormActionProps<FormData extends Record<string, any> = Record<string, any>> = Omit<
  FormComponentProps<FormData>,
  'route' | 'params'
> & {
  route?: never
  params?: never
}

type FormComponentContext<FormData extends Record<string, any>, Props> = {
  props: PublicProps & Props
  expose: (exposed: {}) => void
  attrs: any
  slots: {
    default: (props: InertiaFormSlotProps<FormData>) => any
  }
  emit: {}
}

type FormComponentVNode<FormData extends Record<string, any>, Props> = VNode & {
  __ctx?: FormComponentContext<FormData, Props>
}

type FormComponent = {
  <Route extends keyof Routes>(
    props: PublicProps & FormRouteProps<Route>
  ): FormComponentVNode<ExtractRouteBody<Route>, FormRouteProps<Route>>
  <FormData extends Record<string, any> = Record<string, any>>(
    props: PublicProps & FormActionProps<FormData>
  ): FormComponentVNode<FormData, FormActionProps<FormData>>
  /**
   * Combined signature used by programmatic render helpers such as Vue's h().
   */
  <Route extends keyof Routes, FormData extends Record<string, any> = Record<string, any>>(
    props: PublicProps & (FormRouteProps<Route> | FormActionProps<FormData>)
  ): FormComponentVNode<
    ExtractRouteBody<Route> | FormData,
    FormRouteProps<Route> | FormActionProps<FormData>
  >
}

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
const FormImplementation = defineComponent({
  name: 'TuyauForm',
  inheritAttrs: false,
  props: {
    route: {
      type: String as PropType<keyof Routes>,
      required: false,
    },
    params: {
      type: [Array, Object] as unknown as PropType<RouteParamsFormats<keyof Routes>>,
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

export const Form = FormImplementation as unknown as FormComponent
