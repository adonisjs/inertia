/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure'
import { stubsRoot } from './stubs/main.js'
import { Codemods } from '@adonisjs/core/ace/codemods'

const ADAPTERS = ['Vue 3', 'React', 'Svelte', 'Solid'] as const
const ADAPTERS_INFO: {
  [K in (typeof ADAPTERS)[number]]: {
    stubFolder: string
    extension: string
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
    extension: 'ts',
    dependencies: [
      { name: '@inertiajs/vue3', isDevDependency: false },
      { name: 'vue', isDevDependency: false },
      { name: '@vitejs/plugin-vue', isDevDependency: true },
    ],
    viteRegister: {
      pluginCall: 'vue()',
      importDeclarations: [{ isNamed: true, module: '@vitejs/plugin-vue', identifier: 'vue' }],
    },
  },
  'React': {
    stubFolder: 'react',
    extension: 'tsx',
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
      importDeclarations: [{ isNamed: true, module: '@vitejs/plugin-react', identifier: 'react' }],
    },
  },
  'Svelte': {
    stubFolder: 'svelte',
    extension: 'ts',
    dependencies: [
      { name: '@inertiajs/svelte', isDevDependency: false },
      { name: 'svelte', isDevDependency: false },
      { name: '@sveltejs/vite-plugin-svelte', isDevDependency: true },
    ],
    viteRegister: {
      pluginCall: 'svelte()',
      importDeclarations: [
        { isNamed: true, module: '@sveltejs/vite-plugin-svelte', identifier: 'svelte' },
      ],
    },
  },
  'Solid': {
    stubFolder: 'solid',
    extension: 'tsx',
    dependencies: [
      { name: 'solid-js', isDevDependency: false },
      { name: 'inertia-adapter-solid', isDevDependency: false },
      { name: 'vite-plugin-solid', isDevDependency: true },
    ],
    viteRegister: {
      pluginCall: 'solid()',
      importDeclarations: [{ isNamed: true, module: 'vite-plugin-solid', identifier: 'solid' }],
    },
  },
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
  const extension = adapterInfo.extension
  const stubFolder = adapterInfo.stubFolder

  await codemods.makeUsingStub(stubsRoot, 'config.stub', {})
  await codemods.makeUsingStub(stubsRoot, `${stubFolder}/root.edge.stub`, {})
  await codemods.makeUsingStub(stubsRoot, `${stubFolder}/tsconfig.json.stub`, {})
  await codemods.makeUsingStub(stubsRoot, `${stubFolder}/app.${extension}.stub`, {})

  /**
   * Update vite config
   */
  await codemods.registerVitePlugin(
    adapterInfo.viteRegister.pluginCall,
    adapterInfo.viteRegister.importDeclarations
  )

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

  command.logger.success(
    'Inertia was configured successfully. Please note that you still need to update your vite config, setup your Edge root view and others things. Read the docs for more info.'
  )
}
