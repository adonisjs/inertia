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
  type ONCE_PROP,
  type DEEP_MERGE,
  type SCROLL_PROP,
  type ALWAYS_PROP,
  type OPTIONAL_PROP,
  type TO_BE_MERGED,
  type DEFERRED_PROP,
  type MERGE_PREPEND,
  type SCROLL_DEFERRED,
  type MERGE_MATCH_ON,
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
  /** Once-keys the client already holds a fresh, cached value for */
  exceptOnceProps?: string[]
  /**
   * Infinite-scroll merge direction requested by the client. `prepend` loads an
   * earlier page, `append` (the default when the header is absent) loads a later
   * one.
   */
  mergeIntent?: 'append' | 'prepend'
}

/**
 * The infinite-scroll cursor a provider returns and the adapter auto-derives
 * from a transformer paginator. Does not include `reset` — that is driven by the
 * `X-Inertia-Reset` request header, not user code.
 */
export type ScrollProps = {
  /** Query-string parameter the client uses to request a page (e.g. `page`). */
  pageName: string
  /** Identifier for the page currently in the response. */
  currentPage: number | string | null
  /** Identifier for the next page, or `null` when there is none. */
  nextPage: number | string | null
  /** Identifier for the previous page, or `null` when there is none. */
  previousPage: number | string | null
}

/**
 * Full per-prop entry emitted under the page object's `scrollProps` map: the
 * cursor plus the `reset` flag the client uses to discard cached items.
 */
export type ScrollMetaData = ScrollProps & {
  /** When `true`, the client discards cached items for this prop before merging. */
  reset: boolean
}

/**
 * Callback that computes the infinite-scroll cursor from the resolved prop value.
 * Required whenever the value is not a transformer paginator the adapter can
 * auto-derive from. Runs only when the prop is resolved, so a deferred scroll
 * prop computes its cursor on the partial reload rather than the initial visit.
 *
 * @template T - The resolved prop value handed to the provider
 */
export type ScrollPropsProvider<T = any> = (value: T) => AsyncOrSync<ScrollProps>

/**
 * The resolved value shape a scroll prop accepts: any object exposing a typed
 * `data` array. Only `data` is type-checked; the rest of the object is opaque
 * display data the adapter reads only to auto-derive the cursor.
 *
 * @template Item - The item type of the paginated `data` array
 */
export type ScrollResolvedValue<Item> = { data: Item[] } & Record<string, any>

/**
 * The two forms a scroll prop value can take once resolved: a transformer
 * paginator (a resolvable that resolves to `{ data, metadata }`) or a plain
 * object with a typed `data` array.
 *
 * @template Item - The item type of the paginated `data` array
 */
export type ScrollValue<Item> = ScrollResolvedValue<Item> | ResolvableOf<ScrollResolvedValue<Item>>

/**
 * Phantom brand distinguishing a `Scroll<Item>` marker from a plain object so
 * `AsPageProps` can require the `scroll()` helper for that prop. Never present at
 * runtime.
 */
declare const SCROLL_BRAND: unique symbol

/**
 * Marker a client component uses to declare an infinite-scroll prop. The
 * component receives the resolved `data` array; on the server, `AsPageProps`
 * requires the matching prop to be built with `inertia.scroll()`.
 *
 * @template Item - The item type of the paginated `data` array
 *
 * @example
 * ```ts
 * declare module '@adonisjs/inertia/types' {
 *   interface InertiaPages {
 *     'users/index': { users: Scroll<User> }
 *   }
 * }
 * ```
 */
export type Scroll<Item> = {
  data: Item[]
  readonly [SCROLL_BRAND]: true
}

/**
 * Detects a `Scroll<Item>` marker by its phantom brand.
 *
 * @template V - The client prop value to test
 */
export type IsScrollMarker<V> = [V] extends [never]
  ? false
  : [V] extends [{ readonly [SCROLL_BRAND]: any }]
    ? true
    : false

