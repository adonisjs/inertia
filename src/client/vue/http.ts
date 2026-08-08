/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { useHttp as useInertiaHttp } from '@inertiajs/vue3'
// Inertia's declarations omit NodeNext-compatible extensions from internal type re-exports.
// prettier-ignore
// @ts-ignore TypeScript resolves these exports in client projects using Bundler resolution.
import type { ErrorValue, FormDataErrors, FormDataKeys, FormDataType, FormDataValues, Method, UrlMethodPair, UseFormTransformCallback, UseHttpSubmitOptions } from '@inertiajs/core'

import { useTuyau } from './context.ts'
import { buildRouteUrl, normalizeValidationErrors } from '../common.ts'
import type { ExtractRouteBody, RouteParams, Routes } from '../types.ts'

/**
 * Inertia HTTP form bound to a Tuyau route.
 */
export type RouteHttp<Route extends keyof Routes> = Omit<
  ReturnType<
    typeof useInertiaHttp<FormDataType<ExtractRouteBody<Route>>, Routes[Route]['types']['response']>
  >,
  | 'submit'
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'withPrecognition'
  | 'transform'
  | 'defaults'
  | 'reset'
  | 'clearErrors'
  | 'resetAndClearErrors'
  | 'setError'
  | 'dontRemember'
  | 'optimistic'
  | 'withAllErrors'
> & {
  /**
   * Submit the form to its bound route.
   */
  submit(
    options?: UseHttpSubmitOptions<
      Routes[Route]['types']['response'],
      FormDataType<ExtractRouteBody<Route>>
    >
  ): Promise<Routes[Route]['types']['response']>

  /**
   * Transform the form data before it is submitted.
   */
  transform(
    callback: UseFormTransformCallback<FormDataType<ExtractRouteBody<Route>>>
  ): RouteHttp<Route>

  /**
   * Update the defaults used when resetting the form.
   */
  defaults(): RouteHttp<Route>
  defaults<Field extends FormDataKeys<FormDataType<ExtractRouteBody<Route>>>>(
    field: Field,
    value: FormDataValues<FormDataType<ExtractRouteBody<Route>>, Field>
  ): RouteHttp<Route>
  defaults(fields: Partial<FormDataType<ExtractRouteBody<Route>>>): RouteHttp<Route>

  /**
   * Reset selected fields, or every field when none are provided, to their defaults.
   */
  reset(...fields: FormDataKeys<FormDataType<ExtractRouteBody<Route>>>[]): RouteHttp<Route>

  /**
   * Clear errors for selected fields, or every field when none are provided.
   */
  clearErrors(...fields: FormDataKeys<FormDataType<ExtractRouteBody<Route>>>[]): RouteHttp<Route>

  /**
   * Reset selected fields and clear their errors.
   */
  resetAndClearErrors(
    ...fields: FormDataKeys<FormDataType<ExtractRouteBody<Route>>>[]
  ): RouteHttp<Route>

  /**
   * Set one or more errors on the form.
   */
  setError(
    field: FormDataKeys<FormDataType<ExtractRouteBody<Route>>>,
    value: ErrorValue
  ): RouteHttp<Route>
  setError(errors: FormDataErrors<FormDataType<ExtractRouteBody<Route>>>): RouteHttp<Route>

  /**
   * Exclude fields when the form state is remembered.
   */
  dontRemember(...fields: FormDataKeys<FormDataType<ExtractRouteBody<Route>>>[]): RouteHttp<Route>

  /**
   * Apply an optimistic data update to the next submission.
   */
  optimistic(
    callback: (
      data: FormDataType<ExtractRouteBody<Route>>
    ) => Partial<FormDataType<ExtractRouteBody<Route>>>
  ): RouteHttp<Route>

  /**
   * Preserve all validation messages returned for each field.
   */
  withAllErrors(): RouteHttp<Route>
}

function useHttpImplementation(...args: any[]) {
  const tuyau = useTuyau()
  const params = args[0]
  const isRouteMode =
    typeof params === 'object' && params !== null && typeof params.route === 'string'
  let inertiaArgs = args

  if (isRouteMode) {
    const { methods } = tuyau.getRoute(params.route, { params: params.routeParams })
    inertiaArgs = [
      {
        url: buildRouteUrl(tuyau, params.route, params.routeParams, params.qs),
        method: params.method ?? methods[0].toLowerCase(),
      },
      args[1] ?? {},
    ]
  }

  const request = (useInertiaHttp as (...httpArgs: any[]) => any)(...inertiaArgs)

  const withErrorNormalization = (options: any = {}) => {
    return {
      ...options,
      onError(errors: unknown) {
        const normalizedErrors = normalizeValidationErrors(errors)

        if (normalizedErrors !== errors) {
          request.clearErrors()
          request.setError(normalizedErrors)
        }

        options.onError?.(normalizedErrors)
      },
    }
  }

  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const send = request[method]
    request[method] = (url: string, options?: any) => send(url, withErrorNormalization(options))
  }

  const submit = request.submit
  request.submit = (...submitArgs: any[]) => {
    const optionsIndex =
      typeof submitArgs[0] === 'string' ? 2 : submitArgs[0]?.url !== undefined ? 1 : 0

    submitArgs[optionsIndex] = withErrorNormalization(submitArgs[optionsIndex])
    return submit(...submitArgs)
  }

  return request
}

/**
 * Creates an Inertia HTTP form.
 *
 * Passing a Tuyau route infers the request body and response from the route
 * registry and binds submissions to that endpoint. The returned form keeps
 * Inertia's state and form-management API, but exposes submit as its only
 * endpoint-issuing method. Calls without a route retain Inertia's native
 * useHttp signatures. AdonisJS validation errors are normalized to Inertia's
 * field-keyed error format for each request. The composable must be called
 * inside a TuyauProvider.
 *
 * @example
 * ```ts
 * const request = useHttp(
 *   { route: 'users.store' },
 *   { email: 'virk@adonisjs.com' }
 * )
 *
 * await request.submit()
 * ```
 *
 * @example
 * ```ts
 * const request = useHttp({ query: '' })
 * await request.get('/api/users')
 * ```
 *
 * @throws Error when called outside a TuyauProvider
 */
export const useHttp = useHttpImplementation as {
  <Route extends keyof Routes>(
    params: RouteParams<Route>,
    data?: FormDataType<ExtractRouteBody<Route>> | (() => FormDataType<ExtractRouteBody<Route>>)
  ): RouteHttp<Route>

  <FormData extends FormDataType<FormData>, Response = unknown>(
    method: Method | (() => Method),
    url: string | (() => string),
    data: FormData | (() => FormData)
  ): ReturnType<ReturnType<typeof useInertiaHttp<FormData, Response>>['withPrecognition']>

  <FormData extends FormDataType<FormData>, Response = unknown>(
    urlMethodPair: UrlMethodPair | (() => UrlMethodPair),
    data: FormData | (() => FormData)
  ): ReturnType<ReturnType<typeof useInertiaHttp<FormData, Response>>['withPrecognition']>

  <FormData extends FormDataType<FormData>, Response = unknown>(
    rememberKey: string,
    data: FormData | (() => FormData)
  ): ReturnType<typeof useInertiaHttp<FormData, Response>>

  <FormData extends FormDataType<FormData>, Response = unknown>(
    data: (FormData & { route?: never }) | (() => FormData)
  ): ReturnType<typeof useInertiaHttp<FormData, Response>>

  <FormData extends FormDataType<FormData>, Response = unknown>(): ReturnType<
    typeof useInertiaHttp<FormData, Response>
  >
}
