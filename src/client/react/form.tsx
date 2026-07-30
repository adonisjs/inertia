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
// Inertia's declarations omit NodeNext-compatible extensions from internal type re-exports.
// @ts-ignore TypeScript resolves these exports correctly in client projects using Bundler resolution.
import type { FormComponentProps, FormComponentRef, FormComponentSlotProps } from '@inertiajs/core'
import { useTuyau } from './context.tsx'
import type { ExtractRouteBody, RouteParams, Routes } from '../common.ts'

const BaseForm = InertiaForm as any

type InertiaFormProps<FormData extends object> = FormComponentProps<FormData> &
  Omit<React.FormHTMLAttributes<HTMLFormElement>, keyof FormComponentProps | 'children'> &
  Omit<React.AllHTMLAttributes<HTMLFormElement>, keyof FormComponentProps | 'children'> & {
    children?: React.ReactNode | ((props: FormComponentSlotProps<FormData>) => React.ReactNode)
  }

export type FormRef<FormData extends object> = FormComponentRef<FormData>

/**
 * Parameters required for route navigation with proper type safety.
 */
export type FormParams<Route extends keyof Routes> = RouteParams<Route>

/**
 * Props for the Form component when using route-based navigation
 */
export type FormRouteProps<Route extends keyof Routes> = Omit<
  InertiaFormProps<ExtractRouteBody<Route>>,
  'action' | 'method'
> &
  FormParams<Route> & {
    action?: never
  }

/**
 * Props for the Form component when using direct action
 */
export type FormActionProps<FormData extends object = Record<string, any>> = Omit<
  InertiaFormProps<FormData>,
  'route'
> & {
  route?: never
}

/**
 * Union type for Form component props - either route-based or direct action
 */
export type FormProps<
  Route extends keyof Routes = keyof Routes,
  FormData extends object = Record<string, any>,
> = FormRouteProps<Route> | FormActionProps<FormData>

/**
 * Internal Form component implementation with forward ref support.
 * Resolves route parameters and generates the appropriate URL and HTTP method
 * for Inertia form submission when using route-based navigation.
 * Falls back to standard InertiaForm when action is provided directly.
 */
function FormInner<
  Route extends keyof Routes = keyof Routes,
  FormData extends object = Record<string, any>,
>(
  props: FormProps<Route, FormData>,
  ref?: React.ForwardedRef<FormRef<ExtractRouteBody<Route>> | FormRef<FormData>>
) {
  const tuyau = useTuyau()

  // Check if props has action (direct form submission)
  if ('action' in props) {
    return <BaseForm {...props} ref={ref} />
  }

  // Route-based navigation
  const { route: _route, routeParams: params, ...formProps } = props as FormRouteProps<Route>
  const routeInfo = tuyau.getRoute((props as any).route, { params })

  return (
    <BaseForm
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
 * correct URL and HTTP method for each route. Alternatively, you can use
 * the standard action prop for direct form submission.
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
 * <Form route="users.update" routeParams={{ id: 1 }}>
 *   {({ errors }) => (
 *     <>
 *       <input type="text" name="name" />
 *       {errors.name && <div>{errors.name}</div>}
 *       <button type="submit">Update</button>
 *     </>
 *   )}
 * </Form>
 *
 * // Form with direct action
 * <Form action={{ url: '/users', method: 'post' }}>
 *   {({ processing }) => (
 *     <>
 *       <input type="text" name="name" />
 *       <button type="submit" disabled={processing}>Create</button>
 *     </>
 *   )}
 * </Form>
 * ```
 */
export const Form: {
  <Route extends keyof Routes>(
    props: FormRouteProps<Route> & {
      ref?: React.Ref<FormRef<ExtractRouteBody<Route>>>
    }
  ): ReturnType<typeof FormInner>
  <FormData extends object = Record<string, any>>(
    props: FormActionProps<FormData> & {
      ref?: React.Ref<FormRef<FormData>>
    }
  ): ReturnType<typeof FormInner>
  /**
   * Combined signature used by component helpers such as React.createElement.
   */
  <Route extends keyof Routes, FormData extends object = Record<string, any>>(
    props:
      | (FormRouteProps<Route> & {
          ref?: React.Ref<FormRef<ExtractRouteBody<Route>>>
        })
      | (FormActionProps<FormData> & {
          ref?: React.Ref<FormRef<FormData>>
        })
  ): ReturnType<typeof FormInner>
} = React.forwardRef(FormInner as any) as any
