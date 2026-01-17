/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Tuyau } from '@tuyau/core/client'
import type { TuyauRegistry } from '@tuyau/core/types'
import { defineComponent, inject, provide } from 'vue'
import type { InjectionKey, PropType } from 'vue'

/**
 * Vue context for providing Tuyau client instance throughout the component tree
 */
const TuyauContext = Symbol('Tuyau') as InjectionKey<Tuyau<any>>

/**
 * Provider component that makes the Tuyau client available to child components.
 */
export const TuyauProvider = defineComponent({
  name: 'TuyauProvider',
  props: {
    client: {
      type: Object as PropType<Tuyau<TuyauRegistry>>,
      required: true,
    },
  },
  setup(props, { slots }) {
    provide(TuyauContext, props.client)
    return () => slots.default?.()
  },
})

/**
 * Composable to access the Tuyau client from any component within a TuyauProvider.
 */
export function useTuyau() {
  const context = inject(TuyauContext, null)
  if (!context) throw new Error('You must wrap your app in a TuyauProvider')

  return context
}
