/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure'
import { Codemods } from '@adonisjs/core/ace/codemods'

import { stubsRoot } from './stubs/main.js'

const ADAPTERS = ['Vue 3', 'React', 'Svelte', 'Solid'] as const
const ADAPTERS_INFO: {
  [K in (typeof ADAPTERS)[number]]: {
    stubFolder: string
    appExtension: string
    componentsExtension: string
    dependencies: { name: string; isDevDependency: boolean }[]
    ssrDependencies?: { name: string; isDevDependency: boolean }[]
    viteRegister: {
      pluginCall: Parameters<Codemods['registerVitePlugin']>[0]
      importDeclarations: Parameters<Codemods['registerVitePlugin']>[1]
    }
  }
} = {
  'Vue 3': {
    stubFolder: 'vue',
    appExtension: 'ts',
    componentsExtension: 'vue',
    dependencies: [
      { name: '@inertiajs/vue3', isDevDependency: false },
      { name: 'vue', isDevDependency: false },
      { name: '@vitejs/plugin-vue', isDevDependency: true },
    ],
    viteRegister: {
      pluginCall: 'vue()',
      importDeclarations: [{ isNamed: false, module: '@vitejs/plugin-vue', identifier: 'vue' }],
    },
  },
  'React': {
    stubFolder: 'react',
    appExtension: 'tsx',
    componentsExtension: 'tsx',
    dependencies: [
      { name: '@inertiajs/react', isDevDependency: false },
      { name: 'react', isDevDependency: false },
      { name: 'react-dom', isDevDependency: false },
      { name: '@vitejs/plugin-react', isDevDependency: true },
      { name: '@types/react', isDevDependency: true },
      { name: '@types/react-dom', isDevDependency: true },
    ],
    viteRegister: {
      pluginCall: 'react()',
      importDeclarations: [{ isNamed: false, module: '@vitejs/plugin-react', identifier: 'react' }],
    },
  },
  'Svelte': {
    stubFolder: 'svelte',
    appExtension: 'ts',
    componentsExtension: 'svelte',
    dependencies: [
      { name: '@inertiajs/svelte', isDevDependency: false },
      { name: 'svelte', isDevDependency: false },
      { name: '@sveltejs/vite-plugin-svelte', isDevDependency: true },
    ],
    viteRegister: {
      pluginCall: 'svelte()',
      importDeclarations: [
        { isNamed: false, module: '@sveltejs/vite-plugin-svelte', identifier: 'svelte' },
      ],
    },
  },
  'Solid': {
    stubFolder: 'solid',
    appExtension: 'tsx',
    componentsExtension: 'tsx',
    dependencies: [
      { name: 'solid-js', isDevDependency: false },
      { name: 'inertia-adapter-solid', isDevDependency: false },
      { name: 'vite-plugin-solid', isDevDependency: true },
      { name: '@solidjs/meta', isDevDependency: false },
    ],
    viteRegister: {
      pluginCall: 'solid()',
      importDeclarations: [{ isNamed: false, module: 'vite-plugin-solid', identifier: 'solid' }],
    },
  },
}

/**
 * Adds the /inertia route to the routes file
 */
async function defineExampleRoute(command: Configure, codemods: Codemods) {
  const tsMorph = await codemods.getTsMorphProject()
  const routesFile = tsMorph?.getSourceFile(command.app.makePath('./start/routes.ts'))

  if (!routesFile) {
    return command.logger.warning('Unable to find the routes file')
  }

  const isAlreadyDefined = routesFile.getText().includes('/inertia')
  if (isAlreadyDefined) {
    command.logger.warning('/inertia route is already defined. Skipping')
    return
  }

  const action = command.logger.action('update start/routes.ts file')
  try {
    routesFile?.addStatements((writer) => {
      writer.writeLine(
        `router.get('/inertia', ({ inertia }) => inertia.render('home', { version: 6 }))`
      )
    })

    await tsMorph?.save()
    action.succeeded()
  } catch (error) {
    codemods.emit('error', error)
    action.failed(error.message)
  }
}

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  /**
   * Prompt for adapter
   */
  const adapter = await command.prompt.choice(
    'Select the Inertia adapter you want to use',
    ADAPTERS,
    { name: 'adapter' }
  )

  const adapterInfo = ADAPTERS_INFO[adapter]
  const codemods = await command.createCodemods()

  /**
   * Publish provider
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@adonisjs/inertia/inertia_provider')
  })

  /**
   * Add Inertia middleware
   */
  await codemods.registerMiddleware('router', [
    { path: '@adonisjs/inertia/inertia_middleware', position: 'after' },
  ])

  /**
   * Publish stubs
   */
  const appExt = adapterInfo.appExtension
  const stubFolder = adapterInfo.stubFolder
  const compExt = adapterInfo.componentsExtension

  await codemods.makeUsingStub(stubsRoot, 'config.stub', {})
  await codemods.makeUsingStub(stubsRoot, `app.css.stub`, {})
  await codemods.makeUsingStub(stubsRoot, `${stubFolder}/root.edge.stub`, {})
  await codemods.makeUsingStub(stubsRoot, `${stubFolder}/tsconfig.json.stub`, {})
  await codemods.makeUsingStub(stubsRoot, `${stubFolder}/app.${appExt}.stub`, {})
  await codemods.makeUsingStub(stubsRoot, `${stubFolder}/home.${compExt}.stub`, {})

  /**
   * Update vite config
   */
  await codemods.registerVitePlugin(
    adapterInfo.viteRegister.pluginCall,
    adapterInfo.viteRegister.importDeclarations
  )

  /**
   * Add route example
   */
  defineExampleRoute(command, codemods)

  /**
   * Install packages
   */
  const pkgToInstall = adapterInfo.dependencies
  const shouldInstallPackages = await command.prompt.confirm(
    `Do you want to install dependencies ${pkgToInstall.map((pkg) => pkg.name).join(', ')}?`,
    { name: 'install' }
  )

  if (shouldInstallPackages) {
    await codemods.installPackages(pkgToInstall)
  } else {
    await codemods.listPackagesToInstall(pkgToInstall)
  }

  command.logger.success('Inertia configured')
}
