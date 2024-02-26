/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { configProvider } from '@adonisjs/core'
import { RuntimeException } from '@poppinss/utils'
import type { PluginFn } from '@japa/runner/types'
import { ApiRequest, ApiResponse } from '@japa/api-client'
import type { ApplicationService } from '@adonisjs/core/types'

import type { PageProps, ResolvedConfig } from '../../types.js'

declare module '@japa/api-client' {
  export interface ApiRequest {
    /**
     * Set `X-Inertia` header on the request
     */
    withInertia(): this

    /**
     * Set `X-Inertia-Partial-Data` and `X-Inertia-Partial-Component` headers on the request
     */
    withInertiaPartialReload(component: string, data: string[]): this
  }

  export interface ApiResponse {
    /**
     * The inertia component
     */
    inertiaComponent?: string

    /**
     * The inertia response props
     */
    inertiaProps: Record<string, any>

    /**
     * Assert component name of inertia response
     */
    assertInertiaComponent(component: string): this

    /**
     * Assert props to be exactly the same as the given props
     */
    assertInertiaProps(props: PageProps): this

    /**
     * Assert inertia props contains a subset of the given props
     */
    assertInertiaPropsContains(props: PageProps): this
  }
}

/**
 * Ensure the response is an inertia response, otherwise throw an error
 */
function ensureIsInertiaResponse(this: ApiResponse) {
  if (!this.header('x-inertia')) {
    throw new Error(
      'Response is not an Inertia response. Make sure to call `withInertia()` on the request'
    )
  }
}

export function inertiaApiClient(app: ApplicationService): PluginFn {
  return async () => {
    const inertiaConfigProvider = app.config.get<any>('inertia')
    const config = await configProvider.resolve<ResolvedConfig>(app, inertiaConfigProvider)
    if (!config) {
      throw new RuntimeException(
        'Invalid "config/inertia.ts" file. Make sure you are using the "defineConfig" method'
      )
    }

    ApiRequest.macro('withInertia', function (this: ApiRequest) {
      this.header('x-inertia', 'true')
      this.header('x-inertia-version', config.versionCache.getVersion().toString())
      return this
    })

    ApiRequest.macro(
      'withInertiaPartialReload',
      function (this: ApiRequest, component: string, data: string[]) {
        this.withInertia()
        this.header('X-Inertia-Partial-Data', data.join(','))
        this.header('X-Inertia-Partial-Component', component)
        return this
      }
    )

    /**
     * Response getters
     */
    ApiResponse.getter('inertiaComponent', function (this: ApiResponse) {
      ensureIsInertiaResponse.call(this)
      return this.body().component
    })

    ApiResponse.getter('inertiaProps', function (this: ApiResponse) {
      ensureIsInertiaResponse.call(this)
      return this.body().props
    })

    /**
     * Response assertions
     */
    ApiResponse.macro('assertInertiaComponent', function (this: ApiResponse, component: string) {
      ensureIsInertiaResponse.call(this)

      this.assert!.deepEqual(this.body().component, component)
      return this
    })

    ApiResponse.macro(
      'assertInertiaProps',
      function (this: ApiResponse, props: Record<string, unknown>) {
        this.ensureHasAssert()
        ensureIsInertiaResponse.call(this)
        this.assert!.deepEqual(this.body().props, props)
        return this
      }
    )

    ApiResponse.macro(
      'assertInertiaPropsContains',
      function (this: ApiResponse, props: Record<string, unknown>) {
        this.ensureHasAssert()
        ensureIsInertiaResponse.call(this)
        this.assert!.containsSubset(this.body().props, props)
        return this
      }
    )
  }
}
