/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { readdir } from 'node:fs/promises'
import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { join } from 'node:path'

const stubsRoot = join(import.meta.dirname, '../stubs')

export default class MakePage extends BaseCommand {
  static commandName = 'make:page'
  static description = 'Create a new Inertia page component'
  static options: CommandOptions = {
    allowUnknownFlags: true,
  }

  @args.string({ description: 'Name of the page component' })
  declare name: string

  @flags.boolean({ description: 'Create a Vue page component' })
  declare vue: boolean

  @flags.boolean({ description: 'Create a React page component' })
  declare react: boolean

  /**
   * Directory under which the inertia pages are stored
   */
  protected pagesDir: string = 'inertia/pages'

  /**
   * Detect the framework by scanning existing files in the
   * inertia/pages directory.
   */
  async #detectFramework(): Promise<'vue' | 'react' | null> {
    try {
      const pagesDir = this.app.makePath(this.pagesDir)
      const files = await readdir(pagesDir, { recursive: true })

      const hasVue = files.some((file) => file.endsWith('.vue'))
      const hasReact = files.some((file) => file.endsWith('.tsx') || file.endsWith('.jsx'))

      if (hasVue && !hasReact) {
        return 'vue'
      }
      if (hasReact && !hasVue) {
        return 'react'
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Resolve which framework to use. Flags take priority,
   * then auto-detection, and finally prompt the user.
   */
  async #resolveFramework(): Promise<'vue' | 'react'> {
    if (this.vue) {
      return 'vue'
    }
    if (this.react) {
      return 'react'
    }

    const detected = await this.#detectFramework()
    if (detected) {
      return detected
    }

    return this.prompt.choice('Select the frontend framework', ['vue', 'react'])
  }

  async run() {
    const framework = await this.#resolveFramework()
    const codemods = await this.createCodemods()

    await codemods.makeUsingStub(stubsRoot, `make/page/${framework}.stub`, {
      flags: this.parsed.flags,
      pagesDir: this.pagesDir,
      entity: this.app.generators.createEntity(this.name),
    })
  }
}
