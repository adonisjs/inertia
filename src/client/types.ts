/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Reached through `@inertiajs/core`'s `export * from './types'`, which does
 * not resolve under the package's NodeNext program (the upstream d.ts are
 * ESM with extensionless internal imports), so the member is invisible
 * there and the import errors. The ts-ignore lets it degrade to `any` in
 * that program — the `WithoutSharedProps` guard neutralizes the degraded
 * shape — while the client programs (bundler resolution) resolve it fully.
 */
// @ts-ignore
import type { SharedPageProps } from '@inertiajs/core'
import type { AreAllOptional } from '@poppinss/utils/types'
import type { UserRegistry, InferRoutes } from '@tuyau/core/types'

import type { InertiaPages } from '../types.ts'

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
 * Strips the globally shared props from a page's prop set. The client
 * carries shared props across an instant visit (that is what the page
 * object's `sharedProps` field advertises), so an instant link must not be
 * asked to supply them. The shared shape comes from the app's
 * `@inertiajs/core` `sharedPageProps` bridge; without the augmentation the
 * upstream default is a free-form record whose `keyof` is `string`, and the
 * guard skips the omit so it cannot silently erase every demanded key.
 */
type WithoutSharedProps<Props> = string extends keyof SharedPageProps
  ? Props
  : Omit<Props, keyof SharedPageProps>

/**
 * Page names registered in the generated page registry. Falls back to
 * `string` when the registry has not been generated (or augmented), so the
 * page-facing props stay usable — merely untyped — instead of collapsing
 * to `never`.
 */
export type KnownPages = [keyof InertiaPages] extends [never] ? string : keyof InertiaPages & string

/**
 * Page names carried by a route's response type. `inertia.render()` returns
 * `PageObject<Props, Page>`, so a controller that returns its render call
 * records the rendered page name (or a union of them, for conditional
 * renders) in the generated route registry. Intersecting with
 * {@link KnownPages} keeps the result inside the page registry: a legacy
 * registry whose page object types the component as plain `string` widens to
 * every known page instead of defeating the registry check. `never` survives
 * the intersection, so the {@link RoutePages} fallback still sees routes
 * without a page object.
 */
type InferredRoutePages<Route extends keyof Routes> = Extract<
  Routes[Route]['types']['response'],
  { component: string; props: unknown }
>['component'] &
  KnownPages

/**
 * Pages a route can render. Routes whose response carries no page object —
 * the controller does not return the render call, the endpoint never renders
 * Inertia pages, or the rendered page is missing from the page registry —
 * widen to every known page, so instant visits stay expressible (against the
 * full registry) rather than being rejected.
 */
export type RoutePages<Route extends keyof Routes> = [InferredRoutePages<Route>] extends [never]
  ? KnownPages
  : InferredRoutePages<Route>

/**
 * Props an instant link must supply for its destination page. The page's
 * declared optionality is preserved on purpose — no blanket `Partial`: a
 * prop the destination cannot render without stays required here, because
 * the instant (client-side) render mounts the page before the server
 * responds and a missing required prop crashes it. Pages opt into instant
 * visits by declaring optional whatever they can paint without. Components
 * without a page-registry entry keep the upstream free-form record.
 */
export type InstantPageProps<Component extends string> = Component extends keyof InertiaPages
  ? WithoutSharedProps<InertiaPages[Component]>
  : Record<string, unknown>

/**
 * Value accepted by the `pageProps` prop of an instant link: the props
 * object itself or the upstream callback form receiving the current and
 * shared props. The current props stay an untyped record because the current
 * page's identity is not knowable from the link's position in the tree. Shared
 * props come from the app's global Inertia augmentation and are partial because
 * the runtime only passes shared keys present on the current page.
 */
export type InstantPagePropsValue<Component extends string> =
  | InstantPageProps<Component>
  | ((
      currentProps: Record<string, unknown>,
      sharedProps: Partial<SharedPageProps>
    ) => InstantPageProps<Component>)

/**
 * Instant-visit bindings for the Link components. Selecting a `component`
 * commits to a destination page: `pageProps` then follows that page's
 * declared props and its key becomes required unless the page declared
 * every (non-shared) prop optional. Without a `component` nothing is
 * demanded — plain links stay untouched — but a `pageProps` given on its
 * own still follows the pages the route can render.
 *
 * `undefined` stays admissible in both value positions so conditional
 * instant links (`component={instant ? 'projects/show' : undefined}`
 * paired with a `pageProps` ternary) keep working: TypeScript cannot
 * correlate the two ternaries, so the pairing is enforced at the key level
 * — writing `component` demands writing `pageProps` alongside it, while an
 * explicitly undefined pair signals the correlation lives at runtime.
 */
type InstantVisitParamsFor<Component extends string> =
  | { component?: never; pageProps?: InstantPagePropsValue<Component> }
  | ({ component: Component | undefined } & ({} extends InstantPageProps<Component>
      ? { pageProps?: InstantPagePropsValue<Component> | undefined }
      : { pageProps: InstantPagePropsValue<Component> | undefined }))

/**
 * Distributes the instant-visit bindings over every possible destination so
 * each component remains paired with its own page props. Keeping that
 * correlation here means framework wrappers do not need a separate component
 * generic solely for inference.
 */
export type InstantVisitParams<Component extends string> = Component extends unknown
  ? InstantVisitParamsFor<Component>
  : never

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
