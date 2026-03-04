/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { IgnitorFactory } from '@adonisjs/core/factories'
import { HttpContext } from '@adonisjs/core/http'
import { type ApplicationService } from '@adonisjs/core/types'
import { type ProviderNode } from '@adonisjs/core/types/app'
import { defineConfig as defineViteConfig, Vite } from '@adonisjs/vite'
import { ApiClient, apiClient } from '@japa/api-client'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { test } from '@japa/runner'
import type { Test } from '@japa/runner/core'
import { runner, syncReporter } from '@japa/runner/factories'
import { type NamedReporterContract } from '@japa/runner/types'
import { Edge } from 'edge.js'
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http'
import { type InlineConfig } from 'vite'

import { defineConfig } from '../src/define_config.ts'
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

export const makePaginatedData = (currentPage: number, lastPage: number) => {
  return {
    data: [{ id: currentPage, title: `Post ${currentPage}` }],
    meta: {
      total: lastPage * 10,
      perPage: 10,
      currentPage,
      lastPage,
      firstPage: 1,
      firstPageUrl: '/?page=1',
      lastPageUrl: `/?page=${lastPage}`,
      nextPageUrl: currentPage < lastPage ? `/?page=${currentPage + 1}` : null,
      previousPageUrl: currentPage > 1 ? `/?page=${currentPage - 1}` : null,
    },
  }
}
