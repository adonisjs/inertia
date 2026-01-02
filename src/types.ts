/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { HttpContext } from '@adonisjs/core/http'
import { type ContainerResolver } from '@adonisjs/core/container'
import type { JSONDataTypes } from '@adonisjs/core/types/transformers'
import type { AsyncOrSync, DeepPartial, Prettify } from '@adonisjs/core/types/common'
import {
  type DEEP_MERGE,
  type ALWAYS_PROP,
  type OPTIONAL_PROP,
  type TO_BE_MERGED,
  type DEFERRED_PROP,
  type ONCE_PROP,
} from './symbols.ts'

/**
 * Representation of a resource item, collection and paginator that can be resolved to
 * get normalized objects
 *
 * @template T - The type that the resource resolves to
 */
export type ResolvableOf<T> = {
  resolve(container: ContainerResolver<any>, depth: number, maxDepth?: number): Promise<T>
}

/**
 * Union type representing unpacked page prop values that can be either JSON data or serializable objects
 *
 * @template T - The JSON data type, defaults to JSONDataTypes
 */
export type UnPackedPageProps<T extends JSONDataTypes = JSONDataTypes> = T | ResolvableOf<T>

/**
 * Utility type that extracts the resolved type from a SerializableOf wrapper
 * If the type is already unwrapped, returns it as-is
 *
 * @template T - The type to unwrap, potentially wrapped in SerializableOf
 */
export type UnpackProp<T> = T extends ResolvableOf<infer A> ? A : T

/**
 * Information extracted from Inertia request headers
 * Contains metadata about the current request type and filtering preferences
 */
export type RequestInfo = {
  /** Asset version sent by the client for cache busting */
  version?: string
  /** Whether this is an Inertia AJAX request */
  isInertiaRequest: boolean
  /** Whether this is a partial data request */
  isPartialRequest: boolean
  /** Component name for partial reloads */
  partialComponent?: string
  /** Props to include in partial requests */
  onlyProps?: string[]
  /** Props to exclude in partial requests */
  exceptProps?: string[]
  /** Props to reset during merging */
  resetProps?: string[]
  /** Error bag identifier for validation errors */
  errorBag?: string
  /** Props that the client already has cached (once props) */
  exceptOnceProps?: string[]
}

/**
 * Represents a prop that is always included in responses and cannot be removed during cherry-picking
 *
 * @template T - The type of the prop value
 */
export type AlwaysProp<T extends UnPackedPageProps> = {
  /** The actual value of the prop */
  value: T
  /** Brand symbol to identify this as an always prop */
  [ALWAYS_PROP]: true
}

/**
 * Represents a prop that is never included in standard visits but can be explicitly requested
 * The prop value is computed lazily when requested
 *
 * @template T - The type of the computed prop value
 */
export type OptionalProp<T extends UnPackedPageProps> = {
  /** Function that computes the prop value when requested */
  compute: () => AsyncOrSync<T>
  /** Brand symbol to identify this as an optional prop */
  [OPTIONAL_PROP]: true
  /** Creates a once prop version that is cached by the client */
  once(): OnceProp<OptionalProp<T>>
}

/**
 * Represents a deferred prop that is never included in standard visits but must be shared with
 * the client during standard visits. Can be explicitly requested and supports merging
 *
 * @template T - The type of the computed prop value
 */
export type DeferProp<T extends UnPackedPageProps> = {
  group: string
  /** Function that computes the prop value when requested */
  compute: () => AsyncOrSync<T>
  /** Creates a mergeable version of this deferred prop */
  merge(): MergeableProp<DeferProp<T>>
  /** Creates a once prop version that is cached by the client */
  once(): OnceProp<DeferProp<T>>
  /** Brand symbol to identify this as a deferred prop */
  [DEFERRED_PROP]: true
}

/**
 * Represents a prop that should be merged with existing props on the page rather than replaced
 *
 * @template T - The type of the prop value to be merged
 */
export type MergeableProp<T extends UnPackedPageProps | DeferProp<UnPackedPageProps>> = {
  /** The prop value to be merged */
  value: T
  /** Brand symbol to identify this prop for merging */
  [TO_BE_MERGED]: true
  [DEEP_MERGE]: boolean
  /** Creates a once prop version that is cached by the client */
  once(): OnceProp<MergeableProp<T>>
}

/**
 * Represents a prop that is resolved only once and remembered by the client
 * across page navigations. Useful for expensive data that rarely changes.
 *
 * @template T - The type of the prop value or wrapped prop type
 */