/**
 * Extracts the item type from a `Scroll<Item>` marker.
 *
 * @template V - The `Scroll` marker to read
 */
export type ScrollItemOf<V> = V extends { data: (infer Item)[] } ? Item : never

/**
 * Pagination metadata produced by an AdonisJS Lucid paginator's `getMeta()`.
 * Exposed for typing the `meta` of a scroll prop value when desired.
 */
export type PaginationMeta = {
  total: number
  perPage: number
  currentPage: number
  pageName: string
  lastPage: number
  firstPage: number
  firstPageUrl: string
  lastPageUrl: string
  nextPageUrl: string | null
  previousPageUrl: string | null
}

/**
 * Represents an infinite-scroll prop: a mergeable, paginated value carrying the
 * pagination cursor the client needs to keep loading pages as the user scrolls.
 * The cursor is auto-derived from a transformer paginator or supplied by a
 * provider callback.
 *
 * @template Item - The item type of the paginated `data` array
 * @template Deferred - `true` once `.deferred()` is chained; makes the prop
 *   optional on the client (absent on the initial load), so a deferred scroll
 *   prop only satisfies an optional client prop — never a required one.
 */
export type ScrollProp<Item = any, Deferred extends boolean = false> = {
  /** The paginated value (or a callback resolving to it) */
  value: ScrollValue<Item> | (() => AsyncOrSync<ScrollValue<Item>>)
  /**
   * Computes the cursor from the resolved value. Defaults to a paginator-aware
   * provider that auto-derives from a transformer paginator and throws when the
   * value is not paginator data.
   */
  provider: ScrollPropsProvider<ScrollResolvedValue<Item>>
  /** Defer group when deferred via `.deferred()`; `undefined` ⇒ not deferred */
  group?: string
  /** Exclude the first page from the initial load; loaded on demand */
  deferred(group?: string): ScrollProp<Item, true>
  /** Dedupe/replace incoming items by the given key, relative to `data` */
  matchOn(key: string): ScrollProp<Item, Deferred>
  /** Brand symbol to identify this as a scroll prop */
  [SCROLL_PROP]: true
  /** Type-only flag: `true` once deferred. Never present at runtime. */
  [SCROLL_DEFERRED]?: Deferred
  /** Match key for keyed merges; `undefined` when unkeyed */
  [MERGE_MATCH_ON]?: string
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
  /** Remember this prop on the client across visits */
  once(options?: OnceOptions): OnceProp<OptionalProp<T>>
  /** Brand symbol to identify this as an optional prop */
  [OPTIONAL_PROP]: true
}

/**
 * Represents a deferred prop that is never included in standard visits but must be shared with
 * the client during standard visits. Can be explicitly requested and supports merging
 *
 * @template T - The type of the computed prop value
 */
export type DeferProp<T extends UnPackedPageProps> = {
  group: string
  /**
   * When `true`, a resolution error is caught: the prop is omitted from the
   * response and its path is reported to the client via `rescuedProps` so the
   * `<Deferred>` component can render its `rescue` slot instead of staying in a
   * loading state. The error is reported out of band (see {@link RescueListener}).
   */
  rescue: boolean
  /** Function that computes the prop value when requested */
  compute: () => AsyncOrSync<T>
  /** Creates a mergeable version of this deferred prop */
  merge(): MergeableProp<DeferProp<T>>
  /** Creates a deep-mergeable version of this deferred prop */
  deepMerge(): MergeableProp<DeferProp<T>>
  /** Remember this prop on the client across visits */
  once(options?: OnceOptions): OnceProp<DeferProp<T>>
  /** Brand symbol to identify this as a deferred prop */
  [DEFERRED_PROP]: true
}

/**
 * Options for creating a deferred prop. The second argument to `defer` also
 * accepts a bare group name string for backwards compatibility.
 */
