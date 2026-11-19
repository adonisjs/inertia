/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Runtime surface the shipped `.svelte` wrappers import.
 *
 * The wrappers are published uncompiled, so their imports have to resolve
 * against a file that exists in the built package. Funnelling them through
 * this one module keeps that to a single extra build entrypoint instead of
 * one per module they would otherwise reach for.
 *
 * Not part of the public API — consumers import from the package's `./svelte`
 * export subpath.
 */
export { buildRouteUrl } from '../common.ts'
export { setTuyau, useTuyau } from './context.ts'
