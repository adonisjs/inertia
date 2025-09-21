/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { debuglog } from 'node:util'

/**
 * Debug logger for Inertia.js package
 *
 * Provides debugging functionality using Node.js built-in debuglog.
 * Enable debugging by setting the NODE_DEBUG environment variable to 'adonisjs:inertia'.
 *
 * @example
 * ```js
 * import debug from './debug.js'
 *
 * debug('Processing Inertia request')
 * debug('Component: %s, Props: %o', componentName, props)
 * ```
 *
 * @example
 * ```bash
 * # Enable debugging
 * NODE_DEBUG=adonisjs:inertia node server.js
 * ```
 */
export default debuglog('adonisjs:inertia')