export type DeferOptions = {
  /** Group deferred props so the client fetches them together */
  group?: string
  /**
   * Opt into graceful failure: catch resolution errors, omit the prop, and
   * report its path via `rescuedProps`. Defaults to `false`.
   */
  rescue?: boolean
}

/**
 * Listener invoked when a rescuable deferred prop's resolution throws. Register
 * one via `Inertia.onRescue(...)`; when none is registered, the error is logged
 * through the request logger (`ctx.logger.error`).
 *
 * @param error - The thrown error that was rescued
 * @param context - The prop path that failed and its HTTP context
 */
export type RescueListener = (error: unknown, context: { prop: string; ctx: HttpContext }) => void

/**
 * Represents a prop that should be merged with existing props on the page rather than replaced
 *
 * @template T - The type of the prop value to be merged
 */
export type MergeableProp<T extends UnPackedPageProps | DeferProp<UnPackedPageProps>> = {
  /** The prop value to be merged */
  value: T
  /** Prepend incoming array items instead of appending (shallow merge only) */
  prepend(): MergeableProp<T>
  /** Append incoming array items (the default; restores append after `prepend`) */
  append(): MergeableProp<T>
  /** Dedupe/replace incoming array items by the given match path */
  matchOn(key: string): MergeableProp<T>
  /** Remember this prop on the client across visits */
  once(options?: OnceOptions): OnceProp<MergeableProp<T>>
  /** Brand symbol to identify this prop for merging */
  [TO_BE_MERGED]: true
  /** Whether the merge is deep (recursive) rather than a shallow array merge */
  [DEEP_MERGE]: boolean
  /** Direction flag for shallow array merges: `true` prepends, `false` appends */
  [MERGE_PREPEND]: boolean
  /** Match path for keyed merges, relative to the prop; `undefined` when unkeyed */
  [MERGE_MATCH_ON]?: string
}

/**
 * Expiry configuration for a once prop. Accepts either a relative TTL or an
 * absolute expiry; both normalize to epoch-milliseconds at response-build time.
 *
 * @example
 * ```ts
 * { expiresIn: '2h' }            // relative, parsed via @poppinss/utils
 * { expiresIn: 3_600_000 }       // relative, milliseconds
 * { expiresAt: new Date(...) }   // absolute
 * ```
 */
export type OnceExpiry = {
  /** Relative time-to-live: milliseconds (number) or a duration string like '2h' */
  expiresIn?: number | string
  /** Absolute expiry: a Date or epoch-milliseconds */
  expiresAt?: Date | number
}

/**
 * Options accepted by `inertia.once()` and the `.once()` chaining method.
 */
export type OnceOptions = OnceExpiry & {
  /**
   * Custom once-key the client uses to identify the cached value across pages.
   * Defaults to the prop's top-level path.
   */
  key?: string
  /**
   * Resolve the value for this response regardless of the client cache. Returns
   * to normal once semantics on the next response.
   */
  fresh?: boolean
}

/**
 * Represents a prop that is remembered by the client across visits. The server
 * skips re-resolving it when the client reports a fresh cached value, and always
 * emits the prop's caching metadata in the page object's `onceProps` field.
 *
 * @template T - The wrapped value or inner prop wrapper (`defer`/`optional`/`merge`)
 */
export type OnceProp<T> = {
  /** The wrapped value or inner prop wrapper */
  value: T
  /** Custom once-key; `undefined` means "use the prop path" */
  onceKey?: string
  /** Raw expiry config, normalized to epoch-ms at build time */
  expiry: OnceExpiry
  /** Force resolution for this response, ignoring the client cache */
  fresh: boolean
  /** Brand symbol to identify this as a once prop */
  [ONCE_PROP]: true
}

/**
 * Per-request context that drives the once-prop resolution gate while building
 * props. Passed from the Inertia instance into the prop builders.
 */
