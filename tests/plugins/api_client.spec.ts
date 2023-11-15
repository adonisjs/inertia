/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import getPort from 'get-port'
import { test } from '@japa/runner'
import { AppFactory } from '@adonisjs/core/factories/app'
import { ApplicationService } from '@adonisjs/core/types'
import { HttpContextFactory, RequestFactory, ResponseFactory } from '@adonisjs/core/factories/http'

import { VersionCache } from '../../src/version_cache.js'
import InertiaMiddleware from '../../src/inertia_middleware.js'
import { InertiaFactory } from '../../factories/inertia_factory.js'
import { httpServer, runJapaTest } from '../../tests_helpers/index.js'

const app = new AppFactory().create(new URL('./', import.meta.url), () => {}) as ApplicationService

test.group('Japa plugin | Api Client', (group) => {
  group.setup(async () => {
    await app.init()
    await app.boot()
  })

  test('inertia() should send the x-inertia header', async ({ assert }) => {
    assert.plan(1)

    const server = httpServer.create(async (req, res) => {
      assert.deepEqual(req.headers['x-inertia'], 'true')
      res.end()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client }) => {
      await client.get(url).withInertia()
    })
  })

  test('assertions should works', async () => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const inertia = new InertiaFactory().merge({ ctx: ctx }).create()

      const middleware = new InertiaMiddleware(new VersionCache(new URL(import.meta.url), '1'))

      await middleware.handle(ctx, async () => {
        response.send(await inertia.render('Pages/Home', { username: 'foo', foo: 'bar' }))
      })

      response.finish()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client }) => {
      const r1 = await client.get(url).withInertia()

      r1.assertInertiaComponent('Pages/Home')
        .assertInertiaProps({ username: 'foo', foo: 'bar' })
        .assertInertiaPropsContains({ foo: 'bar' })

      const r2 = await client.get(url).withInertiaPartialReload('Pages/Home', ['username'])

      r2.assertInertiaComponent('Pages/Home')
        .assertInertiaProps({ username: 'foo' })
        .assertInertiaPropsContains({ username: 'foo' })
    })
  })

  test('assertions should throws if not valid', async () => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const inertia = new InertiaFactory().merge({ ctx: ctx }).create()

      const middleware = new InertiaMiddleware(new VersionCache(new URL(import.meta.url), '1'))

      await middleware.handle(ctx, async () => {
        response.send(await inertia.render('Pages/Home', { username: 'foo', foo: 'bar' }))
      })

      response.finish()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client, assert }) => {
      const r1 = await client.get(url).withInertia()

      assert.throws(() => r1.assertInertiaComponent('Bar/Login'))
      assert.throws(() => r1.assertInertiaProps({ username: 'nopew' }))
      assert.throws(() => r1.assertInertiaPropsContains({ foo: 'nopew' }))
    })
  })

  test('api client properties should contains correct data', async () => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      const inertia = new InertiaFactory().merge({ ctx: ctx }).create()

      const middleware = new InertiaMiddleware(new VersionCache(new URL(import.meta.url), '1'))

      await middleware.handle(ctx, async () => {
        response.send(await inertia.render('Pages/Home', { username: 'foo', foo: 'bar' }))
      })

      response.finish()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client, assert }) => {
      const r1 = await client.get(url).withInertia()

      assert.deepEqual(r1.inertiaComponent, 'Pages/Home')
      assert.deepEqual(r1.inertiaProps, { username: 'foo', foo: 'bar' })
    })
  })
})
