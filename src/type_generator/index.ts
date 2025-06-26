/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import dedent from 'dedent'
import { glob } from 'node:fs/promises'
import { relative, join, extname } from 'node:path'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import {
  FrameworkStrategy,
  ReactStrategy,
  SolidStrategy,
  SvelteStrategy,
  VueStrategy,
} from './strategies.js'
import { slash } from '@poppinss/utils'

export interface PagesLocation {
  root: string
  pages: string[]
}

export interface DetectedFrameworks {
  react: boolean
  vue: boolean
  svelte: boolean
  solid: boolean
}

export interface PageEntry {
  name: string
  importPath: string
  extension: string
}

/**
 * Generates TypeScript definitions for Inertia pages with framework-specific type helpers
 */
export class InertiaPageTypesGenerator {
  #appRoot: string
  #pages: PageEntry[] = []
  #strategies: FrameworkStrategy[] = []
  #selectedStrategy: FrameworkStrategy | null = null
  #frameworks: DetectedFrameworks = { react: false, vue: false, svelte: false, solid: false }

  constructor(appRoot: string) {
    this.#appRoot = appRoot
    this.#strategies = [
      new VueStrategy(),
      new SvelteStrategy(),
      new ReactStrategy(),
      new SolidStrategy(),
    ]
  }

  /**
   * Detects which Inertia packages are installed by analyzing package.json
   */
  async #detectFrameworks(): Promise<void> {
    const packageJsonPath = join(this.#appRoot, 'package.json')
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(packageJsonContent)

    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    this.#frameworks = {
      react: '@inertiajs/react' in allDeps,
      vue: '@inertiajs/vue3' in allDeps,
      svelte: '@inertiajs/svelte' in allDeps,
      solid: 'inertia-adapter-solid' in allDeps,
    }
  }

  /**
   * Scans for pages based on the provided glob patterns
   */
  async #scanPages(pagesLocations: PagesLocation[]): Promise<void> {
    this.#pages = []

    for (const pagesLocation of pagesLocations) {
      const foundPagesIterator = glob(pagesLocation.pages, {
        cwd: this.#appRoot,
      })

      for await (const pagePath of foundPagesIterator) {
        const rootPath = join(this.#appRoot, pagesLocation.root)
        const fullPagePath = join(this.#appRoot, pagePath)
        const relativePath = relative(rootPath, fullPagePath)

        // Remove file extension and create page name
        const pageName = slash(relativePath.replace(extname(relativePath), ''))

        // Create import path relative to .adonisjs directory (always keep extension)
        const importPath = slash(relative(join(this.#appRoot, '.adonisjs'), fullPagePath))

        this.#pages.push({ name: pageName, importPath, extension: extname(relativePath) })
      }
    }
  }

  /**
   * Generates framework-specific import statements
   */
  #generateImports(): string {
    const imports = this.#selectedStrategy!.getImports()
    return imports.length > 0 ? imports.join('\n') + '\n\n' : ''
  }

  /**
   * Generates the page entries for the InertiaPages interface
   */
  #generatePageEntries(): string {
    return this.#pages
      .map((page) => `  '${page.name}': GetPageProps<typeof import('./${page.importPath}')>`)
      .join('\n')
  }

  /**
   * Generates the complete TypeScript file content
   */
  #generateFileContent(): string {
    const imports = this.#generateImports()
    const getPagePropsType = this.#selectedStrategy!.getPagePropsType()
    const pageEntries = this.#generatePageEntries()

    let content = dedent`
      /**
       * Generated file. Do not edit manually.
       * This file contains type definitions for all Inertia pages.
       */
    `

    if (imports.trim()) content += '\n\n' + imports.trim()

    content += `\n\n${getPagePropsType}`
    content += dedent`\n\n
      /**
       * Type-safe mapping of all Inertia pages and their expected props
       */
      export interface MyInertiaPages {
    `

    if (pageEntries.trim()) {
      content += `\n${pageEntries}\n`
    } else {
      content += '\n'
    }

    content += '}\n'

    content += dedent`\n
      declare module '@adonisjs/inertia/types' {
        interface InertiaPages extends MyInertiaPages {}
      }
    `

    return content
  }

  /**
   * Writes the generated content to the .adonisjs/inertia.ts file
   */
  async #writeFile(content: string): Promise<void> {
    const adonisJsDir = join(this.#appRoot, '.adonisjs')
    await mkdir(adonisJsDir, { recursive: true })

    const outputPath = join(adonisJsDir, 'inertia.ts')
    await writeFile(outputPath, content, 'utf-8')
  }

  /**
   * Main method to generate the Inertia pages types file
   */
  async generate(pagesLocations: PagesLocation[]): Promise<void> {
    await this.#detectFrameworks()

    this.#selectedStrategy =
      this.#strategies.find((strategy) => strategy.shouldUse(this.#frameworks)) || null

    if (!this.#selectedStrategy) throw new Error('No supported Inertia framework detected')

    await this.#scanPages(pagesLocations)

    const fileContent = this.#generateFileContent()
    await this.#writeFile(fileContent)
  }
}
