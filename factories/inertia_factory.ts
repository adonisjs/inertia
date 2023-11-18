/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { HttpContext } from '@adonisjs/core/http'
import { AppFactory } from '@adonisjs/core/factories/app'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { ApplicationService } from '@adonisjs/core/types'

import { defineConfig } from '../index.js'
import { Inertia } from '../src/inertia.js'
import { AssetsVersion, InertiaConfig } from '../src/types.js'

type FactoryParameters = {
  ctx: HttpContext
  config?: InertiaConfig
}

/**
 * Inertia factory to quickly create a new instance of Inertia
 * for testing purposes
 */
export class InertiaFactory {
  #parameters: FactoryParameters = {
    ctx: new HttpContextFactory().create(),
  }

  #getApp() {
    return new AppFactory().create(new URL('./', import.meta.url), () => {}) as ApplicationService
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
    this.#parameters.config = { ...this.#parameters.config, assetsVersion: version }
    return this
  }

  async create() {
    const config = await defineConfig(this.#parameters.config || {}).resolver(this.#getApp())
    return new Inertia(this.#parameters.ctx, config)
  }
}
