/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { setupApp } from './helpers.ts'
import { InertiaManager } from '../src/inertia_manager.ts'

test.group('Inertia Provider', () => {
  test('register inertia container singleton', async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    assert.instanceOf(await app.container.make(InertiaManager), InertiaManager)
  })

  test('register brisk route macro', async ({ assert, cleanup }) => {
    const { app } = await setupApp([
      {
        file: () => import('../providers/inertia_provider.ts'),
        environment: ['web', 'test'],
      },
    ])
    cleanup(() => app.terminate())

    const router = await app.container.make('router')
    assert.property(router.on('foo'), 'renderInertia')
  })
})
