/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { InertiaPageTypesGenerator } from '../src/type_generator/index.js'
import {
  createFakeReactPage,
  createPackageWithFramework,
  createFakeSveltePage,
  createFakeVuePage,
  createFakeSolidPage,
} from './helpers.js'

test.group('InertiaPageTypesGenerator', () => {
  test('generates types for React pages', async ({ assert, fs }) => {
    await createPackageWithFramework('react')

    await createFakeReactPage('inertia/pages/home.tsx')
    await createFakeReactPage('inertia/pages/about.tsx')
    await createFakeReactPage('inertia/pages/users/profile.tsx')

    const generator = new InertiaPageTypesGenerator(fs.basePath)
    await generator.generate([
      {
        root: './inertia/pages',
        pages: ['./inertia/pages/**/*.tsx'],
      },
    ])

    const generatedContent = await fs.contents('.adonisjs/inertia.ts')
    assert.snapshot(generatedContent).match()
  })

  test('generates types for Vue pages', async ({ assert, fs }) => {
    await createPackageWithFramework('vue')

    await createFakeVuePage('inertia/pages/home.vue')
    await createFakeVuePage('inertia/pages/dashboard/stats.vue')

    const generator = new InertiaPageTypesGenerator(fs.basePath)
    await generator.generate([
      {
        root: './inertia/pages',
        pages: ['./inertia/pages/**/*.vue'],
      },
    ])

    const generatedContent = await fs.contents('.adonisjs/inertia.ts')
    assert.snapshot(generatedContent).match()
  })

  test('generates types for Svelte pages', async ({ assert, fs }) => {
    await createPackageWithFramework('svelte')

    await createFakeSveltePage('inertia/pages/home.svelte')
    await createFakeSveltePage('inertia/pages/settings/profile.svelte')

    const generator = new InertiaPageTypesGenerator(fs.basePath)
    await generator.generate([
      {
        root: './inertia/pages',
        pages: ['./inertia/pages/**/*.svelte'],
      },
    ])

    const generatedContent = await fs.contents('.adonisjs/inertia.ts')
    assert.snapshot(generatedContent).match()
  })

  test('generates types for Solid pages', async ({ assert, fs }) => {
    await createPackageWithFramework('solid')

    await createFakeSolidPage('inertia/pages/home.tsx')
    await createFakeSolidPage('inertia/pages/admin/dashboard.tsx')

    const generator = new InertiaPageTypesGenerator(fs.basePath)
    await generator.generate([
      {
        root: './inertia/pages',
        pages: ['./inertia/pages/**/*.tsx'],
      },
    ])

    const generatedContent = await fs.contents('.adonisjs/inertia.ts')
    assert.snapshot(generatedContent).match()
  })

  test('handles multiple page locations', async ({ assert, fs }) => {
    await createPackageWithFramework('vue')

    await createFakeVuePage('inertia/pages/home.vue')
    await createFakeVuePage('inertia/admin/dashboard.vue')
    await createFakeVuePage('resources/views/auth/login.vue')

    const generator = new InertiaPageTypesGenerator(fs.basePath)
    await generator.generate([
      {
        root: './inertia/pages',
        pages: ['./inertia/pages/**/*.vue'],
      },
      {
        root: './inertia/admin',
        pages: ['./inertia/admin/**/*.vue'],
      },
      {
        root: './resources/views',
        pages: ['./resources/views/**/*.vue'],
      },
    ])

    const generatedContent = await fs.contents('.adonisjs/inertia.ts')
    assert.snapshot(generatedContent).match()
  })

  test('handles nested directory structures', async ({ assert, fs }) => {
    await createPackageWithFramework('react')

    await createFakeReactPage('inertia/pages/auth/login.tsx')
    await createFakeReactPage('inertia/pages/admin/users/index.tsx')
    await createFakeReactPage('inertia/pages/admin/users/[id]/edit.tsx')

    const generator = new InertiaPageTypesGenerator(fs.basePath)
    await generator.generate([
      {
        root: './inertia/pages',
        pages: ['./inertia/pages/**/*.tsx'],
      },
    ])

    const generatedContent = await fs.contents('.adonisjs/inertia.ts')
    assert.snapshot(generatedContent).match()
  })

  test('creates .adonisjs directory if it does not exist', async ({ assert, fs }) => {
    await createPackageWithFramework('react')
    await createFakeReactPage('inertia/pages/home.tsx')

    const generator = new InertiaPageTypesGenerator(fs.basePath)
    await generator.generate([
      {
        root: './inertia/pages',
        pages: ['./inertia/pages/**/*.tsx'],
      },
    ])

    assert.isTrue(await fs.exists('.adonisjs'))
    assert.isTrue(await fs.exists('.adonisjs/inertia.ts'))
  })

  test('handles empty pages gracefully', async ({ assert, fs }) => {
    await createPackageWithFramework('react')

    const generator = new InertiaPageTypesGenerator(fs.basePath)
    await generator.generate([
      {
        root: './inertia/pages',
        pages: ['./inertia/pages/**/*.tsx'],
      },
    ])

    const generatedContent = await fs.contents('.adonisjs/inertia.ts')

    assert.isTrue(generatedContent.includes('export interface InertiaPages {'))
    assert.snapshot(generatedContent).match()
  })
})
