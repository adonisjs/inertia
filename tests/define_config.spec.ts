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
import { slash } from '@poppinss/utils'

import { defineConfig } from '../index.js'
import { setupApp } from '../tests_helpers/index.js'

test.group('Define Config', () => {
  test('detect entrypoint automatically - "{$self}"')
    .with(['resources/application/app.tsx', 'resources/app.ts', 'resources/app.tsx'])
    .run(async ({ assert, fs }, filePath) => {
      const { app } = await setupApp()
      const configProvider = defineConfig({})
      await fs.create(filePath, '')

      const result = await configProvider.resolver(app)

      assert.deepEqual(result.entrypoint, slash(join(app.makePath(filePath))))
    })

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
    .with(['resources/application/ssr.tsx', 'resources/ssr.ts', 'resources/ssr.tsx'])
    .run(async ({ assert, fs }, filePath) => {
      const { app } = await setupApp()
      const configProvider = defineConfig({})
      await fs.create(filePath, '')

      const result = await configProvider.resolver(app)

      assert.deepEqual(result.ssr.entrypoint, join(app.makePath(filePath)))
    })
})