export type OnceProp<
  T extends
    | UnPackedPageProps
    | DeferProp<UnPackedPageProps>
    | OptionalProp<UnPackedPageProps>
    | MergeableProp<UnPackedPageProps | DeferProp<UnPackedPageProps>>,
> = {
  /** The prop value that will be cached by the client */
  value: T
  /** Function that computes the prop value */
  compute: () => AsyncOrSync<
    T extends DeferProp<infer U> | OptionalProp<infer U>
      ? U
      : T extends UnPackedPageProps
        ? T
        : never
  >
  /** Whether to force refresh this prop even if client has it cached */
  shouldBeRefreshed: boolean
  /** Custom key for sharing data across multiple pages with different prop names */
  customKey: string | null
  /** Expiration timestamp in milliseconds (null = no expiration) */
  expiresAt: number | null
  /** Brand symbol to identify this as a once prop */
  [ONCE_PROP]: true
  /** Force this once prop to be refreshed on the next request */
  fresh(value?: boolean): OnceProp<T>
  /** Set a custom key for sharing data across multiple pages */
  as(key: string): OnceProp<T>
  /** Set an expiration time for this once prop (duration string ['1h', '5m'], Date, or seconds as number) */
  until(delay: string | number | Date): OnceProp<T>
}

/**
 * Lazy props are never included during standard Inertia visits
 * These props must be explicitly requested by the client
 *
 * @template T - The data type of the prop value
 */
type PagePropsLazyDataTypes<T extends JSONDataTypes> =
  /**
   * - Never included on standard visit
   * - Must be shared with the client during standard visit
   * - Can be explicitly requested for
   * - Can be dropped during cherry-picking
   */
  | DeferProp<T | ResolvableOf<T>>

  /**
   * - Never included on standard visit
   * - Can be explicitly requested for
   * - Can be dropped during cherry-picking
   */
  | OptionalProp<T | ResolvableOf<T>>

  /**
   * - Never included on standard visit (inner deferred prop)
   * - Must be shared with the client during standard visit
   * - Cached by client and reused on subsequent pages
   * - Can be explicitly requested for
   * - Can be dropped during cherry-picking
   */
  | OnceProp<DeferProp<T | ResolvableOf<T>>>

  /**
   * - Never included on standard visit (inner optional prop)
   * - Cached by client and reused on subsequent pages
   * - Can be explicitly requested for
   * - Can be dropped during cherry-picking
   */
  | OnceProp<OptionalProp<T | ResolvableOf<T>>>

  /**
   * - Never included on standard visit (inner deferred prop)
   * - Merged with existing client-side data on navigation
   * - Cached by client and reused on subsequent pages
   * - Can be explicitly requested for
   * - Can be dropped during cherry-picking
   */
  | OnceProp<MergeableProp<DeferProp<T | ResolvableOf<T>>>>

/**
 * Eager props are always included during standard Inertia visits, but
 * can be removed via cherry-picking when only specific props are requested
 *
 * @template T - The data type of the prop value
 */
type PagePropsEagerDataTypes<T extends JSONDataTypes> =
  /**
   * - Always included on standard visit.
   * - Can be dropped during cherry-picking
   */
  | T

  /**
   * - Always included on standard visit.
   * - Can be dropped during cherry-picking
   */
  | ResolvableOf<T>

  /**
   * - Always included on standard visit.
   * - Can be dropped during cherry-picking
   */
  | (() => AsyncOrSync<T | ResolvableOf<T>>)

  /**
   * - Always included on standard visit
   * - Cannot be dropped during cherry-picking
   */
  | AlwaysProp<T | ResolvableOf<T>>

  /**
   * - Included on standard visit unless client already has it cached
   * - Cached by client and reused on subsequent pages
   * - Can be dropped during cherry-picking
   */
  | OnceProp<T | ResolvableOf<T>>

  /**
   * - Included on standard visit unless client already has it cached
   * - Cached by client and reused on subsequent pages
   * - Merged with existing client-side data on navigation
   * - Can be dropped during cherry-picking
   */
  | OnceProp<MergeableProp<T | ResolvableOf<T>>>

/**
 * Following is the list of acceptable Page props data types
 * Combines both eager and lazy prop data types for comprehensive prop handling
 *
 * @template T - The data type extending JSONDataTypes, defaults to JSONDataTypes
 */
export type PagePropsDataTypes<T extends JSONDataTypes = JSONDataTypes> =
  | PagePropsEagerDataTypes<T>
  | PagePropsLazyDataTypes<T>

/**
 * Record type representing all page props that can be passed to an Inertia page
 * Maps prop names to their corresponding data types, including branded types for special behavior
 */
