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
  test('@inertia generate a root div with data-page', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia()`, { page: {} })

    assert.deepEqual(html.split('\n'), ['<div id="app" data-page="{}"></div>'])
  })

  test('@inertia generate a root dive with data-page filled and encoded', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia()`, {
      page: { foo: 'bar' },
    })

    assert.deepEqual(html.split('\n'), [
      '<div id="app" data-page="{&quot;foo&quot;:&quot;bar&quot;}"></div>',
    ])
  })

  test('throws if passing invalid argument', async () => {
    const edge = Edge.create().use(edgePluginInertia())

    await edge.renderRaw(`@inertia('foo')`, { page: {} })
  }).throws(`"('foo')" is not a valid argument for @inertia`)

  test('pass class to @inertia', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia({ class: 'foo' })`, {
      page: {},
    })

    assert.deepEqual(html.split('\n'), ['<div id="app" class="foo" data-page="{}"></div>'])
  })

  test('pass id to @inertia', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia({ id: 'foo' })`, {
      page: {},
    })

    assert.deepEqual(html.split('\n'), ['<div id="foo" data-page="{}"></div>'])
  })

  test('works with variable reference', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia({ class: mainClass })`, {
      mainClass: 'foo bar',
      page: {},
    })

    assert.deepEqual(html.split('\n'), ['<div id="app" class="foo bar" data-page="{}"></div>'])
  })

  test('works with function call', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia({ class: mainClass() })`, {
      mainClass() {
        return 'foo bar'
      },
      page: {},
    })

    assert.deepEqual(html.split('\n'), ['<div id="app" class="foo bar" data-page="{}"></div>'])
  })

  test('render root div as another tag', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia({ as: 'main' })`, {
      page: {},
    })

    assert.deepEqual(html.split('\n'), ['<main id="app" data-page="{}"></main>'])
  })

  test('@inertia just insert the ssrBody if present', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia()`, {
      page: { ssrBody: '<div>foo</div>' },
    })

    assert.deepEqual(html.split('\n'), ['<div>foo</div>'])
  })
})
