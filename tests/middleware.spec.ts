/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import supertest from 'supertest'
import { test } from '@japa/runner'
import { HttpContextFactory, RequestFactory, ResponseFactory } from '@adonisjs/core/factories/http'

import { httpServer } from '../tests_helpers/index.js'
import { VersionCache } from '../src/version_cache.js'
import InertiaMiddleware from '../src/inertia_middleware.js'

test.group('Middleware', () => {
  test('set 303 http code on put/patch/delete method', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const middleware = new InertiaMiddleware(new VersionCache(new URL(import.meta.url), '1'))

      await middleware.handle(ctx, () => {
        ctx.response.redirect('/foo')
      })

      ctx.response.finish()
    })

    const r1 = await supertest(server).put('/').set('x-inertia', 'true')
    const r2 = await supertest(server).delete('/').set('x-inertia', 'true')
    const r3 = await supertest(server).patch('/').set('x-inertia', 'true')

    assert.equal(r1.status, 303)
    assert.equal(r2.status, 303)
    assert.equal(r3.status, 303)
  })

  test('dont set 303 http code if not inertia request', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const middleware = new InertiaMiddleware(new VersionCache(new URL(import.meta.url), '1'))

      await middleware.handle(ctx, () => {
        ctx.response.redirect('/foo')
      })

      ctx.response.finish()
    })

    const r1 = await supertest(server).put('/')
    const r2 = await supertest(server).delete('/')
    const r3 = await supertest(server).patch('/')

    assert.equal(r1.status, 302)
    assert.equal(r2.status, 302)
    assert.equal(r3.status, 302)
  })

  test('set vary and x-inertia header as response if its inertia request', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const middleware = new InertiaMiddleware(new VersionCache(new URL(import.meta.url), '1'))

      await middleware.handle(ctx, () => {
        ctx.response.redirect('/foo')
      })

      ctx.response.finish()
    })

    const r1 = await supertest(server).get('/').set('x-inertia', 'true')
    const r2 = await supertest(server).get('/')

    assert.equal(r1.headers.vary, 'Accept')
    assert.equal(r1.headers['x-inertia'], 'true')
    assert.isUndefined(r2.headers.vary)
    assert.isUndefined(r2.headers['x-inertia'])
  })

  test('force a full reload if version has changed', async ({ assert }) => {
    let requestCount = 1

    const version = new VersionCache(new URL(import.meta.url), '1')
    const middleware = new InertiaMiddleware(version)
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      version.setVersion(requestCount.toString())

      await middleware.handle(ctx, () => {
        ctx.response.redirect('/foo')
      })

      ctx.response.finish()
    })

    const r1 = await supertest(server).get('/').set('x-inertia', 'true')

    assert.equal(r1.status, 409)
    assert.equal(r1.headers['x-inertia-location'], '/')
  })
})
