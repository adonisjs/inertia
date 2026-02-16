/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import React from 'react'
import { test } from '@japa/runner'
import { createTuyau } from '@tuyau/core/client'
import { type AdonisEndpoint } from '@tuyau/core/types'

import { Form } from '../src/client/react/form.tsx'
import { Link } from '../src/client/react/link.tsx'
import { useRouter } from '../src/client/react/router.ts'
import { TuyauProvider } from '../src/client/react/context.tsx'

const routes = {
  'users.index': {
    methods: ['GET', 'HEAD'],
    pattern: '/users',
    tokens: [{ old: '/users', type: 0, val: 'users', end: '' }],
    types: null as any as {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
    },
  },
  'users.store': {
    methods: ['POST'],
    pattern: '/users',
    tokens: [{ old: '/users', type: 0, val: 'users', end: '' }],
    types: null as any as {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
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
      response: unknown
    },
  },
  'users.update': {
    methods: ['PUT', 'PATCH'],
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
      response: unknown
    },
  },
} as const satisfies Record<string, AdonisEndpoint>

const registry = {
  routes,
  $tree: {} as any,
}

test.group('React | Link Component', () => {
  test('Link with route should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      React.createElement(
        TuyauProvider,
        { client, children: null },
        React.createElement(Link, { route: 'users.index' }, 'Users')
      )
    })
  })

  test('Link with route and params should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      React.createElement(
        TuyauProvider,
        { client, children: null },
        React.createElement(Link, { route: 'users.comments.edit', routeParams: ['1'] }, 'View User')
      )
    })
  })

  test('Link with direct href should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      React.createElement(
        TuyauProvider,
        { client, children: null },
        React.createElement(Link, { href: '/about' }, 'About')
      )
    })
  })

  test('Link with href and method should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      React.createElement(
        TuyauProvider,
        { client, children: null },
        React.createElement(Link, { href: '/logout', method: 'post' }, 'Logout')
      )
    })
  })

  test('Link with external href should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      React.createElement(
        TuyauProvider,
        { client, children: null },
        React.createElement(Link, { href: 'https://example.com' }, 'External Link')
      )
    })
  })
})

test.group('React | Form Component', () => {
  test('Form with route should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      React.createElement(
        TuyauProvider,
        { client, children: null },
        React.createElement(Form, { route: 'users.index' })
      )
    })
  })

  test('Form with route and params should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      React.createElement(
        TuyauProvider,
        { client, children: null },
        React.createElement(Form, { route: 'users.comments.edit', routeParams: ['1'] })
      )
    })
  })

  test('Form with direct action should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      React.createElement(
        TuyauProvider,
        { client, children: null },
        React.createElement(Form, { action: { url: '/users', method: 'post' } })
      )
    })
  })

  test('Form with action using PUT method should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      React.createElement(
        TuyauProvider,
        { client, children: null },
        React.createElement(Form, { action: { url: '/users/1', method: 'put' } })
      )
    })
  })

  test('Form with action using DELETE method should not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      React.createElement(
        TuyauProvider,
        { client, children: null },
        React.createElement(Form, { action: { url: '/users/1', method: 'delete' } })
      )
    })
  })
})

test.group('React | useRouter Hook', () => {
  test('useRouter should be callable', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      // Create a functional component to test the hook
      const TestComponent = () => {
        const router = useRouter()
        // Verify router has visit method
        assert.isFunction(router.visit)
        return null
      }

      React.createElement(
        TuyauProvider,
        { client, children: null },
        React.createElement(TestComponent)
      )
    })
  })
})
