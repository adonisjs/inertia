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

import { edgePluginInertia } from '../src/edge_plugin.js'

test.group('Edge plugin', () => {
  test('@inertia generate a root div with data-page', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia`, { page: {} })

    assert.deepEqual(html.split('\n'), ['<div id="app" data-page="{}"></div>'])
  })

  test('@inertia generate a root dive with data-page filled and encoded', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia`, {
      page: { foo: 'bar' },
    })

    assert.deepEqual(html.split('\n'), [
      '<div id="app" data-page="{&quot;foo&quot;:&quot;bar&quot;}"></div>',
    ])
  })

  test('@inertia just insert the ssrBody if present', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia`, {
      page: { ssrBody: '<div>foo</div>' },
    })

    assert.deepEqual(html.split('\n'), ['<div>foo</div>'])
  })
})
