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

import { type Scroll, type AsPageProps } from '../../src/types.ts'
import { once, always, defer, merge, deepMerge, scroll, optional } from '../../src/props.ts'
import { type User, userRows } from '../helpers.js'

function createRenderer<Input extends Record<string, any>>() {
  return function render<T extends AsPageProps<Input>>(_: T): void {}
}

test.group('To page props', () => {
  test('allow passing component props as it is', () => {
    type Props = {
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const render = createRenderer<Props>()
    render({
      user: {
        id: 1,
        timestamps: true,
      },
      posts: [{ id: 1, title: 'Hello world' }],
      paginated: {
        data: [{ id: 1, title: 'Hello world' }],
        total: 10,
      },
    })
  })

  test('allow skipping optional values', () => {
    type Props = {
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const render = createRenderer<Props>()
    render({
      user: {
        id: 1,
        timestamps: true,
      },
      posts: [{ id: 1 }],
      paginated: {
        data: [{ id: 1 }],
      },
    })
  })

  test('allow skipping optional props', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const render = createRenderer<Props>()
    render({
      posts: [{ id: 1, title: 'Hello world' }],
    })
  })

  test('allow defining optional props via deferred helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const render = createRenderer<Props>()
    render({
      user: defer(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }),
      posts: [{ id: 1 }],
      paginated: defer(() => {
        return {
          data: [{ id: 1 }],
        }
      }),
    })
  })

  test('defer options (group / rescue) do not perturb the optional component type', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts?: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const render = createRenderer<Props>()
    render({
      // bare group string (backwards compatible) still typechecks
      user: defer(() => {
        return { id: 1, timestamps: true }
      }, 'group1'),
      // options object with rescue resolves to the same optional prop type
      posts: defer(() => [{ id: 1 }], { rescue: true }),
      paginated: defer(
        () => {
          return { data: [{ id: 1 }] }
        },
        { group: 'group1', rescue: true }
      ),
    })
  })

  test('disallow defining required props via deferred helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const render = createRenderer<Props>()
    render({
      user: defer(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }),
      // @ts-expect-error
      posts: defer(() => [{ id: 1 }]),
      paginated: defer(() => {
        return {
          data: [{ id: 1 }],
        }
      }),
    })
  })

  test('allow defining optional props via optional helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const render = createRenderer<Props>()
    render({
      user: optional(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }),
      posts: [{ id: 1 }],
      paginated: optional(() => {
        return {
          data: [{ id: 1 }],
        }
      }),
    })
  })

  test('disallow defining required props via optional helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const render = createRenderer<Props>()
    render({
      user: optional(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }),
      // @ts-expect-error
      posts: optional(() => [{ id: 1 }]),
      paginated: optional(() => {
        return {
          data: [{ id: 1 }],
        }
      }),
    })
  })

  test('allow defining required and optional props via always helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const render = createRenderer<Props>()
    render({
      user: always({
        id: 1,
        timestamps: true,
      }),
      posts: always([{ id: 1, title: 'Hello world' }]),
      paginated: always({
        data: [{ id: 1, title: 'Hello world' }],
        total: 10,
      }),
    })
  })

  test('allow defining required and optional props via mergeable helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const render = createRenderer<Props>()
    render({
      user: merge({
        id: 1,
        timestamps: true,
      }),
      posts: merge([{ id: 1, title: 'Hello world' }]),
      paginated: merge({
        data: [{ id: 1, title: 'Hello world' }],
        total: 10,
      }),
    })
  })

  test('allow defining optional props via mergeable and defer helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const render = createRenderer<Props>()
    render({
      user: defer(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }).merge(),
      posts: merge([{ id: 1, title: 'Hello world' }]),
      paginated: defer(() => {
        return {
          data: [{ id: 1, title: 'Hello world' }],
          total: 10,
        }
      }).merge(),
    })
  })

  test('disallow defining required props via mergeable and defer helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const render = createRenderer<Props>()
    render({
      user: defer(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }).merge(),
      // @ts-expect-error
      posts: defer(() => {
        return [{ id: 1, title: 'Hello world' }]
      }).merge(),
      paginated: defer(() => {
        return {
          data: [{ id: 1, title: 'Hello world' }],
          total: 10,
        }
      }).merge(),
    })
  })
})

