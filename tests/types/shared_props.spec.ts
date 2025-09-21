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

import { type InferSharedProps } from '../../src/types.ts'
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
