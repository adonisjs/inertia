/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { InertiaFactory } from '../factories/inertia_factory.js'
import { roundTripThroughClient } from './helpers.js'

test.group('v3 client contract', () => {
  test('the v3 client reconstructs a genuine server page object', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const serverPage = await inertia.page('home', {
      user: { id: 1, name: 'Jane', avatar: '/uploads/jane.png' },
      links: ['/dashboard', '/settings/profile'],
    })

    const { page: clientPage } = await roundTripThroughClient(serverPage)

    assert.deepEqual(clientPage, serverPage)
  })

  test('forward-slash escaping survives the round-trip and blocks tag breakout', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory().create()

    const serverPage = await inertia.page('home', {
      bio: 'evil </script><script>alert(1)</script>',
      url: 'https://adonisjs.com/docs',
    })

    const { html, page: clientPage } = await roundTripThroughClient(serverPage)

    /**
     * The raw, unescaped breakout sequence must never appear in the output...
     */
    assert.notInclude(html, '</script><script>alert(1)')
    /**
     * ...yet the v3 client must still parse the original value back intact.
     */
    assert.deepEqual(clientPage, serverPage)
    assert.equal((clientPage as any).props.bio, 'evil </script><script>alert(1)</script>')
  })

  test('the v3 client honours a custom mount id', async ({ assert }) => {
    const inertia = new InertiaFactory().create()
    const serverPage = await inertia.page('home', { ok: true })

    const { page: clientPage } = await roundTripThroughClient(serverPage, { id: 'app-root' })

    assert.deepEqual(clientPage, serverPage)
  })

  test('omitted clearHistory/encryptHistory round-trip as absent (v3 defaults them false)', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory().create()
    const serverPage = await inertia.page('home', { ok: true })

    assert.notProperty(serverPage, 'clearHistory')
    assert.notProperty(serverPage, 'encryptHistory')

    const { page: clientPage } = await roundTripThroughClient(serverPage)
    assert.notProperty(clientPage, 'clearHistory')
    assert.notProperty(clientPage, 'encryptHistory')
  })

  test('the v3 client reconstructs once-prop metadata from the page object', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    const serverPage = await inertia.page('home', {
      lookups: inertia.once(() => ['/dashboard', '/settings'], { key: 'lookups' }),
    })

    /**
     * The server emits the value plus its caching metadata on first encounter.
     */
    assert.deepEqual((serverPage as any).onceProps, {
      lookups: { prop: 'lookups', expiresAt: null },
    })

    const { page: clientPage } = await roundTripThroughClient(serverPage)

    /**
     * The real v3 client must reconstruct the page object, `onceProps` included,
     * exactly as the server produced it.
     */
    assert.deepEqual(clientPage, serverPage)
    assert.deepEqual((clientPage as any).onceProps, (serverPage as any).onceProps)
  })
})
