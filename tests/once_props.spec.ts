/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { BaseTransformer } from '@adonisjs/core/transformers'
import { HttpContextFactory } from '@adonisjs/core/factories/http'

import { InertiaFactory } from '../factories/inertia_factory.ts'
import { once, buildStandardVisitProps } from '../src/props.ts'

test.group('Once props | standard visit', () => {
  test('resolve value and emit metadata on first encounter', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { lookups: string[] } }>().create()

    const page = await inertia.page('home', {
      lookups: inertia.once(() => ['a', 'b']),
    })

    assert.deepEqual(page.props, { lookups: ['a', 'b'] })
    assert.deepEqual(page.onceProps, {
      lookups: { prop: 'lookups', expiresAt: null },
    })
  })

  test('skip value but still emit metadata when the client holds it cached', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { lookups: string[] } }>()
      .withExceptOnceProps(['lookups'])
      .create()

    const page = await inertia.page('home', {
      lookups: inertia.once(() => ['a', 'b']),
    })

    assert.notProperty(page.props, 'lookups')
    assert.deepEqual(page.onceProps, {
      lookups: { prop: 'lookups', expiresAt: null },
    })
  })

  test('fresh forces resolution even when the client holds it cached', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { lookups: string[] } }>()
      .withExceptOnceProps(['lookups'])
      .create()

    const page = await inertia.page('home', {
      lookups: inertia.once(() => ['a', 'b'], { fresh: true }),
    })

    assert.deepEqual(page.props, { lookups: ['a', 'b'] })
    assert.property(page.onceProps, 'lookups')
  })

  test('custom key drives both the metadata key and the gate', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { lookups: string[] } }>()
      .withExceptOnceProps(['globalLookups'])
      .create()

    const page = await inertia.page('home', {
      lookups: inertia.once(() => ['a', 'b'], { key: 'globalLookups' }),
    })

    assert.notProperty(page.props, 'lookups')
    assert.deepEqual(page.onceProps, {
      globalLookups: { prop: 'lookups', expiresAt: null },
    })
  })

  test('once props shared via share() flow through the builder', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { other: number } }>().create()
    inertia.share({ lookups: inertia.once(() => ['a', 'b']) })

    const page = await inertia.page('home', { other: 1 })

    assert.deepEqual(page.props, { lookups: ['a', 'b'], other: 1 })
    assert.property(page.onceProps, 'lookups')
  })

  test('emit an empty onceProps map when there are no once props', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { other: number } }>().create()

    const page = await inertia.page('home', { other: 1 })

    assert.deepEqual(page.onceProps, {})
  })
})

test.group('Once props | composition', () => {
  test('defer().once() defers on a standard visit and emits metadata', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { stats?: number[] } }>().create()

    const page = await inertia.page('home', {
      stats: inertia.defer(() => [1, 2, 3]).once(),
    })

    assert.notProperty(page.props, 'stats')
    assert.deepEqual(page.deferredProps, { default: ['stats'] })
    assert.property(page.onceProps, 'stats')
  })

  test('optional().once() is omitted on a standard visit but emits metadata', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory<{ home: { audit?: number[] } }>().create()

    const page = await inertia.page('home', {
      audit: inertia.optional(() => [1, 2, 3]).once(),
    })

    assert.notProperty(page.props, 'audit')
    assert.deepEqual(page.deferredProps, {})
    assert.property(page.onceProps, 'audit')
  })

  test('merge().once() lists the prop in mergeProps when resolved', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { feed: number[] } }>().create()

    const page = await inertia.page('home', {
      feed: inertia.merge([1, 2, 3]).once(),
    })

    assert.deepEqual(page.props, { feed: [1, 2, 3] })
    assert.deepEqual(page.mergeProps, ['feed'])
    assert.property(page.onceProps, 'feed')
  })

  test('merge().once() is not listed in mergeProps when the value is skipped', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory<{ home: { feed: number[] } }>()
      .withExceptOnceProps(['feed'])
      .create()

    const page = await inertia.page('home', {
      feed: inertia.merge([1, 2, 3]).once(),
    })

    assert.notProperty(page.props, 'feed')
    assert.deepEqual(page.mergeProps, [])
    assert.property(page.onceProps, 'feed')
  })
})

test.group('Once props | partial reload', () => {
  test('resolve a requested once prop that is not cached', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { lookups: string[]; other: number } }>()
      .partialReload('home')
      .only(['lookups'])
      .create()

    const page = await inertia.page('home', {
      lookups: inertia.once(() => ['a', 'b']),
      other: 1,
    })

    assert.deepEqual(page.props, { lookups: ['a', 'b'] })
    assert.property(page.onceProps, 'lookups')
  })

  test('resolve a requested once prop even when the client reports it cached', async ({
    assert,
  }) => {
    /**
     * The except-once header is honoured on standard visits only. A partial
     * reload that explicitly requests a once prop always resolves it, matching
     * inertia-laravel (its once-cache gate runs only on non-partial requests).
     */
    const inertia = new InertiaFactory<{ home: { lookups: string[]; other: number } }>()
      .withExceptOnceProps(['lookups'])
      .partialReload('home')
      .only(['lookups'])
      .create()

    const page = await inertia.page('home', {
      lookups: inertia.once(() => ['a', 'b']),
      other: 1,
    })

    assert.deepEqual(page.props, { lookups: ['a', 'b'] })
    assert.property(page.onceProps, 'lookups')
  })

  test('do not emit metadata for once props outside the cherry-pick list', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { lookups: string[]; other: number } }>()
      .partialReload('home')
      .only(['other'])
      .create()

    const page = await inertia.page('home', {
      lookups: inertia.once(() => ['a', 'b']),
      other: 1,
    })

    assert.deepEqual(page.props, { other: 1 })
    assert.deepEqual(page.onceProps, {})
  })
})

