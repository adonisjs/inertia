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
import { createServer } from 'node:http'
import { type HttpContext } from '@adonisjs/core/http'
import { type NextFn } from '@adonisjs/core/types/http'
import { SessionMiddlewareFactory } from '@adonisjs/session/factories'
import { HttpContextFactory, RequestFactory, ResponseFactory } from '@adonisjs/core/factories/http'

import { Inertia } from '../src/inertia.js'
import { InertiaHeaders } from '../src/headers.ts'
import { httpServer, setupApp } from './helpers.js'
import BaseInertiaMiddleware from '../src/inertia_middleware.js'

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

const AUTH_SESSION_KEY = 'test.auth.user_id'

const clearHistoryServer = test.macro(async ($test) => {
  const { app } = await setupApp([
    {
      file: () => import('../providers/inertia_provider.ts'),
      environment: ['web', 'test'],
    },
  ])
  $test.cleanup(() => app.terminate())

  const sessionMiddleware = await new SessionMiddlewareFactory().create()
  const server = createServer(async (req, res) => {
    const request = new RequestFactory().merge({ req, res }).create()
    const response = new ResponseFactory().merge({ req, res }).create()
    const ctx = new HttpContextFactory().merge({ request, response }).create()
    ctx.containerResolver = app.container.createResolver()

    await sessionMiddleware.handle(ctx, async () => {
      const middleware = new InertiaMiddleware()
      await middleware.handle(ctx, async () => {
        if (ctx.request.url() === '/account') {
          ctx.session.put(AUTH_SESSION_KEY, 1)
          ctx.inertia.encryptHistory()
          ctx.response.send(
            await ctx.inertia.render('settings/show', { preference: 'authenticated' })
          )
          return
        }

        if (ctx.request.url() === '/logout-location') {
          /**
           * The adapter does not depend on @adonisjs/auth. From its boundary,
           * session-guard logout means removing the authentication state from
           * this session before issuing the clear-history location response.
           */
          ctx.session.forget(AUTH_SESSION_KEY)
          ctx.inertia.clearHistory()
          ctx.inertia.location('/login')
          return
        }

        if (ctx.request.url() === '/logout-redirect') {
          ctx.inertia.clearHistory()
          ctx.response.redirect('/login')
          return
        }

        if (ctx.request.url() === '/health') {
          ctx.response.send('ok')
          return
        }

        ctx.response.send(
          await ctx.inertia.render('settings/show', {
            preference: ctx.session.has(AUTH_SESSION_KEY) ? 'authenticated' : 'guest',
          })
        )
      })
    })

    ctx.response.finish()
  })
  $test.cleanup(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })
  return server
})

