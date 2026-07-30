/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { UserRegistry, InferRoutes } from '@tuyau/core/types'
import type { AreAllOptional } from '@poppinss/utils/types'

export type Routes = InferRoutes<UserRegistry>

/**
 * Get request body type for a route
 */
export type ExtractRouteBody<Route extends keyof Routes> =
  Routes[Route]['types']['body'] extends object
    ? Routes[Route]['types']['body']
    : Record<string, never>

/**
 * Get parameter tuple type for a route
 */
export type ExtractParamsTuple<Route extends keyof Routes> = Routes[Route]['types']['paramsTuple']

/**
 * Get parameter object type for a route
 */
export type ExtractParamsObject<Route extends keyof Routes> = Routes[Route]['types']['params']

/**
 * Get params format for a route
 */
export type RouteParamsFormats<Route extends keyof Routes> =
  ExtractParamsObject<Route> extends Record<string, never>
    ? never
    : ExtractParamsTuple<Route> | ExtractParamsObject<Route>

/**
 * Parameters required for route navigation with proper type safety.
 */
export type RouteParams<Route extends keyof Routes> = {
  route: Route
} & (RouteParamsFormats<Route> extends never
  ? { routeParams?: never }
  : AreAllOptional<ExtractParamsObject<Route>> extends true
    ? { routeParams?: RouteParamsFormats<Route> }
    : { routeParams: RouteParamsFormats<Route> })
