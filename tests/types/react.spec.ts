/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { createTuyau } from '@tuyau/core/client'
import { type AdonisEndpoint } from '@tuyau/core/types'

import type { PageObject } from '../../src/types.ts'
import { Link } from '../../src/client/react/link.tsx'
import { Form } from '../../src/client/react/form.tsx'
import { useRouter } from '../../src/client/react/router.ts'
import { TuyauProvider } from '../../src/client/react/context.tsx'

/**
 * Page registry fixture for the instant-visit assertions. Augmented here so
 * both typecheck programs (the package NodeNext program and the client
 * program at tests/types/tsconfig.json) see the same pages. The
 * `users/profile` page carries a shared prop and is asserted exclusively in
 * react_client.spec.ts, where the `@inertiajs/core` sharedPageProps bridge
 * resolves.
 */
declare module '../../src/types.ts' {
  interface InertiaPages {
    'users/index': { users: { id: number }[] }
    'users/show': { user: { id: number } }
    'users/limited': { reason: string }
    'users/profile': { appName: string; user: { id: number } }
    'posts/index': { posts?: string[] }
    'settings/show': { preference: string | undefined }
  }
}

const routes = {
  'users.index': {
    methods: ['GET', 'HEAD'],
    pattern: '/',
    tokens: [{ old: '/', type: 0, val: '/', end: '' }],
    types: null as any as {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: string | PageObject<{ users: { id: number }[] }, 'users/index'>
    },
  },
  'users.show': {
    methods: ['GET', 'HEAD'],
    pattern: '/users/:id',
    tokens: [
      { old: '/users', type: 0, val: 'users', end: '/' },
      { old: ':id', type: 1, val: 'id', end: '' },
    ],
    types: null as any as {
      body: {}
      paramsTuple: [string]
      params: { id: string }
      query: {}
      response:
        | string
        | PageObject<{ user: { id: number } }, 'users/show'>
        | PageObject<{ reason: string }, 'users/limited'>
    },
  },
  'users.profile': {
    methods: ['GET', 'HEAD'],
    pattern: '/users/:id/profile',
    tokens: [
      { old: '/users', type: 0, val: 'users', end: '/' },
      { old: ':id', type: 1, val: 'id', end: '/profile' },
      { old: '/profile', type: 0, val: 'profile', end: '' },
    ],
    types: null as any as {
      body: {}
      paramsTuple: [string]
      params: { id: string }
      query: {}
      response: string | PageObject<{ appName: string; user: { id: number } }, 'users/profile'>
    },
  },
  'users.comments.edit': {
    methods: ['GET', 'HEAD'],
    pattern: '/users/:id/comments/:comment_id/edit',
    tokens: [
      { old: '/users', type: 0, val: 'users', end: '/' },
      { old: ':id', type: 1, val: 'id', end: '/' },
      { old: '/comments', type: 0, val: 'comments', end: '/' },
      { old: ':comment_id', type: 1, val: 'comment_id', end: '/edit' },
      { old: '/edit', type: 0, val: 'edit', end: '' },
    ],
    types: null as any as {
      body: {}
      paramsTuple: [string, string]
      params: { id: string; comment_id: string }
      query: {}
      response: unknown
    },
  },
  'posts.index': {
    methods: ['GET', 'HEAD'],
    pattern: '/posts',
    tokens: [{ old: '/posts', type: 0, val: 'posts', end: '' }],
    types: null as any as {
      body: {}
      paramsTuple: []
      params: {}
      query: { page?: number; status?: string }
      response: string | PageObject<{ posts?: string[] }, 'posts/index'>
    },
  },
  'users.store': {
    methods: ['POST'],
    pattern: '/users',
    tokens: [{ old: '/users', type: 0, val: 'users', end: '' }],
    types: null as any as {
      body: { email: string; remember?: boolean }
      paramsTuple: []
      params: {}
      query: {}
      response: { id: number; email: string }
    },
  },
  'posts.update': {
    methods: ['PUT', 'PATCH'],
    pattern: '/posts/:id',
    tokens: [
      { old: '/posts', type: 0, val: 'posts', end: '/' },
      { old: ':id', type: 1, val: 'id', end: '' },
    ],
    types: null as any as {
      body: {}
      paramsTuple: [string]
      params: { id: string }
      query: {}
      response: unknown
    },
  },
} as const satisfies Record<string, AdonisEndpoint>