test.group('Once props | expiry and keys', () => {
  const resolver = new HttpContextFactory().create().containerResolver
  const NOW = 1_000_000

  test('relative expiry in milliseconds resolves against now', async ({ assert }) => {
    const { onceProps } = await buildStandardVisitProps(
      { lookups: once(() => ['a'], { expiresIn: 5000 }) },
      resolver,
      { exceptOnce: new Set(), now: NOW }
    )

    assert.deepEqual(onceProps, { lookups: { prop: 'lookups', expiresAt: NOW + 5000 } })
  })

  test('relative expiry as a duration string is parsed', async ({ assert }) => {
    const { onceProps } = await buildStandardVisitProps(
      { lookups: once(() => ['a'], { expiresIn: '2h' }) },
      resolver,
      { exceptOnce: new Set(), now: NOW }
    )

    assert.deepEqual(onceProps, { lookups: { prop: 'lookups', expiresAt: NOW + 7_200_000 } })
  })

  test('absolute expiry as a Date is normalized to epoch-ms', async ({ assert }) => {
    const when = new Date(NOW + 60_000)
    const { onceProps } = await buildStandardVisitProps(
      { lookups: once(() => ['a'], { expiresAt: when }) },
      resolver,
      { exceptOnce: new Set(), now: NOW }
    )

    assert.deepEqual(onceProps, { lookups: { prop: 'lookups', expiresAt: when.getTime() } })
  })

  test('absolute expiry as epoch-ms passes through, winning over relative', async ({ assert }) => {
    const { onceProps } = await buildStandardVisitProps(
      { lookups: once(() => ['a'], { expiresAt: 42, expiresIn: 5000 }) },
      resolver,
      { exceptOnce: new Set(), now: NOW }
    )

    assert.deepEqual(onceProps, { lookups: { prop: 'lookups', expiresAt: 42 } })
  })

  test('a duplicate once-key in one response is last-wins', async ({ assert }) => {
    const { props, onceProps } = await buildStandardVisitProps(
      {
        first: once(() => ['a'], { key: 'shared' }),
        second: once(() => ['b'], { key: 'shared' }),
      },
      resolver,
      { exceptOnce: new Set(), now: NOW }
    )

    assert.deepEqual(props, { first: ['a'], second: ['b'] })
    assert.deepEqual(onceProps, { shared: { prop: 'second', expiresAt: null } })
  })

  test('the gate skips resolution for keys the client already holds', async ({ assert }) => {
    const compute = () => {
      throw new Error('should not be called for a cached once prop')
    }

    const { props, onceProps } = await buildStandardVisitProps(
      { lookups: once(compute) },
      resolver,
      {
        exceptOnce: new Set(['lookups']),
        now: NOW,
      }
    )

    assert.notProperty(props, 'lookups')
    assert.deepEqual(onceProps, { lookups: { prop: 'lookups', expiresAt: null } })
  })
})

test.group('Once props | transformers', () => {
  class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
    toObject() {
      return this.resource
    }
  }

  test('resolve a once prop wrapping a transformer', async ({ assert }) => {
    const inertia = new InertiaFactory<{
      home: { user: { id: number; timestamps: boolean } }
    }>().create()

    const page = await inertia.page('home', {
      user: inertia.once(UserTransformer.transform({ id: 1, timestamps: true })),
    })

    assert.deepEqual(page.props, { user: { id: 1, timestamps: true } })
    assert.deepEqual(page.onceProps, { user: { prop: 'user', expiresAt: null } })
  })

  test('skip a cached once prop wrapping a transformer', async ({ assert }) => {
    const inertia = new InertiaFactory<{
      home: { user: { id: number; timestamps: boolean } }
    }>()
      .withExceptOnceProps(['user'])
      .create()

    const page = await inertia.page('home', {
      user: inertia.once(UserTransformer.transform({ id: 1, timestamps: true })),
    })

    assert.notProperty(page.props, 'user')
    assert.deepEqual(page.onceProps, { user: { prop: 'user', expiresAt: null } })
  })

  test('resolve a deferred once transformer during a partial reload', async ({ assert }) => {
    const inertia = new InertiaFactory<{
      home: { user?: { id: number; timestamps: boolean } }
    }>()
      .partialReload('home')
      .only(['user'])
      .create()

    const page = await inertia.page('home', {
      user: inertia.defer(() => UserTransformer.transform({ id: 1, timestamps: true })).once(),
    })

    assert.deepEqual(page.props, { user: { id: 1, timestamps: true } })
    assert.deepEqual(page.onceProps, { user: { prop: 'user', expiresAt: null } })
  })

  test('merge a once prop wrapping a transformer', async ({ assert }) => {
    const inertia = new InertiaFactory<{
      home: { user: { id: number; timestamps: boolean } }
    }>().create()

    const page = await inertia.page('home', {
      user: inertia.merge(UserTransformer.transform({ id: 1, timestamps: true })).once(),
    })

    assert.deepEqual(page.props, { user: { id: 1, timestamps: true } })
    assert.deepEqual(page.mergeProps, ['user'])
    assert.deepEqual(page.onceProps, { user: { prop: 'user', expiresAt: null } })
  })
})
