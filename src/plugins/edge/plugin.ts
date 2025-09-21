/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { encode } from 'html-entities'
import type { PluginFn } from 'edge.js/types'

import debug from '../../debug.js'
import { inertiaHeadTag, inertiaTag } from './tags.js'

/**
 * Edge.js plugin that registers Inertia.js tags and global functions
 *
 * This plugin adds the @inertia and @inertiaHead tags to Edge templates,
 * along with global helper functions for rendering Inertia pages.
 *
 * @returns Edge plugin function that registers Inertia functionality
 *
 * @example
 * ```js
 * // Configure in config/edge.ts
 * import { edgePluginInertia } from '@adonisjs/inertia/plugins/edge'
 *
 * edge.use(edgePluginInertia())
 * ```
 *
 * @example
 * ```edge
 * {{-- Use in Edge templates --}}
 * <!DOCTYPE html>
 * <html>
 * <head>
 *   @inertiaHead()
 * </head>
 * <body>
 *   @inertia({ id: 'app', class: 'min-h-screen' })
 * </body>
 * </html>
 * ```
 */
export const edgePluginInertia: () => PluginFn<undefined> = () => {
  return (edge) => {
    debug('sharing globals and inertia tags with edge')

    /**
     * Register the `inertia` global used by the `@inertia` tag
     */
    edge.global(
      'inertia',
      (page: Record<string, unknown> = {}, attributes: Record<string, any> = {}) => {
        if (page.ssrBody) {
          return page.ssrBody
        }

        const className = attributes?.class ? ` class="${attributes.class}"` : ''
        const id = attributes?.id ? ` id="${attributes.id}"` : ' id="app"'
        const tag = attributes?.as || 'div'
        const dataPage = encode(JSON.stringify(page))

        return `<${tag}${id}${className} data-page="${dataPage}"></${tag}>`
      }
    )

    /**
     * Register the `inertiaHead` global used by the `@inertiaHead` tag
     */
    edge.global('inertiaHead', (page: Record<string, unknown>) => {
      const { ssrHead = [] }: { ssrHead?: string[] } = page || {}
      return ssrHead.join('\n')
    })

    /**
     * Register tags
     */
    edge.registerTag(inertiaHeadTag)
    edge.registerTag(inertiaTag)
  }
}
