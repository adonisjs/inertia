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
 * Props for the Link component extending InertiaLink props
 * with route-specific type safety and parameter validation.
 */
type LinkProps<Route extends keyof Routes> = Omit<
  React.ComponentPropsWithoutRef<typeof InertiaLink>,
  'href' | 'method'
> &
  LinkParams<Route>

/**
 * Internal Link component implementation with forward ref support.
 * Resolves route parameters and generates the appropriate URL and HTTP method
 * for Inertia navigation.
 *
 * @param props - Link properties including route and parameters
 * @param ref - Forward ref for the underlying InertiaLink component
 */
function LinkInner<Route extends keyof Routes>(
  props: LinkProps<Route>,
  ref?: React.ForwardedRef<React.ElementRef<typeof InertiaLink>>
) {
  const { route: _route, params, ...linkProps } = props

  const tuyau = useTuyau()
  const routeInfo = tuyau.getRoute(props.route, { params })

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
 * correct URL and HTTP method for each route.
 *
 * @example
 * ```tsx
 * // Link to a route without parameters
 * <Link route="home">Home</Link>
 *
 * // Link to a route with required parameters
 * <Link route="user.show" params={{ id: 1 }}>
 *   View User
 * </Link>
 * ```
 */

export const Link: <Route extends keyof Routes>(
  props: LinkProps<Route> & {
    ref?: React.Ref<React.ElementRef<typeof InertiaLink>>
  }
) => ReturnType<typeof LinkInner> = React.forwardRef(LinkInner as any) as any
