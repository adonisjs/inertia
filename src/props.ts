/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { MaybePromise } from './types.js'

export const ignoreFirstLoadSymbol = Symbol('ignoreFirstLoad')

/**
 * Base class for Mergeable props
 */
export abstract class MergeableProp {
  public shouldMerge = false

  public merge() {
    this.shouldMerge = true
    return this
  }
}

/**
 * Optional prop
 */
export class OptionalProp<T extends MaybePromise<any>> {
  [ignoreFirstLoadSymbol] = true

  constructor(public callback: T) {}
}

/**
 * Defer prop
 */
export class DeferProp<T extends MaybePromise<any>> extends MergeableProp {
  [ignoreFirstLoadSymbol] = true as const

  constructor(
    public callback: T,
    private group: string
  ) {
    super()
  }

  public getGroup() {
    return this.group
  }
}

/**
 * Merge prop
 */
export class MergeProp<T extends MaybePromise<any>> extends MergeableProp {
  constructor(public callback: T) {
    super()
    this.shouldMerge = true
  }
}

/**
 * Always prop
 */
export class AlwaysProp<T extends MaybePromise<any>> extends MergeableProp {
  constructor(public callback: T) {
    super()
  }
}
