/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference types="@adonisjs/core/providers/edge_provider" />

import { Vite } from '@adonisjs/vite'
import type { HttpContext } from '@adonisjs/core/http'

import { ServerRenderer } from './server_renderer.js'
import type {
  Data,
  MaybePromise,
  PageObject,
  PageProps,
  ResolvedConfig,
  SharedData,
} from './types.js'
import {
  AlwaysProp,
  DeferProp,
  ignoreFirstLoadSymbol,
  MergeableProp,
  MergeProp,
  OptionalProp,
} from './props.js'
import { InertiaHeaders } from './headers.js'

/**
 * Main class used to interact with Inertia
 */
export class Inertia {
  #sharedData: SharedData = {}
  #serverRenderer: ServerRenderer

  #shouldClearHistory = false
  #shouldEncryptHistory = false

  constructor(
    protected ctx: HttpContext,
    protected config: ResolvedConfig,
    protected vite?: Vite
  ) {
    this.#sharedData = config.sharedData
    this.#serverRenderer = new ServerRenderer(config, vite)

    this.#shouldClearHistory = false
    this.#shouldEncryptHistory = config.history.encrypt
  }

  /**
   * Check if the current request is a partial request
   */
  #isPartial(component: string) {
    return this.ctx.request.header(InertiaHeaders.PartialComponent) === component
  }

  /**
   * Resolve the `only` partial request props.
   * Only the props listed in the `x-inertia-partial-data` header
   * will be returned
   */
  #resolveOnly(props: PageProps) {
    const partialOnlyHeader = this.ctx.request.header(InertiaHeaders.PartialOnly)
    const only = partialOnlyHeader!.split(',').filter(Boolean)
    let newProps: PageProps = {}

    for (const key of only) newProps[key] = props[key]

    return newProps
  }

  /**
   * Resolve the `except` partial request props.
   * Remove the props listed in the `x-inertia-partial-except` header
   */
  #resolveExcept(props: PageProps) {
    const partialExceptHeader = this.ctx.request.header(InertiaHeaders.PartialExcept)
    const except = partialExceptHeader!.split(',').filter(Boolean)

    for (const key of except) delete props[key]

    return props
  }

  /**
   * Resolve the props for the current request
   * by filtering out the props that are not needed
   * based on the request headers
   */
  #pickPropsToResolve(component: string, props: PageProps = {}) {
    const isPartial = this.#isPartial(component)
    let newProps = props

    /**
     * If it's not a partial request, keep everything as it is
     * except the props that are marked as `ignoreFirstLoad`
     */
    if (!isPartial) {
      newProps = Object.fromEntries(
        Object.entries(props).filter(([_, value]) => {
          if (value && (value as any)[ignoreFirstLoadSymbol]) return false

          return true
        })
      )
    }

    /**
     * Keep only the props that are listed in the `x-inertia-partial-data` header
     */
    const partialOnlyHeader = this.ctx.request.header(InertiaHeaders.PartialOnly)
    if (isPartial && partialOnlyHeader) newProps = this.#resolveOnly(props)

    /**
     * Remove the props that are listed in the `x-inertia-partial-except` header
     */
    const partialExceptHeader = this.ctx.request.header(InertiaHeaders.PartialExcept)
    if (isPartial && partialExceptHeader) newProps = this.#resolveExcept(newProps)

    /**
     * Resolve all the props that are marked as `AlwaysProp` since they
     * should be resolved on every request, no matter if it's a partial
     * request or not.
     */
    for (const [key, value] of Object.entries(props)) {
      if (value instanceof AlwaysProp) newProps[key] = props[key]
    }

    return newProps
  }

  /**
   * Resolve a single prop by calling the callback or resolving the promise
   */
  async #resolvePageProps(props: PageProps = {}) {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(props).map(async ([key, value]) => {
          if (typeof value === 'function') {
            return [key, await value(this.ctx)]
          }

          if (
            value instanceof OptionalProp ||
            value instanceof MergeProp ||
            value instanceof DeferProp ||
            value instanceof AlwaysProp
          ) {
            return [key, await value.callback()]
          }

          return [key, value]
        })
      )
    )
  }

  /**
   * Resolve the deferred props listing. Will be returned only
   * on the first visit to the page and will be used to make
   * subsequent partial requests
   */
  #resolveDeferredProps(component: string, pageProps?: PageProps) {
    if (this.#isPartial(component)) return {}

    const deferredProps = Object.entries(pageProps || {})
      .filter(([_, value]) => value instanceof DeferProp)
      .map(([key, value]) => ({ key, group: (value as DeferProp<any>).getGroup() }))
      .reduce(
        (groups, { key, group }) => {
          if (!groups[group]) groups[group] = []

          groups[group].push(key)
          return groups
        },
        {} as Record<string, string[]>
      )

    return Object.keys(deferredProps).length ? { deferredProps } : {}
  }

  /**
   * Resolve the props that should be merged
   */
  #resolveMergeProps(pageProps?: PageProps) {
    const inertiaResetHeader = this.ctx.request.header(InertiaHeaders.Reset) || ''
    const resetProps = new Set(inertiaResetHeader.split(',').filter(Boolean))

    const mergeProps = Object.entries(pageProps || {})
      .filter(([_, value]) => value instanceof MergeableProp && value.shouldMerge)
      .map(([key]) => key)
      .filter((key) => !resetProps.has(key))

    return mergeProps.length ? { mergeProps } : {}
  }

  /**
   * Build the page object that will be returned to the client
   *
   * See https://inertiajs.com/the-protocol#the-page-object
   */
  async #buildPageObject<TPageProps extends PageProps>(
    component: string,
    pageProps?: TPageProps
  ): Promise<PageObject<TPageProps>> {
    const propsToResolve = this.#pickPropsToResolve(component, {
      ...this.#sharedData,
      ...pageProps,
    })

    return {
      component,
      url: this.ctx.request.url(true),
      version: this.config.versionCache.getVersion(),
      props: await this.#resolvePageProps(propsToResolve),
      clearHistory: this.#shouldClearHistory,
      encryptHistory: this.#shouldEncryptHistory,
      ...this.#resolveMergeProps(pageProps),
      ...this.#resolveDeferredProps(component, pageProps),
    }
  }

  /**
   * If the page should be rendered on the server or not
   *
   * The ssr.pages config can be a list of pages or a function that returns a boolean
   */
  async #shouldRenderOnServer(component: string) {
    const isSsrEnabled = this.config.ssr.enabled
    if (!isSsrEnabled) return false

    let isSsrEnabledForPage = false
    if (typeof this.config.ssr.pages === 'function') {
      isSsrEnabledForPage = await this.config.ssr.pages(this.ctx, component)
    } else if (this.config.ssr.pages) {
      isSsrEnabledForPage = this.config.ssr.pages?.includes(component)
    } else {
      isSsrEnabledForPage = true
    }

    return isSsrEnabledForPage
  }

  /**
   * Resolve the root view
   */
  #resolveRootView() {
    return typeof this.config.rootView === 'function'
      ? this.config.rootView(this.ctx)
      : this.config.rootView
  }

  /**
   * Render the page on the server
   */
  async #renderOnServer(pageObject: PageObject, viewProps?: Record<string, any>) {
    const { head, body } = await this.#serverRenderer.render(pageObject)

    return this.ctx.view.render(this.#resolveRootView(), {
      ...viewProps,
      page: { ssrHead: head, ssrBody: body, ...pageObject },
    })
  }

  /**
   * Share data for the current request.
   * This data will override any shared data defined in the config.
   */
  share(data: Record<string, Data>) {
    this.#sharedData = { ...this.#sharedData, ...data }
  }

  /**
   * Render a page using Inertia
   */
  async render<
    TPageProps extends Record<string, any> = {},
    TViewProps extends Record<string, any> = {},
  >(
    component: string,
    pageProps?: TPageProps,
    viewProps?: TViewProps
  ): Promise<string | PageObject<TPageProps>> {
    const pageObject = await this.#buildPageObject(component, pageProps)
    const isInertiaRequest = !!this.ctx.request.header(InertiaHeaders.Inertia)

    if (!isInertiaRequest) {
      const shouldRenderOnServer = await this.#shouldRenderOnServer(component)
      if (shouldRenderOnServer) return this.#renderOnServer(pageObject, viewProps)

      return this.ctx.view.render(this.#resolveRootView(), { ...viewProps, page: pageObject })
    }

    this.ctx.response.header(InertiaHeaders.Inertia, 'true')
    return pageObject
  }

  /**
   * Clear history state.
   *
   * See https://v2.inertiajs.com/history-encryption#clearing-history
   */
  clearHistory() {
    this.#shouldClearHistory = true
  }

  /**
   * Encrypt history
   *
   * See https://v2.inertiajs.com/history-encryption
   */
  encryptHistory(encrypt = true) {
    this.#shouldEncryptHistory = encrypt
  }

  /**
   * Create a lazy prop
   *
   * Lazy props are never resolved on first visit, but only when the client
   * request a partial reload explicitely with this value.
   *
   * See https://inertiajs.com/partial-reloads#lazy-data-evaluation
   *
   * @deprecated use `optional` instead
   */
  lazy<T>(callback: () => MaybePromise<T>) {
    return new OptionalProp(callback)
  }

  /**
   * Create an optional prop
   *
   * See https://inertiajs.com/partial-reloads#lazy-data-evaluation
   */
  optional<T>(callback: () => MaybePromise<T>) {
    return new OptionalProp(callback)
  }

  /**
   * Create a mergeable prop
   *
   * See https://v2.inertiajs.com/merging-props
   */
  merge<T>(callback: () => MaybePromise<T>) {
    return new MergeProp(callback)
  }

  /**
   * Create an always prop
   *
   * Always props are resolved on every request, no matter if it's a partial
   * request or not.
   *
   * See https://inertiajs.com/partial-reloads#lazy-data-evaluation
   */
  always<T>(callback: () => MaybePromise<T>) {
    return new AlwaysProp(callback)
  }

  /**
   * Create a deferred prop
   *
   * Deferred props feature allows you to defer the loading of certain
   * page data until after the initial page render.
   *
   * See https://v2.inertiajs.com/deferred-props
   */
  defer<T>(callback: () => MaybePromise<T>, group = 'default') {
    return new DeferProp(callback, group)
  }

  /**
   * This method can be used to redirect the user to an external website
   * or even a non-inertia route of your application.
   *
   * See https://inertiajs.com/redirects#external-redirects
   */
  async location(url: string) {
    this.ctx.response.header(InertiaHeaders.Location, url)
    this.ctx.response.status(409)
  }
}