export type OnceContext = {
  /** Once-keys the client already holds a fresh cached value for */
  exceptOnce: Set<string>
  /** Reference timestamp (epoch-ms) used to normalize relative expiry */
  now: number
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
 * Following is the list of acceptable Page props data types
 * Combines both eager and lazy prop data types for comprehensive prop handling
 *
 * @template T - The data type extending JSONDataTypes, defaults to JSONDataTypes
 */
export type PagePropsDataTypes<T extends JSONDataTypes = JSONDataTypes> =
  PagePropsEagerDataTypes<T> | PagePropsLazyDataTypes<T>

/**
 * Record type representing all page props that can be passed to an Inertia page
 * Maps prop names to their corresponding data types, including branded types for special behavior
 */
export type PageProps = Record<
  string,
  | PagePropsDataTypes
  | MergeableProp<UnPackedPageProps | DeferProp<UnPackedPageProps>>
  | ScrollProp<any, boolean>
  | OnceProp<PagePropsDataTypes | MergeableProp<UnPackedPageProps | DeferProp<UnPackedPageProps>>>
>

/**
 * Record type representing component props as they appear on the frontend after serialization
 * Maps prop names to JSON-serializable values that components can consume directly
 */
export type ComponentProps = Record<string, JSONDataTypes>

/**
 * Map of once-prop caching metadata, keyed by once-key, accumulated while
 * building a response.
 */
export type OncePropsMap = { [onceKey: string]: { prop: string; expiresAt?: number | null } }

/**
 * A pending resolution entry collected while classifying props: either a plain
 * value/callback to serialize into a prop, or a scroll prop whose serialized
 * value and pagination cursor are resolved together.
 */
export type UnpackEntry =
  | {
      key: string
      value: UnPackedPageProps | (() => AsyncOrSync<UnPackedPageProps>)
      /**
       * When `true`, a resolution error is caught: the value is omitted and the
       * key is recorded in `rescuedProps`. Set only for rescuable deferred props.
       */
      rescue?: boolean
    }
  | { key: string; scroll: ScrollProp<any, boolean> }

/**
 * Predicate that resolves to `true` when a prop value may be absent on the
 * client (optional/deferred, possibly undefined, a deferred merge, or a once
 * prop wrapping any of those).
 *
 * @template Value - The prop value type to classify
 */
export type IsOptionalPropValue<Value> = [Value] extends [OptionalProp<any>]
  ? true
  : [Value] extends [DeferProp<any>]
    ? true
    : [undefined] extends [Value]
      ? true
      : [Value] extends [MergeableProp<infer A>]
        ? [A] extends [DeferProp<any>]
          ? true
          : false
        : [Value] extends [ScrollProp<any, true>]
          ? true
          : [Value] extends [ScrollProp<any, false>]
            ? false
            : [Value] extends [OnceProp<infer Inner>]
              ? IsOptionalPropValue<Inner>
              : false

/**
 * Utility type to extract optional and deferred prop keys from a props object
 * Identifies props that are not required and may not be present in the component
 *
 * @template Props - The page props object type to analyze
 */
export type GetOptionalProps<Props> = {
  [K in keyof Props]: IsOptionalPropValue<Props[K]> extends true ? K : never
}[keyof Props]

/**
 * Utility type to extract required prop keys from a props object
 * Identifies props that are always present and required by the component
 *
 * @template Props - The page props object type to analyze
 */
export type GetRequiredProps<Props> = {
  [K in keyof Props]: IsOptionalPropValue<Props[K]> extends true ? never : K
}[keyof Props]

/**
 * Utility type to simplify value of a required prop by unwrapping branded types
 * Extracts the actual value type from wrapped prop types like AlwaysProp, functions, etc.
 *
 * @template Value - The prop value type to unwrap
 */
export type GetRequiredPropValue<Value> =
  Value extends OnceProp<infer Inner>
    ? GetRequiredPropValue<Inner>
    : Value extends AlwaysProp<infer A>
      ? UnpackProp<A>
      : Value extends MergeableProp<infer B>
        ? UnpackProp<B>
        : Value extends ScrollProp<infer Item, any>
          ? Scroll<Item>
          : Value extends () => AsyncOrSync<infer C>
            ? UnpackProp<C>
            : UnpackProp<Value>

/**
 * Utility type to simplify value of an optional prop by unwrapping branded types
 * Extracts the actual value type from wrapped optional prop types like DeferProp, OptionalProp, etc.
 *
 * @template Value - The optional prop value type to unwrap
 */
export type GetOptionalPropValue<Value> =
  Value extends OnceProp<infer Inner>
    ? GetOptionalPropValue<Inner>
    : Value extends DeferProp<infer A>
      ? UnpackProp<A>
      : Value extends MergeableProp<infer B>
        ? B extends DeferProp<infer BA>
          ? UnpackProp<BA>
          : UnpackProp<B>
        : Value extends ScrollProp<infer Item, any>
          ? Scroll<Item>
          : Value extends OptionalProp<infer C>
            ? UnpackProp<C>
            : Value extends () => AsyncOrSync<infer D>
              ? UnpackProp<D>
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
    [
      K in {
        [O in keyof Props]: [undefined] extends [Props[O]] ? O : never
      }[keyof Props]
    ]?:
      | PagePropsDataTypes<Props[K]>
      | MergeableProp<UnPackedPageProps<Props[K]> | DeferProp<UnPackedPageProps<Props[K]>>>
      | ScrollProp<ScrollItemOf<Props[K]>, boolean>
      | OnceProp<
          | PagePropsDataTypes<Props[K]>
          | MergeableProp<UnPackedPageProps<Props[K]> | DeferProp<UnPackedPageProps<Props[K]>>>
        >
  } & {
    [
      K in {
        [O in keyof Props]: [undefined] extends [Props[O]] ? never : O
      }[keyof Props]
    ]:
      | PagePropsEagerDataTypes<Props[K]>
      | MergeableProp<UnPackedPageProps<Props[K]>>
      | ScrollProp<ScrollItemOf<Props[K]>, false>
      | OnceProp<PagePropsEagerDataTypes<Props[K]> | MergeableProp<UnPackedPageProps<Props[K]>>>
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
     * The entrypoint file that boots the frontend application on the server.
     * Must also be declared under `serverEntrypoints` on the AdonisJS Vite
     * plugin so it gets bundled for production. The value is passed to
     * `vite.loadServerModule()` to evaluate the module in dev and import
     * the bundle in production.
     */
    entrypoint: string
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
   * Top-level keys registered through the `share()` pipeline (Inertia v3). The
   * client uses it to carry shared prop values forward across instant
   * (client-side) visits, where it swaps to the target component before the
   * server responds and needs to know which props to keep from the current page.
   *
   * This is registration metadata, not a snapshot of `props`: every shared key is
   * listed regardless of whether its value is present this response. A shared prop
   * skipped as deferred/optional, or filtered out by a partial reload, is still
   * listed — so the client keeps treating it as shared. Page-prop overrides keep
   * the key too. Mirrors inertia-laravel, which collects the keys before
   * resolution and filtering. Omitted entirely when no shared keys exist, so the
   * default wire format is unchanged and the v2 client (which has no such field)
   * is unaffected.
   */
  sharedProps?: string[]

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
   * An array with the keys of props whose incoming array value should be
   * prepended to (rather than appended onto) the existing array on the page
   */
  prependProps?: string[]

  /**
   * Keyed-merge configuration. Each entry is `"<propPath>.<matchField>"`; the
   * client dedupes/replaces incoming array items by the match field instead of
   * concatenating. The client splits each entry on its last dot.
   */
  matchPropsOn?: string[]

  /**
   * Pagination cursors for infinite-scroll props, keyed by prop name. Each entry
   * tells the client which page-name query parameter to use and the identifiers
   * for the previous/current/next pages, plus a `reset` flag.
   */
  scrollProps?: {
    [prop: string]: ScrollMetaData
  }

  /**
   * Paths of deferred props whose resolution threw and was rescued. The prop is
   * omitted from `props`; the client renders the `<Deferred>` `rescue` slot for
   * each listed path. Emitted on every response (as `[]` when nothing was
   * rescued) to match the non-optional v3 `Page.rescuedProps` field.
   */
  rescuedProps?: string[]

  /**
   * Metadata for props the client should remember across visits, keyed by
   * once-key. Emitted even when the value itself is skipped, so the client can
   * keep using its cached copy.
   */
  onceProps?: {
    [onceKey: string]: {
      prop: string
      expiresAt?: number | null
    }
  }

  /**
   * First-class flash bag (Inertia v2.3+). Lives alongside `props` rather than
   * inside it; the client treats it as ephemeral — stripped from history state
   * and surfaced via the `onFlash` visit callback and the `inertia:flash` event.
   * Populated from the Inertia middleware's `flash()` method; omitted entirely
   * when no flash provider is registered, so the default wire format is
   * unchanged.
   */
  flash?: FlashData

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
 * Default shape of the first-class flash bag. Apps narrow the actual shape by
 * typing the middleware's `flash()` method return type and bridging it into the
 * client via {@link InferFlashData}.
 */
export type FlashData = Record<string, any>

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
 * Type helper to infer the shared props shape from the `share()` method of an
 * Inertia middleware. Bridge the result into both augmentation targets: the
 * package's own {@link SharedProps} interface so `inertia.render` knows which
 * keys arrive from the middleware, and the client's `@inertiajs/core`
 * `sharedPageProps` config so `usePage().props`, `LayoutCallback`, and every
 * other upstream prop-reading surface is typed globally. The client-side
 * augmentation must live in the client source tree (e.g. `inertia/types.ts`)
 * and reference the generated `Data.SharedProps` alias rather than running
 * the inference again: the client tsconfig does not include server files,
 * and the alias keeps the middleware's server-side type graph out of the
 * client program.
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
 * // Server side, next to the middleware
 * declare module '@adonisjs/inertia/types' {
 *   type MiddlewareSharedProps = InferSharedProps<InertiaMiddleware>
 *   export interface SharedProps extends MiddlewareSharedProps {}
 * }
 *
 * // Client side, in the client source tree (e.g. inertia/types.ts).
 * // Data.SharedProps is the codegen alias for InferSharedProps<InertiaMiddleware>.
 * declare module '@inertiajs/core' {
 *   interface InertiaConfig {
 *     sharedPageProps: Data.SharedProps
 *   }
 * }
 * ```
 */
export type InferSharedProps<T> = T extends {
  share(...args: any[]): infer R
}
  ? Awaited<R> extends PageProps
    ? ToComponentProps<Awaited<R>>
    : never
  : never

/**
 * Type helper to infer the flash-bag shape from the `flash()` method of an
 * Inertia middleware, mirroring {@link InferSharedProps}. Unlike shared props,
 * flash is plain JSON (no branded prop wrappers), so the method's return type is
 * used as-is. Bridge the result into the client's `@inertiajs/core`
 * `flashDataType` config so `page.flash`, the `onFlash` callback, and
 * `router.flash()` are typed end-to-end from the server's `flash()` method.
 *
 * @template T - The middleware class type that defines a `flash` method
 *
 * @example
 * ```typescript
 * class InertiaMiddleware extends BaseInertiaMiddleware {
 *   flash(ctx: HttpContext) {
 *     return ctx.session.flashMessages.all()
 *   }
 * }
 *
 * declare module '@inertiajs/core' {
 *   interface InertiaConfig {
 *     flashDataType: InferFlashData<InertiaMiddleware>
 *   }
 * }
 * ```
 */
export type InferFlashData<T> = T extends {
  flash(...args: any[]): infer R
}
  ? Awaited<R> extends Record<string, any>
    ? Awaited<R>
    : never
  : never
