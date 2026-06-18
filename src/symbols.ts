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
 * Symbol carrying the direction of a shallow array merge. When `true` the client
 * prepends the incoming items (`prependProps`); when `false` it appends them
 * (`mergeProps`). Ignored for deep merges — the client deep-merge path has no
 * direction.
 */
export const MERGE_PREPEND = Symbol.for('MERGE_PREPEND')

/**
 * Symbol carrying the match path (relative to the prop) used for keyed merges.
 * When set, the client dedupes/replaces array items by this field rather than
 * concatenating. Emitted on the wire as `"<propPath>.<matchOn>"` in `matchPropsOn`.
 */
export const MERGE_MATCH_ON = Symbol.for('MERGE_MATCH_ON')

/**
 * Symbol used to mark props that are remembered by the client across visits.
 * The server skips re-resolving a once prop when the client reports it already
 * holds the value, and always emits the prop's caching metadata.
 */
export const ONCE_PROP = Symbol.for('ONCE_PROP')

/**
 * Symbol used to mark an infinite-scroll prop. Scroll props layer pagination
 * metadata (emitted under the page object's `scrollProps`) on top of the keyed
 * and directional merge primitive, so the client can continuously load pages as
 * the user scrolls.
 */
export const SCROLL_PROP = Symbol.for('SCROLL_PROP')

/**
 * Type-only discriminant carrying whether a scroll prop has been deferred via
 * `.deferred()`. A deferred scroll prop is absent on the initial load, so this
 * flag lets the type system treat it as optional — rejecting it on a required
 * client prop, exactly like `defer()`. It is never set at runtime.
 */
export const SCROLL_DEFERRED = Symbol.for('SCROLL_DEFERRED')
