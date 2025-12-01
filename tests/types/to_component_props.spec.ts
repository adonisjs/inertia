/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import {
  type Item,
  type Paginator,
  type Collection,
  BaseTransformer,
} from '@adonisjs/core/transformers'

import {
  type DeferProp,
  type AlwaysProp,
  type OptionalProp,
  type MergeableProp,
  type ToComponentProps,
} from '../../src/types.ts'

test.group('To component props', () => {
  test('convert page props to component props', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        total: number
      }
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        total: number
      }
    }>()
  })

  test('convert optional page props to component props', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      user:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts: { id: number; title: string }[]
      paginated:
        | {
            data: { id: number; title: string }[]
            meta: {
              total: number
            }
          }
        | undefined
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts: { id: number; title: string }[]
      paginated?:
        | {
            data: { id: number; title: string }[]
            meta: {
              total: number
            }
          }
        | undefined
    }>()
  })

  test('convert lazily evaluated page props to component props', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      user: () => Promise<{
        id: number
        timestamps: boolean
      }>
      posts: { id: number; title: string }[]
      paginated: () => Promise<{
        data: { id: number; title: string }[]
        total: number
      }>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        total: number
      }
    }>()
  })

  test('convert mergeable page props to component props', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      user: MergeableProp<{
        id: number
        timestamps: boolean
      }>
      posts: MergeableProp<{ id: number; title: string }[]>
      paginated: MergeableProp<{
        data: { id: number; title: string }[]
        total: number
      }>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        total: number
      }
    }>()
  })

  test('convert page props using transformers to component props', ({ expectTypeOf }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          title: 'Hello world',
        }
      }
    }

    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          timestamps: true,
        }
      }
    }

    type Data = ToComponentProps<{
      user: Item<UserTransformer, 1, 'toObject'>
      posts: Collection<PostsTransformer, 1, 'toObject'>
      paginated: Paginator<
        Collection<PostsTransformer, 1, 'toObject'>,
        {
          total: number
        }
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        meta: {
          total: number
        }
      }
    }>()
  })

  test('convert optional page props using transformers to component props', ({ expectTypeOf }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          title: 'Hello world',
        }
      }
    }

    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          timestamps: true,
        }
      }
    }

    type Data = ToComponentProps<{
      user: Item<UserTransformer, 1, 'toObject'> | undefined
      posts: Collection<PostsTransformer, 1, 'toObject'>
      paginated:
        | Paginator<
            Collection<PostsTransformer, 1, 'toObject'>,
            {
              total: number
            }
          >
        | undefined
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts: { id: number; title: string }[]
      paginated?:
        | {
            data: { id: number; title: string }[]
            meta: {
              total: number
            }
          }
        | undefined
    }>()
  })

  test('convert lazily evaluated page props using transformers to component props', ({
    expectTypeOf,
  }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          title: 'Hello world',
        }
      }
    }

    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          timestamps: true,
        }
      }
    }

    type Data = ToComponentProps<{
      user: () => Promise<Item<UserTransformer, 1, 'toObject'> | undefined>
      posts: Collection<PostsTransformer, 1, 'toObject'>
      paginated: () => Promise<
        | Paginator<
            Collection<PostsTransformer, 1, 'toObject'>,
            {
              total: number
            }
          >
        | undefined
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts: { id: number; title: string }[]
      paginated:
        | {
            data: { id: number; title: string }[]
            meta: {
              total: number
            }
          }
        | undefined
    }>()
  })

  test('convert mergeable page props using transformers to component props', ({ expectTypeOf }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          title: 'Hello world',
        }
      }
    }

    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          timestamps: true,
        }
      }
    }

    type Data = ToComponentProps<{
      user: MergeableProp<Item<UserTransformer, 1, 'toObject'> | undefined>
      posts: MergeableProp<Collection<PostsTransformer, 1, 'toObject'>>
      paginated: MergeableProp<
        | Paginator<
            Collection<PostsTransformer, 1, 'toObject'>,
            {
              total: number
            }
          >
        | undefined
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts: { id: number; title: string }[]
      paginated:
        | {
            data: { id: number; title: string }[]
            meta: {
              total: number
            }
          }
        | undefined
    }>()
  })
})

