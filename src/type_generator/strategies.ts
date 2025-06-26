/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import dedent from 'dedent'
import { DetectedFrameworks } from './index.js'

/**
 * Strategy interface for framework-specific type generation
 */
export interface FrameworkStrategy {
  /**
   * Returns the import statements needed for this framework
   */
  getImports(): string[]

  /**
   * Returns the GetPageProps type definition for this framework
   */
  getPagePropsType(): string

  /**
   * Determines if this strategy should be used based on detected frameworks
   */
  shouldUse(frameworks: DetectedFrameworks): boolean
}

/**
 * React framework strategy
 */
export class ReactStrategy implements FrameworkStrategy {
  getImports(): string[] {
    return ["import type React from 'react'"]
  }

  getPagePropsType(): string {
    return dedent`
      /**
       * Extracts the props type from a React component
       */
      type PropsFrom<TComponent> = TComponent extends React.FC<infer Props>
        ? Props
        : TComponent extends React.Component<infer Props>
        ? Props
        : never

      /**
       * Extracts the props type from an Inertia page component's default export
       */
      type GetPageProps<T extends { default: any }> = PropsFrom<T['default']>
    `
  }

  shouldUse(frameworks: DetectedFrameworks): boolean {
    return frameworks.react
  }
}

/**
 * Vue framework strategy
 */
export class VueStrategy implements FrameworkStrategy {
  getImports(): string[] {
    return []
  }

  getPagePropsType(): string {
    return dedent`
      /**
       * Extracts the props type from an Inertia page component's default export
       */
      type GetPageProps<T extends { default: any }> = InstanceType<T['default']>['$props']
    `
  }

  shouldUse(frameworks: DetectedFrameworks): boolean {
    return frameworks.vue
  }
}

/**
 * Svelte framework strategy
 */
export class SvelteStrategy implements FrameworkStrategy {
  getImports(): string[] {
    return ["import type { ComponentProps } from 'svelte'"]
  }

  getPagePropsType(): string {
    return dedent`
      /**
       * Extracts the props type from an Inertia page component
       */
      type GetPageProps<T> = ComponentProps<T>
    `
  }

  shouldUse(frameworks: DetectedFrameworks): boolean {
    return frameworks.svelte
  }
}

/**
 * Solid framework strategy
 */
export class SolidStrategy implements FrameworkStrategy {
  getImports(): string[] {
    return []
  }

  getPagePropsType(): string {
    return dedent`
      /**
       * Extracts the props type from an Inertia page component's default export
       */
      type GetPageProps<T extends { default: any }> = T['default'] extends (props: infer P) => any ? P : unknown
    `
  }

  shouldUse(frameworks: DetectedFrameworks): boolean {
    return frameworks.solid
  }
}
