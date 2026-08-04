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
 * Query-string parameters accepted for a route. Uses the route's declared
 * query types when present, and falls back to a free-form record for routes
 * without them.
 */
export type RouteQs<Route extends keyof Routes> =
  keyof Routes[Route]['types']['query'] extends never
    ? Record<string, any>
    : Routes[Route]['types']['query']

/**
 * HTTP methods that Inertia can issue visits with.
 */
type VisitableMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

/**
 * HTTP methods registered for a route that Inertia can visit with, as
 * lowercase literals. HEAD and OPTIONS registrations are excluded since
 * Inertia never issues those visits.
 *
 * A collapsed (`never`) result widens back to every visitable method:
 * React.createElement and Vue's h() validate the combined Form call
 * signature with `Route` instantiated as a wildcard, where the
 * `Extract<Lowercase<...>>` chain collapses to `never` and would otherwise
 * reject every method.
 */
export type RouteMethod<Route extends keyof Routes> =
  | Extract<Lowercase<Routes[Route]['methods'][number]>, VisitableMethod>
  | ([Extract<Lowercase<Routes[Route]['methods'][number]>, VisitableMethod>] extends [never]
      ? VisitableMethod
      : never)

/**
 * Names of the routes registered for a given HTTP method. Powers the
 * route-aware router sugar, where `router.post()` only accepts routes
 * that can actually be visited with POST.
 */
export type RoutesWithMethod<Method extends string> = {
  [K in keyof Routes]: Method extends RouteMethod<K> ? K : never
}[keyof Routes]

/**
 * Bindings required for route navigation, with the route parameters exposed
 * under a configurable key: `routeParams` on the react wrappers and `params`
 * on the vue ones. The parameters stay optional when every route parameter
 * is optional, and required otherwise.
 */
export type RouteArgs<Route extends keyof Routes, ParamsKey extends string> = {
  route: Route
  qs?: RouteQs<Route>
  method?: RouteMethod<Route>
} & (RouteParamsFormats<Route> extends never
  ? { [K in ParamsKey]?: never }
  : AreAllOptional<ExtractParamsObject<Route>> extends true
    ? { [K in ParamsKey]?: RouteParamsFormats<Route> }
    : { [K in ParamsKey]: RouteParamsFormats<Route> })

/**
 * Parameters required for route navigation with proper type safety.
 */
export type RouteParams<Route extends keyof Routes> = RouteArgs<Route, 'routeParams'>

/**
 * The vue flavor of {@link RouteParams}: the vue wrappers expose the route
 * parameters under the `params` prop instead of `routeParams`.
 */
export type VueRouteParams<Route extends keyof Routes> = RouteArgs<Route, 'params'>

/**
 * Structural surface of the upstream Inertia router needed by the
 * createRouter factory. Both the react and vue packages re-export the same
 * core router, so the factory is generic over whichever one is handed in
 * and derives its data/options types from it.
 */
export type RouterLike = Record<
  'visit' | 'get' | 'post' | 'put' | 'patch' | 'delete',
  (...args: any[]) => any
>

/**
 * Parameters for a direct href visit. The route bindings are explicitly
 * disallowed so the two modes stay mutually exclusive.
 */
export type VisitHrefParams<R extends RouterLike> = {
  href: Parameters<R['visit']>[0]
  route?: never
  routeParams?: never
  qs?: never
  method?: never
}

/**
 * Union type for visit parameters - either route-based or direct href
 */
export type VisitParams<R extends RouterLike, Route extends keyof Routes> =
  (RouteParams<Route> & { href?: never }) | VisitHrefParams<R>

/**
 * Parameters for the router method sugar: the method is fixed by the call,
 * so the override prop is not accepted.
 */
export type MethodVisitParams<R extends RouterLike, Route extends keyof Routes> =
  (Omit<RouteParams<Route>, 'method'> & { href?: never }) | VisitHrefParams<R>

/**
 * Request body accepted by the router's post, put, and patch methods. In
 * route mode the body follows the route's declared body type, with FormData
 * kept for file uploads. An href call carries no route to infer from, so the
 * route parameter resolves to its declared `never` default and the body
 * falls back to the upstream payload type.
 */
export type RouterRequestBody<
  R extends RouterLike,
  Method extends 'post' | 'put' | 'patch',
  Route extends keyof Routes,
> = [Route] extends [never] ? Parameters<R[Method]>[1] : ExtractRouteBody<Route> | FormData
