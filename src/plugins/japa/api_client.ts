/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { PluginFn } from '@japa/runner/types'
import { ApiRequest, ApiResponse } from '@japa/api-client'
import type { ApplicationService } from '@adonisjs/core/types'

import { InertiaHeaders } from '../../headers.ts'
import type { PageProps, InertiaPages, InertiaConfig } from '../../types.js'

declare module '@japa/api-client' {
  /**
   * Extended ApiRequest interface with Inertia.js specific methods
   *
   * Adds methods to configure requests for testing Inertia applications,
   * including setting required headers and configuring partial reloads.
   */
  export interface ApiRequest {
    /**
     * Set `X-Inertia` header on the request to mark it as an Inertia request
     *
     * This method configures the request to be treated as an Inertia AJAX request
     * by setting the required headers that Inertia.js uses for identification.
     *
     * @returns The ApiRequest instance for method chaining
     *
     * @example
     * ```js
     * const response = await client
     *   .get('/dashboard')
     *   .withInertia()
     * ```
     */
    withInertia(this: ApiRequest): this

    /**
     * Set headers for partial data requests (partial reloads)
     *
     * Configures the request to only fetch specific props from a component,
     * simulating Inertia's partial reload functionality in tests.
     *
     * @param component - The component name to partially reload
     * @param props - Array of prop names to include in the partial request
     * @returns The ApiRequest instance for method chaining
     *
     * @example
     * ```js
     * const response = await client
     *   .get('/users')
     *   .withInertiaPartialReload('Users/Index', ['users', 'pagination'])
     * ```
     */
    withInertiaPartialReload<K extends keyof InertiaPages>(
      this: ApiRequest,
      component: K,
      props: (keyof InertiaPages[K])[]
    ): this
  }

  /**
   * Extended ApiResponse interface with Inertia.js specific properties and assertions
   *
   * Provides getters for accessing Inertia response data and assertion methods
   * for validating Inertia responses in tests.
   */
  export interface ApiResponse {
    /**
     * The name of the Inertia component returned in the response
     *
     * @example
     * ```js
     * console.log(response.inertiaComponent) // 'Users/Index'
     * ```
     */
    inertiaComponent?: keyof InertiaPages

    /**
     * The props data returned in the Inertia response
     *
     * @example
     * ```js
     * console.log(response.inertiaProps.users) // [{ id: 1, name: 'John' }]
     * ```
     */
    inertiaProps: Record<string, any>

    /**
     * Assert that the response contains the expected Inertia component
     *
     * @param component - Expected component name
     * @returns The ApiResponse instance for method chaining
     *
     * @throws AssertionError when component names don't match
     *
     * @example
     * ```js
     * response.assertInertiaComponent('Users/Index')
     * ```
     */
    assertInertiaComponent(this: ApiResponse, component: string): this

    /**
     * Assert that the response props exactly match the provided props
     *
     * @param props - Expected props object to match exactly
     * @returns The ApiResponse instance for method chaining
     *
     * @throws AssertionError when props don't match exactly
     *
     * @example
     * ```js
     * response.assertInertiaProps({
     *   users: [{ id: 1, name: 'John' }],
     *   total: 1
     * })
     * ```
     */
    assertInertiaProps(this: ApiResponse, props: PageProps): this

    /**
     * Assert that the response props contain a subset of the provided props
     *
     * @param props - Expected subset of props to be present
     * @returns The ApiResponse instance for method chaining
     *
     * @throws AssertionError when expected props are not found
     *
     * @example
     * ```js
     * response.assertInertiaPropsContains({
     *   user: { name: 'John' }
     * })
     * ```
     */
    assertInertiaPropsContains(this: ApiResponse, props: PageProps): this
  }
}

/**
 * Ensure the response is an inertia response, otherwise throw an error
 *
 * @throws Error when the response is not an Inertia response
 */
function ensureIsInertiaResponse(this: ApiResponse) {
  if (!this.header('x-inertia')) {
    throw new Error(
      'Not an Inertia response. Make sure to use "withInertia()" method when making the request'
    )
  }
}

function ensureHasAssert(assertLib: unknown): asserts assertLib {
  if (!assertLib) {
    throw new Error(
      'Response assertions are not available. Make sure to install the @japa/assert plugin'
    )
  }
}

/**
 * Japa plugin that extends the API client with Inertia.js testing capabilities
 *
 * This plugin adds methods to ApiRequest and ApiResponse classes to support
 * testing Inertia applications, including partial reloads and response assertions.
 *
 * @param app - The AdonisJS application service instance
 * @returns Japa plugin function
 *
 * @example
 * ```js
 * // Configure in tests/bootstrap.ts
 * import { inertiaApiClient } from '@adonisjs/inertia/plugins/japa/api_client'
 *
 * export const plugins: Config['plugins'] = [
 *   assert(),
 *   apiClient(app),
 *   inertiaApiClient(app)
 * ]
 * ```
 *
 * @example
 * ```js
 * // Use in tests
 * test('renders dashboard page', async ({ client }) => {
 *   const response = await client
 *     .get('/dashboard')
 *     .withInertia()
 *
 *   response.assertInertiaComponent('Dashboard')
 *   response.assertInertiaPropsContains({
 *     user: { name: 'John' }
 *   })
 * })
 * ```
 */
export function inertiaApiClient(app: ApplicationService): PluginFn {
  return async () => {
    const inertiaConfig = app.config.get<InertiaConfig>('inertia')

    ApiRequest.macro('withInertia', function () {
      this.header(InertiaHeaders.Inertia, 'true')
      this.header(InertiaHeaders.Version, String(inertiaConfig.assetsVersion ?? '1'))
      return this
    })

    ApiRequest.macro('withInertiaPartialReload', function (component, data) {
      this.withInertia()
      this.header(InertiaHeaders.PartialComponent, component)
      this.header(InertiaHeaders.PartialOnly, data.join(','))
      return this
    })

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
    ApiResponse.macro('assertInertiaComponent', function (component) {
      ensureIsInertiaResponse.call(this)
      ensureHasAssert(this.assert)
      this.assert.equal(this.body().component, component)
      return this
    })

    ApiResponse.macro('assertInertiaProps', function (props) {
      ensureIsInertiaResponse.call(this)
      ensureHasAssert(this.assert)
      this.assert.deepEqual(this.body().props, props)
      return this
    })

    ApiResponse.macro('assertInertiaPropsContains', function (props) {
      ensureIsInertiaResponse.call(this)
      ensureHasAssert(this.assert)
      this.assert.containSubset(this.body().props, props)
      return this
    })
  }
}
