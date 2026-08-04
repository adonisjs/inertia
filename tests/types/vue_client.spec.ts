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
 * augmentation comes from vue.spec.ts, which is part of the same program.
 */
import { test } from '@japa/runner'

import { Link } from '../../src/client/vue/link.ts'
import { Form } from '../../src/client/vue/form.ts'

test.group('Vue | Typings | Client resolution only', () => {
  test('wrappers typecheck the upstream props surface', () => {
    // Upstream props are typed on the wrapper. The components are invoked
    // directly (rather than through h()) so object literals keep their
    // freshness and excess property checks fire.
    Link({ route: 'users.index', preserveScroll: true })
    Form({ route: 'users.index', disableWhileProcessing: true })

    // href accepts the UrlMethodPair form
    Link({ href: { url: '/logout', method: 'post' } })

    // @ts-expect-error typo in an upstream prop is rejected
    Link({ route: 'users.index', preserveScrol: true })

    // @ts-expect-error wrong value type for an upstream prop
    Form({ route: 'users.index', errorBag: 42 })

    // @ts-expect-error unknown route
    Link({ route: 'unknown' })
  }).fails()
})
