/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import React from 'react'
import { createRequire } from 'node:module'
import { test } from '@japa/runner'
import { http } from '@inertiajs/core'
import { createTuyau } from '@tuyau/core/client'
import { type AdonisEndpoint } from '@tuyau/core/types'
import { createSSRApp, h } from 'vue'

import { useHttp as useReactHttp } from '../src/client/react/http.ts'
import { TuyauProvider as ReactTuyauProvider } from '../src/client/react/context.tsx'
import { useHttp as useVueHttp } from '../src/client/vue/http.ts'
import { TuyauProvider as VueTuyauProvider } from '../src/client/vue/context.ts'

const require = createRequire(import.meta.url)
const renderToStaticMarkup: (node: React.ReactNode) => string =
  require('react-dom/server').renderToStaticMarkup
const renderToString: (app: unknown) => Promise<string> =
  require('@vue/server-renderer').renderToString

const routes = {
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
      { old: '/posts', type: 0, val: 'posts', end: '' },
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

const client = createTuyau({
  registry: { routes, $tree: {} as any },
  baseUrl: 'http://localhost',
})

async function captureHttpRequest(callback: () => Promise<unknown>) {
  const originalClient = http.getClient()
  let capturedRequest: { method: string; url: string; data?: unknown } | undefined

  http.setClient({
    async request(config: { method: string; url: string; data?: unknown }) {
      capturedRequest = config
      return {
        status: 200,
        data: JSON.stringify({ id: 1, email: 'virk@adonisjs.com' }),
        headers: {},
      }
    },
  })

  try {
    await callback()
  } finally {
    http.setClient(originalClient)
  }

  if (!capturedRequest) {
    throw new Error('Expected useHttp to issue a request')
  }

  return capturedRequest
}

test.group('React | useHttp Hook', () => {
  test('require TuyauProvider', ({ assert }) => {
    function TestComponent() {
      useReactHttp({ email: '' })
      return null
    }

    assert.throws(
      () => renderToStaticMarkup(React.createElement(TestComponent)),
      'You must wrap your app in a TuyauProvider'
    )
  })

  test('bind route URL, default method, and initial data', async ({ assert }) => {
    const request = await captureHttpRequest(async () => {
      let routeHttp: { submit(): Promise<unknown> } | undefined

      function TestComponent() {
        routeHttp = useReactHttp(
          { route: 'users.store' },
          { email: 'virk@adonisjs.com', remember: true }
        )
        return null
      }

      renderToStaticMarkup(
        React.createElement(ReactTuyauProvider, {
          client,
          children: React.createElement(TestComponent),
        })
      )

      await routeHttp!.submit()
    })

    assert.equal(request.method, 'post')
    assert.equal(request.url, '/users')
    assert.equal(request.data, JSON.stringify({ email: 'virk@adonisjs.com', remember: true }))
  })

  test('resolve route params and a method override', async ({ assert }) => {
    const request = await captureHttpRequest(async () => {
      let routeHttp: { submit(): Promise<unknown> } | undefined

      function TestComponent() {
        routeHttp = useReactHttp({ route: 'posts.update', routeParams: ['1'], method: 'patch' }, {})
        return null
      }

      renderToStaticMarkup(
        React.createElement(ReactTuyauProvider, {
          client,
          children: React.createElement(TestComponent),
        })
      )

      await routeHttp!.submit()
    })

    assert.equal(request.method, 'patch')
    assert.equal(request.url, '/posts/1')
  })

  test('preserve native useHttp calls without a route', async ({ assert }) => {
    const request = await captureHttpRequest(async () => {
      let nativeHttp: { post(url: string): Promise<unknown> } | undefined

      function TestComponent() {
        nativeHttp = useReactHttp({ email: 'virk@adonisjs.com' })
        return null
      }

      renderToStaticMarkup(
        React.createElement(ReactTuyauProvider, {
          client,
          children: React.createElement(TestComponent),
        })
      )

      await nativeHttp!.post('/native/users')
    })

    assert.equal(request.method, 'post')
    assert.equal(request.url, '/native/users')
  })
})

test.group('Vue | useHttp Composable', () => {
  test('require TuyauProvider', async ({ assert }) => {
    const app = createSSRApp({
      setup() {
        useVueHttp({ email: '' })
        return () => null
      },
    })
    app.config.warnHandler = () => undefined

    await assert.rejects(() => renderToString(app), 'You must wrap your app in a TuyauProvider')
  })

  test('bind route URL, default method, and initial data', async ({ assert }) => {
    const request = await captureHttpRequest(async () => {
      let routeHttp: { submit(): Promise<unknown> } | undefined

      const app = createSSRApp({
        render: () =>
          h(VueTuyauProvider, { client }, () =>
            h({
              setup() {
                routeHttp = useVueHttp(
                  { route: 'users.store' },
                  { email: 'virk@adonisjs.com', remember: true }
                )
                return () => null
              },
            })
          ),
      })

      await renderToString(app)
      await routeHttp!.submit()
    })

    assert.equal(request.method, 'post')
    assert.equal(request.url, '/users')
    assert.equal(request.data, JSON.stringify({ email: 'virk@adonisjs.com', remember: true }))
  })

  test('resolve route params and a method override', async ({ assert }) => {
    const request = await captureHttpRequest(async () => {
      let routeHttp: { submit(): Promise<unknown> } | undefined

      const app = createSSRApp({
        render: () =>
          h(VueTuyauProvider, { client }, () =>
            h({
              setup() {
                routeHttp = useVueHttp(
                  { route: 'posts.update', routeParams: ['1'], method: 'patch' },
                  {}
                )
                return () => null
              },
            })
          ),
      })

      await renderToString(app)
      await routeHttp!.submit()
    })

    assert.equal(request.method, 'patch')
    assert.equal(request.url, '/posts/1')
  })

  test('preserve native useHttp calls without a route', async ({ assert }) => {
    const request = await captureHttpRequest(async () => {
      let nativeHttp: { post(url: string): Promise<unknown> } | undefined

      const app = createSSRApp({
        render: () =>
          h(VueTuyauProvider, { client }, () =>
            h({
              setup() {
                nativeHttp = useVueHttp({ email: 'virk@adonisjs.com' })
                return () => null
              },
            })
          ),
      })

      await renderToString(app)
      await nativeHttp!.post('/native/users')
    })

    assert.equal(request.method, 'post')
    assert.equal(request.url, '/native/users')
  })
})
