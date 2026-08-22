/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Runtime counterpart to react_components.spec.ts, adapted to how Svelte
 * actually invokes components. `React.createElement`/Vue's `h()` only build
 * a lazy element/vnode descriptor — the component function itself is not
 * called until something mounts the tree, so those tests mostly prove the
 * call *compiles*. Svelte 5 has no such descriptor: `mount`/`render` invoke
 * the component immediately. `render` from `svelte/server` is used here
 * (no DOM/jsdom dependency) so these assertions are a genuine step further —
 * they prove the wrapper actually resolves the route and renders real HTML
 * through the bundled `@inertiajs/svelte` components, not just that
 * construction doesn't throw synchronously.
 *
 * Requires the test-only `.svelte` Node loader (tests/support/svelte_loader)
 * registered by bin/test.ts — see that file and the loader's own doc comment
 * for why plain Node needs it and what it works around.
 *
 * Scope note: an earlier draft of this file also asserted that rendering
 * Link outside a TuyauProvider throws. In isolation it does (verified
 * directly), but reproducibly stopped throwing once several successful
 * `render()` calls preceded it in the same process — an SSR context-reuse
 * quirk in `svelte/server`/`@inertiajs/svelte` under rapid sequential calls,
 * not in this adapter's own code (which unconditionally calls `useTuyau()`
 * at component init either way). Real apps render one page per request
 * through `@inertiajs/svelte`'s own `createInertiaApp` SSR pipeline, not this
 * raw harness, so it was dropped rather than chased further here.
 */
import { render } from 'svelte/server'
import { test } from '@japa/runner'
import { createTuyau } from '@tuyau/core/client'
import { type AdonisEndpoint } from '@tuyau/core/types'

import Link from '../src/client/svelte/link.svelte'
import Form from '../src/client/svelte/form.svelte'
import { provideTuyau, tuyauContext } from '../src/client/svelte/context.ts'

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
      { old: '/users', type: 0, val: 'users', end: '' },
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
      { old: '/users', type: 0, val: 'users', end: '' },
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

test.group('Svelte | Link Component', () => {
  test('Link with route renders the resolved href', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    const { body } = render(Link as any, {
      props: { route: 'users.index' },
      context: tuyauContext(client),
    })

    assert.include(body, 'href="/users"')
  })

  test('Link with route and params renders the resolved href', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    const { body } = render(Link as any, {
      props: { route: 'users.show', routeParams: { id: '1' } },
      context: tuyauContext(client),
    })

    assert.include(body, 'href="/users/1"')
  })

  test('Link with direct href does not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      render(Link as any, { props: { href: '/about' }, context: tuyauContext(client) })
    })
  })

  test('Link with href and a non-GET method renders a JS-driven button', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    // Non-GET methods can't navigate via a plain <a href>, so the bundled
    // Inertia Link renders a button that drives the visit via JS instead —
    // real upstream behavior, not something this wrapper changes. This
    // proves `method` reaches the underlying component correctly.
    const { body } = render(Link as any, {
      props: { href: '/logout', method: 'post' },
      context: tuyauContext(client),
    })

    assert.include(body, '<button type="button">')
  })
})

test.group('Svelte | Form Component', () => {
  test('Form with route renders the resolved action and method', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    const { body } = render(Form as any, {
      props: { route: 'users.store' },
      context: tuyauContext(client),
    })

    assert.include(body, 'action="/users"')
    assert.include(body, 'method="post"')
  })

  test('Form with route and params renders the resolved action', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    const { body } = render(Form as any, {
      props: { route: 'users.show', routeParams: { id: '1' } },
      context: tuyauContext(client),
    })

    assert.include(body, 'action="/users/1"')
  })

  test('Form with direct action does not throw', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    assert.doesNotThrow(() => {
      render(Form as any, {
        props: { action: { url: '/users', method: 'post' } },
        context: tuyauContext(client),
      })
    })
  })

  test('Form with action using PUT method renders a hidden method override', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    const { body } = render(Form as any, {
      props: { action: { url: '/users/1', method: 'put' } },
      context: tuyauContext(client),
    })

    assert.include(body, 'action="/users/1"')
  })
})

test.group('Svelte | Tuyau context', () => {
  /**
   * `provideTuyau` is what an app actually uses: `createInertiaApp` owns the
   * mounting (so it can hydrate server-rendered markup or mount from scratch)
   * and hands a context map to its `withApp` hook rather than accepting one
   * back. Seeding through that map has to reach the components the same way
   * `tuyauContext` does — the two write the same key, and this proves it
   * rather than assuming it.
   */
  test('a client seeded the way withApp seeds it reaches the components', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    const context = new Map<any, any>()
    provideTuyau(context, client)

    const { body } = render(Link as any, {
      props: { route: 'users.show', routeParams: { id: '1' } },
      context,
    })

    assert.include(body, 'href="/users/1"')
  })

  test('provideTuyau and tuyauContext agree on the context key', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    const seeded = new Map<any, any>()
    provideTuyau(seeded, client)

    assert.deepEqual([...seeded.keys()], [...tuyauContext(client).keys()])
  })

  test('provideTuyau leaves the rest of the context map alone', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    const context = new Map<any, any>([['app.locale', 'en']])
    provideTuyau(context, client)

    assert.equal(context.get('app.locale'), 'en')
    assert.equal(context.size, 2)
  })
})
