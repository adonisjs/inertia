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

import { type AsPageProps } from '../../src/types.ts'
import { always, defer, merge, optional } from '../../src/props.ts'

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
