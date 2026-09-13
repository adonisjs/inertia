/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { test } from '@japa/runner'
import { Vite } from '@adonisjs/vite'
import { createHash } from 'node:crypto'
import { HttpContext } from '@adonisjs/core/http'
import { HttpContextFactory, RequestFactory } from '@adonisjs/core/factories/http'

import { Inertia } from '../src/inertia.ts'
import { InertiaHeaders } from '../src/headers.ts'
import { setupViewMacroMock, setupVite } from './helpers.js'
import { InertiaFactory } from '../factories/inertia_factory.js'
import { ServerRenderer } from '../src/server_renderer.js'
import { defineConfig } from '../src/define_config.js'

test.group('Inertia', () => {
  test('is macroable so packages can extend it', ({ assert, cleanup }) => {
    Inertia.macro('greet' as any, function (this: Inertia<any>) {
      return `hello from ${this.constructor.name}`
    })
    cleanup(() => {
      delete (Inertia.prototype as any).greet
    })

    const inertia = new InertiaFactory().create()

    assert.equal((inertia as any).greet(), 'hello from Inertia')
  })

  test('Set X-Inertia-Location header with 409 status code', async ({ assert }) => {
    const ctx = new HttpContextFactory().create()
    const inertia = new InertiaFactory().merge({ ctx }).create()

    inertia.location('https://adonisjs.com')

    assert.isUndefined(ctx.response.getHeader(InertiaHeaders.Inertia))
    assert.equal(ctx.response.getStatus(), 409)
    assert.equal(ctx.response.getHeader(InertiaHeaders.Location), 'https://adonisjs.com')
  })

  test('cannot carry clear history through a location response without a session', async ({
    assert,
  }) => {
    const logoutContext = new HttpContextFactory().create()
    const logoutInertia = new InertiaFactory().merge({ ctx: logoutContext }).create()

    logoutInertia.clearHistory()
    logoutInertia.location('/login')

    assert.equal(logoutContext.response.getStatus(), 409)
    assert.equal(logoutContext.response.getHeader(InertiaHeaders.Location), '/login')

    const loginInertia = new InertiaFactory().create()
    const loginPage: any = await loginInertia.render('login', {})
    assert.notProperty(loginPage, 'clearHistory')
  })

  test('calling inertia.render should set the X-Inertia header', async ({ assert }) => {
    setupViewMacroMock()

    const ctx = new HttpContextFactory().create()
    const inertia = new InertiaFactory<{ home: {} }>().merge({ ctx }).create()

    const response = await inertia.render('home', {})
    assert.snapshot(response).matchInline(`
      {
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "matchPropsOn": [],
        "mergeProps": [],
        "onceProps": {},
        "prependProps": [],
        "props": {},
        "rescuedProps": [],
        "scrollProps": {},
        "url": "",
        "version": "1",
      }
    `)
    assert.equal(ctx.response.getHeader(InertiaHeaders.Inertia), 'true')
  })

  test('render root view with page props', async ({ assert }) => {
    setupViewMacroMock()

    const inertia = new InertiaFactory().withoutInertia().create()
    const result = (await inertia.render('foo', { foo: 'bar' })) as any

    assert.deepEqual(result.view, 'inertia_layout')
    assert.deepEqual(result.props.page, {
      component: 'foo',
      version: '1',
      props: { foo: 'bar' },
      url: '',
      deferredProps: {},
      mergeProps: [],
      deepMergeProps: [],
      prependProps: [],
      matchPropsOn: [],
      onceProps: {},
      scrollProps: {},
      rescuedProps: [],
    })
  })

  test('dynamically pick root view', async ({ assert }) => {
    setupViewMacroMock()

    let i = 0
    const inertia = new InertiaFactory()
      .merge({ config: { rootView: () => `inertia_layout_${i++}` } })
      .withoutInertia()
      .create()

    const r1: any = await inertia.render('foo', { foo: 'bar' })
    const r2: any = await inertia.render('foo', { foo: 'bar' })

    assert.deepEqual(r1.view, 'inertia_layout_0')
    assert.deepEqual(r2.view, 'inertia_layout_1')
  })

  test('only return page object when request is from inertia', async ({ assert }) => {
    const inertia = new InertiaFactory().create()
    const result = await inertia.render('foo', { foo: 'bar' })

    assert.deepEqual(result, {
      component: 'foo',
      version: '1',
      props: { foo: 'bar' },
      url: '',
      deferredProps: {},
      mergeProps: [],
      deepMergeProps: [],
      prependProps: [],
      matchPropsOn: [],
      onceProps: {},
      scrollProps: {},
      rescuedProps: [],
    })
  })

  test('return given component name in page object', async ({ assert }) => {
    const inertia = new InertiaFactory().create()
    const result: any = await inertia.render('Pages/Login', { foo: 'bar' })
    assert.deepEqual(result.component, 'Pages/Login')
  })

  test('return sharedData in page object', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const result: any = await inertia
      .share({
        foo: 'bar',
      })
      .render('foo', { errors: [1, 2] })

    assert.deepEqual(result.props, {
      foo: 'bar',
      errors: [1, 2],
    })
  })

  test('define sharedData in as an async function', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const result: any = await inertia
      .share(async () => {
        return {
          foo: 'bar',
        }
      })
      .share({
        bar: 'baz',
      })
      .render('foo', { errors: [1, 2] })

    assert.deepEqual(result.props, {
      foo: 'bar',
      bar: 'baz',
      errors: [1, 2],
    })
  })

  test('make sure shared state is merged in correct order', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const result: any = await inertia
      .share(async () => {
        return {
          foo: 'bar',
        }
      })
      .share({
        foo: 'baz',
      })
      .render('foo', { errors: [1, 2] })

    assert.deepEqual(result.props, {
      foo: 'baz',
      errors: [1, 2],
    })
  })

  test('emit flash bag under the top-level flash field', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const result: any = await inertia
      .flash(() => ({ success: 'User created' }))
      .render('foo', { foo: 'bar' })

    assert.deepEqual(result.flash, { success: 'User created' })
    assert.deepEqual(result.props, { foo: 'bar' })
  })

  test('resolve flash bag from an async provider', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const result: any = await inertia
      .flash(async () => ({ message: 'Welcome' }))
      .render('foo', { foo: 'bar' })

    assert.deepEqual(result.flash, { message: 'Welcome' })
  })

  test('omit flash field when no provider is registered', async ({ assert }) => {
    const inertia = new InertiaFactory().create()
    const result: any = await inertia.render('foo', { foo: 'bar' })

    assert.notProperty(result, 'flash')
  })

  test('render props should take precedence over sharedData', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const result: any = await inertia
      .share({
        foo: 'bar',
      })
      .render('foo', { foo: 'baz' })

    assert.deepEqual(result.props, { foo: 'baz' })
  })

  test('emit sharedProps listing the top-level share() keys', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const result: any = await inertia
      .share({ user: { id: 1 } })
      .share(async () => ({ menu: ['home'] }))
      .render('foo', { post: { id: 42 } })

    assert.deepEqual(result.sharedProps, ['user', 'menu'])
    assert.deepEqual(result.props, { user: { id: 1 }, menu: ['home'], post: { id: 42 } })
  })

  test('omit sharedProps when no shared state is registered', async ({ assert }) => {
    const inertia = new InertiaFactory().create()
    const result: any = await inertia.render('foo', { foo: 'bar' })

    assert.notProperty(result, 'sharedProps')
  })

  test('omit sharedProps when shared state has no keys', async ({ assert }) => {
    const inertia = new InertiaFactory().create()
    const result: any = await inertia.share({}).render('foo', { foo: 'bar' })

    assert.notProperty(result, 'sharedProps')
  })

  test('list a deferred shared prop even though its value is skipped', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const result: any = await inertia
      .share({ stats: inertia.defer(() => ({ visits: 1 })) })
      .render('foo', { foo: 'bar' })

    /**
     * The value is deferred (absent from props on a standard visit), but the key
     * is still advertised as shared so the client carries it over once loaded.
     */
    assert.deepEqual(result.sharedProps, ['stats'])
    assert.deepEqual(result.deferredProps, { default: ['stats'] })
    assert.deepEqual(result.props, { foo: 'bar' })
  })

  test('keep an overridden shared key in sharedProps', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const result: any = await inertia.share({ foo: 'shared' }).render('foo', { foo: 'page' })

    assert.deepEqual(result.props, { foo: 'page' })
    assert.deepEqual(result.sharedProps, ['foo'])
  })

  test('sharedProps is not narrowed by partial-reload cherry-picking', async ({ assert }) => {
    const inertia = new InertiaFactory().partialReload('Auth/Login').only(['user']).create()

    const result: any = await inertia
      .share({ menu: ['home'] })
      .render('Auth/Login', { user: 'jul', categories: [1, 2] })

    /**
     * `only(['user'])` filters `menu` out of props, yet `sharedProps` still names
     * it — the field reports registered shared keys, not the emitted subset.
     */
    assert.deepEqual(result.props, { user: 'jul' })
    assert.deepEqual(result.sharedProps, ['menu'])
  })

  test('if x-inertia-partial-data header is present only return partial data', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory().partialReload('Auth/Login').only(['user']).create()
    const result: any = await inertia.render('Auth/Login', { user: 'jul', categories: [1, 2] })

    assert.deepEqual(result.props, { user: 'jul' })
  })

  test('if x-inertia-partial-component is different from component name return all data', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory().partialReload('Auth/Login').only(['user']).create()
    const result: any = await inertia.render('Auth/Register', { user: 'jul', categories: [1, 2] })

    assert.deepEqual(result.props, { user: 'jul', categories: [1, 2] })
  })

  test('exclude props from partial response', async ({ assert }) => {
    setupViewMacroMock()

    const inertia = new InertiaFactory().partialReload('Auth/Login').except(['user']).create()

    const result: any = await inertia.render('Auth/Login', {
      user: 'jul',
      message: 'hello',
    })

    assert.deepEqual(result.props, { message: 'hello' })
  })

  test('props using always helper should be included during partial request', async ({
    assert,
  }) => {
    setupViewMacroMock()

    const inertia = new InertiaFactory().partialReload('Auth/Login').only(['user']).create()

    const result: any = await inertia.render('Auth/Login', {
      user: 'jul',
      message: inertia.always('hello'),
    })

    assert.deepEqual(result.props, { user: 'jul', message: 'hello' })
  })

  test('use mergeable props', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const result: any = await inertia.render('foo', {
      foo: 'bar',
      baz: inertia.merge([1, 2, 3]),
      bar: inertia.merge('bar'),
    })

    assert.deepEqual(result.props, { foo: 'bar', baz: [1, 2, 3], bar: 'bar' })
    assert.deepEqual(result.mergeProps, ['baz', 'bar'])
  })

  test('use mergeable and deferred props', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    let computeCalls = 0
    const result: any = await inertia.render('foo', {
      foo: 'bar',
      baz: inertia.merge([1, 2, 3]),
      bar: inertia
        .defer(() => {
          computeCalls++
          return 'bar'
        })
        .merge(),
    })

    assert.deepEqual(result.deferredProps, { default: ['bar'] })
    assert.deepEqual(result.mergeProps, ['baz', 'bar'])
    assert.deepEqual(result.deepMergeProps, [])
    assert.deepEqual(result.props, { foo: 'bar', baz: [1, 2, 3] })
    assert.equal(computeCalls, 0)
  })

  test('use deep-mergeable and deferred props via .deepMerge() chained on defer()', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory().create()

    let computeCalls = 0
    const result: any = await inertia.render('foo', {
      foo: 'bar',
      baz: inertia.deepMerge({ a: 1 }),
      bar: inertia
        .defer(() => {
          computeCalls++
          return { items: [1, 2, 3] }
        })
        .deepMerge(),
    })

    assert.deepEqual(result.deferredProps, { default: ['bar'] })
    assert.deepEqual(result.mergeProps, [])
    assert.deepEqual(result.deepMergeProps, ['baz', 'bar'])
    assert.deepEqual(result.props, { foo: 'bar', baz: { a: 1 } })
    assert.equal(computeCalls, 0)
  })

  test('use deep-mergeable and deferred props via inertia.deepMerge(inertia.defer())', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory().create()

    let computeCalls = 0
    const result: any = await inertia.render('foo', {
      foo: 'bar',
      bar: inertia.deepMerge(
        inertia.defer(() => {
          computeCalls++
          return { items: [1, 2, 3] }
        })
      ),
    })

    assert.deepEqual(result.deferredProps, { default: ['bar'] })
    assert.deepEqual(result.deepMergeProps, ['bar'])
    assert.deepEqual(result.mergeProps, [])
    assert.deepEqual(result.props, { foo: 'bar' })
    assert.equal(computeCalls, 0)
  })

  test('load mergeable deferred props when present in x-inertia-partial-data', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory().partialReload('foo').only(['bar']).create()

    let computeCalls = 0
    const result: any = await inertia.render('foo', {
      foo: 'bar',
      bar: inertia
        .defer(() => {
          computeCalls++
          return { items: [1, 2, 3] }
        })
        .deepMerge(),
    })

    assert.deepEqual(result.props, { bar: { items: [1, 2, 3] } })
    assert.deepEqual(result.deepMergeProps, ['bar'])
    assert.equal(computeCalls, 1)
  })

  test('properly handle null and undefined values on first visit', async ({ assert }) => {
    setupViewMacroMock()

    const inertia = new InertiaFactory().withoutInertia().create()
    const result: any = await inertia.render('Auth/Login', {
      user: undefined,
      password: null,
      message: 'hello',
    })

    assert.deepEqual(result.props.page.props, {
      message: 'hello',
      password: null,
      user: undefined,
    })
  })

  test("don't return defer props on first visit", async ({ assert }) => {
    setupViewMacroMock()

    const inertia = new InertiaFactory().withoutInertia().create()
    const result: any = await inertia.render('Auth/Login', {
      user: 'jul',
      message: inertia.defer(() => 'hello'),
    })

    assert.deepEqual(result.props.page.props, { user: 'jul' })
  })

  test('load defer props when present in x-inertia-partial-data', async ({ assert }) => {
    const inertia = new InertiaFactory()
      .partialReload('Auth/Login')
      .only(['user', 'message', 'foo'])
      .create()

    const result: any = await inertia.render('Auth/Login', {
      user: 'jul',
      categories: [1, 2],
      message: inertia.defer(() => 'hello'),
      foo: inertia.defer(async () => 'bar'),
      bar: inertia.defer(() => 'baz'),
    })

    assert.deepEqual(result.props, { user: 'jul', message: 'hello', foo: 'bar' })
  })

  test('resolve page props functions', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const result: any = await inertia.render('foo', {
      foo: 'bar',
      baz: () => 'baz',
      qux: async () => 'qux',
    })

    assert.deepEqual(result.props, { foo: 'bar', baz: 'baz', qux: 'qux' })
  })

  test('allow null values as props', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const result: any = await inertia.render('foo', {
      foo: null,
      baz: () => null,
      qux: async () => null,
      always: inertia.always(null),
    })

    assert.deepEqual(result.props, { foo: null, baz: null, qux: null, always: null })
  })

  test('return version in page object', async ({ assert }) => {
    const inertia = new InertiaFactory().withVersion('2').create()
    const result: any = await inertia.render('foo', {})
    assert.deepEqual(result.version, '2')
  })

  test('preserve query parameters in page object url', async ({ assert }) => {
    const request = new RequestFactory().merge({ url: '/foo?bar=baz&test[]=32&12&bla=42' }).create()
    const inertia = new InertiaFactory()
      .merge({ ctx: new HttpContextFactory().merge({ request }).create() })
      .create()

    const result: any = await inertia.render('foo', {})
    assert.deepEqual(result.url, '/foo?bar=baz&test[]=32&12&bla=42')
  })

  test('share view props with the root edge template', async ({ assert }) => {
    setupViewMacroMock()
    const inertia = new InertiaFactory().withoutInertia().create()
    const result: any = await inertia.render('foo', { data: 42 }, { metaTitle: 'foo' })

    assert.deepEqual(result.props.metaTitle, 'foo')

    // @ts-expect-error mock
    delete HttpContext.prototype.view
  })

  test('share data with the current request', async ({ assert }) => {
    const inertia = new InertiaFactory().create()
    inertia.share({ foo: 'bar' })

    const result: any = await inertia.render('foo', {})

    assert.deepEqual(result.props, { foo: 'bar' })
  })

  test('dont execute deferred props on first visit', async ({ assert }) => {
    setupViewMacroMock()

    const inertia = new InertiaFactory().create()
    let executed = false

    await inertia.render('foo', {
      foo: 'bar',
      baz: inertia.defer(() => {
        executed = true
        return 'baz'
      }),
    })

    assert.deepEqual(executed, false)
  })

  test('deferred props listing are returned in page object', async ({ assert }) => {
    setupViewMacroMock()

    const inertia = new InertiaFactory().withoutInertia().create()

    const result: any = await inertia.render('foo', {
      foo: 'bar',
      baz: inertia.defer(() => 'baz'),
      qux: inertia.defer(() => 'qux'),
    })

    assert.deepEqual(result.props.page.deferredProps, {
      default: ['baz', 'qux'],
    })
  })

  test('deferred props groups are respected', async ({ assert }) => {
    setupViewMacroMock()

    const inertia = new InertiaFactory().withoutInertia().create()

    const result: any = await inertia.render('foo', {
      foo: 'bar',
      baz: inertia.defer(() => 'baz', 'group1'),
      qux: inertia.defer(() => 'qux', 'group2'),
      lorem: inertia.defer(() => 'lorem', 'group1'),
      ipsum: inertia.defer(() => 'ipsum', 'group2'),
    })

    assert.deepEqual(result.props.page.deferredProps, {
      group1: ['baz', 'lorem'],
      group2: ['qux', 'ipsum'],
    })
  })

  test('execute and return deferred props on partial reload', async ({ assert }) => {
    const inertia = new InertiaFactory().partialReload('foo').only(['baz']).create()

    const result: any = await inertia.render('foo', {
      foo: 'bar',
      baz: inertia.defer(() => 'baz'),
    })

    assert.deepEqual(result.props, { baz: 'baz' })
  })

  test('encrypt history using config flag', async ({ assert }) => {
    const inertia = new InertiaFactory().merge({ config: { encryptHistory: true } }).create()
    const result: any = await inertia.render('foo', {})

    assert.isTrue(result.encryptHistory)
  })

  test('encrypt history per request', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    inertia.encryptHistory()
    const result: any = await inertia.render('foo', {})

    assert.isTrue(result.encryptHistory)
  })

  test('clear history on the same response without session middleware', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    inertia.clearHistory()
    const result: any = await inertia.render('foo', {})
    assert.isTrue(result.clearHistory)
  })
})

