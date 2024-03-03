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
import { HttpContext } from '@adonisjs/core/http'
import { HttpContextFactory, RequestFactory } from '@adonisjs/core/factories/http'

import { InertiaFactory } from '../factories/inertia_factory.js'
import { setupViewMacroMock, setupVite } from '../tests_helpers/index.js'

test.group('Inertia', () => {
  test('location should returns x-inertia-location with 409 code', async ({ assert }) => {
    const ctx = new HttpContextFactory().create()

    const inertia = await new InertiaFactory().merge({ ctx }).create()

    inertia.location('https://adonisjs.com')

    assert.equal(ctx.response.getStatus(), 409)
    assert.equal(ctx.response.getHeader('x-inertia-location'), 'https://adonisjs.com')
  })

  test('location should not returns x-inertia header', async ({ assert }) => {
    const ctx = new HttpContextFactory().create()

    const inertia = await new InertiaFactory().merge({ ctx }).create()

    inertia.location('https://adonisjs.com')

    assert.equal(ctx.response.getHeader('x-inertia'), null)
  })

  test('render should returns x-inertia header', async ({ assert }) => {
    setupViewMacroMock()

    const ctx = new HttpContextFactory().create()
    const inertia = await new InertiaFactory().merge({ ctx }).withXInertiaHeader().create()

    await inertia.render('foo')

    assert.equal(ctx.response.getHeader('x-inertia'), 'true')
  })

  test('render root view with page props', async ({ assert }) => {
    setupViewMacroMock()

    const inertia = await new InertiaFactory().create()
    const result: any = await inertia.render('foo', { foo: 'bar' })

    assert.deepEqual(result.view, 'root')
    assert.deepEqual(result.props.page, {
      component: 'foo',
      version: '1',
      props: { foo: 'bar' },
      url: null,
    })
  })

  test('only return page object when request is from inertia', async ({ assert }) => {
    const inertia = await new InertiaFactory().withXInertiaHeader().create()
    const result = await inertia.render('foo', { foo: 'bar' })

    assert.deepEqual(result, {
      component: 'foo',
      version: '1',
      props: { foo: 'bar' },
      url: null,
    })
  })

  test('return given component name in page object', async ({ assert }) => {
    const inertia = await new InertiaFactory().withXInertiaHeader().create()
    const result: any = await inertia.render('Pages/Login', { foo: 'bar' })

    assert.deepEqual(result.component, 'Pages/Login')
  })

  test('return sharedData in page object', async ({ assert }) => {
    const inertia = await new InertiaFactory()
      .merge({ config: { sharedData: { foo: 'bar' } } })
      .withXInertiaHeader()
      .create()

    const result: any = await inertia.render('foo', { errors: [1, 2] })

    assert.deepEqual(result.props, {
      foo: 'bar',
      errors: [1, 2],
    })
  })

  test('render props take precedence over sharedData', async ({ assert }) => {
    const inertia = await new InertiaFactory()
      .merge({ config: { sharedData: { foo: 'bar' } } })
      .withXInertiaHeader()
      .create()

    const result: any = await inertia.render('foo', { foo: 'baz' })

    assert.deepEqual(result.props, { foo: 'baz' })
  })

  test('if x-inertia-partial-data header is present only return partial data', async ({
    assert,
  }) => {
    const inertia = await new InertiaFactory()
      .withXInertiaHeader()
      .withInertiaPartialReload('Auth/Login', ['user'])
      .create()

    const result: any = await inertia.render('Auth/Login', { user: 'jul', categories: [1, 2] })

    assert.deepEqual(result.props, { user: 'jul' })
  })

  test('if x-inertia-partial-component is different from component name return all data', async ({
    assert,
  }) => {
    const inertia = await new InertiaFactory()
      .withXInertiaHeader()
      .withInertiaPartialReload('Auth/Login', ['user'])
      .create()

    const result: any = await inertia.render('Auth/Register', { user: 'jul', categories: [1, 2] })

    assert.deepEqual(result.props, { user: 'jul', categories: [1, 2] })
  })

  test("don't return lazy props on first visit", async ({ assert }) => {
    setupViewMacroMock()

    const inertia = await new InertiaFactory().create()

    const result: any = await inertia.render('Auth/Login', {
      user: 'jul',
      message: inertia.lazy(() => 'hello'),
    })

    assert.deepEqual(result.props.page.props, { user: 'jul' })
  })

  test('load lazy props when present in x-inertia-partial-data', async ({ assert }) => {
    const inertia = await new InertiaFactory()
      .withXInertiaHeader()
      .withInertiaPartialReload('Auth/Login', ['user', 'message', 'foo'])
      .create()

    const result: any = await inertia.render('Auth/Login', {
      user: 'jul',
      categories: [1, 2],
      message: inertia.lazy(() => 'hello'),
      foo: inertia.lazy(async () => 'bar'),
      bar: inertia.lazy(() => 'baz'),
    })

    assert.deepEqual(result.props, { user: 'jul', message: 'hello', foo: 'bar' })
  })

  test('resolve page props functions', async ({ assert }) => {
    const inertia = await new InertiaFactory().withXInertiaHeader().create()

    const result: any = await inertia.render('foo', {
      foo: 'bar',
      baz: () => 'baz',
      qux: async () => 'qux',
    })

    assert.deepEqual(result.props, { foo: 'bar', baz: 'baz', qux: 'qux' })
  })

  test('resolve sharedData function', async ({ assert }) => {
    const inertia = await new InertiaFactory()
      .merge({ config: { sharedData: { foo: () => 'bar' } } })
      .withXInertiaHeader()
      .create()

    const result: any = await inertia.render('foo')

    assert.deepEqual(result.props, { foo: 'bar' })
  })

  test('returns version in page object', async ({ assert }) => {
    const inertia = await new InertiaFactory().withXInertiaHeader().withVersion('2').create()

    const result: any = await inertia.render('foo')

    assert.deepEqual(result.version, '2')
  })

  test('preserve query parameters in page object url', async ({ assert }) => {
    const request = new RequestFactory().merge({ url: '/foo?bar=baz&test[]=32&12&bla=42' }).create()
    const inertia = await new InertiaFactory()
      .merge({ ctx: new HttpContextFactory().merge({ request }).create() })
      .withXInertiaHeader()
      .create()

    const result: any = await inertia.render('foo')

    assert.deepEqual(result.url, '/foo?bar=baz&test[]=32&12&bla=42')
  })

  test('view props are passed to the root view', async ({ assert }) => {
    // @ts-expect-error mock
    HttpContext.getter('view', () => ({ render: (view: any, props: any) => ({ view, props }) }))

    const inertia = await new InertiaFactory().create()
    const result: any = await inertia.render('foo', { data: 42 }, { metaTitle: 'foo' })

    assert.deepEqual(result.props.metaTitle, 'foo')

    // @ts-expect-error mock
    delete HttpContext.prototype.view
  })

  test('share data for the current request', async ({ assert }) => {
    const inertia = await new InertiaFactory().withXInertiaHeader().create()

    inertia.share({ foo: 'bar' })

    const result: any = await inertia.render('foo')

    assert.deepEqual(result.props, { foo: 'bar' })
  })

  test('share() data are scoped to current instance', async ({ assert }) => {
    const inertia = await new InertiaFactory().withXInertiaHeader().create()
    const inertia2 = await new InertiaFactory().withXInertiaHeader().create()

    inertia.share({ foo: 'bar' })
    inertia2.share({ foo: 'baz' })

    const result: any = await inertia.render('foo')
    const result2: any = await inertia2.render('foo')

    assert.deepEqual(result.props, { foo: 'bar' })
    assert.deepEqual(result2.props, { foo: 'baz' })
  })

  test('share() data override the global shared data', async ({ assert }) => {
    const inertia = await new InertiaFactory()
      .merge({ config: { sharedData: { foo: 'bar' } } })
      .withXInertiaHeader()
      .create()

    inertia.share({ foo: 'baz' })

    const result: any = await inertia.render('foo')

    assert.deepEqual(result.props, { foo: 'baz' })
  })
})