export type PageProps = Record<
  string,
  PagePropsDataTypes | MergeableProp<UnPackedPageProps | DeferProp<UnPackedPageProps>>
>

/**
 * Record type representing component props as they appear on the frontend after serialization
 * Maps prop names to JSON-serializable values that components can consume directly
 */
export type ComponentProps = Record<string, JSONDataTypes>

/**
 * Utility type to extract optional and deferred prop keys from a props object
 * Identifies props that are not required and may not be present in the component
 *
 * @template Props - The page props object type to analyze
 */
export type GetOptionalProps<Props> = {
  [K in keyof Props]: Props[K] extends OptionalProp<any>
    ? K
    : Props[K] extends DeferProp<any>
      ? K
      : Props[K] extends OnceProp<infer T>
        ? T extends DeferProp<any> | OptionalProp<any>
          ? K
          : never
        : [undefined] extends [Props[K]]
          ? K
          : Props[K] extends MergeableProp<infer A>
            ? A extends DeferProp<any>
              ? K
              : never
            : never
}[keyof Props]

/**
 * Utility type to extract required prop keys from a props object
 * Identifies props that are always present and required by the component
 *
 * @template Props - The page props object type to analyze
 */
export type GetRequiredProps<Props> = {
  [K in keyof Props]: Props[K] extends OptionalProp<any>
    ? never
    : Props[K] extends DeferProp<any>
      ? never
      : Props[K] extends OnceProp<infer T>
        ? T extends DeferProp<any> | OptionalProp<any>
          ? never
          : K
        : [undefined] extends [Props[K]]
          ? never
          : Props[K] extends MergeableProp<infer A>
            ? A extends DeferProp<any>
              ? never
              : K
            : K
}[keyof Props]

/**
 * Utility type to simplify value of a required prop by unwrapping branded types
 * Extracts the actual value type from wrapped prop types like AlwaysProp, functions, etc.
 *
 * @template Value - The prop value type to unwrap
 */
export type GetRequiredPropValue<Value> =
  Value extends AlwaysProp<infer A>
    ? UnpackProp<A>
    : Value extends OnceProp<infer B>
      ? UnpackProp<B>
      : Value extends MergeableProp<infer C>
        ? UnpackProp<C>
        : Value extends () => AsyncOrSync<infer D>
          ? UnpackProp<D>
          : UnpackProp<Value>

/**
 * Utility type to simplify value of an optional prop by unwrapping branded types
 * Extracts the actual value type from wrapped optional prop types like DeferProp, OptionalProp, etc.
 *
 * @template Value - The optional prop value type to unwrap
 */
export type GetOptionalPropValue<Value> =
  Value extends DeferProp<infer A>
    ? UnpackProp<A>
    : Value extends OnceProp<infer B>
      ? UnpackProp<B>
      : Value extends MergeableProp<infer C>
        ? C extends DeferProp<infer CA>
          ? UnpackProp<CA>
          : UnpackProp<C>
        : Value extends OptionalProp<infer D>
          ? UnpackProp<D>
          : Value extends () => AsyncOrSync<infer E>
            ? UnpackProp<E>
            : UnpackProp<Value>

/**
 * Converts the Page props to Component props that will be available to the frontend
 * app after serialization. Maps server-side prop definitions to client-side prop types
 *
 * @template Props - The page props object with branded prop types
 */
export type ToComponentProps<Props extends PageProps> = Prettify<
  {
    [K in GetRequiredProps<Props>]: GetRequiredPropValue<Props[K]>
  } & {
    [K in GetOptionalProps<Props>]?: GetOptionalPropValue<Props[K]>
  }
>

/**
 * Converts the Component props to Page props to allow computing the same values
 * via branded types and lazy evaluated callbacks and promises
 * Maps client-side prop types back to server-side prop definitions
 *
 * @template Props - The component props object with JSON data types
 */
export type AsPageProps<Props extends ComponentProps> = Prettify<
  {
    [K in {
      [O in keyof Props]: [undefined] extends [Props[O]] ? O : never
    }[keyof Props]]?:
      | PagePropsDataTypes<Props[K]>
      | MergeableProp<UnPackedPageProps<Props[K]> | DeferProp<UnPackedPageProps<Props[K]>>>
  } & {
    [K in {
      [O in keyof Props]: [undefined] extends [Props[O]] ? never : O
    }[keyof Props]]: PagePropsEagerDataTypes<Props[K]> | MergeableProp<UnPackedPageProps<Props[K]>>
  }
>

/**
 * Allowed values for the assets version used for cache busting
 * Can be a string, number, or undefined for auto-detection
 */
