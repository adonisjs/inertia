/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Vite } from '@adonisjs/vite'
import { HttpContext } from '@adonisjs/core/http'
import { AppFactory } from '@adonisjs/core/factories/app'
import { ApplicationService } from '@adonisjs/core/types'
import { HttpContextFactory } from '@adonisjs/core/factories/http'

import { defineConfig } from '../index.js'
import { Inertia } from '../src/inertia.js'
import { InertiaHeaders } from '../src/headers.js'
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
  #vite?: Vite
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
    this.#parameters.ctx.request.request.headers[InertiaHeaders.Inertia] = 'true'
    return this
  }

  withInertiaPartialComponent(component: string) {
    this.#parameters.ctx.request.request.headers[InertiaHeaders.PartialComponent] = component
    return this
  }

  withInertiaPartialReload(component: string, data: string[]) {
    this.withInertiaPartialData(data)
    this.withInertiaPartialComponent(component)
    return this
  }

  withInertiaPartialExcept(data: string[]) {
    this.#parameters.ctx.request.request.headers[InertiaHeaders.PartialExcept] = data.join(',')
    return this
  }

  withVite(options: Vite) {
    this.#vite = options
    return this
  }

  withInertiaPartialData(data: string[]) {
    this.#parameters.ctx.request.request.headers[InertiaHeaders.PartialOnly] = data.join(',')
    return this
  }

  withVersion(version: AssetsVersion) {
    this.#parameters.config = { ...this.#parameters.config, assetsVersion: version }
    return this
  }

  async create() {
    const config = await defineConfig(this.#parameters.config || {}).resolver(this.#getApp())
    return new Inertia(this.#parameters.ctx, config, this.#vite)
  }
}
