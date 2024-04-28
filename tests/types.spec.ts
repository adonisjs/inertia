/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { InferPageProps } from '../src/types.js'
import { InertiaFactory } from '../factories/inertia_factory.js'

test.group('Types', () => {
  test('assign interface to render', async () => {
    const inertia = await new InertiaFactory().create()

    interface MyRouteResponse {
      foo: string
    }

    inertia.render<MyRouteResponse>('foo', null as any).catch(() => {})
  })

  test('no ts error if generic is not passed', async () => {
    const inertia = await new InertiaFactory().create()

    inertia.render('foo', { foo: 1 }).catch(() => {})
  })

  test('ts error if page props doesnt match generic', async () => {
    const inertia = await new InertiaFactory().create()

    interface MyRouteResponse {
      foo: string
    }

    // @ts-expect-error props doesn't match generic
    inertia.render<MyRouteResponse>('foo', { foo: 1 }).catch(() => {})
  })

  test('ts error if view props doesnt match generic', async () => {
    const inertia = await new InertiaFactory().create()

    interface MyViewProps {
      metaTitle: string
    }

    // @ts-expect-error props doesn't match generic
    inertia.render<any, MyViewProps>('foo', { foo: 1 }, { foo: 32 }).catch(() => {})
  })

  test('able to extract PageProps from inertia.render', async ({ expectTypeOf }) => {
    const inertia = await new InertiaFactory().create()

    class Controller {
      index() {
        return inertia.render('foo', { foo: 1 })
      }
    }

    type SentProps = Exclude<Awaited<ReturnType<Controller['index']>>, string>['props']
    expectTypeOf<SentProps>().toEqualTypeOf<{ foo: number }>()
  })

  test('InferPageProps helper', async ({ expectTypeOf }) => {
    const inertia = await new InertiaFactory().create()

    class Controller {
      index() {
        return inertia.render('foo', { foo: 1 })
      }
    }

    expectTypeOf<InferPageProps<Controller, 'index'>>().toEqualTypeOf<{ foo: number }>()
  })

  test('InferPageProps should serialize props', async ({ expectTypeOf }) => {
    const inertia = await new InertiaFactory().create()

    class Controller {
      index() {
        return inertia.render('foo', { foo: new Date() })
      }
    }

    expectTypeOf<InferPageProps<Controller, 'index'>>().toEqualTypeOf<{ foo: string }>()
  })

  test('InferPageProps with lazy props', async ({ expectTypeOf }) => {
    const inertia = await new InertiaFactory().create()

    class Controller {
      index() {
        return inertia.render('foo', {
          bar: inertia.lazy(() => 'bar'),
          foo: inertia.lazy(() => new Date()),
          bar2: 'bar2',
        })
      }

      edit() {
        return inertia.render('foo', {
          bar: inertia.lazy(() => 'bar'),
        })
      }
    }

    expectTypeOf<InferPageProps<Controller, 'index'>>().toEqualTypeOf<{
      bar?: string
      foo?: string
      bar2: string
    }>()

    expectTypeOf<InferPageProps<Controller, 'edit'>>().toEqualTypeOf<{
      bar?: string
    }>()
  })

  test('InferPageProps with empty props', async ({ expectTypeOf }) => {
    const inertia = await new InertiaFactory().create()

    class Controller {
      index() {
        return inertia.render('foo')
      }
    }

    type Props = InferPageProps<Controller, 'index'>
    expectTypeOf<Props>().toEqualTypeOf<{}>()
  })
})
