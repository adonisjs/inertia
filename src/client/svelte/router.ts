/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { router as InertiaRouter } from '@inertiajs/svelte'

import { useTuyau } from './context.ts'
import { createRouter } from '../common.ts'

/**
 * Returns type-safe navigation utilities for Inertia.js.
 *
 * Provides an enhanced router with a type-safe visit method and the method
 * sugar (get, post, put, patch, delete) that resolve route URLs, methods,
 * and query strings from your application's route definitions.
 * Alternatively, you can use direct href for navigation.
 *
 * Must be called during component initialisation, since it reads the Tuyau
 * client from the svelte context.
 */
export function useRouter() {
  return createRouter(useTuyau(), InertiaRouter)
}
