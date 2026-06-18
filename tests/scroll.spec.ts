/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { scroll } from '../src/props.ts'
import { type Scroll } from '../src/types.ts'
import { InertiaFactory } from '../factories/inertia_factory.js'
import {
  type User,
  userRows,
  paginatorMeta,
  UserTransformer,
  roundTripThroughClient,
} from './helpers.js'

test.group('Scroll | transformer paginator', () => {
  test('auto-derive the cursor from the paginator metadata', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { users: Scroll<User> } }>().create()

    const page = await inertia.page('home', {
      users: scroll(() => UserTransformer.paginate(userRows, paginatorMeta(1, 3))),
    })

    assert.deepEqual(page.scrollProps, {
      users: { pageName: 'page', currentPage: 1, nextPage: 2, previousPage: null, reset: false },
    })
    assert.deepEqual(page.props.users.data, userRows)
  })

  test('label the data array under mergeProps for an append intent', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { users: Scroll<User> } }>().create()

    const page = await inertia.page('home', {
      users: scroll(() => UserTransformer.paginate(userRows, paginatorMeta(2, 3))),
    })

    assert.deepEqual(page.mergeProps, ['users.data'])
    assert.deepEqual(page.prependProps, [])
    assert.deepEqual(page.scrollProps!.users, {
      pageName: 'page',
      currentPage: 2,
      nextPage: 3,
      previousPage: 1,
      reset: false,
    })
  })

  test('label the data array under prependProps for a prepend intent', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { users: Scroll<User> } }>()
      .withMergeIntent('prepend')
      .create()

    const page = await inertia.page('home', {
      users: scroll(() => UserTransformer.paginate(userRows, paginatorMeta(2, 3))),
    })

    assert.deepEqual(page.prependProps, ['users.data'])
    assert.deepEqual(page.mergeProps, [])
  })

  test('a custom pageName flows from the paginator metadata', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { users: Scroll<User> } }>().create()

    const page = await inertia.page('home', {
      users: scroll(() => UserTransformer.paginate(userRows, paginatorMeta(1, 3, 'users_page'))),
    })

    assert.equal(page.scrollProps!.users.pageName, 'users_page')
  })
})

test.group('Scroll | keyed', () => {
  test('matchOn() emits a "<key>.data.<key>" entry for keyed dedup', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { users: Scroll<User> } }>().create()

    const page = await inertia.page('home', {
      users: scroll(() => UserTransformer.paginate(userRows, paginatorMeta(1, 3))).matchOn('id'),
    })

    assert.deepEqual(page.matchPropsOn, ['users.data.id'])
  })

  test('no matchPropsOn entry by default', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { users: Scroll<User> } }>().create()

    const page = await inertia.page('home', {
      users: scroll(() => UserTransformer.paginate(userRows, paginatorMeta(1, 3))),
    })

    assert.deepEqual(page.matchPropsOn, [])
  })
})

test.group('Scroll | provider', () => {
  test('compute the cursor from a provider for a plain { data } value', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { posts: Scroll<User> } }>().create()

    const page = await inertia.page('home', {
      posts: scroll(
        () => ({ data: userRows, meta: { cursor: 'abc', next: 'def' } }),
        (value) => ({
          pageName: 'cursor',
          currentPage: value.meta.cursor,
          nextPage: value.meta.next,
          previousPage: null,
        })
      ),
    })

    assert.deepEqual(page.scrollProps!.posts, {
      pageName: 'cursor',
      currentPage: 'abc',
      nextPage: 'def',
      previousPage: null,
      reset: false,
    })
    assert.deepEqual(page.props.posts.data, userRows)
  })

  test('throw when the value is neither a paginator nor carries a provider', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { posts: Scroll<User> } }>().create()

    await assert.rejects(
      () => inertia.page('home', { posts: scroll(() => ({ data: userRows })) }),
      /Cannot derive an infinite-scroll cursor from the value/
    )
  })

  test('throw for a transformer paginator with non-offset metadata and no provider', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory<{ home: { posts: Scroll<User> } }>().create()

    /**
     * A cursor paginator is still a transformer paginator (`$type: 'paginator'`),
     * but its metadata has no numeric `currentPage`, so the default provider
     * cannot derive an offset cursor and must fail loudly.
     */
    await assert.rejects(
      () =>
        inertia.page('home', {
          posts: scroll(() => UserTransformer.paginate(userRows, { cursor: 'abc' })),
        }),
      /Cannot derive an infinite-scroll cursor from the value/
    )
  })
})