test.group('Middleware', () => {
  test('add inertia to HTTP context', async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const server = httpServer.create(async (_req, res) => {
      try {
        const ctx = new HttpContextFactory().create()
        ctx.containerResolver = app.container.createResolver()
        const middleware = new InertiaMiddleware()

        await middleware.handle(ctx, () => {})
        assert.instanceOf(ctx.inertia, Inertia)
      } catch (error) {
        console.log(error)
      }
      res.end()
    })

    const response = await supertest(server).get('/')
    assert.equal(response.statusCode, 200)
    assert.isUndefined(response.headers[InertiaHeaders.Inertia])
    assert.isUndefined(response.headers.Vary)
  })

  test('set 303 status code for PUT/PATCH/DELETE methods', async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.containerResolver = app.container.createResolver()

      try {
        const middleware = new InertiaMiddleware()

        await middleware.handle(ctx, () => {
          ctx.response.redirect('/foo')
        })
      } catch (error) {
        console.log(error)
      }

      ctx.response.finish()
    })

    const putResponse = await supertest(server)
      .put('/')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')

    const deleteResponse = await supertest(server)
      .delete('/')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')

    const patchResponse = await supertest(server)
      .patch('/')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')

    assert.equal(putResponse.status, 303)
    assert.isUndefined(putResponse.headers[InertiaHeaders.Inertia])
    assert.equal(putResponse.headers.vary, InertiaHeaders.Inertia)

    assert.equal(deleteResponse.status, 303)
    assert.isUndefined(deleteResponse.headers[InertiaHeaders.Inertia])
    assert.equal(deleteResponse.headers.vary, InertiaHeaders.Inertia)

    assert.equal(patchResponse.status, 303)
    assert.isUndefined(patchResponse.headers[InertiaHeaders.Inertia])
    assert.equal(patchResponse.headers.vary, InertiaHeaders.Inertia)
  })

  test("don't set 303 status code if is not an Inertia request", async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.containerResolver = app.container.createResolver()

      try {
        const middleware = new InertiaMiddleware()
        await middleware.handle(ctx, () => {
          ctx.response.redirect('/foo')
        })
      } catch (error) {
        console.log(error)
      }

      ctx.response.finish()
    })

    const putResponse = await supertest(server).put('/')
    const deleteResponse = await supertest(server).delete('/')
    const patchResponse = await supertest(server).patch('/')

    assert.equal(putResponse.status, 302)
    assert.isUndefined(putResponse.headers[InertiaHeaders.Inertia])
    assert.isUndefined(putResponse.headers.Vary)

    assert.equal(deleteResponse.status, 302)
    assert.isUndefined(deleteResponse.headers[InertiaHeaders.Inertia])
    assert.isUndefined(deleteResponse.headers.Vary)

    assert.equal(patchResponse.status, 302)
    assert.isUndefined(patchResponse.headers[InertiaHeaders.Inertia])
    assert.isUndefined(patchResponse.headers.Vary)
  })

  test('set vary header for inertia requests only', async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.containerResolver = app.container.createResolver()

      try {
        const middleware = new InertiaMiddleware()
        await middleware.handle(ctx, () => {
          ctx.response.redirect('/foo')
        })
      } catch (error) {
        console.log(error)
      }

      ctx.response.finish()
    })

    const inertiaResponse = await supertest(server)
      .get('/')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')
    const nonInertiaResponse = await supertest(server).get('/')

    assert.equal(inertiaResponse.status, 302)
    assert.equal(inertiaResponse.headers.vary, InertiaHeaders.Inertia)
    assert.isUndefined(inertiaResponse.headers[InertiaHeaders.Inertia])

    assert.equal(nonInertiaResponse.status, 302)
    assert.isUndefined(nonInertiaResponse.headers.vary)
    assert.isUndefined(nonInertiaResponse.headers[InertiaHeaders.Inertia])
  })

  test('should not set X-Inertia header when no inertia response is sent', async ({
    assert,
    cleanup,
  }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      ctx.containerResolver = app.container.createResolver()

      try {
        const middleware = new InertiaMiddleware()
        await middleware.handle(ctx, () => {})
      } catch (error) {
        console.log(error)
      }

      ctx.response.finish()
    })

    const response = await supertest(server)
      .get('/')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')
    assert.isUndefined(response.headers[InertiaHeaders.Inertia])
  })

  test('force a full reload if version has changed', async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.containerResolver = app.container.createResolver()

      try {
        const middleware = new InertiaMiddleware()
        await middleware.handle(ctx, () => {})
      } catch (error) {
        console.log(error)
      }

      ctx.response.finish()
    })

    const response = await supertest(server)
      .get('/')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '2')

    assert.equal(response.status, 409)
    assert.isUndefined(response.headers[InertiaHeaders.Inertia])
    assert.equal(response.headers[InertiaHeaders.Location], '/')
    assert.equal(response.headers[InertiaHeaders.Version], '1')
  })

  test('carry clear history through a location response after session-backed logout and consume it once', async ({
    assert,
  }) => {
    const server = await clearHistoryServer()

    const client = supertest.agent(server)
    const accountResponse = await client
      .get('/account')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')
    assert.isTrue(accountResponse.body.encryptHistory)
    assert.equal(accountResponse.body.props.preference, 'authenticated')

    const logoutResponse = await client
      .post('/logout-location')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')
    assert.equal(logoutResponse.status, 409)
    assert.equal(logoutResponse.headers[InertiaHeaders.Location], '/login')

    const loginResponse = await client
      .get('/login')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')
    assert.isTrue(loginResponse.body.clearHistory)
    assert.equal(loginResponse.body.props.preference, 'guest')

    const nextLoginResponse = await client
      .get('/login')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')
    assert.notProperty(nextLoginResponse.body, 'clearHistory')
  })

  test('carry clear history through an ordinary redirect', async ({ assert }) => {
    const server = await clearHistoryServer()
    const client = supertest.agent(server)

    const logoutResponse = await client
      .delete('/logout-redirect')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')
    assert.equal(logoutResponse.status, 303)
    assert.equal(logoutResponse.headers.location, '/login')

    const loginResponse = await client
      .get('/login')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')
    assert.isTrue(loginResponse.body.clearHistory)
  })

  test('do not consume clear history on a non-Inertia response', async ({ assert }) => {
    const server = await clearHistoryServer()
    const client = supertest.agent(server)

    await client
      .post('/logout-location')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')

    const healthResponse = await client.get('/health')
    assert.equal(healthResponse.text, 'ok')

    const loginResponse = await client
      .get('/login')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')
    assert.isTrue(loginResponse.body.clearHistory)
  })

  test('preserve clear history through an asset version reload', async ({ assert }) => {
    const server = await clearHistoryServer()
    const client = supertest.agent(server)

    await client
      .post('/logout-location')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')

    const staleVersionResponse = await client
      .get('/login')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '2')
    assert.equal(staleVersionResponse.status, 409)
    assert.equal(staleVersionResponse.headers[InertiaHeaders.Location], '/login')

    const loginResponse = await client
      .get('/login')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')
    assert.isTrue(loginResponse.body.clearHistory)
  })

  test('isolate clear history between sessions', async ({ assert }) => {
    const server = await clearHistoryServer()
    const firstClient = supertest.agent(server)
    const secondClient = supertest.agent(server)

    await firstClient
      .post('/logout-location')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')

    const secondLoginResponse = await secondClient
      .get('/login')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')
    assert.notProperty(secondLoginResponse.body, 'clearHistory')

    const firstLoginResponse = await firstClient
      .get('/login')
      .set(InertiaHeaders.Inertia, 'true')
      .set(InertiaHeaders.Version, '1')
    assert.isTrue(firstLoginResponse.body.clearHistory)
  })
})

