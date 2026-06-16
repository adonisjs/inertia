/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Edge } from 'edge.js'
import { test } from '@japa/runner'
import { type InlineConfig } from 'vite'
import { getInitialPageFromDOM } from '@inertiajs/core'
import type { Test } from '@japa/runner/core'
import { HttpContext } from '@adonisjs/core/http'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { ApiClient, apiClient } from '@japa/api-client'
import { IgnitorFactory } from '@adonisjs/core/factories'
import { type ProviderNode } from '@adonisjs/core/types/app'
import { runner, syncReporter } from '@japa/runner/factories'
import { type ApplicationService } from '@adonisjs/core/types'
import { type NamedReporterContract } from '@japa/runner/types'
import { defineConfig as defineViteConfig, Vite } from '@adonisjs/vite'
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http'

import { defineConfig } from '../src/define_config.ts'
import { edgePluginInertia } from '../src/plugins/edge/plugin.js'
import { inertiaApiClient } from '../src/plugins/japa/api_client.js'

export const BASE_URL = new URL('./tmp/', import.meta.url)

/**
 * Create a http server that will be closed automatically
 * when the test ends
 */
export const httpServer = {
  create: test.macro(($test, callback: (req: IncomingMessage, res: ServerResponse) => any) => {
    const server = createServer(callback)
    $test.cleanup(async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
    })
    return server
  }),
}

/**
 * Mock the `view` macro on HttpContext to return a fake
 */
export function setupViewMacroMock() {
  const edge = Edge.create()
  const originalRenderer = edge.createRenderer.bind(edge)

  edge.createRenderer = function () {
    const renderer = originalRenderer()
    renderer.render = function (view, props): any {
      return { view, props: { ...this.getState(), ...props } }
    }
    return renderer
  }

  HttpContext.getter('view', () => edge.createRenderer(), true)
}

/**
 * Runs a japa test in isolation
 */
export async function runJapaTest(app: ApplicationService, callback: Parameters<Test['run']>[0]) {
  ApiClient.clearSetupHooks()
  ApiClient.clearTeardownHooks()
  ApiClient.clearRequestHandlers()

  await runner()
    .configure({
      reporters: {
        activated: [syncReporter.name],
        list: [syncReporter as NamedReporterContract],
      },
      plugins: [apiClient(), pluginAdonisJS(app), inertiaApiClient(app)],
      files: [],
    })
    .runTest('testing japa integration', callback)
}

/**
 * Spin up a Vite server for the test
 */
export const setupVite = test.macro(async ($test, options: InlineConfig) => {
  /**
   * Create a dummy file to ensure the root directory exists
   * otherwise Vite will throw an error
   */
  await $test.context.fs.create('dummy.txt', 'dummy')

  const vite = new Vite({
    buildDirectory: $test.context.fs.basePath,
    manifestFile: 'manifest.json',
  })

  await vite.createDevServer({
    root: $test.context.fs.basePath,
    clearScreen: false,
    logLevel: 'silent',
    ...options,
  })

  $test.cleanup(() => vite.stopDevServer())
  return vite
})

/**
 * Setup an AdonisJS app for testing
 */
export async function setupApp(providers?: ProviderNode[]) {
  const ignitor = new IgnitorFactory()
    .withCoreProviders()
    .withCoreConfig()
    .merge({
      config: {
        vite: defineViteConfig({}),
        inertia: defineConfig({}),
      },
      rcFileContents: {
        providers: (providers ?? []).concat([
          {
            file: () => import('@adonisjs/core/providers/edge_provider'),
            environment: ['test', 'web'],
          },
          {
            file: () => import('@adonisjs/vite/vite_provider'),
            environment: ['test', 'web'],
          },
        ]),
      },
    })
    .create(BASE_URL, {
      importer: (filePath) => {
        if (filePath.startsWith('./') || filePath.startsWith('../')) {
          return import(new URL(filePath, BASE_URL).href)
        }

        return import(filePath)
      },
    })

  const app = ignitor.createApp('web')
  await app.init().then(() => app.boot())

  const ace = await app.container.make('ace')
  ace.ui.switchMode('raw')

  return { ace, app, ignitor }
}

/**
 * Minimal, faithful DOM shim that implements just enough of
 * `document.querySelector` for the real `@inertiajs/core` `getInitialPageFromDOM`
 * helper to run against a server-rendered HTML string.
 *
 * It parses every `<script>...</script>` block out of the markup and matches
 * the `script[attr="value"]...` selector the v3 client builds. The regex stops
 * at the first *unescaped* `</script>`, which is exactly the boundary the
 * browser's HTML parser uses — so an escaped `<\/script>` inside the JSON
 * payload does not terminate the element early.
 */
export function createDocumentFrom(html: string) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map((match) => {
    const attributes: Record<string, string> = {}
    for (const attr of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) {
      attributes[attr[1]] = attr[2]
    }
    return { attributes, textContent: match[2] }
  })

  return {
    querySelector(selector: string) {
      if (!selector.startsWith('script')) return null
      const conditions = [...selector.matchAll(/\[([\w-]+)="([^"]*)"\]/g)].map(
        (condition) => [condition[1], condition[2]] as const
      )
      const element = scripts.find((script) =>
        conditions.every(([key, value]) => script.attributes[key] === value)
      )
      return element ?? null
    },
  }
}

/**
 * Render a page object the way an application root view does, through the real
 * `@inertia()` Edge global, then hand the resulting markup to the real v3
 * client helper and return whatever it reconstructs.
 */
export async function roundTripThroughClient(
  page: Record<string, any>,
  attributes?: Record<string, any>
) {
  const edge = Edge.create().use(edgePluginInertia())
  const expression = attributes ? `@inertia(${JSON.stringify(attributes)})` : `@inertia()`
  const html = await edge.renderRaw(expression, { page })

  const id = attributes?.id ?? 'app'
  const previousWindow = (globalThis as any).window
  const previousDocument = (globalThis as any).document

  /**
   * `getInitialPageFromDOM` bails out when `window` is undefined, so we make
   * both globals available for the duration of the call.
   */
  ;(globalThis as any).window = {}
  ;(globalThis as any).document = createDocumentFrom(html)

  try {
    return { html, page: getInitialPageFromDOM(id) }
  } finally {
    ;(globalThis as any).window = previousWindow
    ;(globalThis as any).document = previousDocument
  }
}

export const setupFakeAdonisProject = test.macro(async ($test) => {
  await Promise.all([
    $test.context.fs.create('.env', ''),
    $test.context.fs.createJson('tsconfig.json', {}),
    $test.context.fs.create('adonisrc.ts', `export default defineConfig({})`),
    $test.context.fs.create('vite.config.ts', `export default { plugins: [] }`),
    $test.context.fs.create(
      'start/kernel.ts',
      `
      import router from '@adonisjs/core/services/router'
      import server from '@adonisjs/core/services/server'

      router.use([
        () => import('@adonisjs/core/bodyparser_middleware'),
      ])

      server.use([])
    `
    ),
  ])
})