test.group('Scroll | deferred', () => {
  test('a deferred scroll prop is skipped on a standard visit', async ({ assert }) => {
    /**
     * A deferred prop is absent on the initial load, so the client must declare
     * it optional — and the type system enforces that `.deferred()` only fits an
     * optional `Scroll<User>` prop.
     */
    const inertia = new InertiaFactory<{ home: { users?: Scroll<User> } }>().create()

    const page = await inertia.page('home', {
      users: scroll(() => UserTransformer.paginate(userRows, paginatorMeta(1, 3))).deferred(),
    })

    /**
     * The first page is not sent; the client is told to load it and the merge
     * label is emitted — but no cursor until it resolves.
     */
    assert.deepEqual(page.deferredProps, { default: ['users'] })
    assert.deepEqual(page.mergeProps, ['users.data'])
    assert.deepEqual(page.scrollProps, {})
    assert.notProperty(page.props, 'users')
  })

  test('a deferred scroll prop resolves and emits its cursor on a partial reload', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory<{ home: { users?: Scroll<User> } }>()
      .partialReload('home')
      .only(['users'])
      .create()

    const page = await inertia.page('home', {
      users: scroll(() => UserTransformer.paginate(userRows, paginatorMeta(1, 3))).deferred(),
    })

    assert.deepEqual(page.props.users!.data, userRows)
    assert.deepEqual(page.scrollProps!.users, {
      pageName: 'page',
      currentPage: 1,
      nextPage: 2,
      previousPage: null,
      reset: false,
    })
  })
})

test.group('Scroll | reset', () => {
  test('X-Inertia-Reset drops the merge label and flags reset', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { users: Scroll<User> } }>()
      .partialReload('home')
      .only(['users'])
      .reset(['users'])
      .create()

    const page = await inertia.page('home', {
      users: scroll(() => UserTransformer.paginate(userRows, paginatorMeta(1, 3))).matchOn('id'),
    })

    /**
     * Reset: the prop is emitted unlabeled (client replaces) and the `reset`
     * flag tells the client to discard cached items — its value is still sent.
     */
    assert.deepEqual(page.mergeProps, [])
    assert.deepEqual(page.prependProps, [])
    assert.deepEqual(page.matchPropsOn, [])
    assert.equal(page.scrollProps!.users.reset, true)
    assert.deepEqual(page.props.users.data, userRows)
  })
})

test.group('Scroll | multiple containers', () => {
  test('each scroll prop emits its own cursor and merge label', async ({ assert }) => {
    const inertia = new InertiaFactory<{
      home: { users: Scroll<User>; posts: Scroll<User> }
    }>().create()

    const page = await inertia.page('home', {
      users: scroll(() => UserTransformer.paginate(userRows, paginatorMeta(1, 2, 'users_page'))),
      posts: scroll(() => UserTransformer.paginate(userRows, paginatorMeta(1, 5, 'posts_page'))),
    })

    assert.deepEqual(page.mergeProps, ['users.data', 'posts.data'])
    assert.equal(page.scrollProps!.users.pageName, 'users_page')
    assert.equal(page.scrollProps!.posts.pageName, 'posts_page')
  })
})

test.group('Scroll | v3 client contract', () => {
  test('scrollProps survive a round-trip through the real client', async ({ assert }) => {
    const inertia = new InertiaFactory<{ home: { users: Scroll<User> } }>().create()

    const page = await inertia.page('home', {
      users: scroll(() => UserTransformer.paginate(userRows, paginatorMeta(1, 3))).matchOn('id'),
    })

    const { page: reconstructed } = await roundTripThroughClient(page)

    assert.deepEqual(reconstructed.scrollProps, {
      users: { pageName: 'page', currentPage: 1, nextPage: 2, previousPage: null, reset: false },
    })
    assert.deepEqual(reconstructed.mergeProps, ['users.data'])
    assert.deepEqual(reconstructed.matchPropsOn, ['users.data.id'])
  })
})
