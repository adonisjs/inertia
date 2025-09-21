/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Edge } from 'edge.js'
import { test } from '@japa/runner'

import { edgePluginInertia } from '../../src/plugins/edge/plugin.js'

test.group('Edge plugin', () => {
  test('generate root div with data-page attribute', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())
    edge.registerTemplate('components/layout', {
      template: `@inertia()`,
    })
    edge.registerTemplate('root_template', {
      template: `@!component('components/layout', { page })`,
    })
    const html = await edge.render('root_template', { page: {} })
    assert.deepEqual(html.split('\n'), ['<div id="app" data-page="{}"></div>'])
  })

  test('@inertia generate a root dive with data-page filled and encoded', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())
    edge.registerTemplate('components/layout', {
      template: `@inertia()`,
    })
    edge.registerTemplate('root_template', {
      template: `@!component('components/layout', { page })`,
    })

    const html = await edge.render('root_template', {
      page: { foo: 'bar' },
    })

    assert.deepEqual(html.split('\n'), [
      '<div id="app" data-page="{&quot;foo&quot;:&quot;bar&quot;}"></div>',
    ])
  })

  test('throw error when invalid arguments are provided to the @inertia tag', async () => {
    const edge = Edge.create().use(edgePluginInertia())

    await edge.renderRaw(`@inertia('foo')`, { page: {} })
  }).throws(`"('foo')" is not a valid argument for @inertia`)

  test('pass through HTML attributes via @inertia tag', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia({ class: 'foo' })`, {
      page: {},
    })

    assert.deepEqual(html.split('\n'), ['<div id="app" class="foo" data-page="{}"></div>'])
  })

  test('render root div as another tag', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia({ as: 'main' })`, {
      page: {},
    })

    assert.deepEqual(html.split('\n'), ['<main id="app" data-page="{}"></main>'])
  })

  test('render SSR body when exists', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia()`, {
      page: { ssrBody: '<div>foo</div>' },
    })

    assert.deepEqual(html.split('\n'), ['<div>foo</div>'])
  })
})
