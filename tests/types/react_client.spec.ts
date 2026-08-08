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
 * augmentation comes from react.spec.ts, which is part of the same program.
 */
import { test } from '@japa/runner'
import '@japa/expect-type'

import { Form } from '../../src/client/react/form.tsx'
import { useHttp } from '../../src/client/react/http.ts'
import { Link } from '../../src/client/react/link.tsx'

/**
 * Shared props bridge fixture. Applies to the whole client program, mirroring
 * how apps bridge middleware shared props into `@inertiajs/core`. The
 * `users/profile` page (declared in react.spec.ts) carries `appName` so the
 * omission below is observable.
 */
declare module '@inertiajs/core' {
  interface InertiaConfig {
    sharedPageProps: { appName: string }
  }
}

test.group('React | Typings | Client resolution only', () => {
  test('route mode rejects fields outside the route body', () => {
    Form({
      route: 'users.store',
      children: (slot) => {
        slot.errors.email
        slot.errors.remember

        // @ts-expect-error unknown route body field
        slot.errors.unknownField
        return null
      },
    })
  }).fails()

  test('action mode rejects unknown error fields on a typed form', () => {
    Form<{ email: string }>({
      action: { url: '/users', method: 'post' },
      children: (slot) => {
        slot.errors.email

        // @ts-expect-error unknown field on a typed form
        slot.errors.unknownField
        return null
      },
    })
  }).fails()

  test('shared props are carried by the runtime, not demanded from the link', () => {
    // `appName` is bridged as a shared prop, so the instant link only owes
    // the page-specific `user` prop
    Link({
      route: 'users.profile',
      routeParams: ['1'],
      component: 'users/profile',
      pageProps: { user: { id: 1 } },
    })

    Link({
      route: 'users.profile',
      routeParams: ['1'],
      component: 'users/profile',
      // @ts-expect-error shared props cannot be supplied through pageProps
      pageProps: { user: { id: 1 }, appName: 'adonis' },
    })

    Link({
      route: 'users.profile',
      routeParams: ['1'],
      component: 'users/profile',
      pageProps: (_currentProps, sharedProps) => {
        sharedProps.appName?.toUpperCase()
        // @ts-expect-error unknown shared prop
        sharedProps.unknown

        return { ...sharedProps, user: { id: 1 } }
      },
    })
  }).fails()

  test('route-bound useHttp derives its state, request options, and response', ({
    expectTypeOf,
  }) => {
    const request = useHttp(
      { route: 'users.store' },
      { email: 'virk@adonisjs.com', remember: true }
    )

    request.data.email.toUpperCase()
    request.errors.email
    request.response?.id.toFixed()

    expectTypeOf(request.data).toEqualTypeOf<{
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
    // @ts-expect-error fluent methods must keep the endpoint bound
    request.withAllErrors().post('/users')
    // @ts-expect-error route-bound instances cannot replace their endpoint with Precognition
    request.withPrecognition('post', '/users')
  }).fails()

  test('route-bound useHttp validates routes, params, methods, and initial data', () => {
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
  }).fails()

  test('useHttp without a route preserves the native Inertia API', ({ expectTypeOf }) => {
    const request = useHttp<{ query: string }, { users: { id: number }[] }>({ query: '' })

    request.data.query
    expectTypeOf(request.data).toEqualTypeOf<{ query: string }>()
    expectTypeOf(request.get('/api/users')).toEqualTypeOf<Promise<{ users: { id: number }[] }>>()
    request.get('/api/users').then((response) => response.users[0]?.id)
    request.post('/api/users')
    request.submit('get', '/api/users')

    const endpoint = useHttp<{ email: string }, { id: number }>(
      { url: '/api/users', method: 'post' },
      { email: 'virk@adonisjs.com' }
    )
    endpoint.validate('email')
    endpoint.submit().then((response) => response.id)
  }).fails()
})
