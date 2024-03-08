/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { FileSystem } from '@japa/file-system'
import Configure from '@adonisjs/core/commands/configure'

import { setupApp } from '../tests_helpers/index.js'

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
      ])

      server.use([])
    `
    ),
  ])
}

test.group('Configure', (group) => {
  group.tap((t) => t.timeout(20_000))
  group.each.setup(async ({ context }) => setupFakeAdonisproject(context.fs))

  test('add provider, config file, and middleware', async ({ assert }) => {
    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('vue')
    ace.prompt.trap('ssr').reject()
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

    ace.prompt.trap('adapter').replyWith('vue')
    ace.prompt.trap('ssr').reject()
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileContains('start/routes.ts', `router.on('/inertia'`)
  })

  test('skip adding example route when already defined', async ({ assert, fs }) => {
    await fs.createJson('tsconfig.json', { compilerOptions: {} })
    await fs.create('start/routes.ts', `router.get('/inertia', () => {})`)

    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('vue')
    ace.prompt.trap('ssr').reject()
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

  test('vue', async ({ assert, fs }) => {
    await fs.createJson('package.json', {})
    await fs.createJson('tsconfig.json', { compilerOptions: {} })

    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('vue')
    ace.prompt.trap('ssr').reject()
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('inertia/app/app.ts')
    await assert.fileExists('resources/views/root.edge')
    await assert.fileExists('inertia/tsconfig.json')
    await assert.fileExists('inertia/pages/home.vue')
    await assert.fileContains('inertia/app/app.ts', 'createApp')

    const viteConfig = await fs.contents('vite.config.ts')
    assert.snapshot(viteConfig).matchInline(`
      "import inertia from '@adonisjs/inertia/client'
      import vue from '@vitejs/plugin-vue'
      import adonisjs from '@adonisjs/vite/client'

      export default { plugins: [inertia({ ssr: { enabled: false } }), vue(), adonisjs({ entrypoints: ['inertia/app/app.ts'], reload: ['resources/views/**/*.edge'] })] }
      "
    `)
  })

  test('React', async ({ assert, fs }) => {
    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('react')
    ace.prompt.trap('ssr').reject()
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('inertia/app/app.tsx')
    await assert.fileExists('resources/views/root.edge')
    await assert.fileExists('inertia/tsconfig.json')
    await assert.fileExists('inertia/pages/home.tsx')
    await assert.fileContains('inertia/app/app.tsx', 'createRoot')

    const viteConfig = await fs.contents('vite.config.ts')
    assert.snapshot(viteConfig).matchInline(`
      "import inertia from '@adonisjs/inertia/client'
      import react from '@vitejs/plugin-react'
      import adonisjs from '@adonisjs/vite/client'

      export default { plugins: [inertia({ ssr: { enabled: false } }), react(), adonisjs({ entrypoints: ['inertia/app/app.tsx'], reload: ['resources/views/**/*.edge'] })] }
      "
    `)
  })

  test('Solid', async ({ assert, fs }) => {
    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('solid')
    ace.prompt.trap('ssr').reject()
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('inertia/app/app.tsx')
    await assert.fileExists('resources/views/root.edge')
    await assert.fileExists('inertia/tsconfig.json')
    await assert.fileExists('inertia/pages/home.tsx')
    await assert.fileNotContains('inertia/app/app.tsx', 'hydrateRoot')

    const viteConfig = await fs.contents('vite.config.ts')
    assert.snapshot(viteConfig).matchInline(`
      "import inertia from '@adonisjs/inertia/client'
      import solid from 'vite-plugin-solid'
      import adonisjs from '@adonisjs/vite/client'

      export default { plugins: [inertia({ ssr: { enabled: false } }), solid(), adonisjs({ entrypoints: ['inertia/app/app.tsx'], reload: ['resources/views/**/*.edge'] })] }
      "
    `)
  })

  test('Svelte', async ({ assert, fs }) => {
    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('svelte')
    ace.prompt.trap('ssr').reject()
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('inertia/app/app.ts')
    await assert.fileExists('resources/views/root.edge')
    await assert.fileExists('inertia/tsconfig.json')
    await assert.fileExists('inertia/pages/home.svelte')
    await assert.fileNotContains('inertia/app/app.ts', 'hydrate')

    const viteConfig = await fs.contents('vite.config.ts')
    assert.snapshot(viteConfig).matchInline(`
      "import inertia from '@adonisjs/inertia/client'
      import { svelte } from '@sveltejs/vite-plugin-svelte'
      import adonisjs from '@adonisjs/vite/client'

      export default { plugins: [inertia({ ssr: { enabled: false } }), svelte(), adonisjs({ entrypoints: ['inertia/app/app.ts'], reload: ['resources/views/**/*.edge'] })] }
      "
    `)
  })
})

test.group('Frameworks | SSR', (group) => {
  group.tap((t) => t.timeout(20_000))
  group.each.setup(async ({ context }) => setupFakeAdonisproject(context.fs))

  test('vue', async ({ assert, fs }) => {
    await fs.createJson('package.json', {})
    await fs.createJson('tsconfig.json', { compilerOptions: {} })

    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('vue')
    ace.prompt.trap('ssr').accept()
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('inertia/app/ssr.ts')
    await assert.fileContains('vite.config.ts', 'inertia({ ssr: { enabled: true')
    const inertiaConfig = await fs.contents('config/inertia.ts')
    assert.snapshot(inertiaConfig).matchInline(`
      "import { defineConfig } from '@adonisjs/inertia'

      export default defineConfig({
        /**
         * Path to the Edge view that will be used as the root view for Inertia responses
         */
        rootView: 'root',

        /**
         * Data that should be shared with all rendered pages
         */
        sharedData: {
          errors: (ctx) => ctx.session?.flashMessages.get('errors'),
        },

        /**
         * Options for the server-side rendering
         */
        ssr: {
          enabled: true,
          entrypoint: 'inertia/app/ssr.ts'
        }
      })"
    `)
  })

  test('React', async ({ assert, fs }) => {
    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('react')
    ace.prompt.trap('ssr').accept()
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('inertia/app/app.tsx')
    await assert.fileContains(
      'vite.config.ts',
      `inertia({ ssr: { enabled: true, entrypoint: 'inertia/app/ssr.tsx' } })`
    )
    await assert.fileContains('inertia/app/app.tsx', 'hydrateRoot')

    const inertiaConfig = await fs.contents('config/inertia.ts')

    assert.snapshot(inertiaConfig).matchInline(`
      "import { defineConfig } from '@adonisjs/inertia'

      export default defineConfig({
        /**
         * Path to the Edge view that will be used as the root view for Inertia responses
         */
        rootView: 'root',

        /**
         * Data that should be shared with all rendered pages
         */
        sharedData: {
          errors: (ctx) => ctx.session?.flashMessages.get('errors'),
        },

        /**
         * Options for the server-side rendering
         */
        ssr: {
          enabled: true,
          entrypoint: 'inertia/app/ssr.tsx'
        }
      })"
    `)
  })

  test('Solid', async ({ assert, fs }) => {
    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('solid')
    ace.prompt.trap('ssr').accept()
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()
    await assert.fileExists('inertia/app/app.tsx')
    await assert.fileContains(
      'vite.config.ts',
      `inertia({ ssr: { enabled: true, entrypoint: 'inertia/app/ssr.tsx' } })`
    )

    await assert.fileContains('vite.config.ts', `solid({ ssr: true })`)
    await assert.fileContains('inertia/app/app.tsx', 'hydrate')

    const inertiaConfig = await fs.contents('config/inertia.ts')
    assert.snapshot(inertiaConfig).matchInline(`
      "import { defineConfig } from '@adonisjs/inertia'

      export default defineConfig({
        /**
         * Path to the Edge view that will be used as the root view for Inertia responses
         */
        rootView: 'root',

        /**
         * Data that should be shared with all rendered pages
         */
        sharedData: {
          errors: (ctx) => ctx.session?.flashMessages.get('errors'),
        },

        /**
         * Options for the server-side rendering
         */
        ssr: {
          enabled: true,
          entrypoint: 'inertia/app/ssr.tsx'
        }
      })"
    `)
  })

  test('Svelte', async ({ assert, fs }) => {
    const { ace } = await setupApp()

    ace.prompt.trap('adapter').replyWith('svelte')
    ace.prompt.trap('ssr').accept()
    ace.prompt.trap('install').reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('inertia/app/app.ts')
    await assert.fileExists('resources/views/root.edge')
    await assert.fileExists('inertia/tsconfig.json')
    await assert.fileExists('inertia/pages/home.svelte')
    await assert.fileContains('inertia/app/app.ts', 'hydrate')

    const viteConfig = await fs.contents('vite.config.ts')
    assert.snapshot(viteConfig).matchInline(`
      "import inertia from '@adonisjs/inertia/client'
      import { svelte } from '@sveltejs/vite-plugin-svelte'
      import adonisjs from '@adonisjs/vite/client'

      export default { plugins: [inertia({ ssr: { enabled: true, entrypoint: 'inertia/app/ssr.ts' } }), svelte({ compilerOptions: { hydratable: true } }), adonisjs({ entrypoints: ['inertia/app/app.ts'], reload: ['resources/views/**/*.edge'] })] }
      "
    `)
  })
})
