/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { fileURLToPath } from 'node:url'
import { IgnitorFactory } from '@adonisjs/core/factories'
import Configure from '@adonisjs/core/commands/configure'

const BASE_URL = new URL('./tmp/', import.meta.url)

async function setupApp() {
  const ignitor = new IgnitorFactory()
    .withCoreProviders()
    .withCoreConfig()
    .create(BASE_URL, {
      importer: (filePath) => {
        if (filePath.startsWith('./') || filePath.startsWith('../')) {
          return import(new URL(filePath, BASE_URL).href)
        }

        return import(filePath)
      },
    })

  const app = ignitor.createApp('web')
  await app.init().then(() => app.boot())

  const ace = await app.container.make('ace')
  ace.ui.switchMode('raw')

  return { ace, app }
}

test.group('Configure', (group) => {
  group.tap((t) => t.timeout(20_000))

  group.each.setup(async ({ context }) => {
    context.fs.baseUrl = BASE_URL
    context.fs.basePath = fileURLToPath(BASE_URL)

    await context.fs.create('.env', '')
    await context.fs.createJson('tsconfig.json', {})
    await context.fs.create('adonisrc.ts', `export default defineConfig({})`)
    await context.fs.create(
      'start/kernel.ts',
      `
      import router from '@adonisjs/core/services/router'
      import server from '@adonisjs/core/services/server'

      router.use([
        () => import('@adonisjs/core/bodyparser_middleware'),
        () => import('@adonisjs/session/session_middleware'),
        () => import('@adonisjs/shield/shield_middleware'),
        () => import('@adonisjs/auth/initialize_auth_middleware'),
      ])
    `
    )
  })

  test('add provider, config file, and middleware', async ({ assert }) => {
    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('Vue 3')
    ace.prompt.trap('ssr').reject()
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('config/inertia.ts')
    await assert.fileExists('adonisrc.ts')
    await assert.fileContains('adonisrc.ts', '@adonisjs/inertia/inertia_provider')
    await assert.fileContains('start/kernel.ts', '@adonisjs/inertia/inertia_middleware')
  })
})
