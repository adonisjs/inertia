/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { PropType, PublicProps, VNode } from 'vue'
import { defineComponent, h } from 'vue'
import { Link as InertiaLink } from '@inertiajs/vue3'

import { useTuyau } from './context.ts'
import { buildRouteUrl } from '../common.ts'
import type { RouteParams, RouteParamsFormats, Routes, VueRouteParams } from '../types.ts'

/**
 * Parameters required for route navigation with proper type safety. Kept on
 * the `routeParams` naming used by useRouter().visit; the Link component
 * itself binds the parameters under the `params` prop.
 */
export type LinkParams<Route extends keyof Routes> = RouteParams<Route>

/**
 * Props of the bundled Inertia Link component, extracted from its public
 * instance so the wrapper stays in sync with the installed client version.
 */
type InertiaLinkProps = InstanceType<typeof InertiaLink>['$props']

/**
 * Props for the Link component when using route-based navigation
 */
export type LinkRouteProps<Route extends keyof Routes> = Omit<InertiaLinkProps, 'href' | 'method'> &
  VueRouteParams<Route> & {
    href?: never
  }

/**
 * Props for the Link component when using direct href
 */
export type LinkHrefProps = Omit<InertiaLinkProps, 'href' | 'method'> & {
  href: NonNullable<InertiaLinkProps['href']>
  method?: InertiaLinkProps['method']
  route?: never
  params?: never
  qs?: never
}

type LinkComponentVNode<Props> = VNode & {
  __ctx?: {
    props: PublicProps & Props
    expose: (exposed: {}) => void
    attrs: any
    slots: InstanceType<typeof InertiaLink>['$slots']
    emit: {}
  }
}

type LinkComponent = {
  <Route extends keyof Routes>(
    props: PublicProps & LinkRouteProps<Route>
  ): LinkComponentVNode<LinkRouteProps<Route>>
  (props: PublicProps & LinkHrefProps): LinkComponentVNode<LinkHrefProps>
  /**
   * Combined signature used by programmatic render helpers such as Vue's h().
   */
  <Route extends keyof Routes>(
    props: PublicProps & (LinkRouteProps<Route> | LinkHrefProps)
  ): LinkComponentVNode<LinkRouteProps<Route> | LinkHrefProps>
}

/**
 * Runtime component. Only the wrapper-owned props are declared so every
 * upstream prop keeps flowing through attrs untouched; the exported
 * LinkComponent type above is what templates typecheck against.
 */
const LinkImplementation = defineComponent({
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
    method: {
      type: String,
      required: false,
    },
    href: {
      type: [String, Object] as PropType<NonNullable<InertiaLinkProps['href']>>,
      required: false,
    },
  },
  setup(props, { attrs, slots }) {
    const tuyau = useTuyau()

    return () => {
      // Check if using direct href
      if (props.href !== undefined) {
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
          method: props.method ?? (methods[0].toLowerCase() as any),
        },
        slots
      )
    }
  },
})

/**
 * Type-safe Link component for Inertia.js navigation.
 *
 * Supports both route-based navigation with automatic URL resolution
 * and direct href navigation for maximum flexibility. The published type
 * merges the upstream Link props (preserve-scroll, prefetch, data, ...)
 * with the wrapper's route bindings, so templates typecheck the full
 * surface while the runtime keeps forwarding upstream props through attrs.
 *
 * @example
 * ```vue
 * <!-- Route-based navigation -->
 * <Link route="users.index">Users</Link>
 * <Link route="users.show" :params="{ id: 1 }">View User</Link>
 * <Link route="users.index" :qs="{ page: 2 }" preserve-scroll>Next</Link>
 *
 * <!-- Direct href navigation -->
 * <Link href="/about">About</Link>
 * <Link href="/logout" method="post">Logout</Link>
 * ```
 */
export const Link = LinkImplementation as unknown as LinkComponent
