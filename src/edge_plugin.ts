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

import debug from './debug.js'

/**
 * Register the Inertia tags and globals within Edge
 */
export const edgePluginInertia: () => PluginFn<undefined> = () => {
  return (edge) => {
    debug('sharing globals and inertia tags with edge')

    edge.global('inertia', (page: Record<string, unknown> = {}) => {
      if (page.ssrBody) return page.ssrBody
      return `<div id="app" data-page="${encode(JSON.stringify(page))}"></div>`
    })

    edge.global('inertiaHead', (page: Record<string, unknown>) => {
      const { ssrHead = [] }: { ssrHead?: string[] } = page || {}
      return ssrHead.join('\n')
    })

    edge.registerTag({
      block: false,
      tagName: 'inertia',
      seekable: false,
      compile(_, buffer, { filename, loc }) {
        buffer.writeExpression(`out += state.inertia(state.page)`, filename, loc.start.line)
      },
    })

    edge.registerTag({
      block: false,
      tagName: 'inertiaHead',
      seekable: false,
      compile(_, buffer, { filename, loc }) {
        buffer.writeExpression(`out += state.inertiaHead(state.page)`, filename, loc.start.line)
      },
    })
  }
}