test.group('Inertia | Ssr', () => {
  test('if viteRuntime is available, use entrypoint file to render the page', async ({
    assert,
    fs,
  }) => {
    setupViewMacroMock()
    const vite = await setupVite({ build: { rollupOptions: { input: 'foo.ts' } } })

    await fs.create('foo.ts', 'export default () => ({ head: "head", body: "foo.ts" })')

    const inertia = await new InertiaFactory()
      .merge({ config: { ssr: { enabled: true, entrypoint: 'foo.ts' } } })
      .withVite(vite)
      .create()

    const result: any = await inertia.render('foo')

    assert.deepEqual(result.props.page.ssrHead, ['head'])
    assert.deepEqual(result.props.page.ssrBody, 'foo.ts')
  })

  test('if viteRuntime is not available, use bundle file to render the page', async ({
    assert,
    fs,
  }) => {
    setupViewMacroMock()

    await fs.create('foo.js', 'export default () => ({ head: "head", body: "foo.ts" })')

    const inertia = await new InertiaFactory()
      .merge({ config: { ssr: { enabled: true, bundle: new URL('foo.js', fs.baseUrl).href } } })
      .create()

    const result: any = await inertia.render('foo')

    assert.deepEqual(result.props.page.ssrBody, 'foo.ts')
    assert.deepEqual(result.props.page.ssrHead, ['head'])
  })

  test('enable only for listed pages', async ({ assert, fs }) => {
    setupViewMacroMock()
    const vite = await setupVite({ build: { rollupOptions: { input: 'foo.ts' } } })

    await fs.create('foo.ts', 'export default () => ({ head: "head", body: "foo.ts" })')

    const inertia = await new InertiaFactory()
      .withVite(vite)
      .merge({ config: { ssr: { enabled: true, entrypoint: 'foo.ts', pages: ['foo'] } } })
      .create()

    const result: any = await inertia.render('foo')
    const result2: any = await inertia.render('bar')

    assert.deepEqual(result.props.page.ssrBody, 'foo.ts')
    assert.notExists(result2.props.page.ssrBody)
  })

  test('should pass page object to the view', async ({ assert, fs }) => {
    setupViewMacroMock()
    const vite = await setupVite({ build: { rollupOptions: { input: 'foo.ts' } } })

    await fs.create('foo.ts', 'export default () => ({ head: "head", body: "foo.ts" })')

    const inertia = await new InertiaFactory()
      .withVite(vite)
      .merge({ config: { ssr: { enabled: true, entrypoint: 'foo.ts' } } })
      .create()

    const result: any = await inertia.render('foo')

    assert.deepEqual(result.props.page.component, 'foo')
    assert.deepEqual(result.props.page.version, '1')
  })
})

