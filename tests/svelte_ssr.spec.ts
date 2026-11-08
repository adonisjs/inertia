/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Edge } from 'edge.js'
import { render } from 'svelte/server'
import { createInertiaApp } from '@inertiajs/svelte'
import { createTuyau } from '@tuyau/core/client'
import { type AdonisEndpoint } from '@tuyau/core/types'
import { Vite } from '@adonisjs/vite'

import { compile, compileModule } from 'svelte/compiler'
import SimplePage from './support/fixtures/simple_page.svelte'
import Layout from './support/fixtures/layout.svelte'
import RoutePage from './support/fixtures/route_page.svelte'
import { edgePluginInertia } from '../src/plugins/edge/plugin.js'
import { ServerRenderer } from '../src/server_renderer.js'
import { defineConfig } from '../src/define_config.js'
import { setupVite } from './helpers.js'
import { tuyauContext } from '../src/client/svelte/context.ts'

const routes = {
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
  'users.store': {
    methods: ['POST'],
    pattern: '/users',
    tokens: [{ old: '/users', type: 0, val: 'users', end: '' }],
    types: null as any as {
      body: { email: string }
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
    },
  },
} as const satisfies Record<string, AdonisEndpoint>

const client = createTuyau({
  registry: { routes, $tree: {} as any },
  baseUrl: 'http://localhost',
})

test.group('Svelte 5 SSR | createInertiaApp', () => {
  test('render page props and head tags during SSR', async ({ assert }) => {
    const pageObject = {
      component: 'SimplePage',
      props: { user: { name: 'Alice' }, title: 'User Profile - Alice' },
      url: '/users/alice',
      version: '1',
      clearHistory: false,
      encryptHistory: false,
    }

    const result = await createInertiaApp({
      page: pageObject,
      resolve: () => ({ default: SimplePage }),
      setup({ App, props }: any) {
        return render(App, { props })
      },
    })

    assert.isDefined(result)
    assert.isString(result!.body)
    assert.isArray(result!.head)

    // Body contains initial JSON script tag
    assert.include(result!.body, '<script data-page="app" type="application/json">')
    assert.include(result!.body, '"component":"SimplePage"')
    assert.include(result!.body, '"name":"Alice"')

    // Body contains pre-rendered mount node with data-server-rendered
    assert.include(result!.body, '<div data-server-rendered="true" id="app">')
    assert.include(result!.body, '<h1>Hello Alice</h1>')

    // Head tags contain the title rendered by <svelte:head>
    assert.isTrue(
      result!.head.some((tag: string) => tag.includes('<title>User Profile - Alice</title>'))
    )
  })

  test('render application-wide layout during SSR', async ({ assert }) => {
    const pageObject = {
      component: 'SimplePage',
      props: { user: { name: 'Bob' } },
      url: '/users/bob',
      version: '1',
      clearHistory: false,
      encryptHistory: false,
    }

    const result = await createInertiaApp({
      page: pageObject,
      resolve: () => ({ default: SimplePage }),
      layout: () => Layout,
      setup({ App, props }: any) {
        return render(App, { props })
      },
    })

    assert.isDefined(result)
    assert.include(result!.body, '<div class="layout">')
    assert.include(result!.body, '<nav>Navigation Bar</nav>')
    assert.include(result!.body, '<h1>Hello Bob</h1>')
    assert.include(result!.body, '<footer>Page Footer</footer>')
  })

  test('render Tuyau-backed Link and Form components during SSR', async ({ assert }) => {
    const pageObject = {
      component: 'RoutePage',
      props: { userId: '42' },
      url: '/users/42',
      version: '1',
      clearHistory: false,
      encryptHistory: false,
    }

    const result = await createInertiaApp({
      page: pageObject,
      resolve: () => ({ default: RoutePage }),
      setup({ App, props }: any) {
        return render(App, {
          props,
          context: tuyauContext(client),
        })
      },
    })

    assert.isDefined(result)
    assert.include(result!.body, 'href="/users/42"')
    assert.include(result!.body, 'User Profile')
    assert.include(result!.body, 'action="/users"')
    assert.include(result!.body, 'method="post"')
    assert.include(result!.body, '<button type="submit">Save</button>')
  })

  test('integrate with Edge @inertia and @inertiaHead tags', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const pageObject = {
      component: 'SimplePage',
      props: { user: { name: 'Charlie' }, title: 'Charlie Page' },
      url: '/users/charlie',
      version: '1',
      clearHistory: false,
      encryptHistory: false,
    }

    const result = await createInertiaApp({
      page: pageObject,
      resolve: () => ({ default: SimplePage }),
      setup({ App, props }: any) {
        return render(App, { props })
      },
    })

    const template = `
      <!DOCTYPE html>
      <html>
        <head>
          @inertiaHead()
        </head>
        <body>
          @inertia()
        </body>
      </html>
    `

    const rendered = await edge.renderRaw(template, {
      page: {
        ssrHead: result!.head,
        ssrBody: result!.body,
        ...pageObject,
      },
    })

    assert.include(rendered, '<title>Charlie Page</title>')
    assert.include(rendered, '<script data-page="app" type="application/json">')
    assert.include(rendered, '<div data-server-rendered="true" id="app">')
    assert.include(rendered, '<h1>Hello Charlie</h1>')
  })

  test('concurrent SSR renders maintain state isolation', async ({ assert }) => {
    const renderUser = async (name: string, id: string) => {
      const pageObject = {
        component: 'SimplePage',
        props: { user: { name }, title: `Profile - ${name}` },
        url: `/users/${id}`,
        version: '1',
        clearHistory: false,
        encryptHistory: false,
      }

      return createInertiaApp({
        page: pageObject,
        resolve: () => ({ default: SimplePage }),
        setup({ App, props }: any) {
          return render(App, { props })
        },
      })
    }

    const [user1Result, user2Result] = await Promise.all([
      renderUser('UserOne', '1'),
      renderUser('UserTwo', '2'),
    ])

    // UserOne checks
    assert.include(user1Result!.body, '<h1>Hello UserOne</h1>')
    assert.notInclude(user1Result!.body, 'UserTwo')
    assert.isTrue(
      user1Result!.head.some((h: string) => h.includes('<title>Profile - UserOne</title>'))
    )
    assert.isFalse(user1Result!.head.some((h: string) => h.includes('UserTwo')))

    // UserTwo checks
    assert.include(user2Result!.body, '<h1>Hello UserTwo</h1>')
    assert.notInclude(user2Result!.body, 'UserOne')
    assert.isTrue(
      user2Result!.head.some((h: string) => h.includes('<title>Profile - UserTwo</title>'))
    )
    assert.isFalse(user2Result!.head.some((h: string) => h.includes('UserOne')))
  })
})