export type AssetsVersion = string | number | undefined

/**
 * Resolved configuration returned by the `defineConfig` helper
 * Contains all settings needed to configure Inertia.js integration
 */
export type InertiaConfig = {
  /**
   * Root Edge template to use for rendering the shell for the inertia
   * application
   */
  rootView: string | ((ctx: HttpContext) => string)

  /**
   * A fixed asset version value to use. Otherwise, it will be read from the
   * Vite manifest file.
   */
  assetsVersion?: AssetsVersion

  /**
   * History encryption settings. https://inertiajs.com/history-encryption
   */
  encryptHistory: boolean

  /**
   * Configuration settings for server-side rendering of the frontend
   * app
   */
  ssr: {
    /**
     * Enable/disable the SSR. Disabled by default
     */
    enabled: boolean

    /**
     * Cherry pick the pages you want to render server side
     */
    pages?: string[] | ((ctx: HttpContext, page: string) => AsyncOrSync<boolean>)

    /**
     * The entrypoint file to load in order to boot the frontend application on
     * the server
     */
    entrypoint: string

    /**
     * The SSR bundle output to load during production. This bundle is created
     * using Vite
     */
    bundle: string
  }
}

/**
 * Input configuration type allowing partial configuration objects
 * Used when defining configuration where all properties are optional and can be deeply partial
 */
export type InertiaConfigInput = DeepPartial<InertiaConfig>

/**
 * Represents a page object that is passed between server and client
 *
 * @template Props - The props type for the page component
 */
export type PageObject<Props> = {
  /**
   * The name/path of the component to render
   */
  component: string

  /**
   * Version identifier sent to the client with every request. Inertia
   * will trigger a full page refresh (in case of version mis-match)
   */
  version: string | number

  /**
   * Props data to pass to the component. These should be JSON values
   */
  props: Props

  /**
   * Current URL of the page
   */
  url: string

  /**
   * Grouped deferred props that can be loaded after the initial page
   * load
   */
  deferredProps?: {
    [group: string]: string[]
  }

  /**
   * An array with the keys of props that should be merged with the
   * existing props on the page
   */
  mergeProps?: string[]

  /**
   * An array with the keys of props that should be deeply merged with the
   * existing props on the page
   */
  deepMergeProps?: string[]

  /**
   * Once props metadata - maps custom keys to their prop name and expiration.
   * The client uses this to cache props and exclude them from future requests.
   */
  onceProps?: {
    [key: string]: {
      prop: string
      expiresAt: number | null
    }
  }

  /**
   * Encrypt history flag to be sent to the client with every request.
   */
  encryptHistory?: boolean

  /**
   * Optionally clear the browser history
   */
  clearHistory?: boolean
}

/**
 * The shared props inferred from the user-land
 * Should be augmented in the host application to define globally available props
 *
 * @example
 * ```typescript
 * declare module '@adonisjs/inertia/types' {
 *   interface SharedProps {
 *     user: { id: number; name: string } | null
 *     flash: { success?: string; error?: string }
 *   }
 * }
 * ```
 */
export interface SharedProps {}

/**
 * Discovered known pages with their props
 * Should be augmented in the host application to define page-specific prop types
 *
 * @example
 * ```typescript
 * declare module '@adonisjs/inertia/types' {
 *   interface InertiaPages {
 *     'users/index': { users: User[] }
 *     'users/show': { user: User }
 *   }
 * }
 * ```
 */
export interface InertiaPages {}

/**
 * Function signature for the SSR render method that should be exported
 * from the SSR entrypoint file to render Inertia pages on the server
 *
 * @param page - The page object containing component and props data
 * @returns Promise resolving to an object with head tags and body HTML
 */
export type RenderInertiaSsrApp = (
  page: PageObject<any>
) => Promise<{ head: string[]; body: string }>

/**
 * Type helper to infer the return type of InertiaMiddleware.share method
 * and augment the SharedProps interface automatically
 *
 * @template T - The middleware class type that extends BaseInertiaMiddleware
 *
 * @example
 * ```typescript
 * class InertiaMiddleware extends BaseInertiaMiddleware {
 *   async share() {
 *     return {
 *       user: { id: 1, name: 'John' },
 *       flash: { success: 'Welcome!' }
 *     }
 *   }
 * }
 *
 * // Automatically infer and augment SharedProps
 * type InferredSharedProps = InferSharedProps<InertiaMiddleware>
 * ```
 */
export type InferSharedProps<T> = T extends {
  share(...args: any[]): infer R
}
  ? Awaited<R> extends PageProps
    ? ToComponentProps<Awaited<R>>
    : never
  : never
