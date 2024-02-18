/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { IgnitorFactory } from '@adonisjs/core/factories'
import Configure from '@adonisjs/core/commands/configure'
import { BASE_URL } from '../tests_helpers/index.js'
import { FileSystem } from '@japa/file-system'

async function setupApp() {
  console.log(BASE_URL)
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
  // ace.ui.switchMode('raw')

  return { ace, app }
}

async function setupFakeAdonisproject(fs: FileSystem) {
  await Promise.all([
    fs.create('.env', ''),
    fs.createJson('tsconfig.json', {}),
    fs.create('adonisrc.ts', `export default defineConfig({})`),
    fs.create('vite.config.ts', `export default { plugins: [] }`),
    fs.create(
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
    ),
  ])
}

test.group('Configure', (group) => {
  group.tap((t) => t.timeout(20_000))
  group.each.setup(async ({ context }) => setupFakeAdonisproject(context.fs))

  test('add provider, config file, and middleware', async ({ assert }) => {
    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('Vue 3')
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('config/inertia.ts')
    await assert.fileExists('adonisrc.ts')
    await assert.fileContains('adonisrc.ts', '@adonisjs/inertia/inertia_provider')
    await assert.fileContains('start/kernel.ts', '@adonisjs/inertia/inertia_middleware')
  })

  test('add example route', async ({ assert, fs }) => {
    await fs.createJson('tsconfig.json', { compilerOptions: {} })
    await fs.create('start/routes.ts', '')

    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('Vue 3')
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileContains('start/routes.ts', `router.get('/inertia'`)
  })

  test('skip adding example route when already defined', async ({ assert, fs }) => {
    await fs.createJson('tsconfig.json', { compilerOptions: {} })
    await fs.create('start/routes.ts', `router.get('/inertia', () => {})`)

    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('Vue 3')
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    const fileContent = await fs.contents('start/routes.ts')
    const matches = fileContent.match(/router.get\('\/inertia'/g)

    assert.isArray(matches)
    assert.lengthOf(matches!, 1)
  })
})

test.group('Frameworks', (group) => {
  group.tap((t) => t.timeout(20_000))
  group.each.setup(async ({ context }) => setupFakeAdonisproject(context.fs))

  test('Vue 3', async ({ assert, fs }) => {
    await fs.createJson('package.json', {})
    await fs.createJson('tsconfig.json', { compilerOptions: {} })

    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('Vue 3')
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('resources/app.ts')
    await assert.fileExists('resources/views/root.edge')
    await assert.fileExists('resources/tsconfig.json')
    await assert.fileContains('vite.config.ts', '@vitejs/plugin-vue')
    await assert.fileExists('resources/pages/home.vue')
  })

  test('React', async ({ assert }) => {
    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('React')
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('resources/app.tsx')
    await assert.fileExists('resources/views/root.edge')
    await assert.fileExists('resources/tsconfig.json')
    await assert.fileContains('vite.config.ts', '@vitejs/plugin-react')
    await assert.fileExists('resources/pages/home.tsx')
  })

  test('Solid', async ({ assert }) => {
    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('Solid')
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('resources/app.tsx')
    await assert.fileExists('resources/views/root.edge')
    await assert.fileExists('resources/tsconfig.json')
    await assert.fileContains('vite.config.ts', 'vite-plugin-solid')
    await assert.fileExists('resources/pages/home.tsx')
  })
})
