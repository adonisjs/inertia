/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { AceFactory } from '@adonisjs/core/factories'
import MakePage from '../../commands/make_page.js'

test.group('MakePage', () => {
  test('create a vue page using --vue flag', async ({ assert, fs }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePage, ['home', '--vue'])
    await command.exec()

    command.assertSucceeded()
    command.assertLog('green(DONE:)    create inertia/pages/home.vue')
    await assert.fileContains('inertia/pages/home.vue', '<script setup lang="ts">')
    await assert.fileContains('inertia/pages/home.vue', 'Home')
  })

  test('create a react page using --react flag', async ({ assert, fs }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePage, ['home', '--react'])
    await command.exec()

    command.assertSucceeded()
    command.assertLog('green(DONE:)    create inertia/pages/home.tsx')
    await assert.fileContains(
      'inertia/pages/home.tsx',
      'export default function Home({}: PageProps)'
    )
  })

  test('create a page inside a nested directory', async ({ assert, fs }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePage, ['users/index', '--vue'])
    await command.exec()

    command.assertSucceeded()
    command.assertLog('green(DONE:)    create inertia/pages/users/index.vue')
    await assert.fileContains('inertia/pages/users/index.vue', 'Index')
  })

  test('auto-detect vue from existing pages', async ({ fs }) => {
    await fs.create('inertia/pages/dashboard.vue', '<template></template>')

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePage, ['home'])
    await command.exec()

    command.assertSucceeded()
    command.assertLog('green(DONE:)    create inertia/pages/home.vue')
  })

  test('auto-detect react from existing pages', async ({ fs }) => {
    await fs.create('inertia/pages/dashboard.tsx', 'export default function Dashboard() {}')

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePage, ['home'])
    await command.exec()

    command.assertSucceeded()
    command.assertLog('green(DONE:)    create inertia/pages/home.tsx')
  })

  test('prompt when framework cannot be detected', async ({ fs }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePage, ['home'])
    command.prompt.trap('Select the frontend framework').replyWith('vue')
    await command.exec()

    command.assertSucceeded()
    command.assertLog('green(DONE:)    create inertia/pages/home.vue')
  })

  test('prompt when both vue and react pages exist', async ({ fs }) => {
    await fs.create('inertia/pages/dashboard.vue', '<template></template>')
    await fs.create('inertia/pages/settings.tsx', 'export default function Settings() {}')

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePage, ['home'])
    command.prompt.trap('Select the frontend framework').replyWith('react')
    await command.exec()

    command.assertSucceeded()
    command.assertLog('green(DONE:)    create inertia/pages/home.tsx')
  })

  test('flags take priority over auto-detection', async ({ fs }) => {
    await fs.create('inertia/pages/dashboard.vue', '<template></template>')

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePage, ['home', '--react'])
    await command.exec()

    command.assertSucceeded()
    command.assertLog('green(DONE:)    create inertia/pages/home.tsx')
  })
})
