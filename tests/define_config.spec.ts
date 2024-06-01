/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { test } from '@japa/runner'

import { defineConfig } from '../index.js'
import { setupApp } from '../tests_helpers/index.js'
import { InferSharedProps } from '../src/types.js'

test.group('Define Config', () => {
  test('detect bundle automatically - "{$self}"')
    .with(['ssr/ssr.js', 'ssr/ssr.mjs'])
    .run(async ({ assert, fs }, filePath) => {
      const { app } = await setupApp()
      const configProvider = defineConfig({})
      await fs.create(filePath, '')

      const result = await configProvider.resolver(app)

      assert.deepEqual(result.ssr.bundle, join(app.makePath(filePath)))
    })

  test('detect ssr entrypoint automatically - "{$self}"')
    .with(['inertia/app/ssr.tsx', 'resources/ssr.ts', 'resources/ssr.tsx'])
    .run(async ({ assert, fs }, filePath) => {
      const { app } = await setupApp()
      const configProvider = defineConfig({})
      await fs.create(filePath, '')

      const result = await configProvider.resolver(app)

      assert.deepEqual(result.ssr.entrypoint, join(app.makePath(filePath)))
    })

  test('can infer shared data', async ({ expectTypeOf }) => {
    const config = defineConfig({
      sharedData: {
        foo: 'string' as const,
        bar: (ctx) => ctx.request.url(),
        bar2: () => (Math.random() ? 'string' : 1),
      },
    })

    type Props = InferSharedProps<typeof config>
    expectTypeOf<Props>().toEqualTypeOf<{
      foo: 'string'
      bar: string
      bar2: 'string' | 1
    }>()
  })

  test('doesnt create a Record<string, any> when sharedData is not defined', async ({
    expectTypeOf,
  }) => {
    const config = defineConfig({})
    type Props = InferSharedProps<typeof config>
    expectTypeOf<Props>().toEqualTypeOf<{}>()

    const props: Props = null as any

    // @ts-expect-error
    props.notExistent
  })
})
