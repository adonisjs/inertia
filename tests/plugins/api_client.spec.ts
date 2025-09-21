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
import { type HttpContext } from '@adonisjs/core/http'
import { type NextFn } from '@adonisjs/core/types/http'
import { HttpContextFactory, RequestFactory, ResponseFactory } from '@adonisjs/core/factories/http'

import { httpServer, runJapaTest, setupApp } from '../helpers.js'
import BaseInertiaMiddleware from '../../src/inertia_middleware.js'
import { InertiaFactory } from '../../factories/inertia_factory.js'

class InertiaMiddleware extends BaseInertiaMiddleware {
  share(_: HttpContext) {
    return {}
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)
    await next()
    this.dispose(ctx)
  }
}

test.group('Japa plugin | Api Client', () => {
  test('withInertia() should set the X-Inertia request header', async ({ assert, cleanup }) => {
    assert.plan(1)
    const { app } = await setupApp([
      {
        file: () => import('../../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

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

  test('withInertia() should set the X-Inertia-Version header', async ({ assert, cleanup }) => {
    assert.plan(1)

    const { app } = await setupApp([
      {
        file: () => import('../../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const server = httpServer.create(async (req, res) => {
      assert.deepEqual(req.headers['x-inertia-version'], '1')
      res.end()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client }) => {
      await client.get(url).withInertia()
    })
  })

  test('assert inertia response', async ({ cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.containerResolver = app.container.createResolver()

      const inertia = new InertiaFactory<{
        'Pages/Home': {}
      }>()
        .merge({ ctx: ctx })
        .create()

      const middleware = new InertiaMiddleware()
      try {
        await middleware.handle(ctx, async () => {
          response.send(await inertia.render('Pages/Home', { username: 'foo', foo: 'bar' }))
        })
      } catch (error) {
        console.log(error)
      }

      response.finish()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client }) => {
      const response = await client.get(url).withInertia()

      response.assertStatus(200)
      response
        .assertInertiaComponent('Pages/Home')
        .assertInertiaProps({ username: 'foo', foo: 'bar' })
        .assertInertiaPropsContains({ foo: 'bar' })

      const request = client.get(url)
      const response1 = await (request.withInertiaPartialReload as any)('Pages/Home', ['username'])

      response1
        .assertInertiaComponent('Pages/Home')
        .assertInertiaProps({ username: 'foo' })
        .assertInertiaPropsContains({ username: 'foo' })
    })
  })

  test('throw assertion errors on invalid expectations', async ({ cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.containerResolver = app.container.createResolver()
      const inertia = new InertiaFactory().merge({ ctx: ctx }).create()

      const middleware = new InertiaMiddleware()

      await middleware.handle(ctx, async () => {
        response.send(await inertia.render('Pages/Home', { username: 'foo', foo: 'bar' }))
      })

      response.finish()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client, assert }) => {
      const response = await client.get(url).withInertia()

      assert.throws(() => response.assertInertiaComponent('Bar/Login'))
      assert.throws(() => response.assertInertiaProps({ username: 'nopew' }))
      assert.throws(() => response.assertInertiaPropsContains({ foo: 'nopew' }))
    })
  })

  test('api client properties should contain correct data', async ({ cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.containerResolver = app.container.createResolver()
      const inertia = new InertiaFactory().merge({ ctx: ctx }).create()

      const middleware = new InertiaMiddleware()

      await middleware.handle(ctx, async () => {
        response.send(await inertia.render('Pages/Home', { username: 'foo', foo: 'bar' }))
      })

      response.finish()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client, assert }) => {
      const response = await client.get(url).withInertia()

      assert.deepEqual(response.inertiaComponent, 'Pages/Home')
      assert.deepEqual(response.inertiaProps, { username: 'foo', foo: 'bar' })
    })
  })
})
