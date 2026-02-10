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

import { Link } from '../../src/client/react/link.tsx'
import { Form } from '../../src/client/react/form.tsx'
import { useRouter } from '../../src/client/react/router.ts'
import { TuyauProvider } from '../../src/client/react/context.tsx'

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
      response: unknown
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
    Link({ route: 'users.comments.edit', params: ['1', '2'] })

    // Test original object format
    Link({ route: 'users.comments.edit', params: { id: '1', comment_id: '2' } })

    // @ts-expect-error too much params
    Link({ route: 'users.comments.edit', params: ['1', '2', '3'] })

    // @ts-expect-error missing params
    Link({ route: 'users.comments.edit' })

    // @ts-expect-error missing params
    Link({ route: 'users.comments.edit', params: [] })

    // @ts-expect-error missing params
    Link({ route: 'users.comments.edit', params: ['1'] })

    // @ts-expect-error unknown route
    Link({ route: 'unknown', params: [] })
  }).fails()

  test('do not ask for params if none are required', () => {
    Link({ route: 'users.index' })
    Link({ route: 'users.comments.edit', params: ['1', '2'] })

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
    router.visit({ route: 'users.comments.edit', params: ['1', '2'] })

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
    router.visit({ route: 'users.comments.edit', params: ['1', '2'], href: '/users' })
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
    Link({ route: 'users.comments.edit', params: ['1', '2'], href: '/users' })
  }).fails()

  test('Form with route-based navigation', () => {
    // Form to a route without parameters
    Form({ route: 'users.index' })

    // Form to a route with required parameters (tuple)
    Form({ route: 'users.comments.edit', params: ['1', '2'] })

    // Form to a route with required parameters (object)
    Form({ route: 'users.comments.edit', params: { id: '1', comment_id: '2' } })

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

  test('Form action and route are mutually exclusive', () => {
    // Valid: using route
    Form({ route: 'users.index' })

    // Valid: using action
    Form({ action: { url: '/users', method: 'post' } })

    // @ts-expect-error cannot use both route and action
    Form({ route: 'users.index', action: { url: '/users', method: 'post' } })

    // @ts-expect-error cannot use route with action
    Form({
      route: 'users.comments.edit',
      params: ['1', '2'],
      action: { url: '/users', method: 'post' },
    })
  }).fails()
})
