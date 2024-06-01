/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@poppinss/utils/string'
import { Codemods } from '@adonisjs/core/ace/codemods'
import type Configure from '@adonisjs/core/commands/configure'

import { stubsRoot } from './stubs/main.js'

const ADAPTERS = ['vue', 'react', 'svelte', 'solid'] as const
const ADAPTERS_INFO: {
  [K in (typeof ADAPTERS)[number]]: {
    stubFolder: string
    appExtension: string
    componentsExtension: string
    dependencies: { name: string; isDevDependency: boolean }[]
    ssrDependencies?: { name: string; isDevDependency: boolean }[]
    viteRegister: {
      pluginCall: Parameters<Codemods['registerVitePlugin']>[0]
      ssrPluginCall?: Parameters<Codemods['registerVitePlugin']>[0]
      importDeclarations: Parameters<Codemods['registerVitePlugin']>[1]
    }
    ssrEntrypoint?: string
  }
} = {
  vue: {
    stubFolder: 'vue',
    appExtension: 'ts',
    componentsExtension: 'vue',
    dependencies: [
      { name: '@inertiajs/vue3', isDevDependency: false },
      { name: 'vue', isDevDependency: false },
      { name: '@vitejs/plugin-vue', isDevDependency: true },
    ],
    ssrDependencies: [{ name: '@vue/server-renderer', isDevDependency: false }],
    viteRegister: {
      pluginCall: 'vue()',
      importDeclarations: [{ isNamed: false, module: '@vitejs/plugin-vue', identifier: 'vue' }],
    },
    ssrEntrypoint: 'inertia/app/ssr.ts',
  },
  react: {
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
    ssrEntrypoint: 'inertia/app/ssr.tsx',
  },
  svelte: {
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
      ssrPluginCall: 'svelte({ compilerOptions: { hydratable: true } })',
      importDeclarations: [
        { isNamed: true, module: '@sveltejs/vite-plugin-svelte', identifier: 'svelte' },
      ],
    },
    ssrEntrypoint: 'inertia/app/ssr.ts',
  },
  solid: {
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
      ssrPluginCall: 'solid({ ssr: true })',
      importDeclarations: [{ isNamed: false, module: 'vite-plugin-solid', identifier: 'solid' }],
    },
    ssrEntrypoint: 'inertia/app/ssr.tsx',
  },
}

/**
 * Adds the example route to the routes file
 */
