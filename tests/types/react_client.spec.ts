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
 * and checked exclusively by tests/types/tsconfig.json. The `UserRegistry`
 * augmentation comes from react.spec.ts, which is part of the same program.
 */
import { test } from '@japa/runner'

import { Form } from '../../src/client/react/form.tsx'
import { Link } from '../../src/client/react/link.tsx'

/**
 * Shared props bridge fixture. Applies to the whole client program, mirroring
 * how apps bridge middleware shared props into `@inertiajs/core`. The
 * `users/profile` page (declared in react.spec.ts) carries `appName` so the
 * omission below is observable.
 */
declare module '@inertiajs/core' {
  interface InertiaConfig {
    sharedPageProps: { appName: string }
  }
}

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

  test('shared props are carried by the runtime, not demanded from the link', () => {
    // `appName` is bridged as a shared prop, so the instant link only owes
    // the page-specific `user` prop
    Link({
      route: 'users.profile',
      routeParams: ['1'],
      component: 'users/profile',
      pageProps: { user: { id: 1 } },
    })

    Link({
      route: 'users.profile',
      routeParams: ['1'],
      component: 'users/profile',
      // @ts-expect-error shared props cannot be supplied through pageProps
      pageProps: { user: { id: 1 }, appName: 'adonis' },
    })

    Link({
      route: 'users.profile',
      routeParams: ['1'],
      component: 'users/profile',
      pageProps: (_currentProps, sharedProps) => {
        sharedProps.appName?.toUpperCase()
        // @ts-expect-error unknown shared prop
        sharedProps.unknown

        return { ...sharedProps, user: { id: 1 } }
      },
    })
  }).fails()
})
