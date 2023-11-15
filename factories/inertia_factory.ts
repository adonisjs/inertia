/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { HttpContext } from '@adonisjs/core/http'
import { HttpContextFactory } from '@adonisjs/core/factories/http'

import { Inertia } from '../src/inertia.js'
import { InertiaConfig, AssetsVersion } from '../src/types.js'

type FactoryParameters = {
  ctx: HttpContext
  config?: InertiaConfig
  version?: AssetsVersion
}

/**
 * Inertia factory to quickly create a new instance of Inertia
 * for testing purposes
 */
export class InertiaFactory {
  #parameters: FactoryParameters = {
    ctx: new HttpContextFactory().create(),
    version: '1',
  }

  merge(parameters: Partial<FactoryParameters>) {
    Object.assign(this.#parameters, parameters)
    return this
  }

  withXInertiaHeader() {
    this.#parameters.ctx.request.request.headers['x-inertia'] = 'true'
    return this
  }

  withInertiaPartialReload(component: string, data: string[]) {
    this.withInertiaPartialData(data)
    this.#parameters.ctx.request.request.headers['x-inertia-partial-component'] = component
    return this
  }

  withInertiaPartialData(data: string[]) {
    this.#parameters.ctx.request.request.headers['x-inertia-partial-data'] = data.join(',')
    return this
  }

  withVersion(version: AssetsVersion) {
    this.#parameters.version = version
    return this
  }

  create() {
    return new Inertia(this.#parameters.ctx, this.#parameters.config, this.#parameters.version)
  }
}
