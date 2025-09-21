/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Validates that an AST expression is one of the allowed expression types
 *
 * This utility function is used during Edge template compilation to ensure
 * that only specific expression types are allowed in certain contexts.
 *
 * @param expression - The AST expression to validate
 * @param expressions - Array of allowed expression type names
 * @param errorCallback - Function to call when validation fails
 *
 * @example
 * ```js
 * // Ensure expression is either a literal or identifier
 * isSubsetOf(astNode, ['Literal', 'Identifier'], () => {
 *   throw new Error('Invalid expression type')
 * })
 *
 * // Allow only object expressions
 * isSubsetOf(astNode, ['ObjectExpression'], () => {
 *   throw new EdgeError('Expected object expression')
 * })
 * ```
 */
export function isSubsetOf(
  expression: { type: string },
  expressions: string[],
  errorCallback: () => void
) {
  if (!expressions.includes(expression.type)) {
    errorCallback()
  }
}
