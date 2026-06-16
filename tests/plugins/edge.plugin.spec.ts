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
  test('generate script payload element and root mount div', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())
    edge.registerTemplate('components/layout', {
      template: `@inertia()`,
    })
    edge.registerTemplate('root_template', {
      template: `@!component('components/layout', { page })`,
    })
    const html = await edge.render('root_template', { page: {} })
    assert.deepEqual(html.split('\n'), [
      '<script data-page="app" type="application/json">{}</script><div id="app"></div>',
    ])
  })

  test('@inertia embeds the page payload as raw JSON inside the script tag', async ({ assert }) => {
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
      '<script data-page="app" type="application/json">{"foo":"bar"}</script><div id="app"></div>',
    ])
  })

  test('escape forward slashes so a </script> sequence cannot close the tag', async ({
    assert,
  }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia()`, {
      page: { url: '/users', html: '</script><script>alert(1)</script>' },
    })

    assert.notInclude(html, '</script><script>alert(1)')
    assert.include(html, '<\\/script><script>alert(1)<\\/script>')
    assert.include(html, '"url":"\\/users"')
  })

  test('use the custom id for both the script data-page and the mount element', async ({
    assert,
  }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia({ id: 'app-root' })`, { page: {} })

    assert.deepEqual(html.split('\n'), [
      '<script data-page="app-root" type="application/json">{}</script><div id="app-root"></div>',
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

    assert.deepEqual(html.split('\n'), [
      '<script data-page="app" type="application/json">{}</script><div id="app" class="foo"></div>',
    ])
  })

  test('render the mount element as another tag', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia({ as: 'main' })`, {
      page: {},
    })

    assert.deepEqual(html.split('\n'), [
      '<script data-page="app" type="application/json">{}</script><main id="app"></main>',
    ])
  })

  test('render SSR body when exists', async ({ assert }) => {
    const edge = Edge.create().use(edgePluginInertia())

    const html = await edge.renderRaw(`@inertia()`, {
      page: { ssrBody: '<div>foo</div>' },
    })

    assert.deepEqual(html.split('\n'), ['<div>foo</div>'])
  })
})
