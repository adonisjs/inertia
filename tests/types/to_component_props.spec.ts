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
  type OnceProp,
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
            metadata: {
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
            metadata: {
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
      paginated: Paginator<PostsTransformer, 1, 'toObject'>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        metadata: any
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
      paginated: Paginator<PostsTransformer, 1, 'toObject'> | undefined
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
            metadata: any
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
      paginated: () => Promise<Paginator<PostsTransformer, 1, 'toObject'> | undefined>
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
            metadata: any
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
      paginated: MergeableProp<Paginator<PostsTransformer, 1, 'toObject'> | undefined>
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
            metadata: any
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
      paginated: DeferProp<Paginator<PostsTransformer, 1, 'toObject'>>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?: {
        id: number
        timestamps: boolean
      }
      posts?: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        metadata: any
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
      paginated: DeferProp<Paginator<PostsTransformer, 1, 'toObject'> | undefined>
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
            metadata: any
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
      paginated: MergeableProp<DeferProp<Paginator<PostsTransformer, 1, 'toObject'> | undefined>>
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
            metadata: any
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
      paginated: OptionalProp<Paginator<PostsTransformer, 1, 'toObject'>>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?: {
        id: number
        timestamps: boolean
      }
      posts?: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        metadata: any
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
      paginated: OptionalProp<Paginator<PostsTransformer, 1, 'toObject'> | undefined>
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
            metadata: any
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
      paginated: MergeableProp<DeferProp<Paginator<PostsTransformer, 1, 'toObject'> | undefined>>
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
            metadata: any
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
      paginated: AlwaysProp<Paginator<PostsTransformer, 1, 'toObject'>>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        metadata: any
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
      paginated: AlwaysProp<Paginator<PostsTransformer, 1, 'toObject'> | undefined>
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
            metadata: any
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
      paginated: MergeableProp<DeferProp<Paginator<PostsTransformer, 1, 'toObject'> | undefined>>
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
            metadata: any
          }
        | undefined
    }>()
  }).skip(true, 'Have to check if Inertia supports this')
})

test.group('To component props | once', () => {
  test('a once prop wrapping a plain value is required', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      lookups: OnceProp<{ id: number; label: string }[]>
      user: OnceProp<{ id: number; timestamps: boolean }>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      lookups: { id: number; label: string }[]
      user: { id: number; timestamps: boolean }
    }>()
  })

  test('a once prop wrapping a lazy callback is required and unwrapped', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      user: OnceProp<() => Promise<{ id: number; timestamps: boolean }>>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user: { id: number; timestamps: boolean }
    }>()
  })

  test('a once prop wrapping a deferred prop is optional', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      stats: OnceProp<DeferProp<{ total: number }>>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      stats?: { total: number }
    }>()
  })

  test('a once prop wrapping an optional prop is optional', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      audit: OnceProp<OptionalProp<{ entries: string[] }>>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      audit?: { entries: string[] }
    }>()
  })

  test('a once prop wrapping a mergeable prop is required', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      feed: OnceProp<MergeableProp<{ id: number }[]>>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      feed: { id: number }[]
    }>()
  })

  test('a once prop wrapping a mergeable deferred prop is optional', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      feed: OnceProp<MergeableProp<DeferProp<{ id: number }[]>>>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      feed?: { id: number }[]
    }>()
  })

  test('a once prop wrapping a possibly-undefined value is optional', ({ expectTypeOf }) => {
    type Data = ToComponentProps<{
      user: OnceProp<{ id: number } | undefined>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?: { id: number } | undefined
    }>()
  })
})

test.group('To component props | once with transformers', () => {
  test('a once prop wrapping a transformer is required and resolved', ({ expectTypeOf }) => {
    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return { id: 1, timestamps: true }
      }
    }

    type Data = ToComponentProps<{
      user: OnceProp<Item<UserTransformer, 1, 'toObject'>>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user: { id: number; timestamps: boolean }
    }>()
  })

  test('a once prop wrapping a deferred transformer is optional', ({ expectTypeOf }) => {
    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return { id: 1, timestamps: true }
      }
    }

    type Data = ToComponentProps<{
      user: OnceProp<DeferProp<Item<UserTransformer, 1, 'toObject'>>>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user?: { id: number; timestamps: boolean }
    }>()
  })

  test('a once prop wrapping a mergeable transformer is required', ({ expectTypeOf }) => {
    class UserTransformer extends BaseTransformer<any> {
      toObject() {
        return { id: 1, timestamps: true }
      }
    }

    type Data = ToComponentProps<{
      user: OnceProp<MergeableProp<Item<UserTransformer, 1, 'toObject'>>>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      user: { id: number; timestamps: boolean }
    }>()
  })

  test('a once prop wrapping a paginator transformer resolves to data + metadata', ({
    expectTypeOf,
  }) => {
    class PostsTransformer extends BaseTransformer<any> {
      toObject() {
        return { id: 1, title: 'Hello world' }
      }
    }

    type Data = ToComponentProps<{
      posts: OnceProp<Paginator<PostsTransformer, 1, 'toObject'>>
    }>

    expectTypeOf<Data>().toEqualTypeOf<{
      posts: {
        data: { id: number; title: string }[]
        metadata: any
      }
    }>()
  })
})