const registry = {
  routes,
  $tree: {} as any,
}

declare module '@tuyau/core/types' {
  type Registry = typeof registry
  export interface UserRegistry extends Registry {}
}

test.group('React | Typings', () => {
  test('Basics', () => {
    Link({ route: 'users.index' })

    // Test tuple format
    Link({ route: 'users.comments.edit', routeParams: ['1', '2'] })

    // Test original object format
    Link({ route: 'users.comments.edit', routeParams: { id: '1', comment_id: '2' } })

    // @ts-expect-error too much params
    Link({ route: 'users.comments.edit', routeParams: ['1', '2', '3'] })

    // @ts-expect-error missing params
    Link({ route: 'users.comments.edit' })

    // @ts-expect-error missing params
    Link({ route: 'users.comments.edit', routeParams: [] })

    // @ts-expect-error missing params
    Link({ route: 'users.comments.edit', routeParams: ['1'] })

    // @ts-expect-error unknown route
    Link({ route: 'unknown', routeParams: [] })
  }).fails()

  test('do not ask for params if none are required', () => {
    Link({ route: 'users.index' })
    Link({ route: 'users.comments.edit', routeParams: ['1', '2'] })

    // @ts-expect-error missing params
    Link({ route: 'users.comments.edit' })
  }).fails()

  test('provider typing', () => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })
    TuyauProvider({ client, children: null })
  })

  test('useRouter typing', () => {
    const router = useRouter()

    router.visit({ route: 'users.index' })
    router.visit({ route: 'users.comments.edit', routeParams: ['1', '2'] })

    // @ts-expect-error inexistent route
    router.visit({ route: 'foo' })

    // @ts-expect-error missing params
    router.visit({ route: 'users.comments.edit' })
  }).fails()

  test('useRouter with direct href', () => {
    const router = useRouter()

    // Direct href navigation should work
    router.visit({ href: '/about' })
    router.visit({ href: '/users/1' })
    router.visit({ href: 'https://example.com' })

    // Can pass options with href
    router.visit({ href: '/logout' }, { method: 'post' })
    router.visit({ href: '/users' }, { method: 'get', preserveScroll: true })

    // @ts-expect-error cannot mix route and href
    router.visit({ route: 'users.index', href: '/about' })
  }).fails()

  test('useRouter href and route are mutually exclusive', () => {
    const router = useRouter()

    // Valid: using route
    router.visit({ route: 'users.index' })

    // Valid: using href
    router.visit({ href: '/about' })

    // @ts-expect-error cannot use both route and href
    router.visit({ route: 'users.index', href: '/about' })

    // @ts-expect-error cannot use route with href
    router.visit({ route: 'users.comments.edit', routeParams: ['1', '2'], href: '/users' })
  }).fails()

  test('Link with direct href', () => {
    // Direct href navigation should work
    Link({ href: '/about' })
    Link({ href: '/contact', method: 'post' })
    Link({ href: 'https://example.com' })

    // @ts-expect-error cannot mix route and href
    Link({ route: 'users.index', href: '/about' })
  }).fails()

  test('Link href and route are mutually exclusive', () => {
    // Valid: using route
    Link({ route: 'users.index' })

    // Valid: using href
    Link({ href: '/about' })

    // @ts-expect-error cannot use both route and href
    Link({ route: 'users.index', href: '/about' })

    // @ts-expect-error cannot use route with href
    Link({ route: 'users.comments.edit', routeParams: ['1', '2'], href: '/users' })
  }).fails()

  test('qs accepts query string parameters in route mode', () => {
    const router = useRouter()

    // Free-form qs for routes without declared query types
    Link({ route: 'users.index', qs: { page: 2, anything: 'goes' } })
    Form({ route: 'users.index', qs: { page: 2 } })
    router.visit({ route: 'users.index', qs: { page: 2 } })

    // qs follows the route's declared query types
    Link({ route: 'posts.index', qs: { page: 2, status: 'published' } })

    // @ts-expect-error unknown key when the route declares query types
    Link({ route: 'posts.index', qs: { unknown: true } })

    // @ts-expect-error wrong value type for a declared query param
    Link({ route: 'posts.index', qs: { page: 'two' } })
  }).fails()

  test('method overrides the resolved route method', () => {
    const router = useRouter()

    // Any Inertia-visitable method registered for the route is accepted
    Form({ route: 'posts.update', routeParams: ['1'], method: 'patch' })
    router.visit({ route: 'posts.update', routeParams: ['1'], method: 'put' })

    // @ts-expect-error HEAD registrations are not visitable by Inertia
    Link({ route: 'users.index', method: 'head' })

    // @ts-expect-error method not registered for the route
    Link({ route: 'users.index', method: 'post' })

    // @ts-expect-error method not registered for the route
    Form({ route: 'posts.update', routeParams: ['1'], method: 'delete' })
  }).fails()

  test('method sugar is route-aware', () => {
    const router = useRouter()

    // Each verb accepts routes registered for it, or a direct href
    router.get({ route: 'users.index', qs: { page: 2 } })
    router.put({ route: 'posts.update', routeParams: ['1'] })
    router.patch({ route: 'posts.update', routeParams: ['1'] }, { title: 'Hello' })
    router.post({ href: '/direct' })

    // @ts-expect-error route not registered for POST
    router.post({ route: 'users.index' })

    // @ts-expect-error route not registered for GET
    router.get({ route: 'posts.update', routeParams: ['1'] })

    // @ts-expect-error the method is fixed by the sugar
    router.put({ route: 'posts.update', routeParams: ['1'], method: 'patch' })
  }).fails()

  test('method sugar types the request body from the route', () => {
    const router = useRouter()

    // Route mode follows the route's declared body type
    router.post({ route: 'users.store' }, { email: 'virk@adonisjs.com', remember: true })

    // FormData stays accepted for file uploads
    router.post({ route: 'users.store' }, new FormData())

    // Routes without a declared body keep accepting free-form data
    router.patch({ route: 'posts.update', routeParams: ['1'] }, { title: 'Hello' })

    // Href mode has no route to derive a body from, so any payload works
    router.post({ href: '/direct' }, { anything: 'goes' })

    // @ts-expect-error unknown key for the route's declared body
    router.post({ route: 'users.store' }, { email: 'virk@adonisjs.com', unknown: true })

    // @ts-expect-error wrong value type for a declared body field
    router.post({ route: 'users.store' }, { email: 42 })
  }).fails()

  test('Form with route-based navigation', () => {
    // Form to a route without parameters
    Form({ route: 'users.index' })

    // Form to a route with required parameters (tuple)
    Form({ route: 'users.comments.edit', routeParams: ['1', '2'] })

    // Form to a route with required parameters (object)
    Form({ route: 'users.comments.edit', routeParams: { id: '1', comment_id: '2' } })

    // @ts-expect-error missing params
    Form({ route: 'users.comments.edit' })

    // @ts-expect-error unknown route
    Form({ route: 'unknown' })
  }).fails()

  test('Form with direct action', () => {
    // Direct action should work
    Form({ action: { url: '/users', method: 'post' } })
    Form({ action: { url: '/users/1', method: 'put' } })
    Form({ action: { url: '/users/1', method: 'delete' } })

    // @ts-expect-error cannot mix route and action
    Form({ route: 'users.index', action: { url: '/users', method: 'post' } })
  }).fails()

  test('Form types errors in the children render prop', () => {
    // Route mode derives the form-data shape from the route's declared
    // body, so the error keys come from the route itself. The negative
    // assertions (unknown keys are rejected) live in react_client.spec.ts,
    // which is only checked by tests/types/tsconfig.json where the upstream
    // client types resolve.
    Form({
      route: 'users.store',
      children: (slot) => {
        slot.errors.email
        slot.errors.remember
        return null
      },
    })

    // Action mode has no route to derive from, so the form-data shape is
    // given explicitly through the generic.
    Form<{ email: string }>({
      action: { url: '/users', method: 'post' },
      children: (slot) => {
        slot.errors.email
        return null
      },
    })
  }).fails()

  test('instant visit component follows the pages rendered by the route', () => {
    // Single render → the exact page
    Link({ route: 'users.index', component: 'users/index', pageProps: { users: [{ id: 1 }] } })

    // Conditional render → either page is accepted
    Link({
      route: 'users.show',
      routeParams: ['1'],
      component: 'users/show',
      pageProps: { user: { id: 1 } },
    })
    Link({
      route: 'users.show',
      routeParams: ['1'],
      component: 'users/limited',
      pageProps: { reason: 'private project' },
    })

    // Routes without an inferred page fall back to the full page registry
    Link({ route: 'users.store', component: 'posts/index' })

    const destination = 'users/show' as 'users/show' | 'users/limited'

    // A union-valued destination is not correlated with one branch's props
    // @ts-expect-error pageProps do not cover every possible destination
    Link({
      route: 'users.show',
      routeParams: ['1'],
      component: destination,
      pageProps: { reason: 'private project' },
    })

    // @ts-expect-error page not rendered by the route
    Link({ route: 'users.index', component: 'users/show', pageProps: { user: { id: 1 } } })

    // @ts-expect-error misspelled page name
    Link({ route: 'users.index', component: 'users/indx', pageProps: { users: [] } })
  }).fails()

  test('instant visit pageProps follow the chosen destination page', () => {
    // Callback form is typed the same as the object form, and may fold the
    // received shared props into the temporary page props
    Link({
      route: 'users.index',
      component: 'users/index',
      pageProps: (_currentProps, sharedProps) => ({ ...sharedProps, users: [{ id: 1 }] }),
    })

    // @ts-expect-error unknown prop for the destination page
    Link({ route: 'users.index', component: 'users/index', pageProps: { unknown: true } })

    // @ts-expect-error wrong prop value for the destination page
    Link({ route: 'users.index', component: 'users/index', pageProps: { users: 'nope' } })

    // @ts-expect-error callback must return the destination page's props
    Link({ route: 'users.index', component: 'users/index', pageProps: () => ({ users: 'nope' }) })
  }).fails()

  test('pageProps are required unless the destination declares every prop optional', () => {
    // posts/index declares everything optional → pageProps can be omitted
    Link({ route: 'posts.index', component: 'posts/index' })

    // Plain links stay untouched: no component, nothing demanded
    Link({ route: 'users.index' })

    // @ts-expect-error pageProps missing for a destination with required props
    Link({ route: 'users.index', component: 'users/index' })

    // @ts-expect-error required prop missing from pageProps
    Link({ route: 'users.index', component: 'users/index', pageProps: {} })

    // A key whose value accepts undefined is still a required key
    // @ts-expect-error pageProps missing for a destination with a required key
    Link({ href: '/settings', component: 'settings/show' })

    Link({
      href: '/settings',
      component: 'settings/show',
      pageProps: { preference: undefined },
    })
  }).fails()

  test('conditional instant links keep the component/pageProps pairing', () => {
    const mode = 'instant' as 'instant' | 'standard'
    const instant = mode === 'instant'

    // The runtime correlates the two ternaries; the types enforce the
    // pairing at the key level
    Link({
      route: 'users.index',
      component: instant ? 'users/index' : undefined,
      pageProps: instant ? { users: [{ id: 1 }] } : undefined,
    })

    // @ts-expect-error the pageProps key is still demanded alongside component
    Link({ route: 'users.index', component: instant ? 'users/index' : undefined })
  }).fails()

  test('instant visit props in href mode accept any registered page', () => {
    Link({ href: '/users', component: 'users/index', pageProps: { users: [] } })

    // @ts-expect-error unknown page name
    Link({ href: '/users', component: 'users/indx', pageProps: {} })

    // @ts-expect-error unknown prop for the chosen page
    Link({ href: '/users', component: 'users/index', pageProps: { unknown: true } })
  }).fails()

  test('Form action and route are mutually exclusive', () => {
    // Valid: using route
    Form({ route: 'users.index' })

    // Valid: using action
    Form({ action: { url: '/users', method: 'post' } })

    // @ts-expect-error cannot use both route and action
    Form({ route: 'users.index', action: { url: '/users', method: 'post' } })

    const action = { url: '/users', method: 'post' } as const

    // @ts-expect-error cannot use route with action
    Form({ route: 'users.comments.edit', routeParams: ['1', '2'], action })
  }).fails()
})