test.group('Inertia | Ssr', () => {
  test('if devServer is available, use entrypoint file to render the page', async ({
    assert,
    fs,
  }) => {
    setupViewMacroMock()

    await fs.create('foo.ts', 'export default () => ({ head: ["head"], body: "foo.ts" })')
    const vite = await setupVite({ build: { rollupOptions: { input: 'foo.ts' } } })

    const inertia = new InertiaFactory()
      .merge({ config: { ssr: { enabled: true, entrypoint: 'foo.ts' } } })
      .withVite(vite)
      .withoutInertia()
      .create()

    const result: any = await inertia.render('foo', {})

    assert.deepEqual(result.props.page.ssrHead, ['head'])
    assert.deepEqual(result.props.page.ssrBody, 'foo.ts')
  })

  test('if devServer is not available, use SSR bundle from manifest', async ({ assert, fs }) => {
    setupViewMacroMock()

    const vite = new Vite({
      buildDirectory: fs.basePath,
      manifestFile: 'manifest.json',
    })

    await fs.createJson('package.json', { type: 'module' })
    await fs.create('server/foo.js', 'export default () => ({ head: ["head"], body: "foo.ts" })')
    await fs.create(
      'server/.vite/manifest.json',
      JSON.stringify({
        'foo.ts': { file: 'foo.js', isEntry: true, src: 'foo.ts' },
      })
    )

    const inertia = new InertiaFactory()
      .merge({ config: { ssr: { enabled: true, entrypoint: 'foo.ts' } } })
      .withVite(vite)
      .withoutInertia()
      .create()

    const result: any = await inertia.render('foo', {})

    assert.deepEqual(result.props.page.ssrBody, 'foo.ts')
    assert.deepEqual(result.props.page.ssrHead, ['head'])
  })

  test('enable SSR globally for all pages', async ({ assert, fs }) => {
    setupViewMacroMock()
    const vite = await setupVite({ build: { rollupOptions: { input: 'foo.ts' } } })

    await fs.create('foo.ts', 'export default () => ({ head: ["head"], body: "foo.ts" })')

    const inertia = new InertiaFactory()
      .withVite(vite)
      .merge({ config: { ssr: { enabled: true, entrypoint: 'foo.ts' } } })
      .withoutInertia()
      .create()

    const result: any = await inertia.render('foo', {})
    const result2: any = await inertia.render('bar', {})

    assert.deepEqual(result.props.page.ssrBody, 'foo.ts')
    assert.deepEqual(result2.props.page.ssrBody, 'foo.ts')
  })

  test('enable SSR for explicitly defined pages only', async ({ assert, fs }) => {
    setupViewMacroMock()
    const vite = await setupVite({ build: { rollupOptions: { input: 'foo.ts' } } })

    await fs.create('foo.ts', 'export default () => ({ head: ["head"], body: "foo.ts" })')

    const inertia = new InertiaFactory()
      .withVite(vite)
      .merge({ config: { ssr: { enabled: true, entrypoint: 'foo.ts', pages: ['foo'] } } })
      .withoutInertia()
      .create()

    const result: any = await inertia.render('foo', {})
    const result2: any = await inertia.render('bar', {})

    assert.deepEqual(result.props.page.ssrBody, 'foo.ts')
    assert.notExists(result2.props.page.ssrBody)
  })

  test('enable SSR for pages on per request basis', async ({ assert, fs }) => {
    setupViewMacroMock()
    const vite = await setupVite({ build: { rollupOptions: { input: 'foo.ts' } } })

    await fs.create('foo.ts', 'export default () => ({ head: ["head"], body: "foo.ts" })')

    const inertia = new InertiaFactory()
      .withVite(vite)
      .merge({
        config: {
          ssr: {
            enabled: true,
            entrypoint: 'foo.ts',
            pages: (_, page) => page.startsWith('admin/'),
          },
        },
      })
      .withoutInertia()
      .create()

    const r1: any = await inertia.render('foo', {})
    const r2: any = await inertia.render('bar', {})
    const r3: any = await inertia.render('admin/foo', {})
    const r4: any = await inertia.render('admin/bar', {})

    assert.notExists(r1.props.page.ssrBody)
    assert.notExists(r2.props.page.ssrBody)
    assert.deepEqual(r3.props.page.ssrBody, 'foo.ts')
    assert.deepEqual(r4.props.page.ssrBody, 'foo.ts')
  })

  test('should pass page object to the SSR view', async ({ assert, fs }) => {
    setupViewMacroMock()
    const vite = await setupVite({ build: { rollupOptions: { input: 'foo.ts' } } })

    await fs.create('foo.ts', 'export default () => ({ head: ["head"], body: "foo.ts" })')

    const inertia = new InertiaFactory()
      .withVite(vite)
      .merge({ config: { ssr: { enabled: true, entrypoint: 'foo.ts' } } })
      .withoutInertia()
      .create()

    const result: any = await inertia.render('foo', {})

    assert.deepEqual(result.props.page.component, 'foo')
    assert.deepEqual(result.props.page.version, '1')
  })

  test('should recreate module runner after vite dev server restarts', async ({ assert, fs }) => {
    await fs.create('foo.ts', 'export default () => ({ head: ["head"], body: "before restart" })')
    const vite = await setupVite({ build: { rollupOptions: { input: 'foo.ts' } } })

    const config = defineConfig({ ssr: { enabled: true, entrypoint: 'foo.ts' } })
    const renderer = new ServerRenderer(config, vite)

    const pageObject = {
      component: 'foo',
      props: {},
      url: '/',
      version: '1',
      clearHistory: false,
      encryptHistory: false,
      deferredProps: {},
      mergeProps: [],
      deepMergeProps: [],
    }

    /**
     * First render should work normally
     */
    const result1 = await renderer.render(pageObject)
    assert.deepEqual(result1.body, 'before restart')

    /**
     * Restart the Vite dev server. This replaces server.environments.ssr
     * with a new instance, making the old module runner's transport stale.
     */
    await vite.getDevServer()!.restart()

    /**
     * After restart, rendering should still work because the
     * ServerRenderer detects the environment change and recreates
     * the module runner.
     */
    const result2 = await renderer.render(pageObject)
    assert.deepEqual(result2.body, 'before restart')
  }).timeout(30_000)
})