test.group('To page props | Transformers', () => {
  test('allow passing component props using transformers', () => {
    type Props = {
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        metadata: {
          total: number
        }
      }
    }

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const render = createRenderer<Props>()
    render({
      user: UserTransformer.transform({
        id: 1,
        timestamps: true,
      }),
      posts: PostsTransformer.transform([{ id: 1, title: 'Hello world' }]),
      paginated: PostsTransformer.paginate([{ id: 1, title: 'Hello world' }], {
        total: 10,
      }),
    })
  })

  test('allow skipping optional values using transformers', () => {
    type Props = {
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    class PostsTransformer extends BaseTransformer<{ id: number; title?: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const render = createRenderer<Props>()
    render({
      user: UserTransformer.transform({
        id: 1,
        timestamps: true,
      }),
      posts: PostsTransformer.transform([{ id: 1 }]),
      paginated: PostsTransformer.paginate([{ id: 1 }], {}),
    })
  })

  test('allow skipping optional props using transformers', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    const render = createRenderer<Props>()
    render({
      posts: PostsTransformer.transform([{ id: 1, title: 'Hello world' }]),
    })
  })

  test('allow defining optional props using transformers via deferred helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    class PostsTransformer extends BaseTransformer<{ id: number; title?: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const render = createRenderer<Props>()
    render({
      user: defer(() => {
        return UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      }),
      posts: PostsTransformer.transform([{ id: 1 }]),
      paginated: defer(() => {
        return PostsTransformer.paginate([{ id: 1 }], {})
      }),
    })
  })

  test('disallow defining required props via deferred helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    class PostsTransformer extends BaseTransformer<{ id: number; title?: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const render = createRenderer<Props>()
    render({
      user: defer(() => {
        return UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      }),
      // @ts-expect-error
      posts: defer(() => PostsTransformer.transform([{ id: 1 }])),
      paginated: defer(() => {
        return PostsTransformer.paginate([{ id: 1 }], {})
      }),
    })
  })

  test('allow defining optional props via optional helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    class PostsTransformer extends BaseTransformer<{ id: number; title?: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const render = createRenderer<Props>()
    render({
      user: optional(() => {
        return UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      }),
      posts: PostsTransformer.transform([{ id: 1 }]),
      paginated: optional(() => {
        return PostsTransformer.paginate([{ id: 1 }], {})
      }),
    })
  })

  test('disallow defining required props via optional helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    class PostsTransformer extends BaseTransformer<{ id: number; title?: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const render = createRenderer<Props>()
    render({
      user: optional(() => {
        return UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      }),
      // @ts-expect-error
      posts: optional(() => PostsTransformer.transform([{ id: 1 }])),
      paginated: optional(() => {
        return PostsTransformer.paginate([{ id: 1 }], {})
      }),
    })
  })

  test('allow defining required and optional props via always helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        metadata: {
          total: number
        }
      }
    }

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const render = createRenderer<Props>()
    render({
      user: always(
        UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      ),
      posts: always(PostsTransformer.transform([{ id: 1, title: 'Hello world' }])),
      paginated: always(
        PostsTransformer.paginate([{ id: 1, title: 'Hello world' }], {
          total: 10,
        })
      ),
    })
  })

  test('allow defining required and optional props via mergeable helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        metadata: {
          total: number
        }
      }
    }

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const render = createRenderer<Props>()
    render({
      user: merge(
        UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      ),
      posts: merge(PostsTransformer.transform([{ id: 1, title: 'Hello world' }])),
      paginated: merge(
        PostsTransformer.paginate([{ id: 1, title: 'Hello world' }], {
          total: 10,
        })
      ),
    })
  })

  test('allow defining optional props via mergeable and defer helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        metadata: {
          total: number
        }
      }
    }

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const render = createRenderer<Props>()
    render({
      user: defer(() => {
        return UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      }).merge(),
      posts: merge(PostsTransformer.transform([{ id: 1, title: 'Hello world' }])),
      paginated: defer(() => {
        return PostsTransformer.paginate([{ id: 1, title: 'Hello world' }], {
          total: 10,
        })
      }).merge(),
    })
  })

  test('disallow defining required props via mergeable and defer helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        metadata: {
          total: number
        }
      }
    }

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const render = createRenderer<Props>()
    render({
      user: defer(() => {
        return UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      }).merge(),
      // @ts-expect-error
      posts: defer(() => {
        return PostsTransformer.transform([{ id: 1, title: 'Hello world' }])
      }).merge(),
      paginated: defer(() => {
        return PostsTransformer.paginate([{ id: 1, title: 'Hello world' }], {
          total: 10,
        })
      }).merge(),
    })
  })
})

test.group('To page props | once', () => {
  test('allow defining required props via once helper', () => {
    type Props = {
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const render = createRenderer<Props>()
    render({
      user: once({ id: 1, timestamps: true }),
      posts: once(() => [{ id: 1, title: 'Hello world' }]),
      paginated: merge({
        data: [{ id: 1, title: 'Hello world' }],
        total: 10,
      }).once(),
    })
  })

  test('allow defining optional props via once + defer/optional helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const render = createRenderer<Props>()
    render({
      user: defer(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }).once(),
      posts: [{ id: 1 }],
      paginated: optional(() => {
        return {
          data: [{ id: 1 }],
        }
      }).once(),
    })
  })

  test('disallow defining required props via once + defer helper', () => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const render = createRenderer<Props>()
    render({
      user: defer(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }).once(),
      // @ts-expect-error a deferred once prop cannot satisfy a required prop
      posts: defer(() => [{ id: 1 }]).once(),
      paginated: optional(() => {
        return {
          data: [{ id: 1 }],
        }
      }).once(),
    })
  })
})

