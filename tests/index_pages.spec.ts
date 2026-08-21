/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Kernel } from '@adonisjs/core/ace'
import stringHelpers from '@adonisjs/core/helpers/string'
import { IndexGenerator } from '@adonisjs/assembler/index_generator'

import { indexPages } from '../src/index_pages.ts'

test.group('Index pages', () => {
  test('index vue pages', async ({ assert, fs }) => {
    const cliUi = Kernel.create().ui
    cliUi.switchMode('raw')

    await fs.create('inertia/pages/users/index.vue', '')
    await fs.create('inertia/pages/users/create.vue', '')
    await fs.create('inertia/pages/home.vue', '')

    const generator = new IndexGenerator(stringHelpers.toUnixSlash(fs.basePath), cliUi.logger)
    const indexer = indexPages({
      framework: 'vue3',
    })

    indexer.run({} as any, {} as any, generator)
    await generator.generate()

    await assert.fileExists('.adonisjs/server/pages.d.ts')
    await assert.fileContains('.adonisjs/server/pages.d.ts', [
      `import type { VNodeProps, AllowedComponentProps, ComponentInstance } from 'vue'`,
      `type ExtractProps<T>`,
      `declare module '@adonisjs/inertia/types' {`,
      `export interface InertiaPages {`,
      `'home': ExtractProps<(typeof import('../../inertia/pages/home.vue'))['default']>`,
      `'users/create': ExtractProps<(typeof import('../../inertia/pages/users/create.vue'))['default']>`,
      `'users/index': ExtractProps<(typeof import('../../inertia/pages/users/index.vue'))['default']>`,
      ``,
    ])
    console.log(cliUi.logger.getLogs())
    assert.isDefined(
      cliUi.logger.getLogs().find(({ message }) => message.includes('codegen: created 1 file(s)'))
    )
  })

  test('index custom vue pages source', async ({ assert, fs }) => {
    const cliUi = Kernel.create().ui
    cliUi.switchMode('raw')

    await fs.create('resources/js/pages/users/index.vue', '')
    await fs.create('resources/js/pages/users/create.vue', '')
    await fs.create('resources/js/pages/home.vue', '')

    const generator = new IndexGenerator(stringHelpers.toUnixSlash(fs.basePath), cliUi.logger)
    const indexer = indexPages({
      framework: 'vue3',
      source: 'resources/js/pages',
    })

    indexer.run({} as any, {} as any, generator)
    await generator.generate()

    await assert.fileExists('.adonisjs/server/pages.d.ts')
    await assert.fileContains('.adonisjs/server/pages.d.ts', [
      `import type { VNodeProps, AllowedComponentProps, ComponentInstance } from 'vue'`,
      `type ExtractProps<T>`,
      `declare module '@adonisjs/inertia/types' {`,
      `export interface InertiaPages {`,
      `'home': ExtractProps<(typeof import('../../resources/js/pages/home.vue'))['default']>`,
      `'users/create': ExtractProps<(typeof import('../../resources/js/pages/users/create.vue'))['default']>`,
      `'users/index': ExtractProps<(typeof import('../../resources/js/pages/users/index.vue'))['default']>`,
      ``,
    ])
    console.log(cliUi.logger.getLogs())
    assert.isDefined(
      cliUi.logger.getLogs().find(({ message }) => message.includes('codegen: created 1 file(s)'))
    )
  })

  test('index react pages', async ({ assert, fs }) => {
    const cliUi = Kernel.create().ui
    cliUi.switchMode('raw')

    await fs.create('inertia/pages/users/index.tsx', '')
    await fs.create('inertia/pages/users/create.tsx', '')
    await fs.create('inertia/pages/home.tsx', '')

    const generator = new IndexGenerator(stringHelpers.toUnixSlash(fs.basePath), cliUi.logger)
    const indexer = indexPages({
      framework: 'react',
    })

    indexer.run({} as any, {} as any, generator)
    await generator.generate()

    await assert.fileExists('.adonisjs/server/pages.d.ts')
    await assert.fileContains('.adonisjs/server/pages.d.ts', [
      `import type React from 'react'`,
      `type ExtractProps<T>`,
      `declare module '@adonisjs/inertia/types' {`,
      `export interface InertiaPages {`,
      `'home': ExtractProps<(typeof import('../../inertia/pages/home.tsx'))['default']>`,
      `'users/create': ExtractProps<(typeof import('../../inertia/pages/users/create.tsx'))['default']>`,
      `'users/index': ExtractProps<(typeof import('../../inertia/pages/users/index.tsx'))['default']>`,
      ``,
    ])
    assert.isDefined(
      cliUi.logger.getLogs().find(({ message }) => message.includes('codegen: created 1 file(s)'))
    )
  })

  test('index custom react pages source', async ({ assert, fs }) => {
    const cliUi = Kernel.create().ui
    cliUi.switchMode('raw')

    await fs.create('resources/js/pages/users/index.tsx', '')
    await fs.create('resources/js/pages/users/create.tsx', '')
    await fs.create('resources/js/pages/home.tsx', '')

    const generator = new IndexGenerator(stringHelpers.toUnixSlash(fs.basePath), cliUi.logger)
    const indexer = indexPages({
      framework: 'react',
      source: 'resources/js/pages',
    })

    indexer.run({} as any, {} as any, generator)
    await generator.generate()

    await assert.fileExists('.adonisjs/server/pages.d.ts')
    await assert.fileContains('.adonisjs/server/pages.d.ts', [
      `import type React from 'react'`,
      `type ExtractProps<T>`,
      `declare module '@adonisjs/inertia/types' {`,
      `export interface InertiaPages {`,
      `'home': ExtractProps<(typeof import('../../resources/js/pages/home.tsx'))['default']>`,
      `'users/create': ExtractProps<(typeof import('../../resources/js/pages/users/create.tsx'))['default']>`,
      `'users/index': ExtractProps<(typeof import('../../resources/js/pages/users/index.tsx'))['default']>`,
      ``,
    ])
    assert.isDefined(
      cliUi.logger.getLogs().find(({ message }) => message.includes('codegen: created 1 file(s)'))
    )
  })

  test('index svelte pages', async ({ assert, fs }) => {
    const cliUi = Kernel.create().ui
    cliUi.switchMode('raw')

    await fs.create('inertia/pages/users/index.svelte', '')
    await fs.create('inertia/pages/users/create.svelte', '')
    await fs.create('inertia/pages/home.svelte', '')

    const generator = new IndexGenerator(stringHelpers.toUnixSlash(fs.basePath), cliUi.logger)
    const indexer = indexPages({
      framework: 'svelte',
    })

    indexer.run({} as any, {} as any, generator)
    await generator.generate()

    await assert.fileExists('.adonisjs/server/pages.d.ts')
    await assert.fileContains('.adonisjs/server/pages.d.ts', [
      `type ExtractProps<T>`,
      `declare module '@adonisjs/inertia/types' {`,
      `export interface InertiaPages {`,
      `'home': ExtractProps<(typeof import('../../inertia/pages/home.svelte'))['default']>`,
      `'users/create': ExtractProps<(typeof import('../../inertia/pages/users/create.svelte'))['default']>`,
      `'users/index': ExtractProps<(typeof import('../../inertia/pages/users/index.svelte'))['default']>`,
      ``,
    ])
    assert.isDefined(
      cliUi.logger.getLogs().find(({ message }) => message.includes('codegen: created 1 file(s)'))
    )
  })

  /**
   * Guards the specific regression the structural helper exists for: svelte's
   * own `ComponentProps<T>` collapses page props to `never` under
   * svelte-check, so the generated file must not reach for it.
   */
  test('svelte page props are extracted structurally, not through ComponentProps', async ({
    assert,
    fs,
  }) => {
    const cliUi = Kernel.create().ui
    cliUi.switchMode('raw')

    await fs.create('inertia/pages/home.svelte', '')

    const generator = new IndexGenerator(stringHelpers.toUnixSlash(fs.basePath), cliUi.logger)
    indexPages({ framework: 'svelte' }).run({} as any, {} as any, generator)
    await generator.generate()

    const contents = await fs.contents('.adonisjs/server/pages.d.ts')

    assert.notInclude(contents, 'ComponentProps')
    assert.include(contents, `T extends (internals: never, props: infer Props) => any`)
    assert.include(contents, `Omit<Props, 'children' | '$$events' | '$$slots'>`)
  })

  test('index custom svelte pages source', async ({ assert, fs }) => {
    const cliUi = Kernel.create().ui
    cliUi.switchMode('raw')

    await fs.create('resources/js/pages/home.svelte', '')

    const generator = new IndexGenerator(stringHelpers.toUnixSlash(fs.basePath), cliUi.logger)
    const indexer = indexPages({
      framework: 'svelte',
      source: 'resources/js/pages',
    })

    indexer.run({} as any, {} as any, generator)
    await generator.generate()

    await assert.fileContains('.adonisjs/server/pages.d.ts', [
      `'home': ExtractProps<(typeof import('../../resources/js/pages/home.svelte'))['default']>`,
    ])
  })

  test('throw error when unsupported framework is defined for indexing pages', async ({ fs }) => {
    const cliUi = Kernel.create().ui
    cliUi.switchMode('raw')

    await fs.create('inertia/pages/users/index.tsx', '')
    await fs.create('inertia/pages/users/create.tsx', '')
    await fs.create('inertia/pages/home.tsx', '')

    const generator = new IndexGenerator(stringHelpers.toUnixSlash(fs.basePath), cliUi.logger)
    const indexer = indexPages({
      // @ts-ignore
      framework: 'solid',
    })

    indexer.run({} as any, {} as any, generator)
    await generator.generate()
  }).throws(
    'Unsupported framework "solid". Types generation is available only for vue3,react,svelte'
  )
})
