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

import { Inertia } from '../src/inertia.js'
import { InertiaHeaders } from '../src/headers.js'
import { httpServer } from '../tests_helpers/index.js'
import { VersionCache } from '../src/version_cache.js'
import InertiaMiddleware from '../src/inertia_middleware.js'
import { SessionMiddlewareFactory } from '@adonisjs/session/factories'

test.group('Middleware', () => {
  test('add inertia to http context', async ({ assert }) => {
    const server = httpServer.create(async (_req, res) => {
      const ctx = new HttpContextFactory().create()

      const middleware = new InertiaMiddleware({
        rootView: 'root',
        sharedData: {},
        versionCache: new VersionCache(new URL(import.meta.url), '1'),
        ssr: { enabled: false, bundle: '', entrypoint: '' },
        history: { encrypt: false },
      })

      await middleware.handle(ctx, () => {})
      assert.instanceOf(ctx.inertia, Inertia)

      res.end()
    })

    await supertest(server).get('/')
  })

  test('set 303 http code on put/patch/delete method', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const middleware = new InertiaMiddleware({
        rootView: 'root',
        sharedData: {},
        versionCache: new VersionCache(new URL(import.meta.url), '1'),
        ssr: { enabled: false, bundle: '', entrypoint: '' },
        history: { encrypt: false },
      })

      await middleware.handle(ctx, () => {
        ctx.response.redirect('/foo')
      })

      ctx.response.finish()
    })

    const r1 = await supertest(server).put('/').set(InertiaHeaders.Inertia, 'true')
    const r2 = await supertest(server).delete('/').set(InertiaHeaders.Inertia, 'true')
    const r3 = await supertest(server).patch('/').set(InertiaHeaders.Inertia, 'true')

    assert.equal(r1.status, 303)
    assert.equal(r2.status, 303)
    assert.equal(r3.status, 303)
  })

  test('dont set 303 http code if not inertia request', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const middleware = new InertiaMiddleware({
        rootView: 'root',
        sharedData: {},
        versionCache: new VersionCache(new URL(import.meta.url), '1'),
        ssr: { enabled: false, bundle: '', entrypoint: '' },
        history: { encrypt: false },
      })

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

  test('set vary header if its inertia request', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const middleware = new InertiaMiddleware({
        rootView: 'root',
        sharedData: {},
        versionCache: new VersionCache(new URL(import.meta.url), '1'),
        ssr: { enabled: false, bundle: '', entrypoint: '' },
        history: { encrypt: false },
      })

      await middleware.handle(ctx, () => {
        ctx.response.redirect('/foo')
      })

      ctx.response.finish()
    })

    const r1 = await supertest(server).get('/').set(InertiaHeaders.Inertia, 'true')
    const r2 = await supertest(server).get('/')

    assert.equal(r1.headers.vary, InertiaHeaders.Inertia)
    assert.isUndefined(r2.headers.vary)
  })

  test('should not append x-inertia request if not using inertia.render', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const middleware = new InertiaMiddleware({
        rootView: 'root',
        sharedData: {},
        versionCache: new VersionCache(new URL(import.meta.url), '1'),
        ssr: { enabled: false, bundle: '', entrypoint: '' },
        history: { encrypt: false },
      })

      await middleware.handle(ctx, () => {})

      ctx.response.finish()
    })

    const r1 = await supertest(server).get('/')

    assert.isUndefined(r1.headers['x-inertia'])
  })

  test('force a full reload if version has changed', async ({ assert }) => {
    let requestCount = 1

    const version = new VersionCache(new URL(import.meta.url), '1')
    const middleware = new InertiaMiddleware({
      rootView: 'root',
      sharedData: {},
      versionCache: version,
      ssr: { enabled: false, bundle: '', entrypoint: '' },
      history: { encrypt: false },
    })

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

    const r1 = await supertest(server).get('/').set(InertiaHeaders.Inertia, 'true')

    assert.equal(r1.status, 409)
    assert.equal(r1.headers['x-inertia-location'], '/')
  })

  test('if version has changed response should not includes x-inertia header', async ({
    assert,
  }) => {
    let requestCount = 1

    const version = new VersionCache(new URL(import.meta.url), '1')
    const middleware = new InertiaMiddleware({
      rootView: 'root',
      sharedData: {},
      versionCache: version,
      ssr: { enabled: false, bundle: '', entrypoint: '' },
      history: { encrypt: false },
    })

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      version.setVersion(requestCount.toString())

      await middleware.handle(ctx, () => {
        ctx.response.header('x-inertia', 'true')
        ctx.response.redirect('/foo')
      })

      ctx.response.finish()
    })

    const r1 = await supertest(server).get('/').set(InertiaHeaders.Inertia, 'true')

    assert.equal(r1.status, 409)
    assert.equal(r1.headers['x-inertia-location'], '/')
    assert.isUndefined(r1.headers['x-inertia'])
  })

  test('if version is provided as integer it should compare it using a toString', async ({
    assert,
  }) => {
    const version = new VersionCache(new URL(import.meta.url), 1)
    const middleware = new InertiaMiddleware({
      rootView: 'root',
      sharedData: {},
      versionCache: version,
      ssr: { enabled: false, bundle: '', entrypoint: '' },
      history: { encrypt: false },
    })

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await middleware.handle(ctx, () => {})

      ctx.response.finish()
    })

    const r1 = await supertest(server)
      .get('/')
      .set(InertiaHeaders.Inertia, 'true')
      .set('x-inertia-version', '1')

    assert.equal(r1.status, 200)
  })
})