test.group('Inertia | Ssr | CSS Preloading', () => {
  test('collect and preload css files of entrypoint', async ({ assert, fs }) => {
    setupViewMacroMock()
    const vite = await setupVite({ build: { rollupOptions: { input: 'foo.ts' } } })

    await fs.create(
      'foo.ts',
      `
      import './style.css'
      export default () => ({ head: "head", body: "foo.ts" })
      `
    )

    await fs.create('style.css', 'body { color: red }')

    const inertia = await new InertiaFactory()
      .withVite(vite)
      .merge({
        config: {
          entrypoint: join(fs.basePath, 'foo.ts'),
          ssr: { enabled: true, entrypoint: 'foo.ts' },
        },
      })
      .create()

    const result: any = await inertia.render('foo')

    assert.deepEqual(result.props.page.ssrHead, [
      '<link rel="stylesheet" href="/style.css" />',
      'head',
    ])
  })

  test('collect recursively css files of entrypoint', async ({ assert, fs }) => {
    setupViewMacroMock()
    const vite = await setupVite({ build: { rollupOptions: { input: 'foo.ts' } } })

    await fs.create(
      'foo.ts',
      `
      import './foo2.ts'
      import './style.css'
      export default () => ({ head: "head", body: "foo.ts" })
      `
    )

    await fs.create('foo2.ts', `import './style2.css'`)
    await fs.create('style.css', 'body { color: red }')
    await fs.create('style2.css', 'body { color: blue }')

    const inertia = await new InertiaFactory()
      .withVite(vite)
      .merge({
        config: {
          entrypoint: join(fs.basePath, 'foo.ts'),
          ssr: { enabled: true, entrypoint: 'foo.ts', pages: ['foo'] },
        },
      })
      .create()

    const result: any = await inertia.render('foo')

    assert.deepEqual(result.props.page.ssrHead, [
      '<link rel="stylesheet" href="/style2.css" />',
      '<link rel="stylesheet" href="/style.css" />',
      'head',
    ])
  })

  test('collect css rendered page', async ({ assert, fs }) => {
    setupViewMacroMock()
    const vite = await setupVite({ build: { rollupOptions: { input: 'foo.ts' } } })

    await fs.create(
      'app.ts',
      `
      import './style.css'

      import.meta.glob('./pages/**/*.tsx')
      export default () => ({ head: "head", body: "foo.ts" })
      `
    )
    await fs.create('style.css', 'body { color: red }')

    await fs.create('./pages/home/main.tsx', `import './style2.css'`)
    await fs.create('./pages/home/style2.css', 'body { color: blue }')

    const inertia = await new InertiaFactory()
      .withVite(vite)
      .merge({
        config: {
          entrypoint: join(fs.basePath, 'app.ts'),
          ssr: { enabled: true, entrypoint: 'app.ts' },
        },
      })
      .create()

    const result: any = await inertia.render('home/main')

    assert.deepEqual(result.props.page.ssrHead, [
      '<link rel="stylesheet" href="/pages/home/style2.css" />',
      '<link rel="stylesheet" href="/style.css" />',
      'head',
    ])
  })
})
