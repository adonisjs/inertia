/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure'

const ADAPTERS = ['Vue 3', 'React', 'Svelte'] as const
const ADAPTERS_INFO: {
  [K in (typeof ADAPTERS)[number]]: {
    dependencies: {
      name: string
      isDevDependency: boolean
    }[]
    ssrDependencies?: {
      name: string
      isDevDependency: boolean
    }[]
  }
} = {
  'Vue 3': {
    dependencies: [
      { name: '@inertiajs/vue3', isDevDependency: false },
      { name: 'vue', isDevDependency: false },
      { name: '@vitejs/plugin-vue', isDevDependency: true },
    ],
  },
  'React': {
    dependencies: [
      { name: '@inertiajs/inertia-react', isDevDependency: false },
      { name: 'react', isDevDependency: false },
      { name: 'react-dom', isDevDependency: false },
      { name: '@vitejs/plugin-react', isDevDependency: true },
      { name: '@types/react', isDevDependency: true },
      { name: '@types/react-dom', isDevDependency: true },
    ],
  },
  'Svelte': {
    dependencies: [
      { name: '@inertiajs/inertia-svelte', isDevDependency: false },
      { name: 'svelte', isDevDependency: false },
      { name: '@sveltejs/vite-plugin-svelte', isDevDependency: true },
    ],
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
  const pkgToInstall = ADAPTERS_INFO[adapter].dependencies

  /**
   * Prompt for SSR
   */
  const withSsr = await command.prompt.confirm('Do you want to enable server-side rendering?', {
    name: 'ssr',
  })

  if (withSsr) {
    pkgToInstall.push(...(ADAPTERS_INFO[adapter].ssrDependencies || []))
  }

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
  codemods.registerMiddleware('router', [
    { path: '@adonisjs/inertia/inertia_middleware', position: 'after' },
  ])

  /**
   * Publish config
   */
  await command.publishStub('config.stub')

  /**
   * Install packages
   */
  const shouldInstallPackages = await command.prompt.confirm(
    `Do you want to install dependencies ${pkgToInstall.map((pkg) => pkg.name).join(', ')}?`,
    { name: 'install' }
  )

  if (shouldInstallPackages) {
    command.installPackages(pkgToInstall)
  } else {
    command.listPackagesToInstall(pkgToInstall)
  }

  command.logger.success(
    'Inertia was configured successfully. Please note that you still need to update your vite config, setup your Edge root view and others things. Read the docs for more info.'
  )
}