test.group('Svelte 5 SSR | ServerRenderer', () => {
  test('render page through ServerRenderer via SSR entrypoint', async ({ assert, fs }) => {
    // Create an SSR entrypoint that returns { head, body }
    await fs.create(
      'inertia/ssr.ts',
      `
      import { render } from 'svelte/server'
      import { createInertiaApp } from '@inertiajs/svelte'
      import SimplePage from '../../tests/support/fixtures/simple_page.svelte'

      export default function renderApp(page: any) {
        return createInertiaApp({
          page,
          resolve: () => ({ default: SimplePage }),
          setup({ App, props }) {
            return render(App, { props })
          },
        })
      }
    `
    )

    const vite = await setupVite({
      plugins: [
        {
          name: 'svelte-compiler-test-plugin',
          transform(code, id) {
            if (id.endsWith('.svelte.js') || id.endsWith('.svelte.ts')) {
              const { js } = compileModule(code, { filename: id, generate: 'server' })
              return { code: js.code, map: js.map }
            }
            if (id.endsWith('.svelte')) {
              const { js } = compile(code, { filename: id, generate: 'server' })
              return { code: js.code, map: js.map }
            }
          },
        },
      ],
      resolve: {
        conditions: ['svelte'],
      },
      ssr: {
        resolve: {
          conditions: ['svelte'],
        },
      },
      build: { rollupOptions: { input: 'inertia/ssr.ts' } },
    })

    const config = defineConfig({
      ssr: {
        enabled: true,
        entrypoint: 'inertia/ssr.ts',
      },
    })

    const renderer = new ServerRenderer(config, vite)

    const pageObject = {
      component: 'SimplePage',
      props: { user: { name: 'Diana' }, title: 'Diana SSR' },
      url: '/users/diana',
      version: '1',
      clearHistory: false,
      encryptHistory: false,
    }

    const result = await renderer.render(pageObject)

    assert.isString(result.body)
    assert.isArray(result.head)
    assert.include(result.body, '<h1>Hello Diana</h1>')
    assert.include(result.body, '<script data-page="app" type="application/json">')
    assert.include(result.body, '<div data-server-rendered="true" id="app">')
    assert.isTrue(result.head.some((h) => h.includes('<title>Diana SSR</title>')))
  })

  test('render page in production mode using prebuilt SSR bundle from manifest', async ({
    assert,
    fs,
  }) => {
    const vite = new Vite({
      buildDirectory: fs.basePath,
      manifestFile: 'manifest.json',
    })

    await fs.createJson('package.json', { type: 'module' })

    // A precompiled production SSR bundle
    await fs.create(
      'server/ssr.js',
      `
      import { render } from 'svelte/server'
      import { createInertiaApp } from '@inertiajs/svelte'
      import SimplePage from '../../support/fixtures/simple_page.svelte'

      export default function renderApp(page) {
        return createInertiaApp({
          page,
          resolve: () => ({ default: SimplePage }),
          setup({ App, props }) {
            return render(App, { props })
          },
        })
      }
    `
    )

    await fs.create(
      'server/.vite/manifest.json',
      JSON.stringify({
        'inertia/ssr.ts': { file: 'ssr.js', isEntry: true, src: 'inertia/ssr.ts' },
      })
    )

    const config = defineConfig({
      ssr: {
        enabled: true,
        entrypoint: 'inertia/ssr.ts',
      },
    })

    const renderer = new ServerRenderer(config, vite)

    const pageObject = {
      component: 'SimplePage',
      props: { user: { name: 'Edward' }, title: 'Edward Prod SSR' },
      url: '/users/edward',
      version: '1',
      clearHistory: false,
      encryptHistory: false,
    }

    const result = await renderer.render(pageObject)

    assert.isString(result.body)
    assert.isArray(result.head)
    assert.include(result.body, '<h1>Hello Edward</h1>')
    assert.include(result.body, '<script data-page="app" type="application/json">')
    assert.include(result.body, '<div data-server-rendered="true" id="app">')
    assert.isTrue(result.head.some((h) => h.includes('<title>Edward Prod SSR</title>')))
  })
})