test.group('To component props | Deferred', () => {
  test('convert deferred page props to component props', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      user: DeferProp<{
        id: number
        timestamps: boolean
      }>
      posts: DeferProp<{ id: number; title: string }[]>
      paginated: DeferProp<{
        data: { id: number; title: string }[]
        total: number
      }>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?: {
        id: number
        timestamps: boolean
      }
      posts?: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }>()
  })

  test('convert deferred optional page props to component props', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      user: DeferProp<
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      >
      posts: { id: number; title: string }[]
      paginated: DeferProp<
        | {
            data: { id: number; title: string }[]
            total: number
          }
        | undefined
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts: { id: number; title: string }[]
      paginated?:
        | {
            data: { id: number; title: string }[]
            total: number
          }
        | undefined
    }>()
  })

  test('convert mergeable deferred page props to component props', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      user: MergeableProp<
        DeferProp<{
          id: number
          timestamps: boolean
        }>
      >
      posts: MergeableProp<DeferProp<{ id: number; title: string }[]>>
      paginated: MergeableProp<
        DeferProp<{
          data: { id: number; title: string }[]
          total: number
        }>
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?: {
        id: number
        timestamps: boolean
      }
      posts?: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }>()
  })

  test('convert deferred page props using transformers to component props', ({ expectTypeOf }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          title: 'Hello world',
        }
      }
    }

    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          timestamps: true,
        }
      }
    }

    type Data = ToComponentProps<{
      user: DeferProp<Item<UserTransformer, 1, 'toObject'>>
      posts: DeferProp<Collection<PostsTransformer, 1, 'toObject'>>
      paginated: DeferProp<
        Paginator<
          Collection<PostsTransformer, 1, 'toObject'>,
          {
            total: number
          }
        >
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?: {
        id: number
        timestamps: boolean
      }
      posts?: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        meta: {
          total: number
        }
      }
    }>()
  })

  test('convert deferred optional page props using transformers to component props', ({
    expectTypeOf,
  }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          title: 'Hello world',
        }
      }
    }

    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          timestamps: true,
        }
      }
    }

    type Data = ToComponentProps<{
      user: DeferProp<Item<UserTransformer, 1, 'toObject'> | undefined>
      posts: DeferProp<Collection<PostsTransformer, 1, 'toObject'>>
      paginated: DeferProp<
        | Paginator<
            Collection<PostsTransformer, 1, 'toObject'>,
            {
              total: number
            }
          >
        | undefined
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts?: { id: number; title: string }[]
      paginated?:
        | {
            data: { id: number; title: string }[]
            meta: {
              total: number
            }
          }
        | undefined
    }>()
  })

  test('convert mergeable deferred page props using transformers to component props', ({
    expectTypeOf,
  }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          title: 'Hello world',
        }
      }
    }

    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          timestamps: true,
        }
      }
    }

    type Data = ToComponentProps<{
      user: MergeableProp<DeferProp<Item<UserTransformer, 1, 'toObject'> | undefined>>
      posts: MergeableProp<DeferProp<Collection<PostsTransformer, 1, 'toObject'>>>
      paginated: MergeableProp<
        DeferProp<
          | Paginator<
              Collection<PostsTransformer, 1, 'toObject'>,
              {
                total: number
              }
            >
          | undefined
        >
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts?: { id: number; title: string }[]
      paginated?:
        | {
            data: { id: number; title: string }[]
            meta: {
              total: number
            }
          }
        | undefined
    }>()
  })
})

test.group('To component props | Optional', () => {
  test('convert optional page props to component props', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      user: OptionalProp<{
        id: number
        timestamps: boolean
      }>
      posts: OptionalProp<{ id: number; title: string }[]>
      paginated: OptionalProp<{
        data: { id: number; title: string }[]
        total: number
      }>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?: {
        id: number
        timestamps: boolean
      }
      posts?: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }>()
  })

  test('convert optional page props wrapped in an optional to component props', ({
    expectTypeOf,
  }) => {
    type Data = ToComponentProps<{
      user: OptionalProp<
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      >
      posts: { id: number; title: string }[]
      paginated: OptionalProp<
        | {
            data: { id: number; title: string }[]
            total: number
          }
        | undefined
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts: { id: number; title: string }[]
      paginated?:
        | {
            data: { id: number; title: string }[]
            total: number
          }
        | undefined
    }>()
  })

  test('convert mergeable optional page props to component props', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      user: MergeableProp<
        DeferProp<{
          id: number
          timestamps: boolean
        }>
      >
      posts: MergeableProp<DeferProp<{ id: number; title: string }[]>>
      paginated: MergeableProp<
        DeferProp<{
          data: { id: number; title: string }[]
          total: number
        }>
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?: {
        id: number
        timestamps: boolean
      }
      posts?: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }>()
  }).skip(true, 'Have to check if Inertia supports this')

  test('convert optional page props using transformers to component props', ({ expectTypeOf }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          title: 'Hello world',
        }
      }
    }

    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          timestamps: true,
        }
      }
    }

    type Data = ToComponentProps<{
      user: OptionalProp<Item<UserTransformer, 1, 'toObject'>>
      posts: OptionalProp<Collection<PostsTransformer, 1, 'toObject'>>
      paginated: OptionalProp<
        Paginator<
          Collection<PostsTransformer, 1, 'toObject'>,
          {
            total: number
          }
        >
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?: {
        id: number
        timestamps: boolean
      }
      posts?: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        meta: {
          total: number
        }
      }
    }>()
  })

  test('convert optional page props using transformers wrapped in an optional to component props', ({
    expectTypeOf,
  }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          title: 'Hello world',
        }
      }
    }

    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          timestamps: true,
        }
      }
    }

    type Data = ToComponentProps<{
      user: OptionalProp<Item<UserTransformer, 1, 'toObject'> | undefined>
      posts: OptionalProp<Collection<PostsTransformer, 1, 'toObject'>>
      paginated: OptionalProp<
        | Paginator<
            Collection<PostsTransformer, 1, 'toObject'>,
            {
              total: number
            }
          >
        | undefined
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts?: { id: number; title: string }[]
      paginated?:
        | {
            data: { id: number; title: string }[]
            meta: {
              total: number
            }
          }
        | undefined
    }>()
  })

  test('convert optional page props using transformers to component props', ({ expectTypeOf }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          title: 'Hello world',
        }
      }
    }

    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          timestamps: true,
        }
      }
    }

    type Data = ToComponentProps<{
      user: MergeableProp<DeferProp<Item<UserTransformer, 1, 'toObject'> | undefined>>
      posts: MergeableProp<DeferProp<Collection<PostsTransformer, 1, 'toObject'>>>
      paginated: MergeableProp<
        DeferProp<
          | Paginator<
              Collection<PostsTransformer, 1, 'toObject'>,
              {
                total: number
              }
            >
          | undefined
        >
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts?: { id: number; title: string }[]
      paginated?:
        | {
            data: { id: number; title: string }[]
            meta: {
              total: number
            }
          }
        | undefined
    }>()
  }).skip(true, 'Have to check if Inertia supports this')
})

