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
// @ts-ignore TypeScript resolves this export correctly in client projects using Bundler resolution.
import type { FormDataErrors } from '@inertiajs/core'
import type { Prettify } from '@poppinss/utils/types'

import { useTuyau } from './context.tsx'
import { buildRouteUrl } from '../common.ts'
import type { ExtractRouteBody, RouteParams, Routes } from '../types.ts'

/**
 * Parameters required for route navigation with proper type safety.
 */
export type FormParams<Route extends keyof Routes> = RouteParams<Route>

/**
 * Props of the bundled Inertia Form component, keyed by the form-data shape.
 * `ComponentPropsWithoutRef<typeof InertiaForm>` cannot be used here:
 * inferring props from the generic call signature erases `TForm` to its bare
 * constraint instead of applying the given form-data type, which collapses
 * the render prop's `errors` to `{}`. The instantiation expression applies
 * the form-data type eagerly.
 */
type InertiaFormProps<FormData extends object = Record<string, any>> = Omit<
  Parameters<typeof InertiaForm<FormData>>[0],
  'ref'
>

/**
 * Slot props received by the children render prop, keyed by the form-data
 * shape. In route mode the form-data shape is the route's declared body; in
 * action mode it is the explicit `Form` generic.
 */
export type FormSlotProps<FormData extends object = Record<string, any>> = Omit<
  Parameters<
    Extract<Parameters<typeof InertiaForm<FormData>>[0]['children'], (...args: any[]) => any>
  >[0],
  'errors'
> & {
  errors: Prettify<FormDataErrors<FormData>>
}

/**
 * Instance exposed on the Form ref.
 */
export type FormRef<FormData extends object = Record<string, any>> =
  NonNullable<Parameters<typeof InertiaForm<FormData>>[0]['ref']> extends React.Ref<infer R>
    ? R
    : never

/**
 * Children accepted by the Form component. Declared directly (rather than
 * carried through `Omit` of a deferred type) so the render prop's parameter
 * stays contextually typed at call sites.
 */
type FormChildren<FormData extends object> =
  | React.ReactNode
  | ((props: FormSlotProps<FormData>) => React.ReactNode)

/**
 * Props for the Form component when using route-based navigation. The
 * form-data shape is derived from the route's declared body type, so the
 * render prop, reset options, transform, and ref are all typed from the
 * route without a manual generic.
 */
export type FormRouteProps<Route extends keyof Routes> = Omit<
  InertiaFormProps<ExtractRouteBody<Route>>,
  'action' | 'method' | 'children'
> &
  FormParams<Route> & {
    action?: never
    children?: FormChildren<ExtractRouteBody<Route>>
  }

/**
 * Props for the Form component when using direct action
 */
export type FormActionProps<FormData extends object = Record<string, any>> = Omit<
  InertiaFormProps<FormData>,
  'route' | 'children'
> & {
  route?: never
  routeParams?: never
  qs?: never
  children?: FormChildren<FormData>
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
  if ('action' in props && props.action !== undefined) {
    /**
     * The spreads are untyped on purpose: the public FormProps surface
     * carries the type safety, while the upstream component would try to
     * re-infer the form-data type from the spread and clash with the outer
     * generic.
     */
    return <InertiaForm {...(props as any)} ref={ref} />
  }

  // Route-based navigation. getRoute resolves the HTTP methods and urlFor
  // builds the URL, serializing query string parameters in one place.
  const {
    route,
    routeParams: params,
    qs,
    method,
    ...formProps
  } = props as FormRouteProps<Route>
  const { methods } = tuyau.getRoute(route, { params })
  const url = buildRouteUrl(tuyau, route, params, qs)

  return (
    <InertiaForm
      {...(formProps as any)}
      action={{ url, method: method ?? (methods[0].toLowerCase() as any) }}
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
