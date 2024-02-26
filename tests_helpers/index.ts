import type { Test } from '@japa/runner/core'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { IncomingMessage, ServerResponse, createServer } from 'node:http'

import { getActiveTest } from '@japa/runner'
import { HttpContext } from '@adonisjs/core/http'
import { ApiClient, apiClient } from '@japa/api-client'
import { ApplicationService } from '@adonisjs/core/types'
import { NamedReporterContract } from '@japa/runner/types'
import { runner, syncReporter } from '@japa/runner/factories'
import { inertiaApiClient } from '../src/plugins/api_client.js'

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
