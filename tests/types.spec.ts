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

test.group('Types', () => {
  test('assign interface to render', async () => {
    const inertia = await new InertiaFactory().create()

    interface Response {
      foo: string
    }

    inertia.render<Response>('foo', null as any).catch(() => {})
  })

  test('ts error if props doesnt match generic', async () => {
    const inertia = await new InertiaFactory().create()

    interface Response {
      foo: string
    }

    // @ts-expect-error props doesn't match generic
    inertia.render<Response>('foo', { foo: 1 }).catch(() => {})
  })
})
