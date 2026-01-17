/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import React from 'react'
import { Form as InertiaForm } from '@inertiajs/react'
import { useTuyau } from './context.tsx'
import type { RouteParams, Routes } from '../common.ts'

/**
 * Parameters required for route navigation with proper type safety.
 */
export type FormParams<Route extends keyof Routes> = RouteParams<Route>

/**
 * Props for the Form component extending InertiaForm props
 * with route-specific type safety and parameter validation.
 */
type FormProps<Route extends keyof Routes> = Omit<
  React.ComponentPropsWithoutRef<typeof InertiaForm>,
  'action' | 'method'
> &
  FormParams<Route>

/**
 * Internal Form component implementation with forward ref support.
 * Resolves route parameters and generates the appropriate URL and HTTP method
 * for Inertia form submission.
 */
function FormInner<Route extends keyof Routes>(
  props: FormProps<Route>,
  ref?: React.ForwardedRef<React.ElementRef<typeof InertiaForm>>
) {
  const { route: _route, params, ...formProps } = props

  const tuyau = useTuyau()
  const routeInfo = tuyau.getRoute(props.route, { params })

  return (
    <InertiaForm
      {...formProps}
      action={{ url: routeInfo.url, method: routeInfo.methods[0].toLowerCase() as any }}
      ref={ref}
    />
  )
}

/**
 * Type-safe Form component for Inertia.js form submissions.
 *
 * Provides compile-time route validation and automatic parameter type checking
 * based on your application's route definitions. Automatically resolves the
 * correct URL and HTTP method for each route.
 *
 * @example
 * ```tsx
 * // Form to a route without parameters
 * <Form route="users.store">
 *   {({ processing }) => (
 *     <>
 *       <input type="text" name="name" />
 *       <button type="submit" disabled={processing}>Create</button>
 *     </>
 *   )}
 * </Form>
 *
 * // Form to a route with required parameters
 * <Form route="users.update" params={{ id: 1 }}>
 *   {({ errors }) => (
 *     <>
 *       <input type="text" name="name" />
 *       {errors.name && <div>{errors.name}</div>}
 *       <button type="submit">Update</button>
 *     </>
 *   )}
 * </Form>
 * ```
 */
export const Form: <Route extends keyof Routes>(
  props: FormProps<Route> & {
    ref?: React.Ref<React.ElementRef<typeof InertiaForm>>
  }
) => ReturnType<typeof FormInner> = React.forwardRef(FormInner as any) as any
