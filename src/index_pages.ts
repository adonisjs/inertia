/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type AllHooks } from '@adonisjs/assembler/types'

/**
 * File glob patterns for different frontend frameworks.
 * Defines which file extensions should be scanned for each supported framework.
 */
const GLOB = {
  vue3: ['**/*.vue'],
  react: ['**/*.ts', '**/*.tsx'],
}

/**
 * List of supported frontend frameworks for page type generation.
 * Extracted from the GLOB configuration object.
 */
const SUPPORTED_FRAMEWORKS = Object.keys(GLOB)

/**
 * TypeScript helper code templates for extracting component props.
 * Contains framework-specific type extraction logic that gets injected
 * into the generated type definition files.
 */
const TYPES_EXTRACTION_HELPER = {
  vue3: `import type { VNodeProps, AllowedComponentProps, ComponentInstance } from 'vue'

type ExtractProps<T> = Omit<
  ComponentInstance<T>['$props'],
  keyof VNodeProps | keyof AllowedComponentProps
>`,
  react: `import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never`,
}

/**
 * Creates an AdonisJS assembler hook to automatically generate TypeScript definitions
 * for Inertia.js pages based on the specified framework.
 *
 * This function scans page components in the 'inertia/pages' directory and generates
 * type definitions that map page names to their component props.
 *
 * @param config - Configuration object specifying the frontend framework
 * @param config.framework - The frontend framework ('vue3' or 'react')
 * @param config.source - The path to Inertia pages (default: inertia/pages)
 * @returns Assembler hook object with run method for generating page types
 *
 * @example
 * ```js
 * // In your adonisrc.ts file
 * export default defineConfig({
 *   assembler: {
 *     onBuildStarting: [indexPages({ framework: 'vue3' })]
 *   }
 * })
 * ```
 */
export const indexPages = function (config: { framework: 'vue3' | 'react'; source?: string }) {
  if (!SUPPORTED_FRAMEWORKS.includes(config.framework)) {
    throw new Error(
      `Unsupported framework "${config.framework}". Types generation is available only for ${SUPPORTED_FRAMEWORKS.join(',')}`
    )
  }

  return {
    /**
     * Executes the page indexing process to generate TypeScript definitions.
     *
     * @param _ - Unused first parameter (assembler context)
     * @param __ - Unused second parameter (hooks instance)
     * @param indexGenerator - The index generator instance used to register the pages type generation
     */
    run(_, __, indexGenerator) {
      indexGenerator.add('inertiaPages', {
        source: config.source ?? 'inertia/pages',
        glob: GLOB[config.framework],
        output: '.adonisjs/server/pages.d.ts',
        /**
         * Generates the TypeScript module declaration for Inertia pages.
         *
         * @param vfs - Virtual file system containing the scanned page files
         * @param buffer - Buffer instance for writing the generated TypeScript code
         * @param ___ - Unused third parameter
         * @param helpers - Helper utilities for path manipulation and imports
         */
        as(vfs, buffer, ___, helpers) {
          const filesList = vfs.asList()
          buffer.writeLine(`import '@adonisjs/inertia/types'`)
          buffer.writeLine(TYPES_EXTRACTION_HELPER[config.framework])
          buffer.write(`declare module '@adonisjs/inertia/types' {`).indent()
          buffer.write(`export interface InertiaPages {`).indent()

          Object.keys(filesList).forEach((key) => {
            buffer.write(
              `'${key}': ExtractProps<(typeof import('${helpers.toImportPath(filesList[key])}'))['default']>`
            )
          })

          buffer.dedent().write(`}`)
          buffer.dedent().write(`}`)
        },
      })
    },
  } satisfies AllHooks['init'][number]
}
