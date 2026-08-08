/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { EdgeError } from 'edge-error'
import { type TagContract } from 'edge.js/types'

import { isSubsetOf } from './utils.js'

/**
 * Edge tag that generates the root element for Inertia.js applications
 *
 * The @inertia tag emits the initial page payload as a JSON script element
 * followed by the mount element Inertia.js hydrates on the client. The
 * script's `data-page` attribute matches the mount element's id. Supports
 * customization through attributes.
 *
 * @example
 * ```edge
 * {{-- Basic usage with default div element and id="app" --}}
 * @inertia()
 *
 * {{-- Custom element and attributes --}}
 * @inertia({ as: 'main', id: 'app-root', class: 'min-h-screen' })
 *
 * {{-- Results in: --}}
 * {{-- <script data-page="app-root" type="application/json">{...page data...}</script> --}}
 * {{-- <main id="app-root" class="min-h-screen"></main> --}}
 * ```
 *
 * Supported attributes:
 * - `as`: HTML tag name for the root element (defaults to 'div')
 * - `id`: Element ID (defaults to 'app')
 * - `class`: CSS class names for the element
 */
export const inertiaTag: TagContract = {
  block: false,
  tagName: 'inertia',
  seekable: true,
  compile(parser, buffer, { filename, loc, properties }) {
    /**
     * Handle case where no arguments are passed to the tag
     */
    if (properties.jsArg.trim() === '') {
      buffer.writeExpression(`out += state.inertia(state.page)`, filename, loc.start.line)
      return
    }

    /**
     * Get AST for the arguments and ensure it is a valid object expression
     */
    properties.jsArg = `(${properties.jsArg})`
    const parsed = parser.utils.transformAst(
      parser.utils.generateAST(properties.jsArg, loc, filename),
      filename,
      parser
    )

    isSubsetOf(parsed, ['ObjectExpression'], () => {
      const { line, col } = parser.utils.getExpressionLoc(parsed)

      throw new EdgeError(
        `"${properties.jsArg}" is not a valid argument for @inertia`,
        'E_UNALLOWED_EXPRESSION',
        { line, col, filename }
      )
    })

    /**
     * Stringify the object expression and pass it to the `inertia` helper
     */
    const attributes = parser.utils.stringify(parsed)
    buffer.outputExpression(
      `state.inertia(state.page, ${attributes})`,
      filename,
      loc.start.line,
      false
    )
  },
}

/**
 * Edge tag that renders server-side rendered head content for Inertia.js
 *
 * The @inertiaHead tag outputs head tags (title, meta, etc.) that were generated
 * during server-side rendering. Only relevant when SSR is enabled.
 *
 * @example
 * ```edge
 * <!DOCTYPE html>
 * <html>
 * <head>
 *   <meta charset="utf-8">
 *   <meta name="viewport" content="width=device-width, initial-scale=1">
 *   @inertiaHead()
 * </head>
 * <body>
 *   @inertia()
 * </body>
 * </html>
 * ```
 */
export const inertiaHeadTag: TagContract = {
  block: false,
  tagName: 'inertiaHead',
  seekable: false,
  compile(_, buffer, { filename, loc }) {
    buffer.outputExpression('state.inertiaHead(state.page)', filename, loc.start.line, false)
  },
}
