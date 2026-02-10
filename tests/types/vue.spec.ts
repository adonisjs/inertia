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
import { createApp, h } from 'vue'

import { Link } from '../../src/client/vue/link.ts'
import { Form } from '../../src/client/vue/form.ts'
import { useRouter } from '../../src/client/vue/router.ts'
import { TuyauProvider } from '../../src/client/vue/context.ts'

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

test.group('Vue | Link Component', () => {
  test('Link with route should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      h(TuyauProvider, { client }, () => [h(Link, { route: 'users.index' }, () => 'Users')])
    })
  })

  test('Link with route and params should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      h(TuyauProvider, { client }, () => [
        h(Link, { route: 'users.comments.edit', params: ['1', '2'] }, () => 'Edit Comment'),
      ])
    })
  })

  test('Link with direct href should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      h(TuyauProvider, { client }, () => [h(Link, { href: '/about' }, () => 'About')])
    })
  })

  test('Link with href and method should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      h(TuyauProvider, { client }, () => [
        h(Link, { href: '/logout', method: 'post' }, () => 'Logout'),
      ])
    })
  })

  test('Link with external href should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      h(TuyauProvider, { client }, () => [
        h(Link, { href: 'https://example.com' }, () => 'External Link'),
      ])
    })
  })
})

test.group('Vue | Form Component', () => {
  test('Form with route should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      h(TuyauProvider, { client }, () => [h(Form, { route: 'users.index' })])
    })
  })

  test('Form with route and params should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      h(TuyauProvider, { client }, () => [
        h(Form, { route: 'users.comments.edit', params: ['1', '2'] }),
      ])
    })
  })

  test('Form with direct action should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      h(TuyauProvider, { client }, () => [h(Form, { action: { url: '/users', method: 'post' } })])
    })
  })

  test('Form with action using PUT method should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      h(TuyauProvider, { client }, () => [h(Form, { action: { url: '/users/1', method: 'put' } })])
    })
  })

  test('Form with action using DELETE method should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      h(TuyauProvider, { client }, () => [
        h(Form, { action: { url: '/users/1', method: 'delete' } }),
      ])
    })
  })
})

test.group('Vue | useRouter Composable', () => {
  test('useRouter should be callable', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      const app = createApp({
        setup() {
          const router = useRouter()
          // Verify router has visit method
          assert.isFunction(router.visit)
          return () => h('div')
        },
      })

      app.provide('tuyau', client)
    })
  })
})
