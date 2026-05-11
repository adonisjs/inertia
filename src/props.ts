/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseSerializer } from '@adonisjs/core/transformers'
import { type AsyncOrSync } from '@adonisjs/core/types/common'
import { type JSONDataTypes } from '@adonisjs/core/types/transformers'

import { ALWAYS_PROP, DEEP_MERGE, DEFERRED_PROP, OPTIONAL_PROP, TO_BE_MERGED } from './symbols.ts'
import {
  type DeferProp,
  type PageProps,
  type AlwaysProp,
  type OptionalProp,
  type MergeableProp,
  type ComponentProps,
  type UnPackedPageProps,
} from './types.ts'
import { type ContainerResolver } from '@adonisjs/core/container'

class InertiaSerializer extends BaseSerializer {
  wrap: undefined = undefined
  definePaginationMetaData(metaData: unknown): unknown {
    return metaData
  }
}
const inertiaSerializer = new InertiaSerializer()

/**
 * Type guard to check if a value is a plain object
 *
 * @param value - The value to check
 * @returns True if the value is a plain object (not null, not array)
 */
function isObject(value: unknown): value is Record<PropertyKey, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Creates a deferred prop that is never included in standard visits but must be shared with
 * the client during standard visits. Can be explicitly requested and supports merging.
 *
 * Deferred props are useful for expensive computations that should only be loaded when
 * specifically requested by the client.
 *
 * @param fn - Function that computes the prop value when requested
 * @returns A deferred prop object with compute and merge capabilities
 *
 * @example
 * ```javascript
 * // Create a deferred prop for expensive user statistics
 * const userStats = defer(() => {
 *   return calculateExpensiveUserStats(userId)
 * })
 *
 * // Use in page props
 * return inertia.render('dashboard', {
 *   user: user,
 *   stats: userStats // Only loaded when explicitly requested
 * })
 * ```
 */
export function defer<T extends UnPackedPageProps>(
  fn: () => AsyncOrSync<T>,
  group: string = 'default'
): DeferProp<T> {
  return {
    group,
    compute: fn,
    merge() {
      return merge(this)
    },
    [DEFERRED_PROP]: true,
  }
}

/**
 * Creates an optional prop that is never included in standard visits and can only be
 * explicitly requested by the client. Unlike deferred props, optional props are not
 * shared with the client during standard visits.
 *
 * Optional props are ideal for data that is rarely needed and should only be loaded
 * on demand to optimize performance.
 *
 * @param fn - Function that computes the prop value when requested
 * @returns An optional prop object that computes values lazily
 *
 * @example
 * ```javascript
 * // Create an optional prop for detailed audit logs
 * const auditLogs = optional(() => {
 *   return fetchDetailedAuditLogs(resourceId)
 * })
 *
 * // Use in page props
 * return inertia.render('resource/show', {
 *   resource: resource,
 *   auditLogs: auditLogs // Only loaded when explicitly requested
 * })
 * ```
 */
export function optional<T extends UnPackedPageProps>(fn: () => AsyncOrSync<T>): OptionalProp<T> {
  return {
    compute: fn,
    [OPTIONAL_PROP]: true,
  }
}

/**
 * Creates a prop that is always included in responses and cannot be removed during
 * cherry-picking. This ensures the prop is always available to the frontend component.
 *
 * Always props are useful for critical data that the frontend component must have
 * to function properly, regardless of what props are specifically requested.
 *
 * @param value - The value to always include in the response
 * @returns An always prop object that cannot be cherry-picked away
 *
 * @example
 * ```javascript
 * // Create an always prop for critical user permissions
 * const userPermissions = always(user.permissions)
 *
 * // Use in page props
 * return inertia.render('admin/dashboard', {
 *   users: users,
 *   permissions: userPermissions // Always included, never filtered out
 * })
 * ```
 */
export function always<T extends UnPackedPageProps>(value: T): AlwaysProp<T> {
  return {
    value,
    [ALWAYS_PROP]: true,
  }
}

