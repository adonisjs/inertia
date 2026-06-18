/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { type HttpContext } from '@adonisjs/core/http'
import { BaseTransformer } from '@adonisjs/core/transformers'

import { type InferFlashData, type InferSharedProps } from '../../src/types.ts'
import BaseInertiaMiddleware from '../../src/inertia_middleware.ts'

test.group('Infer shared props', () => {
  test('infer shared props from Inertia middleware', ({ expectTypeOf }) => {
    class User {
      declare id: number
      declare timestamps: boolean
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return this.pick(this.resource, ['id', 'timestamps'])
      }
    }

    class InertiaMiddleware extends BaseInertiaMiddleware {
      share(ctx: HttpContext) {
        return {
          errors: this.getValidationErrors(ctx),
          user: UserTransformer.transform(new User()),
        }
      }
    }

    type SharedProps = InferSharedProps<InertiaMiddleware>
    expectTypeOf<SharedProps>().toEqualTypeOf<{
      errors:
        | Record<string, string>
        | {
            [errorBag: string]: Record<string, string>
          }
      user: { id: number; timestamps: boolean }
    }>()
  })

  test('infer shared props using helpers from Inertia middleware', ({ expectTypeOf }) => {
    class User {
      declare id: number
      declare timestamps: boolean
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return this.pick(this.resource, ['id', 'timestamps'])
      }
    }

    class InertiaMiddleware extends BaseInertiaMiddleware {
      share(ctx: HttpContext) {
        return {
          errors: ctx.inertia.always(this.getValidationErrors(ctx)),
          user: ctx.inertia.optional(() => UserTransformer.transform(new User())),
        }
      }
    }

    type SharedProps = InferSharedProps<InertiaMiddleware>
    expectTypeOf<SharedProps>().toEqualTypeOf<{
      errors:
        | Record<string, string>
        | {
            [errorBag: string]: Record<string, string>
          }
      user?: { id: number; timestamps: boolean }
    }>()
  })
})

test.group('Infer flash data', () => {
  test('infer flash data from the middleware flash method', ({ expectTypeOf }) => {
    class InertiaMiddleware extends BaseInertiaMiddleware {
      share() {
        return {}
      }

      flash(_ctx: HttpContext) {
        return {
          success: 'Saved' as string | undefined,
          newUserId: 42 as number | undefined,
        }
      }
    }

    type FlashData = InferFlashData<InertiaMiddleware>
    expectTypeOf<FlashData>().toEqualTypeOf<{
      success: string | undefined
      newUserId: number | undefined
    }>()
  })

  test('infer flash data from an async flash method', ({ expectTypeOf }) => {
    class InertiaMiddleware extends BaseInertiaMiddleware {
      share() {
        return {}
      }

      async flash(_ctx: HttpContext) {
        return { message: 'Welcome' as string | undefined }
      }
    }

    type FlashData = InferFlashData<InertiaMiddleware>
    expectTypeOf<FlashData>().toEqualTypeOf<{ message: string | undefined }>()
  })

  test('resolve to never when the middleware has no flash method', ({ expectTypeOf }) => {
    class InertiaMiddleware extends BaseInertiaMiddleware {
      share() {
        return {}
      }
    }

    type FlashData = InferFlashData<InertiaMiddleware>
    expectTypeOf<FlashData>().toEqualTypeOf<never>()
  })
})
