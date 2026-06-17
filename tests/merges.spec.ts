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
import { defer, merge, deepMerge } from '../src/props.ts'
import { roundTripThroughClient } from './helpers.js'

type ListProps = { users: { id: number; name: string }[] }

test.group('Merges | directional', () => {
  test('merge appends by default', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: ListProps }>().create()

    const page = await inertia.page('home', { users: merge([{ id: 1, name: 'Jane' }]) })

    assert.deepEqual(page.mergeProps, ['users'])
    assert.deepEqual(page.prependProps, [])
    assert.deepEqual(page.deepMergeProps, [])
    assert.deepEqual(page.props.users, [{ id: 1, name: 'Jane' }])
  })

  test('prepend() routes the prop into prependProps', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: ListProps }>().create()

    const page = await inertia.page('home', { users: merge([{ id: 1, name: 'Jane' }]).prepend() })

    assert.deepEqual(page.prependProps, ['users'])
    assert.deepEqual(page.mergeProps, [])
  })

  test('append() restores the append direction after prepend()', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: ListProps }>().create()

    const page = await inertia.page('home', {
      users: merge([{ id: 1, name: 'Jane' }])
        .prepend()
        .append(),
    })

    assert.deepEqual(page.mergeProps, ['users'])
    assert.deepEqual(page.prependProps, [])
  })

  test('a prop is labeled in exactly one direction bucket', async ({ assert }) => {
    const inertia = new InertiaFactory<{
      home: { a: number[]; b: number[]; c: { v: number } }
    }>().create()

    const page = await inertia.page('home', {
      a: merge([1]),
      b: merge([2]).prepend(),
      c: deepMerge({ v: 1 }),
    })

    assert.deepEqual(page.mergeProps, ['a'])
    assert.deepEqual(page.prependProps, ['b'])
    assert.deepEqual(page.deepMergeProps, ['c'])
  })
})

test.group('Merges | keyed', () => {
  test('matchOn() emits a "<prop>.<key>" entry alongside the direction label', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory<{ home: ListProps }>().create()

    const page = await inertia.page('home', {
      users: merge([{ id: 1, name: 'Jane' }]).matchOn('id'),
    })

    assert.deepEqual(page.mergeProps, ['users'])
    assert.deepEqual(page.matchPropsOn, ['users.id'])
  })

  test('matchOn() composes with prepend()', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: ListProps }>().create()

    const page = await inertia.page('home', {
      users: merge([{ id: 1, name: 'Jane' }])
        .prepend()
        .matchOn('id'),
    })

    assert.deepEqual(page.prependProps, ['users'])
    assert.deepEqual(page.mergeProps, [])
    assert.deepEqual(page.matchPropsOn, ['users.id'])
  })

  test('a dotted matchOn path is concatenated verbatim for deep merges', async ({ assert }) => {
    const inertia = new InertiaFactory<{
      home: { settings: { list: { id: number }[] } }
    }>().create()

    const page = await inertia.page('home', {
      settings: deepMerge({ list: [{ id: 1 }] }).matchOn('list.id'),
    })

    assert.deepEqual(page.deepMergeProps, ['settings'])
    /**
     * The client splits each entry on its last dot, so `settings.list.id`
     * resolves to prop path `settings.list` keyed by `id`.
     */
    assert.deepEqual(page.matchPropsOn, ['settings.list.id'])
  })
})

test.group('Merges | composition', () => {
  test('defer().merge().matchOn() defers the value but still labels the merge', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory<{
      home: { users?: { id: number; name: string }[] }
    }>().create()

    const page = await inertia.page('home', {
      users: defer(() => [{ id: 1, name: 'Jane' }])
        .merge()
        .matchOn('id'),
    })

    assert.deepEqual(page.deferredProps, { default: ['users'] })
    assert.deepEqual(page.mergeProps, ['users'])
    assert.deepEqual(page.matchPropsOn, ['users.id'])
    /**
     * The value is deferred, so it is not present on a standard visit.
     */
    assert.notProperty(page.props, 'users')
  })
})

test.group('Merges | reset', () => {
  test('X-Inertia-Reset drops the merge label but keeps the value', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: ListProps }>()
      .partialReload('home')
      .only(['users'])
      .reset(['users'])
      .create()

    const page = await inertia.page('home', {
      users: merge([{ id: 1, name: 'Jane' }]).matchOn('id'),
    })

    /**
     * The client asked to reset `users`, so the server emits it as a plain
     * (replaced) prop: no merge/prepend/match labels, value still sent.
     */
    assert.deepEqual(page.mergeProps, [])
    assert.deepEqual(page.prependProps, [])
    assert.deepEqual(page.matchPropsOn, [])
    assert.deepEqual(page.props.users, [{ id: 1, name: 'Jane' }])
  })

  test('reset only affects the listed prop', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { a: number[]; b: number[] } }>()
      .partialReload('home')
      .only(['a', 'b'])
      .reset(['a'])
      .create()

    const page = await inertia.page('home', {
      a: merge([1]),
      b: merge([2]),
    })

    assert.deepEqual(page.mergeProps, ['b'])
  })
})

test.group('Merges | partial reload', () => {
  test('directional and keyed labels are emitted during a partial reload', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: ListProps }>()
      .partialReload('home')
      .only(['users'])
      .create()

    const page = await inertia.page('home', {
      users: merge([{ id: 1, name: 'Jane' }])
        .prepend()
        .matchOn('id'),
    })

    assert.deepEqual(page.prependProps, ['users'])
    assert.deepEqual(page.matchPropsOn, ['users.id'])
    assert.deepEqual(page.props.users, [{ id: 1, name: 'Jane' }])
  })
})

test.group('Merges | v3 client contract', () => {
  test('prependProps and matchPropsOn survive a round-trip through the real client', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory<{ home: ListProps }>().create()

    const serverPage = await inertia.page('home', {
      users: merge([{ id: 1, name: 'Jane' }])
        .prepend()
        .matchOn('id'),
    })

    const { page: clientPage } = await roundTripThroughClient(serverPage)

    assert.deepEqual(clientPage, serverPage)
    assert.deepEqual((clientPage as any).prependProps, ['users'])
    assert.deepEqual((clientPage as any).matchPropsOn, ['users.id'])
  })
})
