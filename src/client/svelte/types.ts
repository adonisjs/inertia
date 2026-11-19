/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ComponentProps, Snippet } from 'svelte'
import type { Form as InertiaForm, Link as InertiaLink } from '@inertiajs/svelte'
// Inertia's declarations omit NodeNext-compatible extensions from internal type re-exports.
// prettier-ignore
// @ts-ignore TypeScript resolves these exports correctly in client projects using Bundler resolution.
import type { FormComponentSlotProps, FormDataErrors, FormDataType } from '@inertiajs/core'
import type { Prettify } from '@poppinss/utils/types'

import type {
  ExtractRouteBody,
  InstantVisitParams,
  KnownPages,
  RouteParams,
  RoutePages,
  Routes,
} from '../types.ts'

/**
 * Parameters required for route navigation with proper type safety. The
 * svelte wrappers bind the route parameters under `routeParams`, matching
 * the naming `useRouter().visit` already uses, so a single spelling covers
 * both the components and the router within this adapter.
 */
export type LinkParams<Route extends keyof Routes> = RouteParams<Route>

/**
 * Props of the bundled Inertia Link component, read from the installed
 * client so the wrapper stays in sync with it.
 *
 * The upstream component declares a `[key: string]: any` index signature so
 * arbitrary element attributes pass through. `Omit` cannot remove named keys
 * from such a type — `Exclude<string, 'href'>` is still `string` — so what
 * survives here is the permissive index signature. That is deliberate: the
 * route bindings intersected on top of it stay strictly checked (an explicit
 * property always wins over an index signature), while every upstream and
 * DOM attribute keeps flowing through untyped, exactly as it does on the
 * upstream component.
 */
type InertiaLinkProps = Omit<
  ComponentProps<typeof InertiaLink>,
  'href' | 'method' | 'component' | 'pageProps' | 'children'
>

/**
 * Props for the Link component when using route-based navigation. The
 * instant-visit props are correlated with the route: `component` is limited
 * to the pages the route's controller renders, and `pageProps` follows the
 * chosen destination page's declared props.
 */
export type LinkRouteProps<Route extends keyof Routes> = InertiaLinkProps &
  LinkParams<Route> & {
    href?: never
    children?: Snippet
  } & InstantVisitParams<RoutePages<Route>>

/**
 * Props for the Link component when using direct href. There is no route to
 * infer destination pages from, so `component` accepts any page in the page
 * registry, with `pageProps` still correlated to the chosen page.
 */
export type LinkHrefProps = InertiaLinkProps & {
  href: NonNullable<ComponentProps<typeof InertiaLink>['href']>
  method?: ComponentProps<typeof InertiaLink>['method']
  route?: never
  routeParams?: never
  qs?: never
  children?: Snippet
} & InstantVisitParams<KnownPages>

/**
 * Union type for Link component props - either route-based or direct href
 */
export type LinkProps<Route extends keyof Routes = keyof Routes> =
  LinkRouteProps<Route> | LinkHrefProps

/**
 * Slot props received by the Form children snippet, keyed by the form-data
 * shape. In route mode the form-data shape is the route's declared body; in
 * action mode it stays a free-form record.
 *
 * Destructuring the snippet parameter inline —
 * `{#snippet children({ errors, processing })}` — narrows from the `route`
 * prop with no annotation. That relies on {@link FormProps} declaring
 * `children` once, above the route/action union rather than inside each
 * branch: svelte2tsx contextually types a snippet parameter only from a
 * single, non-union `Snippet<...>` prop type, and a union of two `Snippet`s
 * (or a `Snippet` reached through a union member) leaves the destructured
 * bindings on implicit `any`. Annotate the parameter with this type when the
 * shape cannot be inferred — action mode carries no route to derive it from.
 */
export type FormSlotProps<FormData extends Record<string, any> = Record<string, any>> = Omit<
  FormComponentSlotProps<FormData>,
  'errors'
> & {
  errors: Prettify<FormDataErrors<FormData>>
}

/**
 * Instance exposed on the Form component. Svelte 5 surfaces a component's
 * exports through `bind:this`, so this is what a `bind:this` on the wrapper
 * resolves to: the upstream Inertia form API (submit, reset, setError, ...).
 */
export type FormRef<FormData extends Record<string, any> = Record<string, any>> =
  ComponentExports<FormData>

/**
 * The upstream Form component's exports, re-keyed by the form-data shape.
 * The bundled svelte Form is not generic over its data, so the exported API
 * is widened here to follow the route's declared body in route mode.
 */
type ComponentExports<FormData extends Record<string, any>> = Omit<
  FormSlotProps<FormData>,
  'errors' | 'processing' | 'isDirty' | 'hasErrors' | 'wasSuccessful' | 'recentlySuccessful'
>

/**
 * Props of the bundled Inertia Form component. As with the Link props above,
 * the upstream index signature is what survives the `Omit`, keeping every
 * upstream prop passing through while the wrapper-owned bindings stay typed.
 */
type InertiaFormProps = Omit<ComponentProps<typeof InertiaForm>, 'action' | 'method' | 'children'>

/**
 * Parameters required for route navigation with proper type safety.
 */
export type FormParams<Route extends keyof Routes> = RouteParams<Route>

/**
 * Route-mode bindings, without `children`. Split out from
 * {@link FormRouteProps} so {@link FormProps} can union the two modes'
 * bindings while declaring `children` once above them — see
 * {@link FormSlotProps} for why the snippet has to sit outside the union.
 */
type FormRouteBindings<Route extends keyof Routes> = InertiaFormProps &
  FormParams<Route> & {
    action?: never
  }

/**
 * Props for the Form component when using route-based navigation. The
 * form-data shape is derived from the route's declared body type, so the
 * children snippet follows the route without a manual generic.
 */
export type FormRouteProps<Route extends keyof Routes> = FormRouteBindings<Route> & {
  children?: Snippet<[FormSlotProps<FormDataType<ExtractRouteBody<Route>>>]>
}

/**
 * Action-mode bindings, without `children`. The action-mode counterpart of
 * {@link FormRouteBindings}; carries no form-data generic because nothing in
 * these bindings is keyed by it.
 */
type FormActionBindings = InertiaFormProps & {
  action: NonNullable<ComponentProps<typeof InertiaForm>['action']>
  method?: ComponentProps<typeof InertiaForm>['method']
  route?: never
  routeParams?: never
  qs?: never
}

/**
 * Props for the Form component when using a direct action
 */
export type FormActionProps<FormData extends Record<string, any> = Record<string, any>> =
  FormActionBindings & {
    children?: Snippet<[FormSlotProps<FormData>]>
  }

/**
 * Props accepted by the Form component — either route-based or direct action.
 *
 * Only the *bindings* are unioned; `children` is declared once on top, which
 * is what keeps an inline snippet's destructured parameter contextually typed
 * (see {@link FormSlotProps}). `FormData` therefore defaults to the route's
 * declared body rather than a free-form record, so route mode types the
 * snippet with nothing passed. Action mode has no route to derive from and
 * leaves the default at the union of every route body; pass `FormData`
 * explicitly, or annotate the snippet parameter, to type it.
 */
export type FormProps<
  Route extends keyof Routes = keyof Routes,
  FormData extends Record<string, any> = FormDataType<ExtractRouteBody<Route>>,
> = (FormRouteBindings<Route> | FormActionBindings) & {
  children?: Snippet<[FormSlotProps<FormData>]>
}
