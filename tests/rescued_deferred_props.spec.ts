/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'

import { Inertia } from '../src/inertia.ts'
import { InertiaFactory } from '../factories/inertia_factory.ts'

/**
 * The static rescue listener is shared across instances, so reset it after every
 * test to avoid leaking a listener registered by one test into the next.
 */
test.group('Rescued deferred props', (group) => {
  group.each.teardown(() => {
    Inertia.onRescue()
  })

  test('omit a rescuable deferred prop and list its path when resolution throws', async ({
    assert,
  }) => {
    const errors: { prop: string; error: unknown }[] = []
    Inertia.onRescue((error, { prop }) => errors.push({ prop, error }))

    const inertia = new InertiaFactory<{ home: { stats?: number[] } }>()
      .partialReload('home')
      .only(['stats'])
      .create()

    const page = await inertia.page('home', {
      stats: inertia.defer(
        () => {
          throw new Error('boom')
        },
        { rescue: true }
      ),
    })

    assert.notProperty(page.props, 'stats')
    assert.deepEqual(page.rescuedProps, ['stats'])
    assert.lengthOf(errors, 1)
    assert.equal(errors[0].prop, 'stats')
    assert.equal((errors[0].error as Error).message, 'boom')
  })

  test('resolve a rescuable deferred prop normally when it succeeds', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { stats?: number[] } }>()
      .partialReload('home')
      .only(['stats'])
      .create()

    const page = await inertia.page('home', {
      stats: inertia.defer(() => [1, 2, 3], { rescue: true }),
    })

    assert.deepEqual(page.props, { stats: [1, 2, 3] })
    assert.deepEqual(page.rescuedProps, [])
  })

  test('let errors propagate for a deferred prop that is not rescuable', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { stats?: number[] } }>()
      .partialReload('home')
      .only(['stats'])
      .create()

    await assert.rejects(
      () =>
        inertia.page('home', {
          stats: inertia.defer(() => {
            throw new Error('boom')
          }),
        }),
      'boom'
    )
  })

  test('rescue composes with .merge()', async ({ assert }) => {
    Inertia.onRescue(() => {})

    const inertia = new InertiaFactory<{ home: { feed?: number[] } }>()
      .partialReload('home')
      .only(['feed'])
      .create()

    const page = await inertia.page('home', {
      feed: inertia
        .defer(
          () => {
            throw new Error('boom')
          },
          { rescue: true }
        )
        .merge(),
    })

    assert.notProperty(page.props, 'feed')
    assert.deepEqual(page.rescuedProps, ['feed'])
    /**
     * The merge label is still emitted (classification happens before
     * resolution); the rescued omission is treated by the client as a no-op
     * against its cached data.
     */
    assert.deepEqual(page.mergeProps, ['feed'])
  })

  test('rescue composes with .once()', async ({ assert }) => {
    Inertia.onRescue(() => {})

    const inertia = new InertiaFactory<{ home: { stats?: number[] } }>()
      .partialReload('home')
      .only(['stats'])
      .create()

    const page = await inertia.page('home', {
      stats: inertia
        .defer(
          () => {
            throw new Error('boom')
          },
          { rescue: true }
        )
        .once(),
    })

    assert.notProperty(page.props, 'stats')
    assert.deepEqual(page.rescuedProps, ['stats'])
    assert.property(page.onceProps, 'stats')
  })

  test('emit an empty rescuedProps array on a standard visit', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { stats?: number[] } }>().create()

    const page = await inertia.page('home', {
      stats: inertia.defer(
        () => {
          throw new Error('never called on a standard visit')
        },
        { rescue: true }
      ),
    })

    assert.notProperty(page.props, 'stats')
    assert.deepEqual(page.rescuedProps, [])
    assert.deepEqual(page.deferredProps, { default: ['stats'] })
  })

  test('fall back to ctx.logger.error when no listener is registered', async ({ assert }) => {
    const logged: any[] = []
    const ctx = new HttpContextFactory().create()
    ctx.logger.error = ((...args: any[]) => {
      logged.push(args)
    }) as any

    const inertia = new InertiaFactory<{ home: { stats?: number[] } }>()
      .merge({ ctx })
      .partialReload('home')
      .only(['stats'])
      .create()

    const page = await inertia.page('home', {
      stats: inertia.defer(
        () => {
          throw new Error('boom')
        },
        { rescue: true }
      ),
    })

    assert.deepEqual(page.rescuedProps, ['stats'])
    assert.lengthOf(logged, 1)
    assert.deepInclude(logged[0][0], { err: logged[0][0].err })
    assert.match(logged[0][1], /Rescued deferred prop "stats"/)
  })
})

test.group('Rescued deferred props | defer() signature', () => {
  test('defer(fn, "group") still groups deferred props', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { a?: number; b?: number } }>().create()

    const page = await inertia.page('home', {
      a: inertia.defer(() => 1, 'group1'),
      b: inertia.defer(() => 2, 'group1'),
    })

    assert.deepEqual(page.deferredProps, { group1: ['a', 'b'] })
  })

  test('defer(fn, { group, rescue }) groups and marks rescuable', async ({ assert }) => {
    const errors: string[] = []
    Inertia.onRescue((_error, { prop }) => errors.push(prop))

    const inertia = new InertiaFactory<{ home: { a?: number } }>()
      .partialReload('home')
      .only(['a'])
      .create()

    const page = await inertia.page('home', {
      a: inertia.defer(
        () => {
          throw new Error('boom')
        },
        { group: 'g', rescue: true }
      ),
    })

    assert.deepEqual(page.rescuedProps, ['a'])
    assert.deepEqual(errors, ['a'])

    Inertia.onRescue()
  })
})
