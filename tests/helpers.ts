import { InlineConfig } from 'vite'
import { Vite } from '@adonisjs/vite'
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
 * Get active test or throw an error if not found
 */
export function getActiveTestOrThrow(): Test {
  const test = getActiveTest()
  if (!test) throw new Error('Cannot use this function outside a test')

  return test
}

/**
 * Spin up a Vite server for the test
 */
export async function setupVite(options: InlineConfig) {
  const test = getActiveTestOrThrow()

  /**
   * Create a dummy file to ensure the root directory exists
   * otherwise Vite will throw an error
   */
  await test.context.fs.create('dummy.txt', 'dummy')

  const vite = new Vite(true, {
    buildDirectory: test.context.fs.basePath,
    manifestFile: 'manifest.json',
  })

  await vite.createDevServer({
    root: test.context.fs.basePath,
    clearScreen: false,
    logLevel: 'silent',
    ...options,
  })

  test.cleanup(() => vite.stopDevServer())

  return vite
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

/**
 * Creates a basic React page
 */
export async function createFakeReactPage(path: string): Promise<void> {
  const test = getActiveTestOrThrow()

  const content = `
    import React from 'react'

    export default function Component() {
      return <div>React Component</div>
    }
  `

  await test.context.fs.create(path, content)
}

/**
 * Creates a fake Svelte page
 */
export async function createFakeSveltePage(path: string): Promise<void> {
  const test = getActiveTestOrThrow()

  const content = `
    <script lang="ts">
      // Svelte component
    </script>

    <div>Svelte Component</div>
  `

  await test.context.fs.create(path, content)
}

/**
 * Creates a fake Vue page
 */
export async function createFakeVuePage(path: string): Promise<void> {
  const test = getActiveTestOrThrow()

  const content = `
    <template>
      <div>Vue Component</div>
    </template>

    <script setup lang="ts">
      // Vue component
    </script>
  `

  await test.context.fs.create(path, content)
}

/**
 * Creates a fake Solid page
 */
export async function createFakeSolidPage(path: string): Promise<void> {
  const test = getActiveTestOrThrow()

  const content = `
    export default function Component() {
      return <div>Solid Component</div>
    }
  `

  await test.context.fs.create(path, content)
}

/**
 * Creates a package.json with the specified framework dependencies
 */
export async function createPackageWithFramework(framework: 'react' | 'vue' | 'svelte' | 'solid') {
  const test = getActiveTestOrThrow()

  const frameworkDeps = {
    react: { '@inertiajs/react': '^1.0.0' },
    vue: { '@inertiajs/vue3': '^1.0.0' },
    svelte: { '@inertiajs/svelte': '^1.0.0' },
    solid: { 'inertia-adapter-solid': '^1.0.0' },
  }

  await test.context.fs.create(
    'package.json',
    JSON.stringify({ dependencies: frameworkDeps[framework] })
  )
}
