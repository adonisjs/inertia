/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { HttpContext } from '@adonisjs/core/http'
import type { Serialize, Simplify } from '@tuyau/utils/types'

import { kLazySymbol } from './inertia.js'
import type { VersionCache } from './version_cache.js'

export type MaybePromise<T> = T | Promise<T>

/**
 * Props that will be passed to inertia render method
 */
export type PageProps = Record<string, unknown>

/**
 * Shared data types
 */
export type Data = string | number | object | boolean
export type SharedDatumFactory = (ctx: HttpContext) => MaybePromise<Data>
export type SharedData = Record<string, Data | SharedDatumFactory>

/**
 * Allowed values for the assets version
 */
export type AssetsVersion = string | number | undefined

export interface InertiaConfig {
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses.
   * @default root (resources/views/inertia_layout.edge)
   */
  rootView?: string | ((ctx: HttpContext) => string)

  /**
   * Path to your client-side entrypoint file.
   */
  entrypoint?: string

  /**
   * The version of your assets. Every client request will be checked against this version.
   * If the version is not the same, the client will do a full reload.
   */
  assetsVersion?: AssetsVersion

  /**
   * Data that should be shared with all rendered pages
   */
  sharedData?: SharedData

  /**
   * Options to configure SSR
   */
  ssr?: {
    /**
     * Enable or disable SSR
     */
    enabled: boolean

    /**
     * List of components that should be rendered on the server
     */
    pages?: string[] | ((ctx: HttpContext, page: string) => MaybePromise<boolean>)

    /**
     * Path to the SSR entrypoint file
     */
    entrypoint?: string

    /**
     * Path to the SSR bundled file that will be used in production
     */
    bundle?: string
  }
}

/**
 * Resolved inertia configuration
 */
export interface ResolvedConfig {
  rootView: string | ((ctx: HttpContext) => string)
  versionCache: VersionCache
  sharedData: SharedData
  ssr: {
    enabled: boolean
    entrypoint: string
    pages?: string[] | ((ctx: HttpContext, page: string) => MaybePromise<boolean>)
    bundle: string
  }
}

export interface PageObject<TPageProps extends PageProps = PageProps> {
  component: string
  version: string | number
  props: TPageProps
  url: string
  ssrHead?: string
  ssrBody?: string
}

type IsLazyProp<T> = T extends { [kLazySymbol]: () => MaybePromise<any> } ? true : false
type InferProps<T> = {
  // First extract and unwrap lazy props. Also make them optional as they are lazy
  [K in keyof T as IsLazyProp<T[K]> extends true ? K : never]+?: T[K] extends {
    [kLazySymbol]: () => MaybePromise<infer U>
  }
    ? U
    : T[K]
} & {
  // Then include all other props as it is
  [K in keyof T as IsLazyProp<T[K]> extends true ? never : K]: T[K]
}

/**
 * Helper for infering the page props from a Controller method that returns
 * inertia.render
 *
 * ```ts
 * // Your Adonis Controller
 * class MyController {
 *  index() {
 *   return inertia.render('foo', { foo: 1 })
 *  }
 * }
 *
 * // Your React component
 * export default MyReactComponent(props: InferPageProps<Controller, 'index'>) {
 * }
 * ```
 */
export type InferPageProps<
  Controller,
  Method extends keyof Controller,
> = Controller[Method] extends (...args: any[]) => any
  ? Simplify<
      Serialize<InferProps<Exclude<Awaited<ReturnType<Controller[Method]>>, string>['props']>>
    >
  : never

/**
 * Signature for the method in the SSR entrypoint file
 */
export type RenderInertiaSsrApp = (page: PageObject) => Promise<{ head: string[]; body: string }>
