/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import React from 'react'
import { Link as InertiaLink } from '@inertiajs/react'
import { useTuyau } from './context.tsx'
import type { RouteParams, Routes } from '../common.ts'

/**
 * Parameters required for route navigation with proper type safety.
 */
export type LinkParams<Route extends keyof Routes> = RouteParams<Route>

/**
 * Props for the Link component when using route-based navigation
 */
export type LinkRouteProps<Route extends keyof Routes> = Omit<
  React.ComponentPropsWithoutRef<typeof InertiaLink>,
  'href' | 'method'
> &
  LinkParams<Route> & {
    href?: never
  }

/**
 * Props for the Link component when using direct href
 */
export type LinkHrefProps = Omit<React.ComponentPropsWithoutRef<typeof InertiaLink>, 'route'> & {
  route?: never
}

/**
 * Union type for Link component props - either route-based or direct href
 */
export type LinkProps<Route extends keyof Routes = keyof Routes> =
  | LinkRouteProps<Route>
  | LinkHrefProps

/**
 * Internal Link component implementation with forward ref support.
 * Resolves route parameters and generates the appropriate URL and HTTP method
 * for Inertia navigation when using route-based navigation.
 * Falls back to standard InertiaLink when href is provided directly.
 *
 * @param props - Link properties including route and parameters, or direct href
 * @param ref - Forward ref for the underlying InertiaLink component
 */
function LinkInner<Route extends keyof Routes>(
  props: LinkProps<Route>,
  ref?: React.ForwardedRef<React.ElementRef<typeof InertiaLink>>
) {
  const tuyau = useTuyau()

  // Check if props has href (direct navigation)
  if ('href' in props) {
    return <InertiaLink {...props} ref={ref} />
  }

  // Route-based navigation
  const { route: _route, routeParams: params, ...linkProps } = props as LinkRouteProps<Route>
  const routeInfo = tuyau.getRoute((props as any).route, { params })

  return (
    <InertiaLink
      {...linkProps}
      href={routeInfo.url}
      method={routeInfo.methods[0].toLowerCase() as any}
      ref={ref}
    />
  )
}

/**
 * Type-safe Link component for Inertia.js navigation.
 *
 * Provides compile-time route validation and automatic parameter type checking
 * based on your application's route definitions. Automatically resolves the
 * correct URL and HTTP method for each route. Alternatively, you can use
 * the standard href prop for direct navigation.
 *
 * @example
 * ```tsx
 * // Link to a route without parameters
 * <Link route="home">Home</Link>
 *
 * // Link to a route with required parameters
 * <Link route="user.show" routeParams={{ id: 1 }}>
 *   View User
 * </Link>
 *
 * // Link with direct href
 * <Link href="/about">About</Link>
 * ```
 */

export const Link: <Route extends keyof Routes>(
  props: LinkProps<Route> & {
    ref?: React.Ref<React.ElementRef<typeof InertiaLink>>
  }
) => ReturnType<typeof LinkInner> = React.forwardRef(LinkInner as any) as any
