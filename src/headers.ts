/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * List of possible headers used by Inertia.js for client-server communication.
 * These headers control various aspects of Inertia requests and responses,
 * enabling features like partial reloads, version checking, and error handling.
 *
 * @example
 * ```javascript
 * // Check if request is an Inertia request
 * const isInertiaRequest = request.header(InertiaHeaders.Inertia) === 'true'
 *
 * // Set version header in response
 * response.header(InertiaHeaders.Version, '1.0.0')
 *
 * // Handle partial data requests
 * if (request.header(InertiaHeaders.PartialOnly)) {
 *   const onlyProps = request.header(InertiaHeaders.PartialOnly).split(',')
 *   // Return only specified props
 * }
 * ```
 */
export const InertiaHeaders = {
  /**
   * Header to identify Inertia.js requests.
   * Set to 'true' by Inertia.js client to indicate an Inertia request.
   */
  Inertia: 'x-inertia',

  /**
   * Header to drop a prop from the merge and deep merge object.
   */
  Reset: 'x-inertia-reset',

  /**
   * Header containing the current asset version.
   * Used for cache busting - if versions don't match, Inertia performs a full page reload.
   */
  Version: 'x-inertia-version',

  /**
   * Header containing the target URL for redirects.
   * Used when the server wants to redirect to a different URL than the current request.
   */
  Location: 'x-inertia-location',

  /**
   * Header specifying the error bag name for validation errors.
   * Allows multiple forms on the same page to have separate error handling.
   */
  ErrorBag: 'x-inertia-error-bag',

  /**
   * Header containing comma-separated list of props to include in partial data requests.
   * Only the specified props will be returned in the response.
   */
  PartialOnly: 'x-inertia-partial-data',

  /**
   * Header containing comma-separated list of props to exclude in partial data requests.
   * All props except the specified ones will be returned in the response.
   */
  PartialExcept: 'x-inertia-partial-except',

  /**
   * Header specifying the component name for partial reloads.
   * Used to identify which component is being partially reloaded.
   */
  PartialComponent: 'x-inertia-partial-component',

  /**
   * Header specifying which once props to exclude from the response.
   * The client sends this header with a comma-separated list of once prop keys
   * that it has already received and cached.
   */
  ExceptOnceProps: 'x-inertia-except-once-props',
} as const
