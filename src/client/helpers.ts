/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Resolves a page component from a given path or array of paths by looking up
 * the component in the provided pages registry. Supports both direct promises
 * and lazy-loaded functions that return promises.
 *
 * @param path - The page path(s) to resolve. Can be a single string or array of strings
 * @param pages - Registry of page components where keys are paths and values are either promises or functions returning promises
 * @param layout - Optional layout component to assign to the resolved page
 * @returns Promise resolving to the page component
 *
 * @example
 * ```js
 * // Single path resolution
 * const component = await resolvePageComponent('Home', {
 *   'Home': () => import('./pages/Home.vue'),
 *   'About': () => import('./pages/About.vue')
 * })
 *
 * // Multiple path resolution (fallback)
 * const component = await resolvePageComponent(['Dashboard/Admin', 'Dashboard'], {
 *   'Dashboard': () => import('./pages/Dashboard.vue')
 * })
 * ```
 *
 * @throws Error When none of the provided paths can be resolved in the pages registry
 */
export async function resolvePageComponent<T extends { default: unknown }>(
  path: string | string[],
  pages: Record<string, Promise<T> | (() => Promise<T>) | T>,
  layout?: any
): Promise<T['default']> {
  for (const p of Array.isArray(path) ? path : [path]) {
    const page = pages[p]
    if (typeof page === 'undefined') {
      continue
    }
    const resolvedPage = (await (typeof page === 'function'
      ? (page as unknown as () => Promise<T>)()
      : page)) as any

    if (!resolvedPage) {
      throw new Error(
        `Invalid page exported from "${path}". Make sure to default export a function`
      )
    }

    if ('default' in resolvedPage === false) {
      throw new Error(
        `Invalid page exported from "${path}". Make sure to default export a function`
      )
    }

    if (layout && !resolvedPage.default.layout) {
      resolvedPage.default.layout = layout
    }

    return resolvedPage
  }

  throw new Error(`Page not found: "${path}"`)
}