/**
 * Creates a prop that should be merged with existing props on the page rather than
 * replaced. This is useful for incremental updates where you want to combine new
 * data with existing data on the client side.
 *
 * Mergeable props enable efficient partial updates by allowing the client to
 * merge new prop values with existing ones instead of replacing them entirely.
 *
 * @param value - The value to be merged with existing props
 * @returns A mergeable prop object marked for merging behavior
 *
 * @example
 * ```javascript
 * // Create a mergeable prop for incremental notifications
 * const newNotifications = merge([
 *   { id: 1, message: 'New message received' },
 *   { id: 2, message: 'Task completed' }
 * ])
 *
 * // Use in page props - will merge with existing notifications
 * return inertia.render('dashboard', {
 *   user: user,
 *   notifications: newNotifications // Merges with existing notifications array
 * })
 * ```
 */
export function merge<T extends UnPackedPageProps | DeferProp<UnPackedPageProps>>(
  value: T
): MergeableProp<T> {
  return {
    value,
    [TO_BE_MERGED]: true,
    [DEEP_MERGE]: false,
  }
}

/**
 * Creates a prop that should be deeply merged with existing props on the page.
 *
 * Unlike shallow merge, deep merge recursively merges nested objects and arrays,
 * allowing for more granular updates to complex data structures.
 *
 * @param value - The value to be deeply merged with existing props
 * @returns A mergeable prop object marked for deep merging behavior
 *
 * @example
 * ```javascript
 * // Create a deep mergeable prop for nested user settings
 * const updatedSettings = deepMerge({
 *   notifications: {
 *     email: true,
 *     push: false
 *   },
 *   privacy: {
 *     profile: 'public'
 *   }
 * })
 *
 * // Use in page props - will deeply merge with existing settings
 * return inertia.render('settings', {
 *   user: user,
 *   settings: updatedSettings // Deep merges with existing settings object
 * })
 * ```
 */
export function deepMerge<T extends UnPackedPageProps | DeferProp<UnPackedPageProps>>(
  value: T
): MergeableProp<T> {
  return {
    value,
    [TO_BE_MERGED]: true,
    [DEEP_MERGE]: true,
  }
}

/**
 * Type guard that checks if a prop value is a deferred prop.
 *
 * Deferred props contain the DEFERRED_PROP symbol and have compute/merge capabilities.
 * This function is useful for runtime type checking and conditional prop handling.
 *
 * @param propValue - The object to check for deferred prop characteristics
 * @returns True if the prop value is a deferred prop
 *
 * @example
 * ```js
 * const prop = defer(() => ({ data: 'value' }))
 *
 * if (isDeferredProp(prop)) {
 *   // prop is now typed as DeferProp<T>
 *   const result = prop.compute()
 * }
 * ```
 */
export function isDeferredProp<T extends UnPackedPageProps>(
  propValue: Object
): propValue is DeferProp<T> {
  return DEFERRED_PROP in propValue
}

/**
 * Type guard that checks if a prop value is a mergeable prop.
 *
 * Mergeable props contain the TO_BE_MERGED symbol and should be merged with
 * existing props rather than replaced during updates.
 *
 * @param propValue - The object to check for mergeable prop characteristics
 * @returns True if the prop value is a mergeable prop
 *
 * @example
 * ```js
 * const prop = merge({ items: [1, 2, 3] })
 *
 * if (isMergeableProp(prop)) {
 *   // prop is now typed as MergeableProp<T>
 *   const value = prop.value
 * }
 * ```
 */
export function isMergeableProp<T extends UnPackedPageProps | DeferProp<UnPackedPageProps>>(
  propValue: Object
): propValue is MergeableProp<T> {
  return TO_BE_MERGED in propValue
}

/**
 * Type guard that checks if a prop value is an always prop.
 *
 * Always props contain the ALWAYS_PROP symbol and are always included in
 * responses, regardless of cherry-picking or selective prop requests.
 *
 * @param propValue - The object to check for always prop characteristics
 * @returns True if the prop value is an always prop
 *
 * @example
 * ```js
 * const prop = always({ userId: 123, permissions: ['read', 'write'] })
 *
 * if (isAlwaysProp(prop)) {
 *   // prop is now typed as AlwaysProp<T>
 *   const value = prop.value
 * }
 * ```
 */
export function isAlwaysProp<T extends UnPackedPageProps>(
  propValue: Object
): propValue is AlwaysProp<T> {
  return ALWAYS_PROP in propValue
}