test.group('Inertia | Assets version', () => {
  test('fallback to version 1 in dev mode even when a stale build manifest exists', async ({
    assert,
    fs,
    cleanup,
  }) => {
    /**
     * A manifest left behind by a previous `node ace build`. It must exist
     * before the Vite instance is constructed, since `hasManifestFile` is
     * computed once at construction.
     */
    await fs.createJson('manifest.json', { 'app.ts': { file: 'assets/app-old.js' } })

    const vite = new Vite({
      buildDirectory: fs.basePath,
      manifestFile: join(fs.basePath, 'manifest.json'),
    })
    await vite.createDevServer({ root: fs.basePath, clearScreen: false, logLevel: 'silent' })
    cleanup(() => vite.stopDevServer())

    const inertia = new InertiaFactory().withVite(vite).create()

    assert.equal(inertia.getVersion(), '1')
  })

  test('compute version from the manifest hash outside dev mode', async ({ assert, fs }) => {
    const manifest = { 'app.ts': { file: 'assets/app-abc123.js' } }
    await fs.createJson('manifest.json', manifest)

    const vite = new Vite({
      buildDirectory: fs.basePath,
      manifestFile: join(fs.basePath, 'manifest.json'),
    })

    const inertia = new InertiaFactory().withVite(vite).create()

    assert.equal(
      inertia.getVersion(),
      createHash('md5').update(JSON.stringify(manifest)).digest('hex')
    )
  })
})