test.group('To page props | scroll', () => {
  /**
   * A minimal scroll-props provider reused across the cases below. The value
   * form (transformer paginator vs provider) does not change the AsPageProps
   * type behaviour; the paginator-inference path is type-checked in
   * `tests/scroll.spec.ts`.
   */
  const cursor = () => ({ pageName: 'page', currentPage: 1, nextPage: 2, previousPage: null })

  test('require the scroll helper for a required Scroll-marked prop', () => {
    type Props = { users: Scroll<User> }

    const render = createRenderer<Props>()
    render({
      users: scroll(() => ({ data: userRows }), cursor).matchOn('id'),
    })
  })

  test('allow the scroll helper for an optional Scroll-marked prop', () => {
    type Props = { users?: Scroll<User> }

    const render = createRenderer<Props>()
    render({
      users: scroll(() => ({ data: userRows }), cursor),
    })
  })

  test('allow a deferred scroll prop on an optional Scroll-marked prop', () => {
    type Props = { users?: Scroll<User> }

    const render = createRenderer<Props>()
    render({
      users: scroll(() => ({ data: userRows }), cursor)
        .deferred()
        .matchOn('id'),
    })
  })

  test('disallow a deferred scroll prop on a required Scroll-marked prop', () => {
    type Props = { users: Scroll<User> }

    const render = createRenderer<Props>()
    render({
      // @ts-expect-error a deferred scroll prop is absent on first load, so it cannot be required
      users: scroll(() => ({ data: userRows }), cursor).deferred(),
    })
  })

  test('disallow a plain array value for a Scroll-marked prop', () => {
    type Props = { users: Scroll<User> }

    const render = createRenderer<Props>()
    render({
      // @ts-expect-error a Scroll-marked prop must be built with scroll()
      users: userRows,
    })
  })

  test('disallow a plain { data } object for a Scroll-marked prop', () => {
    type Props = { users: Scroll<User> }

    const render = createRenderer<Props>()
    render({
      // @ts-expect-error a data-shaped object is not a scroll prop without scroll()
      users: { data: userRows },
    })
  })

  test('disallow the merge helper on a Scroll-marked prop', () => {
    type Props = { users: Scroll<User> }

    const render = createRenderer<Props>()
    render({
      // @ts-expect-error a Scroll-marked prop must use scroll(), not merge()
      users: merge(userRows),
    })
  })

  test('disallow a scroll prop whose item type does not match the marker', () => {
    type Props = { users: Scroll<User> }

    const render = createRenderer<Props>()
    render({
      // @ts-expect-error the data items are missing the `name` field
      users: scroll(() => ({ data: [{ id: 1 }] }), cursor),
    })
  })

  test('disallow the scroll helper on a prop that is not Scroll-marked', () => {
    type Props = { posts: User[] }

    const render = createRenderer<Props>()
    render({
      // @ts-expect-error a non-Scroll prop cannot be built with scroll()
      posts: scroll(() => ({ data: userRows }), cursor),
    })
  })

  test('matchOn keys follow the merged items', () => {
    // Flat arrays dedupe by an item field
    merge([{ id: 1, name: 'Jane' }]).matchOn('id')
    merge([{ id: 1, name: 'Jane' }]).matchOn('name')

    // @ts-expect-error not a field of the merged items
    merge([{ id: 1, name: 'Jane' }]).matchOn('idd')

    // Deferred merge props unwrap to their computed items
    const deferredUsers = defer(() => [{ id: 1 }]).merge()
    deferredUsers.matchOn('id')

    // @ts-expect-error not a field of the deferred items
    deferredUsers.matchOn('idd')

    // Deep merges keep free-form dotted paths: the array may sit at any depth
    deepMerge({ list: [{ id: 1 }] }).matchOn('list.id')

    // Scroll props dedupe by an item field, relative to `data`
    scroll(() => ({ data: [{ id: 1, title: 'Hello' }] }), cursor).matchOn('id')

    // @ts-expect-error not a field of the scroll items
    scroll(() => ({ data: [{ id: 1, title: 'Hello' }] }), cursor).matchOn('idd')

    // @ts-expect-error dotted paths would move the merge path itself
    scroll(() => ({ data: [{ id: 1, title: 'Hello' }] }), cursor).matchOn('nested.id')
  })
})
