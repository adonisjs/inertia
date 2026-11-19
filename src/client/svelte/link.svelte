<!--
  @adonisjs/inertia

  (c) AdonisJS

  For the full copyright and license information, please view the LICENSE
  file that was distributed with this source code.
-->
<!--
  @component
  Type-safe Link component for Inertia.js navigation.

  Provides compile-time route validation and automatic parameter type
  checking based on your application's route definitions. Automatically
  resolves the correct URL and HTTP method for each route. Alternatively,
  you can use the standard href prop for direct navigation.

  ```svelte
  <Link route="home">Home</Link>

  <Link route="user.show" routeParams={{ id: 1 }}>View User</Link>

  <Link
    route="projects.show"
    routeParams={{ slug: project.slug }}
    instant
    component="projects/show"
    pageProps={() => ({ project })}
  >
    {project.title}
  </Link>

  <Link href="/about">About</Link>
  ```
-->
<script lang="ts" generics="Route extends keyof Routes">
  import { Link as InertiaLink } from '@inertiajs/svelte'

  import { buildRouteUrl, useTuyau } from './internals.js'
  import type { Routes } from '../types.ts'
  import type { LinkProps, LinkRouteProps } from './types.ts'

  const props: LinkProps<Route> = $props()

  /**
   * Read during initialisation: svelte contexts are only readable while the
   * component is being set up, so this cannot be deferred into the derived
   * below.
   */
  const tuyau = useTuyau()

  /**
   * Route-based navigation. getRoute resolves the HTTP methods and urlFor
   * builds the URL, serializing query string parameters in one place.
   *
   * The href mode short-circuits: the route bindings are stripped and every
   * remaining prop is forwarded untouched, so a plain link behaves exactly
   * like the upstream component.
   */
  const resolved = $derived.by(() => {
    const { route, routeParams, qs, method, ...linkProps } = props as LinkRouteProps<Route> & {
      href?: string
    }

    if (linkProps.href !== undefined) {
      return method === undefined ? linkProps : { ...linkProps, method }
    }

    const { methods } = tuyau.getRoute(route, { params: routeParams })

    return {
      ...linkProps,
      href: buildRouteUrl(tuyau, route, routeParams, qs),
      method: method ?? methods[0].toLowerCase(),
    }
  })
</script>

<InertiaLink {...resolved} />
