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
import { createRawSnippet } from 'svelte'
import { test } from '@japa/runner'
import { createTuyau } from '@tuyau/core/client'
import { type AdonisEndpoint } from '@tuyau/core/types'
import { router as InertiaRouter } from '@inertiajs/svelte'

import Link from '../src/client/svelte/link.svelte'
import Form from '../src/client/svelte/form.svelte'
import { useRouter } from '../src/client/svelte/router.ts'
import { provideTuyau, tuyauContext } from '../src/client/svelte/context.ts'
import SvelteHttpProbe from './support/http_probe.svelte'

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

  test('Link renders child snippet content', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })
    const snippet = createRawSnippet(() => ({
      render: () => '<span class="link-label">View Users</span>',
    }))

    const { body } = render(Link as any, {
      props: { route: 'users.index', children: snippet },
      context: tuyauContext(client),
    })

    assert.include(body, 'href="/users"')
    assert.include(body, '<span class="link-label">View Users</span>')
  })

  test('Link with external href renders external link', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    const { body } = render(Link as any, {
      props: { href: 'https://example.com' },
      context: tuyauContext(client),
    })

    assert.include(body, 'href="https://example.com"')
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

  test('Form with action using DELETE method renders a hidden method override', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })

    const { body } = render(Form as any, {
      props: { action: { url: '/users/1', method: 'delete' } },
      context: tuyauContext(client),
    })

    assert.include(body, 'action="/users/1"')
  })

  test('Form renders child snippet content', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })
    const snippet = createRawSnippet(() => ({
      render: () => '<button type="submit">Submit Form</button>',
    }))

    const { body } = render(Form as any, {
      props: { route: 'users.store', children: snippet },
      context: tuyauContext(client),
    })

    assert.include(body, 'action="/users"')
    assert.include(body, '<button type="submit">Submit Form</button>')
  })
})

test.group('Svelte | useRouter Hook', () => {
  test('useRouter throws when called outside component initialization', ({ assert }) => {
    assert.throws(() => {
      useRouter()
    })
  })

  test('useRouter throws when called without Tuyau context', ({ assert }) => {
    assert.throws(() => {
      const { body } = render(SvelteHttpProbe as any, {
        props: {
          onReady() {
            useRouter()
          },
        },
      })
      void body
    }, 'No Tuyau client found in Svelte context')
  })

  test('useRouter returns navigation methods when initialized inside Tuyau context', ({
    assert,
  }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })
    let routerInstance: ReturnType<typeof useRouter> | undefined

    const { body } = render(SvelteHttpProbe as any, {
      props: {
        onReady() {
          routerInstance = useRouter()
        },
      },
      context: tuyauContext(client),
    })
    void body

    assert.isDefined(routerInstance)
    assert.isFunction(routerInstance!.visit)
    assert.isFunction(routerInstance!.get)
    assert.isFunction(routerInstance!.post)
    assert.isFunction(routerInstance!.put)
    assert.isFunction(routerInstance!.patch)
    assert.isFunction(routerInstance!.delete)
  })

  test('useRouter resolves route names and parameters on navigation', ({ assert }) => {
    const client = createTuyau({ registry, baseUrl: 'http://localhost' })
    let routerInstance: ReturnType<typeof useRouter> | undefined

    const { body } = render(SvelteHttpProbe as any, {
      props: {
        onReady() {
          routerInstance = useRouter()
        },
      },
      context: tuyauContext(client),
    })
    void body

    let capturedVisit: { url: string; options: any } | undefined
    const originalVisit = InertiaRouter.visit
    InertiaRouter.visit = ((url: string, options: any) => {
      capturedVisit = { url, options }
    }) as any

    try {
      routerInstance!.get({ route: 'users.show', routeParams: { id: '42' } })
    } finally {
      InertiaRouter.visit = originalVisit
    }

    assert.isDefined(capturedVisit)
    assert.equal(capturedVisit!.url, '/users/42')
    assert.equal(capturedVisit!.options.method, 'get')
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