/**
 * Type guard that checks if a prop value is an optional prop.
 *
 * Optional props contain the OPTIONAL_PROP symbol and are only included
 * when explicitly requested by the client, never in standard visits.
 *
 * @param propValue - The object to check for optional prop characteristics
 * @returns True if the prop value is an optional prop
 *
 * @example
 * ```js
 * const prop = optional(() => ({ detailedData: 'expensive computation' }))
 *
 * if (isOptionalProp(prop)) {
 *   // prop is now typed as OptionalProp<T>
 *   const result = prop.compute()
 * }
 * ```
 */
export function isOptionalProp<T extends UnPackedPageProps>(
  propValue: Object
): propValue is OptionalProp<T> {
  return OPTIONAL_PROP in propValue
}

/**
 * Helper function to unpack prop values using the transformer serialize function.
 *
 * @param value - The prop value to serialize
 * @param containerResolver - Container resolver for dependency injection
 * @returns Promise resolving to the serialized JSON data
 */
async function unpackPropValue(
  value: UnPackedPageProps<JSONDataTypes>,
  containerResolver: ContainerResolver<any>
) {
  if (value === null) {
    return null
  }
  return inertiaSerializer.serialize(value, containerResolver) as Promise<JSONDataTypes>
}

/**
 * Builds props for standard (non-partial) Inertia visits.
 *
 * This function processes page props and categorizes them based on their type:
 * - Deferred props: Skipped but communicated to client
 * - Optional props: Skipped entirely
 * - Always props: Always included
 * - Mergeable props: Included and marked for merging
 * - Regular props: Included normally
 *
 * @param pageProps - The page props to process
 * @param containerResolver - Container resolver for dependency injection
 * @returns Promise resolving to object containing processed props, deferred props list, and merge props list
 *
 * @example
 * ```js
 * const result = await buildStandardVisitProps({
 *   user: { name: 'John' },
 *   posts: defer(() => getPosts()),
 *   settings: merge({ theme: 'dark' })
 * })
 * // Returns: { props: { user: {...} }, deferredProps: { default: ['posts'] }, mergeProps: ['settings'] }
 * ```
 */
export async function buildStandardVisitProps(
  pageProps: PageProps,
  containerResolver: ContainerResolver<any>
) {
  const mergeProps: string[] = []
  const deepMergeProps: string[] = []
  const newProps: ComponentProps = {}
  const deferredProps: { [group: string]: string[] } = {}
  const unpackedValues: Array<{
    key: string
    value: UnPackedPageProps | (() => AsyncOrSync<UnPackedPageProps>)
  }> = []

  for (const [key, value] of Object.entries(pageProps)) {
    if (isObject(value)) {
      /**
       * Deferred props are skipped during the standard visits.
       * But we inform the client about it
       */
      if (isDeferredProp(value)) {
        deferredProps[value.group] = deferredProps[value.group] ?? []
        deferredProps[value.group].push(key)
        continue
      }

      /**
       * Optional props are skipped during the standard visits
       */
      if (isOptionalProp(value)) {
        continue
      }

      /**
       * Unpack always prop value
       */
      if (isAlwaysProp(value)) {
        unpackedValues.push({ key, value: value.value })
        continue
      }

      /**
       * Inform the client about the mergeable prop and use its
       * value
       */
      if (isMergeableProp(value)) {
        if (value[DEEP_MERGE]) {
          deepMergeProps.push(key)
        } else {
          mergeProps.push(key)
        }

        /**
         * Mergeable deferred props are skipped during the standard visits.
         * But we inform the client about both of them
         */
        if (isObject(value.value) && isDeferredProp(value.value)) {
          deferredProps[value.value.group] = deferredProps[value.value.group] ?? []
          deferredProps[value.value.group].push(key)
          unpackedValues.push({
            key,
            value: value.value.compute,
          })
        } else {
          unpackedValues.push({
            key,
            value: value.value,
          })
        }

        continue
      }

      /**
       * Unpack all other values
       */
      unpackedValues.push({
        key,
        value: value,
      })
    } else {
      /**
       * Compute lazy value
       */
      if (typeof value === 'function') {
        unpackedValues.push({
          key,
          value: value,
        })
        continue
      }

      newProps[key] = value
    }
  }

  await Promise.all(
    unpackedValues.map(async ({ key, value }) => {
      if (typeof value === 'function') {
        return Promise.resolve(value())
          .then((r) => unpackPropValue(r, containerResolver))
          .then((jsonValue) => {
            newProps[key] = jsonValue
          })
      } else {
        return unpackPropValue(value, containerResolver).then((jsonValue) => {
          newProps[key] = jsonValue
        })
      }
    })
  )

  return {
    props: newProps,
    mergeProps,
    deepMergeProps,
    deferredProps,
  }
}

