/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Type assertions that hold only when the upstream Inertia client types
 * resolve. This file is excluded from the package tsconfig (NodeNext, where
 * the upstream ESM declaration files do not resolve and degrade to `any`)
 * and checked exclusively by tsconfig.client.json. The `UserRegistry`
 * augmentation comes from react.spec.ts, which is part of the same program.
 */
import { test } from '@japa/runner'

import { Form } from '../../src/client/react/form.tsx'

test.group('React | Typings | Client resolution only', () => {
  test('route mode rejects fields outside the route body', () => {
    Form({
      route: 'users.store',
      children: (slot) => {
        slot.errors.email
        slot.errors.remember

        // @ts-expect-error unknown route body field
        slot.errors.unknownField
        return null
      },
    })
  }).fails()

  test('action mode rejects unknown error fields on a typed form', () => {
    Form<{ email: string }>({
      action: { url: '/users', method: 'post' },
      children: (slot) => {
        slot.errors.email

        // @ts-expect-error unknown field on a typed form
        slot.errors.unknownField
        return null
      },
    })
  }).fails()
})
