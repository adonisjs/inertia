/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { EdgeError } from 'edge-error'
import { TagContract } from 'edge.js/types'

import { isSubsetOf } from './utils.js'

/**
 * `@inertia` tag is used to generate the root element with
 * encoded page data.
 *
 * We can pass an object with `as`, `class` and `id` properties
 * - `as` is the tag name for the root element. Defaults to `div`
 * - `class` is the class name for the root element.
 * - `id` is the id for the root element. Defaults to `app`
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
    buffer.writeExpression(
      `out += state.inertia(state.page, ${attributes})`,
      filename,
      loc.start.line
    )
  },
}

/**
 * `@inertiaHead` tag
 */
export const inertiaHeadTag: TagContract = {
  block: false,
  tagName: 'inertiaHead',
  seekable: false,
  compile(_, buffer, { filename, loc }) {
    buffer.writeExpression(`out += state.inertiaHead(state.page)`, filename, loc.start.line)
  },
}