test.group('To component props | Always', () => {
  test('convert always page props to component props', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      user: AlwaysProp<{
        id: number
        timestamps: boolean
      }>
      posts: AlwaysProp<{ id: number; title: string }[]>
      paginated: AlwaysProp<{
        data: { id: number; title: string }[]
        total: number
      }>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        total: number
      }
    }>()
  })

  test('convert always page props wrapped in an optional to component props (should be restricted via inertia.always method)', ({
    expectTypeOf,
  }) => {
    type Data = ToComponentProps<{
      user: AlwaysProp<
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      >
      posts: { id: number; title: string }[]
      paginated: AlwaysProp<
        | {
            data: { id: number; title: string }[]
            total: number
          }
        | undefined
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts: { id: number; title: string }[]
      paginated:
        | {
            data: { id: number; title: string }[]
            total: number
          }
        | undefined
    }>()
  })

  test('convert mergeable always page props to component props', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      user: MergeableProp<
        DeferProp<{
          id: number
          timestamps: boolean
        }>
      >
      posts: MergeableProp<DeferProp<{ id: number; title: string }[]>>
      paginated: MergeableProp<
        DeferProp<{
          data: { id: number; title: string }[]
          total: number
        }>
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?: {
        id: number
        timestamps: boolean
      }
      posts?: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }>()
  }).skip(true, 'Have to check if Inertia supports this')

  test('convert always page props using transformers to component props', ({ expectTypeOf }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          title: 'Hello world',
        }
      }
    }

    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          timestamps: true,
        }
      }
    }

    type Data = ToComponentProps<{
      user: AlwaysProp<Item<UserTransformer, 1, 'toObject'>>
      posts: AlwaysProp<Collection<PostsTransformer, 1, 'toObject'>>
      paginated: AlwaysProp<
        Paginator<
          Collection<PostsTransformer, 1, 'toObject'>,
          {
            total: number
          }
        >
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        meta: {
          total: number
        }
      }
    }>()
  })

  test('convert always page props using transformers wrapped in an optional to component props (should be restricted via inertia.always method)', ({
    expectTypeOf,
  }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          title: 'Hello world',
        }
      }
    }

    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          timestamps: true,
        }
      }
    }

    type Data = ToComponentProps<{
      user: AlwaysProp<Item<UserTransformer, 1, 'toObject'> | undefined>
      posts: AlwaysProp<Collection<PostsTransformer, 1, 'toObject'>>
      paginated: AlwaysProp<
        | Paginator<
            Collection<PostsTransformer, 1, 'toObject'>,
            {
              total: number
            }
          >
        | undefined
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts: { id: number; title: string }[]
      paginated:
        | {
            data: { id: number; title: string }[]
            meta: {
              total: number
            }
          }
        | undefined
    }>()
  })

  test('convert optional page props using transformers to component props', ({ expectTypeOf }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          title: 'Hello world',
        }
      }
    }

    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return {
          id: 1,
          timestamps: true,
        }
      }
    }

    type Data = ToComponentProps<{
      user: MergeableProp<DeferProp<Item<UserTransformer, 1, 'toObject'> | undefined>>
      posts: MergeableProp<DeferProp<Collection<PostsTransformer, 1, 'toObject'>>>
      paginated: MergeableProp<
        DeferProp<
          | Paginator<
              Collection<PostsTransformer, 1, 'toObject'>,
              {
                total: number
              }
            >
          | undefined
        >
      >
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?:
        | {
            id: number
            timestamps: boolean
          }
        | undefined
      posts?: { id: number; title: string }[]
      paginated?:
        | {
            data: { id: number; title: string }[]
            meta: {
              total: number
            }
          }
        | undefined
    }>()
  }).skip(true, 'Have to check if Inertia supports this')
})
