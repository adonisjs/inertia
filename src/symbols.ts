/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Symbol used to mark props that should always be included in responses.
 * Props marked with this symbol cannot be filtered out during cherry-picking.
 */
export const ALWAYS_PROP = Symbol.for('ALWAYS_PROP')

/**
 * Symbol used to mark props that are optional and only included when explicitly requested.
 * These props are never included in standard visits and must be cherry-picked.
 */
export const OPTIONAL_PROP = Symbol.for('OPTIONAL_PROP')

/**
 * Symbol used to mark props that should be merged with existing props on the client.
 * Props marked with this symbol will be merged rather than replaced during updates.
 */
export const TO_BE_MERGED = Symbol.for('TO_BE_MERGED')

/**
 * Symbol used to mark props that are deferred and computed lazily.
 * These props are skipped in standard visits but communicated to the client for potential loading.
 */
export const DEFERRED_PROP = Symbol.for('DEFERRED_PROP')

/**
 * Symbol used to indicate that a mergeable prop should use deep merging behavior.
 * Deep merging recursively merges nested objects and arrays.
 */
export const DEEP_MERGE = Symbol.for('DEEP_MERGE')

/**
 * Symbol used to mark props that should only be resolved once and remembered by the client.
 * Once props are cached by the client and reused on subsequent pages, reducing server load
 * for data that rarely changes or is expensive to compute.
 */
export const ONCE_PROP = Symbol.for('ONCE_PROP')
