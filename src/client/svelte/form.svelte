<!--
  @adonisjs/inertia

  (c) AdonisJS

  For the full copyright and license information, please view the LICENSE
  file that was distributed with this source code.
-->
<!--
  @component
  Type-safe Form component for Inertia.js form submissions.

  Provides compile-time route validation and automatic parameter type
  checking based on your application's route definitions. Automatically
  resolves the correct URL and HTTP method for each route. Alternatively,
  you can use the standard action prop for direct form submission.

  In route mode the form-data shape is derived from the route's declared
  body, so the children snippet (errors, getData, reset, ...) follows the
  route without a manual generic.

  ```svelte
  <Form route="users.store">
    {#snippet children({ processing })}
      <input type="text" name="name" />
      <button type="submit" disabled={processing}>Create</button>
    {/snippet}
  </Form>

  <Form route="users.update" routeParams={{ id: 1 }}>
    {#snippet children({ errors })}
      <input type="text" name="name" />
      {#if errors.name}<div>{errors.name}</div>{/if}
      <button type="submit">Update</button>
    {/snippet}
  </Form>

  <Form action={{ url: '/users', method: 'post' }}>
    {#snippet children({ processing })}
      <input type="text" name="name" />
      <button type="submit" disabled={processing}>Create</button>
    {/snippet}
  </Form>
  ```
-->
<script
  lang="ts"
  generics="Route extends keyof Routes, FormData extends Record<string, any> = FormDataType<ExtractRouteBody<Route>>"
>
  import { Form as InertiaForm } from '@inertiajs/svelte'
  // Inertia's declarations omit NodeNext-compatible extensions from internal type re-exports.
  // prettier-ignore
  // @ts-ignore TypeScript resolves this export correctly in client projects using Bundler resolution.
  import type { FormDataType } from '@inertiajs/core'

  import { buildRouteUrl, useTuyau } from './internals.js'
  import type { ExtractRouteBody, Routes } from '../types.ts'
  import type { FormProps, FormRouteProps } from './types.ts'

  /**
   * `FormData` is a second type parameter rather than only a default on
   * FormProps so action mode stays inferable: with no route to derive the
   * form-data shape from, it is recovered from an annotated `children`
   * snippet parameter instead. Route mode never supplies it and falls to the
   * default, which follows the route's declared body.
   */
  const props: FormProps<Route, FormData> = $props()

  /**
   * Read during initialisation: svelte contexts are only readable while the
   * component is being set up, so this cannot be deferred into the derived
   * below.
   */
  const tuyau = useTuyau()

  /**
   * Forwarded so `bind:this` on the wrapper reaches the upstream form API
   * (submit, reset, setError, ...) instead of the wrapper itself.
   */
  let inner = $state<any>(undefined)

  export const getFormData = (...args: any[]) => inner?.getFormData(...args)
  export const getData = (...args: any[]) => inner?.getData(...args)
  export const submit = (...args: any[]) => inner?.submit(...args)
  export const reset = (...args: any[]) => inner?.reset(...args)
  export const clearErrors = (...args: any[]) => inner?.clearErrors(...args)
  export const resetAndClearErrors = (...args: any[]) => inner?.resetAndClearErrors(...args)
  export const setError = (...args: any[]) => inner?.setError(...args)
  export const defaults = (...args: any[]) => inner?.defaults(...args)
  export const validate = (...args: any[]) => inner?.validate(...args)
  export const valid = (...args: any[]) => inner?.valid(...args)
  export const invalid = (...args: any[]) => inner?.invalid(...args)
  export const touch = (...args: any[]) => inner?.touch(...args)
  export const touched = (...args: any[]) => inner?.touched(...args)
  export const validator = (...args: any[]) => inner?.validator(...args)

  /**
   * Route-based navigation. getRoute resolves the HTTP methods and urlFor
   * builds the URL, serializing query string parameters in one place.
   *
   * The action mode short-circuits: the route bindings are stripped and
   * every remaining prop is forwarded untouched, so a plain form behaves
   * exactly like the upstream component.
   */
  const resolved = $derived.by(() => {
    const { route, routeParams, qs, method, ...formProps } = props as FormRouteProps<Route> & {
      action?: unknown
    }

    if (formProps.action !== undefined) {
      return method === undefined ? formProps : { ...formProps, method }
    }

    const { methods } = tuyau.getRoute(route, { params: routeParams })

    return {
      ...formProps,
      action: {
        url: buildRouteUrl(tuyau, route, routeParams, qs),
        method: method ?? methods[0].toLowerCase(),
      },
    }
  })
</script>

<InertiaForm bind:this={inner} {...resolved} />
