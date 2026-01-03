/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference types="@adonisjs/core/providers/app_provider" />
/// <reference types="@adonisjs/core/providers/edge_provider" />

import { createHash } from 'node:crypto'
import { type Vite } from '@adonisjs/vite'
import type { HttpContext } from '@adonisjs/core/http'

import { InertiaHeaders } from './headers.js'
import { type ServerRenderer } from './server_renderer.js'
import type {
  PageProps,
  PageObject,
  AsPageProps,
  RequestInfo,
  InertiaConfig,
  ComponentProps,
  SharedProps,
} from './types.js'
import {
  defer,
  merge,
  always,
  optional,
  once,
  deepMerge,
  buildStandardVisitProps,
  buildPartialRequestProps,
} from './props.ts'
import debug from './debug.ts'
import { type AsyncOrSync } from '@poppinss/utils/types'

/**
 * Main class used to interact with Inertia
 *
 * Provides a complete interface for handling Inertia.js requests, rendering pages,
 * managing props, and controlling page navigation behavior.
 *
 * @example
 * ```js
 * const inertia = new Inertia(ctx, config, vite, serverRenderer)
 *
 * // Render a page
 * const result = await inertia.render('Home', { user: { name: 'John' } })
 *
 * // Clear browser history
 * inertia.clearHistory()
 *
 * // Redirect to a different location
 * inertia.location('/dashboard')
 * ```
 */
export class Inertia<Pages> {
  #sharedStateProviders?: (PageProps | (() => AsyncOrSync<PageProps>))[]
  #cachedRequestInfo?: RequestInfo

  /**
   * Optional server-side renderer for SSR functionality
   */
  #serverRenderer?: ServerRenderer

  /**
   * Vite instance for asset management and manifest handling
   */
  #vite?: Vite

  /**
   * Flag to control whether the next navigation should clear browser history
   */
  #shouldClearHistory

  /**
   * Flag to control whether browser history should be encrypted
   */
  #shouldEncryptHistory

  /**
   * Cached version string/number for asset versioning
   */
  #cachedVersion?: string

  /**
   * Defer prop evaluation until client-side rendering
   *
   * @example
   * ```js
   * {
   *   expensiveData: inertia.defer(() => computeExpensiveData())
   * }
   * ```
   */
  defer = defer

  /**
   * Always include prop in both server and client renders
   *
   * @example
   * ```js
   * {
   *   currentUser: inertia.always(() => getCurrentUser())
   * }
   * ```
   */
  always = always

  /**
   * Merge prop with existing client-side data
   *
   * @example
   * ```js
   * {
   *   posts: inertia.merge(() => getPosts())
   * }
   * ```
   */
  merge = merge

  /**
   * Include prop only when specifically requested
   *
   * @example
   * ```js
   * {
   *   optionalData: inertia.optional(() => getOptionalData())
   * }
   * ```
   */
  optional = optional

  /**
   * Deep merge prop with existing client-side data
   *
   * @example
   * ```js
   * {
   *   settings: inertia.deepMerge(() => getSettings())
   * }
   * ```
   */
  deepMerge = deepMerge

  /**
   * Create a once prop that is cached by the client and reused on subsequent pages
   *
   * @example
   * ```js
   * {
   *   // Basic usage - cached after first load
   *   plans: inertia.once(() => Plan.all()),
   *   // With expiration
   *   rates: inertia.once(() => Rate.all()).until('1d'),
   *   // With custom key for sharing across pages
   *   roles: inertia.once(() => Role.all()).as('roles')
   * }
   * ```
   */
  once = once

  /**
   * Creates a new Inertia instance
   *
   * @param ctx - HTTP context for the current request
   * @param config - Inertia configuration object
   * @param vite - Vite instance for asset management
   * @param serverRenderer - Optional server renderer for SSR
   *
   * @example
   * ```js
   * const inertia = new Inertia(ctx, {
   *   rootView: 'app',
   *   ssr: { enabled: true }
   * }, vite, serverRenderer)
   * ```
   */
  constructor(
    protected ctx: HttpContext,
    protected config: InertiaConfig,
    vite?: Vite,
    serverRenderer?: ServerRenderer
  ) {
    if (debug.enabled) {
      debug(
        'instantiating inertia instance for request "%s" using config %O',
        ctx.request.url(),
        this.config
      )
    }
    this.#shouldClearHistory = false
    this.#vite = vite
    this.#serverRenderer = serverRenderer
    this.#shouldEncryptHistory = config.encryptHistory ?? false
    this.#cachedVersion = this.config.assetsVersion ? String(this.config.assetsVersion) : undefined
  }

