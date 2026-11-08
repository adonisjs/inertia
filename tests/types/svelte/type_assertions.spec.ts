/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Type-only "should fail to compile" assertions for the svelte adapter.
 *
 * These live as plain TypeScript in a <script>-less .spec.ts file rather than
 * inside probe.svelte: svelte-check does not honor `@ts-expect-error` placed
 * as an HTML comment in markup (verified empirically — the diagnostic still
 * surfaces at the annotated line), so route-specific prop shapes are asserted
 * directly via the adapter's own exported `LinkRouteProps<Route>` /
 * `FormRouteProps<Route>` generics instead of instantiating a component in a
 * template. probe.svelte in this same folder covers the positive ("this must
 * compile and render") side under real markup, where Svelte's generic
 * inference narrows `Route` from the literal `route="..."` prop the same way
 * it does here from the explicit type argument.
 *
 * `ComponentProps<typeof Link>` (no type argument) is deliberately not used
 * for these: without a concrete `Route`, it resolves `Link`'s generic to its
 * unconstrained default (the union of every route name), which collapses
 * per-route requirements like "routeParams is mandatory for this route" into
 * "optional across the union" and silently defeats exactly the checks below.
 *
 * Runtime: these are ordinary object/variable declarations, so at test-run
 * time (via bin/test.ts) every assignment below just executes harmlessly;
 * the assertions only bite under a real typecheck
 * (svelte-check --tsconfig tests/types/svelte/tsconfig.json), where an
 * `@ts-expect-error` line that does *not* error becomes an "unused directive"
 * compile error, and a line that errors without the comment fails normally.
 * `@ts-expect-error` only covers the line immediately below it, so within a
 * multi-line object literal it sits directly above the offending property,
 * not above the statement.
 */
import { test } from '@japa/runner'

import type { FormRouteProps, LinkRouteProps } from '../../../src/client/svelte/types.ts'
import { useHttp } from '../../../src/client/svelte/http.ts'
import { useRouter } from '../../../src/client/svelte/router.ts'
import './registry.ts'

test.group('Svelte | Link Component types', () => {
  test('route-based props type-check', () => {
    const valid: LinkRouteProps<'users.show'> = { route: 'users.show', routeParams: { id: '1' } }
    void valid

    // @ts-expect-error missing required params
    const missingParams: LinkRouteProps<'users.show'> = { route: 'users.show' }
    void missingParams

    const badQs: LinkRouteProps<'posts.index'> = {
      route: 'posts.index',
      // @ts-expect-error unknown query key for a route with declared query types
      qs: { unknownKey: true },
    }
    void badQs

    const badQsValue: LinkRouteProps<'posts.index'> = {
      route: 'posts.index',
      // @ts-expect-error wrong value type for a declared query param
      qs: { page: 'two' },
    }
    void badQsValue

    const mixed: LinkRouteProps<'users.show'> = {
      route: 'users.show',
      routeParams: { id: '1' },
      // @ts-expect-error cannot mix route and href
      href: '/x',
    }
    void mixed
  })

  test('instant-visit pageProps follow the correlated route', () => {
    const instantOk: LinkRouteProps<'users.show'> = {
      route: 'users.show',
      routeParams: { id: '1' },
      instant: true,
      component: 'users/show',
      pageProps: () => ({ user: { id: 1 } }),
    }
    void instantOk

    const instantOnPageWithNoRequiredProps: LinkRouteProps<'posts.index'> = {
      route: 'posts.index',
      instant: true,
      component: 'posts/index',
    }
    void instantOnPageWithNoRequiredProps

    const wrongPage: LinkRouteProps<'users.show'> = {
      route: 'users.show',
      routeParams: { id: '1' },
      instant: true,
      // @ts-expect-error page not rendered by this route
      component: 'posts/index',
      // @ts-expect-error pageProps follows the (wrong) page above
      pageProps: () => ({}),
    }
    void wrongPage

    const typoPage: LinkRouteProps<'users.show'> = {
      route: 'users.show',
      routeParams: { id: '1' },
      instant: true,
      // @ts-expect-error misspelled page name
      component: 'users/shwo',
      pageProps: () => ({ user: { id: 1 } }),
    }
    void typoPage
  })
})

test.group('Svelte | Form Component types', () => {
  test('route-based props type-check', () => {
    const valid: FormRouteProps<'users.store'> = { route: 'users.store' }
    void valid

    // @ts-expect-error missing required params
    const missingParams: FormRouteProps<'users.comments.edit'> = { route: 'users.comments.edit' }
    void missingParams

    const withParams: FormRouteProps<'users.comments.edit'> = {
      route: 'users.comments.edit',
      routeParams: { id: '1', comment_id: '2' },
    }
    void withParams

    const mixed: FormRouteProps<'users.store'> = {
      route: 'users.store',
      // @ts-expect-error cannot mix route and action
      action: { url: '/x', method: 'post' },
    }
    void mixed

    const validChildren: FormRouteProps<'users.store'> = {
      route: 'users.store',
      children: ({ errors, getData, reset }) => {
        errors.email
        getData().email
        reset('email', 'remember')

        // @ts-expect-error unknown route body field
        errors.unknown

        return undefined as unknown as ReturnType<
          NonNullable<FormRouteProps<'users.store'>['children']>
        >
      },
    }
    void validChildren
  })
})

test.group('Svelte | useHttp Hook types', () => {
  test('route-bound useHttp validates routes, params, methods, and initial data', () => {
    function typeCheck() {
      useHttp({ route: 'users.store' })

      // @ts-expect-error unknown route
      useHttp({ route: 'unknown' })

      // @ts-expect-error required route params are missing
      useHttp({ route: 'users.comments.edit' })

      // @ts-expect-error GET is not registered for this route
      useHttp({ route: 'users.store', method: 'get' })

      // @ts-expect-error unknown request field
      useHttp({ route: 'users.store' }, { email: 'virk@adonisjs.com', unknown: true })

      // @ts-expect-error wrong request field type
      useHttp({ route: 'users.store' }, { email: 42 })
    }
    void typeCheck
  })

  test('route-bound useHttp derives request methods, options, and response', () => {
    function typeCheck() {
      const request = useHttp(
        { route: 'users.store' },
        { email: 'virk@adonisjs.com', remember: true }
      )

      request.data().email.toUpperCase()
      request.errors.email
      request.response?.id.toFixed()

      request.submit({
        onSuccess(response) {
          response.id.toFixed()
          response.email.toUpperCase()
        },
        optimistic(data) {
          return { email: data.email.toUpperCase() }
        },
      })

      request
        .withAllErrors()
        .optimistic((data) => ({ remember: !data.remember }))
        .dontRemember('email')
        .submit()

      // @ts-expect-error unknown request field
      request.dontRemember('unknown')

      // @ts-expect-error route-bound instances cannot override their endpoint
      request.post('/users')

      // @ts-expect-error submit only accepts request options
      request.submit('post', '/users')
    }
    void typeCheck
  })

  test('useHttp without a route preserves native Inertia API', () => {
    function typeCheck() {
      const request = useHttp<{ query: string }, { users: { id: number }[] }>({ query: '' })
      request.data().query.toUpperCase()
      request.get('/api/users').then((res) => res.users[0]?.id)
      request.post('/api/users')
      request.submit('get', '/api/users')
    }
    void typeCheck
  })
})

test.group('Svelte | useRouter Hook types', () => {
  test('useRouter visit and method sugar type-check routes and params', () => {
    function typeCheck() {
      const router = useRouter()

      router.visit({ route: 'users.index' })
      router.visit({ route: 'users.show', routeParams: { id: '1' } })
      router.visit({ href: '/about' })

      // @ts-expect-error unknown route
      router.visit({ route: 'unknown' })

      // @ts-expect-error missing required params
      router.visit({ route: 'users.show' })

      // @ts-expect-error cannot mix route and href
      router.visit({ route: 'users.index', href: '/about' })

      router.get({ route: 'users.index' })
      router.get({ route: 'users.show', routeParams: { id: '1' } })

      // @ts-expect-error users.store is POST-only, cannot be used with router.get
      router.get({ route: 'users.store' })

      router.post({ route: 'users.store' }, { email: 'virk@adonisjs.com', remember: true })

      // @ts-expect-error unknown body field in router.post
      router.post({ route: 'users.store' }, { email: 'virk@adonisjs.com', unknown: true })
    }
    void typeCheck
  })
})
