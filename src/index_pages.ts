/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type AllHooks } from '@adonisjs/assembler/types'

const GLOB = {
  vue3: ['**/*.vue'],
  react: ['**/*.ts', '**/*.tsx'],
}

const SUPPORTED_FRAMEWORKS = Object.keys(GLOB)

const TYPES_EXTRACTION_HELPER = {
  vue3: `import type { VNodeProps, AllowedComponentProps, ComponentInstance } from 'vue'

type ExtractProps<T> = Omit<
  ComponentInstance<T>['$props'][K],
  keyof VNodeProps | keyof AllowedComponentProps
>`,
  react: `import type React from 'react'

type ExtractProps<T> = T extends React.FC<infer Props>
? Props
: T extends React.Component<infer Props>
? Props
: never`,
}

export const indexPages = function (config: { framework: 'vue3' | 'react' }) {
  if (!SUPPORTED_FRAMEWORKS.includes(config.framework)) {
    throw new Error(
      `Unsupported framework "${config.framework}". Types generation is available only for ${SUPPORTED_FRAMEWORKS.join(',')}`
    )
  }

  return {
    run(_, indexGenerator) {
      indexGenerator.add('inertiaPages', {
        source: 'inertia/pages',
        glob: GLOB[config.framework],
        output: '.adonisjs/server/pages.d.ts',
        as(vfs, buffer, __, helpers) {
          const filesList = vfs.asList()
          buffer.write(TYPES_EXTRACTION_HELPER[config.framework])
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
