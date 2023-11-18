/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { HttpContextFactory, RequestFactory } from '@adonisjs/core/factories/http'

import { setupViewMacroMock } from '../tests_helpers/index.js'
import { InertiaFactory } from '../factories/inertia_factory.js'

test.group('Inertia', () => {
  test('location should returns x-inertia-location with 409 code', async ({ assert }) => {
    const ctx = new HttpContextFactory().create()

    const inertia = await new InertiaFactory().merge({ ctx }).create()

    inertia.location('https://adonisjs.com')

    assert.equal(ctx.response.getStatus(), 409)
    assert.equal(ctx.response.getHeader('x-inertia-location'), 'https://adonisjs.com')
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
})