test.group('Middleware | Errors', () => {
  test('flashed errors should be shared', async ({ assert }) => {
    const middleware = new InertiaMiddleware({
      rootView: 'root',
      sharedData: {},
      versionCache: new VersionCache(new URL(import.meta.url), '1'),
      ssr: { enabled: false, bundle: '', entrypoint: '' },
      history: { encrypt: false },
    })

    const sessionMiddleware = await new SessionMiddlewareFactory().create()
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      await sessionMiddleware.handle(ctx, () => {})

      ctx.session.flashMessages.set('errorsBag', { foo: 'bar', bar: 'baz' })
      await middleware.handle(ctx, () => {})

      ctx.response.json(await ctx.inertia.render('foo'))
      ctx.response.finish()
    })

    const r1 = await supertest(server).post('/').set(InertiaHeaders.Inertia, 'true')
    assert.deepEqual(r1.body.props.errors, { foo: 'bar', bar: 'baz' })
  })

  test('if validation error, only return first message', async ({ assert }) => {
    const middleware = new InertiaMiddleware({
      rootView: 'root',
      sharedData: {},
      versionCache: new VersionCache(new URL(import.meta.url), '1'),
      ssr: { enabled: false, bundle: '', entrypoint: '' },
      history: { encrypt: false },
    })

    const sessionMiddleware = await new SessionMiddlewareFactory().create()
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      await sessionMiddleware.handle(ctx, () => {})

      ctx.session.flashMessages.set('errorsBag', {
        E_VALIDATION_ERROR: 'Could not be saved',
      })
      ctx.session.flashMessages.set('inputErrorsBag', {
        email: ['Email is required'],
        password: ['Password is required'],
      })

      await middleware.handle(ctx, () => {})

      ctx.response.json(await ctx.inertia.render('foo'))
      ctx.response.finish()
    })

    const r1 = await supertest(server).post('/').set(InertiaHeaders.Inertia, 'true')
    const errors = r1.body.props.errors

    assert.deepEqual(errors, { email: 'Email is required', password: 'Password is required' })
  })

  test('use correct error bag', async ({ assert }) => {
    const middleware = new InertiaMiddleware({
      rootView: 'root',
      sharedData: {},
      versionCache: new VersionCache(new URL(import.meta.url), '1'),
      ssr: { enabled: false, bundle: '', entrypoint: '' },
      history: { encrypt: false },
    })

    const sessionMiddleware = await new SessionMiddlewareFactory().create()
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      await sessionMiddleware.handle(ctx, () => {})

      ctx.session.flashMessages.set('errorsBag', {
        E_VALIDATION_ERROR: 'Could not be saved',
      })
      ctx.session.flashMessages.set('inputErrorsBag', {
        email: ['Email is required'],
        password: ['Password is required'],
      })

      await middleware.handle(ctx, () => {})

      ctx.response.json(await ctx.inertia.render('foo'))
      ctx.response.finish()
    })

    const r1 = await supertest(server)
      .post('/')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.ErrorBag, 'createUser')

    const errors = r1.body.props.errors

    assert.deepEqual(errors, {
      createUser: { email: 'Email is required', password: 'Password is required' },
    })
  })

  test('errors are always shared', async ({ assert }) => {
    const middleware = new InertiaMiddleware({
      rootView: 'root',
      sharedData: {},
      versionCache: new VersionCache(new URL(import.meta.url), '1'),
      ssr: { enabled: false, bundle: '', entrypoint: '' },
      history: { encrypt: false },
    })

    const sessionMiddleware = await new SessionMiddlewareFactory().create()
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      await sessionMiddleware.handle(ctx, () => {})

      ctx.session.flashMessages.set('errorsBag', { foo: 'bar', bar: 'baz' })
      await middleware.handle(ctx, () => {})

      ctx.response.json(
        await ctx.inertia.render('foo', {
          test: 'value',
          yeah: 'no',
        })
      )
      ctx.response.finish()
    })

    const r1 = await supertest(server)
      .post('/')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.PartialComponent, 'foo')
      .set(InertiaHeaders.PartialOnly, 'yeah')

    assert.deepEqual(r1.body.props, {
      yeah: 'no',
      errors: { foo: 'bar', bar: 'baz' },
    })
  })

  test("if session isn't initialized, doesn't throw an error", async () => {
    const middleware = new InertiaMiddleware({
      rootView: 'root',
      sharedData: {},
      versionCache: new VersionCache(new URL(import.meta.url), '1'),
      ssr: { enabled: false, bundle: '', entrypoint: '' },
      history: { encrypt: false },
    })

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await middleware.handle(ctx, () => {})

      ctx.response.json(await ctx.inertia.render('foo'))
      ctx.response.finish()
    })

    await supertest(server)
      .post('/')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')
  })
})
