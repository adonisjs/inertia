import { test } from '@japa/runner'
import { IgnitorFactory } from '@adonisjs/core/factories'

import { defineConfig } from '../index.js'
import { defineConfig as viteDefineConfig } from '@adonisjs/vite'
import InertiaMiddleware from '../src/inertia_middleware.js'
import { Route } from '@adonisjs/core/http'

const BASE_URL = new URL('./tmp/', import.meta.url)
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, BASE_URL).href)
  }
  return import(filePath)
}

test.group('Inertia Provider', () => {
  test('register inertia middleware singleton', async ({ assert, cleanup }) => {
    const ignitor = new IgnitorFactory()
      .merge({
        rcFileContents: {
          providers: [
            () => import('../providers/inertia_provider.js'),
            () => import('@adonisjs/vite/vite_provider'),
          ],
        },
      })
      .withCoreConfig()
      .withCoreProviders()
      .merge({
        config: { inertia: defineConfig({ rootView: 'root' }), vite: viteDefineConfig({}) },
      })
      .create(BASE_URL, { importer: IMPORTER })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    cleanup(() => app.terminate())

    assert.instanceOf(await app.container.make(InertiaMiddleware), InertiaMiddleware)
  })

  test('register brisk route macro', async ({ assert, cleanup, expectTypeOf }) => {
    const ignitor = new IgnitorFactory()
      .merge({
        rcFileContents: {
          providers: [
            () => import('../providers/inertia_provider.js'),
            () => import('@adonisjs/vite/vite_provider'),
          ],
        },
      })
      .withCoreConfig()
      .withCoreProviders()
      .merge({
        config: { inertia: defineConfig({ rootView: 'root' }), vite: viteDefineConfig({}) },
      })
      .create(BASE_URL, { importer: IMPORTER })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    cleanup(() => app.terminate())

    const router = await app.container.make('router')

    assert.property(router.on('foo'), 'renderInertia')
    expectTypeOf(router.on('foo').renderInertia('/foo')).toEqualTypeOf<Route>()
  })
})