async function defineExampleRoute(command: Configure, codemods: Codemods) {
  const tsMorph = await codemods.getTsMorphProject()
  const routesFile = tsMorph?.getSourceFile(command.app.makePath('./start/routes.ts'))

  if (!routesFile) {
    return command.logger.warning('Unable to find the routes file')
  }

  const action = command.logger.action('update start/routes.ts file')
  try {
    routesFile?.addStatements((writer) => {
      writer.writeLine(`router.on('/').renderInertia('home', { version: 6 })`)
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
  let adapter: keyof typeof ADAPTERS_INFO | undefined = command.parsedFlags.adapter
  let ssr: boolean | undefined = command.parsedFlags.ssr
  let shouldInstallPackages: boolean | undefined = command.parsedFlags.install
  let shouldSkipExampleRoute: boolean | undefined = command.parsedFlags['skip-example-route']

  /**
   * Prompt to select the adapter when `--adapter` flag is not passed
   */
  if (adapter === undefined) {
    adapter = await command.prompt.choice(
      'Select the Inertia adapter you want to use',
      ADAPTERS.map((adapterName) => string.capitalCase(adapterName)),
      { name: 'adapter', result: (value) => value.toLowerCase() as (typeof ADAPTERS)[number] }
    )
  }

  /**
   * Prompt to select if SSR is needed when `--ssr` flag is not passed
   */
  if (ssr === undefined) {
    ssr = await command.prompt.confirm('Do you want to use server-side rendering?', {
      name: 'ssr',
    })
  }

  /**
   * Show error when selected adapter is not supported
   */
  if (adapter! in ADAPTERS_INFO === false) {
    command.logger.error(
      `The selected adapter "${adapter}" is invalid. Select one from: ${string.sentence(
        Object.keys(ADAPTERS_INFO)
      )}`
    )
    command.exitCode = 1
    return
  }

  const adapterInfo = ADAPTERS_INFO[adapter!]
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
  await codemods.registerMiddleware('server', [
    { path: '@adonisjs/inertia/inertia_middleware', position: 'after' },
  ])

  /**
   * Publish stubs
   */
  const appExt = adapterInfo.appExtension
  const stubFolder = adapterInfo.stubFolder
  const compExt = adapterInfo.componentsExtension

  await codemods.makeUsingStub(stubsRoot, 'config.stub', {
    ssr,
    ssrEntrypoint: adapterInfo.ssrEntrypoint,
  })
  await codemods.makeUsingStub(stubsRoot, `app.css.stub`, {})
  await codemods.makeUsingStub(stubsRoot, `${stubFolder}/root.edge.stub`, {})
  await codemods.makeUsingStub(stubsRoot, `${stubFolder}/tsconfig.json.stub`, {})
  await codemods.makeUsingStub(stubsRoot, `${stubFolder}/app.${appExt}.stub`, { ssr })
  await codemods.makeUsingStub(stubsRoot, `${stubFolder}/home.${compExt}.stub`, {})
  await codemods.makeUsingStub(stubsRoot, `${stubFolder}/errors/not_found.${compExt}.stub`, {})
  await codemods.makeUsingStub(stubsRoot, `${stubFolder}/errors/server_error.${compExt}.stub`, {})

  if (ssr) {
    await codemods.makeUsingStub(stubsRoot, `${stubFolder}/ssr.${appExt}.stub`, {})
  }

  /**
   * Register the inertia plugin in vite config
   */
  const inertiaPluginCall = ssr
    ? `inertia({ ssr: { enabled: true, entrypoint: 'inertia/app/ssr.${appExt}' } })`
    : `inertia({ ssr: { enabled: false } })`

  await codemods.registerVitePlugin(inertiaPluginCall, [
    { isNamed: false, module: '@adonisjs/inertia/client', identifier: 'inertia' },
  ])

  /**
   * Register the adapter plugin in vite config
   */
  await codemods.registerVitePlugin(
    ssr && adapterInfo.viteRegister.ssrPluginCall
      ? adapterInfo.viteRegister.ssrPluginCall
      : adapterInfo.viteRegister.pluginCall,
    adapterInfo.viteRegister.importDeclarations
  )

  /**
   * Register vite with adonisjs plugin
   */
  const adonisjsPluginCall = `adonisjs({ entrypoints: ['inertia/app/app.${appExt}'], reload: ['resources/views/**/*.edge'] })`
  await codemods.registerVitePlugin(adonisjsPluginCall, [
    { isNamed: false, module: '@adonisjs/vite/client', identifier: 'adonisjs' },
  ])

  /**
   * Add route example
   */
  if (shouldSkipExampleRoute !== true) {
    await defineExampleRoute(command, codemods)
  }

  /**
   * Install packages
   */
  const pkgToInstall = adapterInfo.dependencies
  if (ssr && adapterInfo.ssrDependencies) {
    pkgToInstall.push(...adapterInfo.ssrDependencies)
  }

  /**
   * Prompt when `install` or `--no-install` flags are
   * not used
   */
  if (shouldInstallPackages === undefined) {
    shouldInstallPackages = await command.prompt.confirm(
      `Do you want to install dependencies ${pkgToInstall.map((pkg) => pkg.name).join(', ')}?`,
      { name: 'install' }
    )
  }

  if (shouldInstallPackages) {
    await codemods.installPackages(pkgToInstall)
  } else {
    await codemods.listPackagesToInstall(pkgToInstall)
  }
}
