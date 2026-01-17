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
  type OnceProp,
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

test.group('To component props | Once with Transformers', () => {
  test('convert once page props using transformers to component props', ({ expectTypeOf }) => {
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
      user: OnceProp<Item<UserTransformer, 1, 'toObject'>>
      posts: OnceProp<Collection<PostsTransformer, 1, 'toObject'>>
      paginated: OnceProp<Paginator<PostsTransformer, 1, 'toObject'>>
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

  test('convert once page props wrapping deferred with transformers to component props', ({
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
      user: OnceProp<DeferProp<Item<UserTransformer, 1, 'toObject'>>>
      posts: OnceProp<DeferProp<Collection<PostsTransformer, 1, 'toObject'>>>
      paginated: OnceProp<DeferProp<Paginator<PostsTransformer, 1, 'toObject'>>>
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

  test('convert once page props wrapping optional with transformers to component props', ({
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
      user: OnceProp<OptionalProp<Item<UserTransformer, 1, 'toObject'>>>
      posts: OnceProp<OptionalProp<Collection<PostsTransformer, 1, 'toObject'>>>
      paginated: OnceProp<OptionalProp<Paginator<PostsTransformer, 1, 'toObject'>>>
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

  test('convert once page props wrapping mergeable with transformers to component props', ({
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
      user: OnceProp<MergeableProp<Item<UserTransformer, 1, 'toObject'>>>
      posts: OnceProp<MergeableProp<Collection<PostsTransformer, 1, 'toObject'>>>
      paginated: OnceProp<MergeableProp<Paginator<PostsTransformer, 1, 'toObject'>>>
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

  test('convert once page props wrapping mergeable deferred with transformers to component props', ({
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
      user: OnceProp<MergeableProp<DeferProp<Item<UserTransformer, 1, 'toObject'>>>>
      posts: OnceProp<MergeableProp<DeferProp<Collection<PostsTransformer, 1, 'toObject'>>>>
      paginated: OnceProp<MergeableProp<DeferProp<Paginator<PostsTransformer, 1, 'toObject'>>>>
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
})