test.group('Middleware | Errors', () => {
  test('get flash input error messages', async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()

    const sessionMiddleware = await new SessionMiddlewareFactory().create()
    await sessionMiddleware.handle(ctx, () => {})

    ctx.session.flashMessages.set('inputErrorsBag', {
      name: 'name is required',
      email: ['email is required', 'email must be formatted correctly'],
    })

    const middleware = new InertiaMiddleware()
    assert.deepEqual(middleware.getValidationErrors(ctx), {
      email: 'email is required',
      name: 'name is required',
    })
  })

  test('scope error messages under an error bag', async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    ctx.request.request.headers[InertiaHeaders.ErrorBag] = 'user'

    const sessionMiddleware = await new SessionMiddlewareFactory().create()
    await sessionMiddleware.handle(ctx, () => {})

    ctx.session.flashMessages.set('inputErrorsBag', {
      name: 'name is required',
      email: ['email is required', 'email must be formatted correctly'],
    })

    const middleware = new InertiaMiddleware()
    assert.deepEqual(middleware.getValidationErrors(ctx), {
      user: {
        email: 'email is required',
        name: 'name is required',
      },
    })
  })

  test('return empty object when not using session middleware', async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()

    const middleware = new InertiaMiddleware()
    assert.deepEqual(middleware.getValidationErrors(ctx), {})
  })

  test('emit every field as an array in all-messages mode', async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()

    const sessionMiddleware = await new SessionMiddlewareFactory().create()
    await sessionMiddleware.handle(ctx, () => {})

    ctx.session.flashMessages.set('inputErrorsBag', {
      name: 'name is required',
      email: ['email is required', 'email must be formatted correctly'],
    })

    const middleware = new InertiaMiddleware()
    assert.deepEqual(middleware.getValidationErrors(ctx, { allMessages: true }), {
      name: ['name is required'],
      email: ['email is required', 'email must be formatted correctly'],
    })
  })

  test('scope all-messages errors under an error bag', async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    ctx.request.request.headers[InertiaHeaders.ErrorBag] = 'user'

    const sessionMiddleware = await new SessionMiddlewareFactory().create()
    await sessionMiddleware.handle(ctx, () => {})

    ctx.session.flashMessages.set('inputErrorsBag', {
      name: 'name is required',
      email: ['email is required', 'email must be formatted correctly'],
    })

    const middleware = new InertiaMiddleware()
    assert.deepEqual(middleware.getValidationErrors(ctx, { allMessages: true }), {
      user: {
        name: ['name is required'],
        email: ['email is required', 'email must be formatted correctly'],
      },
    })
  })
})

test.group('Middleware | Flash', () => {
  test('emit middleware flash() under the page flash field', async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    ctx.containerResolver = app.container.createResolver()
    ctx.request.request.headers[InertiaHeaders.Inertia] = 'true'

    const sessionMiddleware = await new SessionMiddlewareFactory().create()
    await sessionMiddleware.handle(ctx, () => {})
    ctx.session.flashMessages.set('success', 'User created')

    class FlashMiddleware extends BaseInertiaMiddleware {
      share() {
        return {}
      }

      flash(c: HttpContext) {
        return c.session.flashMessages.all()
      }
    }

    const middleware = new FlashMiddleware()
    await middleware.init(ctx)

    const result: any = await (ctx.inertia as any).render('foo', {})
    assert.deepEqual(result.flash, { success: 'User created' })
  })

  test('omit flash field when the middleware has no flash method', async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    ctx.containerResolver = app.container.createResolver()
    ctx.request.request.headers[InertiaHeaders.Inertia] = 'true'

    const middleware = new InertiaMiddleware()
    await middleware.init(ctx)

    const result: any = await (ctx.inertia as any).render('foo', {})
    assert.notProperty(result, 'flash')
  })
})
