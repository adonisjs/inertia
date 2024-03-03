import { ViteRuntime } from 'vite/runtime'
import { getActiveTest } from '@japa/runner'
import type { Test } from '@japa/runner/core'
import { HttpContext } from '@adonisjs/core/http'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { ApiClient, apiClient } from '@japa/api-client'
import { ApplicationService } from '@adonisjs/core/types'
import { IgnitorFactory } from '@adonisjs/core/factories'
import { NamedReporterContract } from '@japa/runner/types'
import { runner, syncReporter } from '@japa/runner/factories'
import { IncomingMessage, ServerResponse, createServer } from 'node:http'
import {
  createServer as createViteServer,
  createViteRuntime,
  ViteDevServer,
  InlineConfig,
} from 'vite'

import { inertiaApiClient } from '../src/plugins/japa/api_client.js'

export const BASE_URL = new URL('./tmp/', import.meta.url)

/**
 * Create a http server that will be closed automatically
 * when the test ends
 */
export const httpServer = {
  create(callback: (req: IncomingMessage, res: ServerResponse) => any) {
    const server = createServer(callback)
    getActiveTest()?.cleanup(async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
    })
    return server
  },
}

/**
 * Mock the `view` macro on HttpContext to return a fake
 */
export function setupViewMacroMock() {
  // @ts-expect-error
  HttpContext.getter('view', () => ({ render: (view: any, props: any) => ({ view, props }) }))
  getActiveTest()?.cleanup(() => {
    // @ts-expect-error
    delete HttpContext.prototype.view
  })
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
export async function setupVite(options: InlineConfig): Promise<{
  devServer: ViteDevServer
  runtime: ViteRuntime
}> {
  const test = getActiveTest()
  if (!test) throw new Error('Cannot use setupVite outside a test')

  /**
   * Create a dummy file to ensure the root directory exists
   * otherwise Vite will throw an error
   */
  await test.context.fs.create('dummy.txt', 'dummy')

  const devServer = await createViteServer({
    server: { middlewareMode: true, hmr: false },
    clearScreen: false,
    logLevel: 'silent',
    root: test.context.fs.basePath,
    ...options,
  })

  const runtime = await createViteRuntime(devServer)

  test.cleanup(() => devServer.close())

  return { devServer, runtime }
}

/**
 * Setup an AdonisJS app for testing
 */
export async function setupApp() {
  const ignitor = new IgnitorFactory()
    .withCoreProviders()
    .withCoreConfig()
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

  return { ace, app }
}
