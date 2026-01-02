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
import { HttpContext } from '@adonisjs/core/http'
import { HttpContextFactory, RequestFactory } from '@adonisjs/core/factories/http'

import { InertiaHeaders } from '../src/headers.ts'
import { setupViewMacroMock, setupVite } from './helpers.js'
import { InertiaFactory } from '../factories/inertia_factory.js'

test.group('Inertia', () => {
  test('Set X-Inertia-Location header with 409 status code', async ({ assert }) => {
    const ctx = new HttpContextFactory().create()
    const inertia = new InertiaFactory().merge({ ctx }).create()

    inertia.location('https://adonisjs.com')

    assert.isUndefined(ctx.response.getHeader(InertiaHeaders.Inertia))
    assert.equal(ctx.response.getStatus(), 409)
    assert.equal(ctx.response.getHeader(InertiaHeaders.Location), 'https://adonisjs.com')
  })

  test('calling inertia.render should set the X-Inertia header', async ({ assert }) => {
    setupViewMacroMock()

    const ctx = new HttpContextFactory().create()
    const inertia = new InertiaFactory<{ home: {} }>().merge({ ctx }).create()

    const response = await inertia.render('home', {})
    assert.snapshot(response).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {},
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
      clearHistory: false,
      encryptHistory: false,
      deferredProps: {},
      mergeProps: [],
      deepMergeProps: [],
      onceProps: {},
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
      encryptHistory: false,
      clearHistory: false,
      deferredProps: {},
      mergeProps: [],
      deepMergeProps: [],
      onceProps: {},
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

  test('render props should take precedence over sharedData', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const result: any = await inertia
      .share({
        foo: 'bar',
      })
      .render('foo', { foo: 'baz' })

    assert.deepEqual(result.props, { foo: 'baz' })
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

    const result: any = await inertia.render('foo', {
      foo: 'bar',
      baz: inertia.merge([1, 2, 3]),
      bar: inertia.defer(() => 'bar').merge(),
    })

    assert.deepEqual(result.deferredProps, { default: ['bar'] })
    assert.deepEqual(result.mergeProps, ['baz', 'bar'])
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

  test('clear history per request', async ({ assert }) => {
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

  test('if devServer is not available, use bundle file to render the page', async ({
    assert,
    fs,
  }) => {
    setupViewMacroMock()

    const vite = new Vite({
      buildDirectory: fs.basePath,
      manifestFile: 'manifest.json',
    })

    await fs.createJson('package.json', { type: 'module' })
    await fs.create('foo.js', 'export default () => ({ head: ["head"], body: "foo.ts" })')

    const inertia = new InertiaFactory()
      .merge({ config: { ssr: { enabled: true, bundle: join(fs.basePath, 'foo.js') } } })
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
})