/**
 * Builds props for partial (cherry-picked) Inertia requests.
 *
 * This function processes page props for partial requests where only specific
 * props are requested. It handles:
 * - Always props: Always included regardless of cherry picking
 * - Cherry-picked props: Only included if in the cherryPickProps list
 * - Mergeable props: Included and marked for merging
 * - Regular props: Included if cherry-picked
 *
 * @param pageProps - The page props to process
 * @param cherryPickProps - Array of prop names to include
 * @param containerResolver - Container resolver for dependency injection
 * @returns Promise resolving to object containing processed props and merge props list
 *
 * @example
 * ```js
 * const result = await buildPartialRequestProps(
 *   { user: { name: 'John' }, posts: defer(() => getPosts()), stats: optional(() => getStats()) },
 *   ['posts', 'stats']
 * )
 * // Returns: { props: { posts: [...], stats: [...] }, mergeProps: [], deferredProps: {} }
 * ```
 */
export async function buildPartialRequestProps(
  pageProps: PageProps,
  cherryPickProps: string[],
  containerResolver: ContainerResolver<any>
) {
  const mergeProps: string[] = []
  const deepMergeProps: string[] = []
  const newProps: ComponentProps = {}
  const unpackedValues: Array<{
    key: string
    value: UnPackedPageProps | (() => AsyncOrSync<UnPackedPageProps>)
  }> = []

  for (const [key, value] of Object.entries(pageProps)) {
    if (isObject(value)) {
      /**
       * Unpack always prop even if it is not part of
       * cherry picking props
       */
      if (isAlwaysProp(value)) {
        unpackedValues.push({ key, value: value.value })
        continue
      }

      /**
       * Skip key if not part of cherry picking list
       */
      if (!cherryPickProps.includes(key)) {
        continue
      }

      /**
       * Unpack deferred prop
       */
      if (isDeferredProp(value)) {
        unpackedValues.push({ key, value: value.compute })
        continue
      }

      /**
       * Unpack optional prop
       */
      if (isOptionalProp(value)) {
        unpackedValues.push({ key, value: value.compute })
        continue
      }

      /**
       * Inform the client about the mergeable prop
       */
      if (isMergeableProp(value)) {
        if (value[DEEP_MERGE]) {
          deepMergeProps.push(key)
        } else {
          mergeProps.push(key)
        }

        /**
         * Unpack deferred mergeable prop
         */
        if (isObject(value.value) && isDeferredProp(value.value)) {
          unpackedValues.push({ key, value: value.value.compute })
        } else {
          unpackedValues.push({ key, value: value.value })
        }

        continue
      }

      /**
       * Unpack all other values
       */
      unpackedValues.push({ key, value: value as UnPackedPageProps })
    } else {
      /**
       * Skip key if not part of cherry picking list
       */
      if (!cherryPickProps.includes(key)) {
        continue
      }

      /**
       * Compute lazy value
       */
      if (typeof value === 'function') {
        unpackedValues.push({ key, value })
        continue
      }

      newProps[key] = value
    }
  }

  await Promise.all(
    unpackedValues.map(async ({ key, value }) => {
      if (typeof value === 'function') {
        return Promise.resolve(value())
          .then((r) => unpackPropValue(r, containerResolver))
          .then((jsonValue) => {
            newProps[key] = jsonValue
          })
      } else {
        return unpackPropValue(value, containerResolver).then((jsonValue) => {
          newProps[key] = jsonValue
        })
      }
    })
  )

  return {
    props: newProps,
    mergeProps,
    deepMergeProps,
    deferredProps: {},
  }
}
