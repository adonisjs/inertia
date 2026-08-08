/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Type assertions that hold only when the upstream Inertia client types
 * resolve. This file is excluded from the package tsconfig (NodeNext, where
 * the upstream ESM declaration files do not resolve and degrade to `any`)
 * and checked exclusively by tests/types/tsconfig.json. The `UserRegistry`
 * augmentation comes from vue.spec.ts, which is part of the same program.
 */
import { test } from '@japa/runner'
import '@japa/expect-type'

import { Link } from '../../src/client/vue/link.ts'
import { Form } from '../../src/client/vue/form.ts'
import { useHttp } from '../../src/client/vue/http.ts'

test.group('Vue | Typings | Client resolution only', () => {
  test('wrappers typecheck the upstream props surface', () => {
    // Upstream props are typed on the wrapper. The components are invoked
    // directly (rather than through h()) so object literals keep their
    // freshness and excess property checks fire.
    Link({ route: 'users.index', preserveScroll: true })
    Form({ route: 'users.index', disableWhileProcessing: true })

    // href accepts the UrlMethodPair form
    Link({ href: { url: '/logout', method: 'post' } })

    // @ts-expect-error typo in an upstream prop is rejected
    Link({ route: 'users.index', preserveScrol: true })

    // @ts-expect-error wrong value type for an upstream prop
    Form({ route: 'users.index', errorBag: 42 })

    // @ts-expect-error unknown route
    Link({ route: 'unknown' })
  }).fails()

  test('instant visit props are correlated with the route', () => {
    // Single render → the exact page, pageProps follow it
    Link({ route: 'users.index', component: 'users/index', pageProps: { users: [{ id: 1 }] } })

    // Conditional render → either page is accepted
    Link({
      route: 'users.show',
      params: ['1'],
      component: 'users/limited',
      pageProps: { reason: 'private project' },
    })

    // @ts-expect-error page not rendered by the route
    Link({ route: 'users.index', component: 'users/show', pageProps: { user: { id: 1 } } })

    // @ts-expect-error unknown prop for the destination page
    Link({ route: 'users.index', component: 'users/index', pageProps: { unknown: true } })

    // @ts-expect-error pageProps required for a destination with required props
    Link({ route: 'users.index', component: 'users/index' })
  }).fails()

  test('route-bound useHttp derives its state, request options, and response', ({
    expectTypeOf,
  }) => {
    const request = useHttp(
      { route: 'users.store' },
      { email: 'virk@adonisjs.com', remember: true }
    )

    request.email.toUpperCase()
    request.errors.email
    request.response?.id.toFixed()

    expectTypeOf(request.data()).toEqualTypeOf<{
      email: string
      remember?: boolean
    }>()
    expectTypeOf(request.response).toEqualTypeOf<{
      id: number
      email: string
    } | null>()
    expectTypeOf(request.submit()).toEqualTypeOf<Promise<{ id: number; email: string }>>()
    expectTypeOf(request.withAllErrors()).toEqualTypeOf(request)
    request.submit({
      onSuccess(response) {
        response.email.toUpperCase()
      },
    })

    request
      .defaults('email', 'virk@adonisjs.com')
      .transform((data) => data)
      .reset('email')
      .clearErrors('email')
      .resetAndClearErrors('email')
      .setError('email', 'Invalid email')
      .dontRemember('email')
      .optimistic((data) => ({ remember: !data.remember }))
      .withAllErrors()
      .submit()

    // @ts-expect-error unknown request field
    request.dontRemember('unknown')
    // @ts-expect-error route-bound instances cannot override their endpoint
    request.patch('/users')
    // @ts-expect-error submit only accepts request options
    request.submit('post', '/users')
    // @ts-expect-error fluent methods must keep the endpoint bound
    request.reset().post('/users')
    // @ts-expect-error route-bound instances cannot replace their endpoint with Precognition
    request.withPrecognition('post', '/users')
    // @ts-expect-error unknown request field
    useHttp({ route: 'users.store' }, { email: 'virk@adonisjs.com', unknown: true })
  }).fails()

  test('useHttp without a route preserves the native Inertia API', ({ expectTypeOf }) => {
    const request = useHttp<{ query: string }, { users: { id: number }[] }>({ query: '' })

    request.query
    expectTypeOf(request.data()).toEqualTypeOf<{ query: string }>()
    expectTypeOf(request.get('/api/users')).toEqualTypeOf<Promise<{ users: { id: number }[] }>>()
    request.get('/api/users').then((response) => response.users[0]?.id)
    request.post('/api/users')
    request.submit('get', '/api/users')
  }).fails()
})
