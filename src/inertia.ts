/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference types="@adonisjs/core/providers/edge_provider" />

import type { ViteDevServer } from 'vite'
import type { ViteRuntime } from 'vite/runtime'
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

/**
 * Symbol used to identify lazy props
 */
const kLazySymbol = Symbol('lazy')

/**
 * Main class used to interact with Inertia
 */
export class Inertia {
  #sharedData: SharedData = {}
  #serverRenderer: ServerRenderer

  constructor(
    protected ctx: HttpContext,
    protected config: ResolvedConfig,
    protected viteRuntime?: ViteRuntime,
    protected viteDevServer?: ViteDevServer
  ) {
    this.#sharedData = config.sharedData
    this.#serverRenderer = new ServerRenderer(config, viteRuntime, viteDevServer)
  }

  /**
   * Check if a value is a lazy prop
   */
  #isLazyProps(value: any) {
    return typeof value === 'object' && value && kLazySymbol in value
  }

  /**
   * Pick props to resolve based on x-inertia-partial-data header
   *
   * If header is not present, resolve all props except lazy props
   * If header is present, resolve only the props that are listed in the header
   */
  #pickPropsToResolve(component: string, props: PageProps) {
    const partialData = this.ctx.request
      .header('x-inertia-partial-data')
      ?.split(',')
      .filter(Boolean)

    const partialComponent = this.ctx.request.header('x-inertia-partial-component')

    let entriesToResolve = Object.entries(props)
    if (partialData && partialComponent === component) {
      entriesToResolve = entriesToResolve.filter(([key]) => partialData.includes(key))
    } else {
      entriesToResolve = entriesToResolve.filter(([key]) => !this.#isLazyProps(props[key]))
    }

    return entriesToResolve
  }

  /**
   * Resolve the props that will be sent to the client
   */
  async #resolvePageProps(component: string, props: PageProps) {
    const entriesToResolve = this.#pickPropsToResolve(component, props)

    const entries = entriesToResolve.map(async ([key, value]) => {
      if (typeof value === 'function') {
        return [key, await value(this.ctx)]
      }

      if (this.#isLazyProps(value)) {
        const lazyValue = (value as any)[kLazySymbol]
        return [key, await lazyValue()]
      }

      return [key, value]
    })

    return Object.fromEntries(await Promise.all(entries))
  }

  /**
   * Build the page object that will be returned to the client
   *
   * See https://inertiajs.com/the-protocol#the-page-object
   */
  async #buildPageObject(component: string, pageProps?: PageProps): Promise<PageObject> {
    return {
      component,
      version: this.config.versionCache.getVersion(),
      props: await this.#resolvePageProps(component, { ...this.#sharedData, ...pageProps }),
      url: this.ctx.request.url(true),
    }
  }

  /**
   * If the page should be rendered on the server
   */
  #shouldRenderOnServer(component: string) {
    const isSsrEnabled = this.config.ssr.enabled
    const isSsrEnabledForPage = this.config.ssr.pages
      ? this.config.ssr.pages.includes(component)
      : true

    return isSsrEnabled && isSsrEnabledForPage
  }

  /**
   * Render the page on the server
   */
  async #renderOnServer(pageObject: PageObject, viewProps?: Record<string, any>) {
    const { head, body } = await this.#serverRenderer.render(pageObject)

    return this.ctx.view.render(this.config.rootView, {
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
    TPageProps extends Record<string, any> = PageProps,
    TViewProps extends Record<string, any> = PageProps,
  >(component: string, pageProps?: TPageProps, viewProps?: TViewProps) {
    const pageObject = await this.#buildPageObject(component, pageProps)
    const isInertiaRequest = !!this.ctx.request.header('x-inertia')

    if (!isInertiaRequest) {
      const shouldRenderOnServer = this.#shouldRenderOnServer(component)
      if (shouldRenderOnServer) return this.#renderOnServer(pageObject, viewProps)

      return this.ctx.view.render(this.config.rootView, { ...viewProps, page: pageObject })
    }

    this.ctx.response.header('x-inertia', 'true')
    return pageObject
  }

  /**
   * Create a lazy prop
   *
   * Lazy props are never resolved on first visit, but only when the client
   * request a partial reload explicitely with this value.
   *
   * See https://inertiajs.com/partial-reloads#lazy-data-evaluation
   */
  lazy(callback: () => MaybePromise<any>) {
    return { [kLazySymbol]: callback }
  }

  /**
   * This method can be used to redirect the user to an external website
   * or even a non-inertia route of your application.
   *
   * See https://inertiajs.com/redirects#external-redirects
   */
  async location(url: string) {
    this.ctx.response.header('X-Inertia-Location', url)
    this.ctx.response.status(409)
  }
}