  /**
   * Resolve the root view template
   *
   * Handles both static strings and dynamic functions for the root view.
   *
   * @example
   * ```js
   * const viewName = this.#resolveRootView()
   * this.ctx.view.render(viewName, { page: pageObject })
   * ```
   */
  #resolveRootView() {
    return typeof this.config.rootView === 'function'
      ? this.config.rootView(this.ctx)
      : this.config.rootView
  }

  /**
   * Constructs and serializes the page props for a given component
   *
   * Handles both full page loads and partial requests with prop filtering.
   * Merges shared state providers with page-specific props, and handles
   * prop cherry-picking for partial reloads based on the `only` and `except` parameters.
   *
   * @param component - The component name being rendered
   * @param requestInfo - Information about the current request
   * @param pageProps - Raw page props to be processed
   *
   * @example
   * ```js
   * const result = await this.#buildPageProps('Dashboard', requestInfo, {
   *   user: { name: 'John' },
   *   posts: defer(() => getPosts())
   * })
   * ```
   */
  async #buildPageProps(component: string, requestInfo: RequestInfo, pageProps: PageProps) {
    let finalProps: PageProps

    /**
     * Shared state could be defined as functions that must be lazily evaluated.
     * Therefore we invoke all the functions and create a final merged shared
     * state.
     */
    if (this.#sharedStateProviders) {
      const sharedState = await Promise.all(
        this.#sharedStateProviders.map((provider) => {
          return typeof provider === 'function' ? provider() : provider
        })
      ).then((resolvedSharedState) => {
        return resolvedSharedState.reduce<PageProps>((result, state) => {
          return { ...result, ...state }
        }, {})
      })
      finalProps = { ...sharedState, ...pageProps }
    } else {
      finalProps = { ...pageProps }
    }

    if (requestInfo.partialComponent === component) {
      const only = requestInfo.onlyProps
      const except = requestInfo.exceptProps ?? []
      const cherryPickProps = Object.keys(finalProps).filter((propName) => {
        if (only) {
          return only.includes(propName) && !except.includes(propName)
        }
        return !except.includes(propName)
      })

      debug('building props for a partial reload %O', requestInfo)
      debug('cherry picking props %s', cherryPickProps)

      return buildPartialRequestProps(finalProps, cherryPickProps, this.ctx.containerResolver)
    }

    debug('building props for a standard visit %O', requestInfo)
    return buildStandardVisitProps(
      finalProps,
      this.ctx.containerResolver,
      requestInfo.exceptOnceProps ?? []
    )
  }

  /**
   * Handle Inertia AJAX request by setting appropriate headers
   *
   * Sets the `X-Inertia` header to 'true' indicating this is an Inertia response,
   * then returns the page object which will be serialized as JSON.
   *
   * @param pageObject - The page object to return
   *
   * @example
   * ```js
   * const pageObj = await this.page('Dashboard', props)
   * return this.#handleInertiaRequest(pageObj)
   * ```
   */
  #handleInertiaRequest<Page extends keyof Pages & string>(
    pageObject: PageObject<Pages[Page]>
  ): PageObject<Pages[Page]> {
    this.ctx.response.header(InertiaHeaders.Inertia, 'true')
    return pageObject
  }

  /**
   * Render page with server-side rendering
   *
   * @param pageObject - The page object to render
   * @param viewProps - Additional props to pass to the root view template
   * @returns Promise resolving to the rendered HTML string
   */
  async #renderWithSSR<Page extends keyof Pages & string>(
    pageObject: PageObject<Pages[Page]>,
    viewProps?: Record<string, any>
  ): Promise<string> {
    if (!this.#serverRenderer) {
      throw new Error('Cannot server render pages without a server renderer')
    }

    debug('server-side rendering %O', pageObject)
    const { head, body } = await this.#serverRenderer.render(pageObject)
    return this.ctx.view.render(this.#resolveRootView(), {
      page: { ssrHead: head, ssrBody: body, ...pageObject },
      ...viewProps,
    })
  }

  /**
   * Render page with client-side rendering only
   *
   * @param pageObject - The page object to render
   * @param viewProps - Additional props to pass to the root view template
   * @returns Promise resolving to the rendered HTML string
   */
  async #renderClientSide<Page extends keyof Pages & string>(
    pageObject: PageObject<Pages[Page]>,
    viewProps?: Record<string, any>
  ): Promise<string> {
    debug('rendering shell for SPA %O', pageObject)
    return this.ctx.view.render(this.#resolveRootView(), { page: pageObject, ...viewProps })
  }

  /**
   * Extract Inertia-specific information from request headers
   *
   * Parses various Inertia headers to determine request type and props filtering.
   *
   * @param reCompute - Whether to recompute the request info instead of using cached version
   * @returns The request information object containing Inertia-specific data
   *
   * @example
   * ```js
   * const info = inertia.requestInfo()
   * if (info.isInertiaRequest) {
   *   // Handle as Inertia request
   * }
   * ```
   */
  requestInfo(reCompute?: boolean): RequestInfo {
    if (reCompute) {
      this.#cachedRequestInfo = undefined
    }

    this.#cachedRequestInfo = this.#cachedRequestInfo ?? {
      version: this.ctx.request.header(InertiaHeaders.Version),
      isInertiaRequest: !!this.ctx.request.header(InertiaHeaders.Inertia),
      isPartialRequest: !!this.ctx.request.header(InertiaHeaders.PartialComponent),
      partialComponent: this.ctx.request.header(InertiaHeaders.PartialComponent),
      onlyProps: this.ctx.request.header(InertiaHeaders.PartialOnly)?.split(','),
      exceptProps: this.ctx.request.header(InertiaHeaders.PartialExcept)?.split(','),
      resetProps: this.ctx.request.header(InertiaHeaders.Reset)?.split(','),
      errorBag: this.ctx.request.header(InertiaHeaders.ErrorBag),
      exceptOnceProps: this.ctx.request.header(InertiaHeaders.ExceptOnceProps)?.split(','),
    }

    return this.#cachedRequestInfo
  }

  /**
   * Compute and cache the assets version
   *
   * Uses Vite manifest hash when available, otherwise defaults to '1'.
   *
   * @returns The computed version string for asset versioning
   */
  getVersion() {
    if (this.#cachedVersion) {
      return this.#cachedVersion
    }

    if (this.#vite?.hasManifestFile) {
      this.#cachedVersion = createHash('md5')
        .update(JSON.stringify(this.#vite.manifest()))
        .digest('hex')
    } else {
      this.#cachedVersion = '1'
    }

    return this.#cachedVersion
  }

  /**
   * Determine if server-side rendering is enabled for a specific component
   *
   * Checks global SSR settings and component-specific configuration.
   *
   * @param component - The component name to check
   * @returns Promise resolving to true if SSR is enabled for the component
   *
   * @example
   * ```js
   * const shouldSSR = await inertia.ssrEnabled('UserProfile')
   * if (shouldSSR) {
   *   // Render on server
   * }
   * ```
   */
  async ssrEnabled<Page extends keyof Pages & string>(component: Page): Promise<boolean> {
    if (!this.config.ssr.enabled) {
      return false
    }

    if (typeof this.config.ssr.pages === 'function') {
      return this.config.ssr.pages(this.ctx, component)
    }

    if (this.config.ssr.pages) {
      return this.config.ssr.pages?.includes(component)
    }

    return true
  }

  /**
   * Share props across all pages
   *
   * Merges the provided props with existing shared state, making them available
   * to all pages rendered by this Inertia instance. Shared props are included
   * in every page render alongside page-specific props.
   *
   * @param sharedState - Props to share across all pages
   * @returns The Inertia instance for method chaining
   *
   * @example
   * ```js
   * // Share user data across all pages
   * inertia.share({
   *   user: getCurrentUser(),
   *   flash: getFlashMessages()
   * })
   *
   * // Chain multiple shares
   * inertia
   *   .share({ currentUser: user })
   *   .share({ permissions: userPermissions })
   * ```
   */
  share(sharedState: PageProps | (() => AsyncOrSync<PageProps>)): this {
    if (!this.#sharedStateProviders) {
      this.#sharedStateProviders = []
    }
    this.#sharedStateProviders.push(sharedState)
    return this
  }

  /**
   * Build a page object with processed props and metadata
   *
   * Creates the complete page object that will be sent to the client or used for SSR.
   *
   * @param page - The page component name
   * @param pageProps - Props to pass to the page component
   * @returns Promise resolving to the complete page object
   *
   * @example
   * ```js
   * const pageObject = await inertia.page('Dashboard', {
   *   user: { name: 'John' },
   *   posts: defer(() => getPosts())
   * })
   * ```
   */
  async page<Page extends keyof Pages & string>(
    page: Page,
    pageProps: Pages[Page] extends ComponentProps
      ? AsPageProps<Omit<Pages[Page], keyof SharedProps>>
      : never
  ): Promise<PageObject<Pages[Page]>> {
    const requestInfo = this.requestInfo()
    const { props, mergeProps, deferredProps, deepMergeProps, onceProps } =
      await this.#buildPageProps(page, requestInfo, pageProps)

    return {
      component: page,
      url: this.ctx.request.url(true),
      version: this.getVersion(),
      clearHistory: this.#shouldClearHistory,
      encryptHistory: this.#shouldEncryptHistory,
      props: props as Pages[Page],
      deferredProps,
      mergeProps,
      deepMergeProps,
      onceProps: onceProps ?? {},
    } satisfies PageObject<Pages[Page]>
  }

  /**
   * Render a page using Inertia
   *
   * This method handles three distinct rendering scenarios:
   * 1. Inertia requests - Returns JSON page object for client-side navigation
   * 2. Initial page loads with SSR - Returns HTML with server-rendered content
   * 3. Initial page loads without SSR - Returns HTML for client-side hydration
   *
   * @param page - The page component name to render
   * @param pageProps - Props to pass to the page component
   * @param viewProps - Additional props to pass to the root view template
   * @returns Promise resolving to PageObject for Inertia requests, HTML string for initial page loads
   *
   * @example
   * ```js
   * // For Inertia requests, returns PageObject
   * const result = await inertia.render('Profile', {
   *   user: getCurrentUser(),
   *   posts: defer(() => getUserPosts())
   * })
   *
   * // For initial page loads, returns HTML string
   * const html = await inertia.render('Home', { welcome: 'Hello World' })
   * ```
   */
  async render<Page extends keyof Pages & string>(
    page: Page,
    pageProps: Pages[Page] extends ComponentProps
      ? AsPageProps<Omit<Pages[Page], keyof SharedProps>>
      : never,
    viewProps?: Record<string, any>
  ): Promise<string | PageObject<Pages[Page]>> {
    const requestInfo = this.requestInfo()
    const pageObject = await this.page(page, pageProps)

    /**
     * Handle Inertia AJAX requests - return JSON page object
     */
    const isInertiaRequest = requestInfo.isInertiaRequest
    if (isInertiaRequest) {
      return this.#handleInertiaRequest(pageObject)
    }

    /**
     * Handle initial page loads - determine rendering strategy
     */
    const shouldUseSSR = await this.ssrEnabled(page)
    if (shouldUseSSR) {
      return this.#renderWithSSR(pageObject, viewProps)
    }

    /**
     * Fallback to client-side rendering
     */
    return this.#renderClientSide(pageObject, viewProps)
  }

  /**
   * Clear the browser history on the next navigation
   *
   * Instructs the client to clear the browser history stack when navigating.
   *
   * @example
   * ```js
   * inertia.clearHistory()
   * return inertia.render('Dashboard', props)
   * ```
   */
  clearHistory() {
    this.#shouldClearHistory = true
  }

  /**
   * Control whether browser history should be encrypted
   *
   * Enables or disables encryption of sensitive data in browser history.
   *
   * @param encrypt - Whether to encrypt history (defaults to true)
   *
   * @example
   * ```js
   * // Enable encryption for sensitive pages
   * inertia.encryptHistory(true)
   *
   * // Disable encryption for public pages
   * inertia.encryptHistory(false)
   * ```
   */
  encryptHistory(encrypt = true) {
    this.#shouldEncryptHistory = encrypt
  }

  /**
   * Redirect to a different location
   *
   * Sets the appropriate headers to redirect the client to a new URL.
   * Uses a 409 status code which Inertia.js interprets as a redirect instruction.
   *
   * @param url - The URL to redirect to
   *
   * @example
   * ```js
   * // Redirect after login
   * inertia.location('/dashboard')
   *
   * // Redirect with full URL
   * inertia.location('https://example.com/external')
   * ```
   */
  location(url: string) {
    this.ctx.response.header(InertiaHeaders.Location, url)
    this.ctx.response.status(409)
  }
}
