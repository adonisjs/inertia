/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Tuyau } from '@tuyau/core/client'
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
 * Builds the URL for a named route, serializing query string parameters
 * through the client's urlFor builder. The wrappers hold a generically
 * erased client (Tuyau<any>), whose urlFor call signature collapses to
 * never; this helper re-types the call once instead of casting at every
 * call site.
 */
export function buildRouteUrl(
  tuyau: Tuyau<any>,
  route: string,
  params: unknown,
  qs?: Record<string, any>
): string {
  type UrlForFn = (name: string, params?: unknown, options?: { qs?: Record<string, any> }) => string
  return (tuyau.urlFor as unknown as UrlForFn)(route, params, { qs })
}

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
 * Query-string parameters accepted for a route. Uses the route's declared
 * query types when present, and falls back to a free-form record for routes
 * without them.
 */
export type RouteQs<Route extends keyof Routes> =
  keyof Routes[Route]['types']['query'] extends never
    ? Record<string, any>
    : Routes[Route]['types']['query']

/**
 * Parameters required for route navigation with proper type safety.
 */
export type RouteParams<Route extends keyof Routes> = {
  route: Route
  qs?: RouteQs<Route>
} & (RouteParamsFormats<Route> extends never
  ? { routeParams?: never }
  : AreAllOptional<ExtractParamsObject<Route>> extends true
    ? { routeParams?: RouteParamsFormats<Route> }
    : { routeParams: RouteParamsFormats<Route> })
