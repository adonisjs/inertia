/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { router as InertiaRouter } from '@inertiajs/vue3'

import { useTuyau } from './context.ts'
import { createRouter } from '../common.ts'

/**
 * Composable providing type-safe navigation utilities for Inertia.js.
 *
 * Returns an enhanced router with a type-safe visit method and the method
 * sugar (get, post, put, patch, delete) that resolve route URLs, methods,
 * and query strings from your application's route definitions.
 * Alternatively, you can use direct href for navigation.
 */
export function useRouter() {
  return createRouter(useTuyau(), InertiaRouter)
}
