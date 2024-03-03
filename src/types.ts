/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { HttpContext } from '@adonisjs/core/http'
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
   * @default root (resources/views/root.edge)
   */
  rootView?: string

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
    pages?: string[]

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
  rootView: string
  versionCache: VersionCache
  sharedData: SharedData
  entrypoint: string
  ssr: {
    enabled: boolean
    entrypoint: string
    pages?: string[]
    bundle: string
  }
}

export interface PageObject {
  component: string
  version: string | number
  props: PageProps
  url: string
  ssrHead?: string
  ssrBody?: string
}
