/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { BaseTransformer } from '@adonisjs/core/transformers'

import { always, deepMerge, defer, merge, optional, once } from '../src/props.ts'
import { InertiaFactory } from '../factories/inertia_factory.ts'

test.group('Inertia.page', () => {
  test('build page with component props as it is', async ({ assert }) => {
    type Props = {
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      user: {
        id: 1,
        timestamps: true,
      },
      posts: [{ id: 1, title: 'Hello world' }],
      paginated: {
        data: [{ id: 1, title: 'Hello world' }],
        total: 10,
      },
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "total": 10,
          },
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('partial reload props defined as values', async ({ assert }) => {
    type Props = {
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['user'])
      .create()

    const page = await inertia.page('home', {
      user: () => {
        return {
          id: 1,
          timestamps: true,
        }
      },
      posts: [{ id: 1, title: 'Hello world' }],
      paginated: {
        data: [{ id: 1, title: 'Hello world' }],
        total: 10,
      },
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('build page with optional values', async ({ assert }) => {
    type Props = {
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      user: {
        id: 1,
        timestamps: true,
      },
      posts: [{ id: 1 }],
      paginated: {
        data: [{ id: 1 }],
        total: 10,
      },
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
              },
            ],
            "total": 10,
          },
          "posts": [
            {
              "id": 1,
            },
          ],
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('build page with optional props', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      posts: [{ id: 1, title: 'Hello world' }],
    })
    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('build page with optional props via deferred helper', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      user: defer(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }),
      posts: [{ id: 1 }],
      paginated: defer(() => {
        return {
          data: [{ id: 1 }],
        }
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {
          "default": [
            "user",
            "paginated",
          ],
        },
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "posts": [
            {
              "id": 1,
            },
          ],
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('compute deferred props during partial reload', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['paginated'])
      .create()

    const page = await inertia.page('home', {
      user: defer(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }),
      posts: [{ id: 1 }],
      paginated: defer(() => {
        return {
          data: [{ id: 1 }],
        }
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
              },
            ],
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('build page with optional props via optional helper', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      user: optional(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }),
      posts: [{ id: 1 }],
      paginated: optional(() => {
        return {
          data: [{ id: 1 }],
        }
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "posts": [
            {
              "id": 1,
            },
          ],
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('compute optional props via optional helper during partial reload', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['paginated', 'user'])
      .create()

    const page = await inertia.page('home', {
      user: optional(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }),
      posts: [{ id: 1 }],
      paginated: optional(() => {
        return {
          data: [{ id: 1 }],
        }
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
              },
            ],
          },
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('build page with required and optional props via always helper', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      user: always({
        id: 1,
        timestamps: true,
      }),
      posts: always([{ id: 1, title: 'Hello world' }]),
      paginated: always({
        data: [{ id: 1, title: 'Hello world' }],
        total: 10,
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "total": 10,
          },
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('always include props computed using always helper during partial reload', async ({
    assert,
  }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['paginated'])
      .create()

    const page = await inertia.page('home', {
      user: always({
        id: 1,
        timestamps: true,
      }),
      posts: always([{ id: 1, title: 'Hello world' }]),
      paginated: always({
        data: [{ id: 1, title: 'Hello world' }],
        total: 10,
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "total": 10,
          },
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('allow defining required and optional props via mergeable helper', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      user: merge({
        id: 1,
        timestamps: true,
      }),
      posts: merge([{ id: 1, title: 'Hello world' }]),
      paginated: merge({
        data: [{ id: 1, title: 'Hello world' }],
        total: 10,
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [
          "user",
          "posts",
          "paginated",
        ],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "total": 10,
          },
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('allow defining required and optional props via deep merge helper', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      user: deepMerge({
        id: 1,
        timestamps: true,
      }),
      posts: merge([{ id: 1, title: 'Hello world' }]),
      paginated: deepMerge({
        data: [{ id: 1, title: 'Hello world' }],
        total: 10,
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [
          "user",
          "paginated",
        ],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [
          "posts",
        ],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "total": 10,
          },
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('partial reload mergeable props', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['paginated'])
      .create()

    const page = await inertia.page('home', {
      user: merge({
        id: 1,
        timestamps: true,
      }),
      posts: merge([{ id: 1, title: 'Hello world' }]),
      paginated: merge({
        data: [{ id: 1, title: 'Hello world' }],
        total: 10,
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [
          "paginated",
        ],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "total": 10,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('partial reload deep mergeable props', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['paginated'])
      .create()

    const page = await inertia.page('home', {
      user: deepMerge({
        id: 1,
        timestamps: true,
      }),
      posts: merge([{ id: 1, title: 'Hello world' }]),
      paginated: deepMerge({
        data: [{ id: 1, title: 'Hello world' }],
        total: 10,
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [
          "paginated",
        ],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "total": 10,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('build page with optional props via mergeable and defer helper', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      user: defer(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }).merge(),
      posts: merge([{ id: 1, title: 'Hello world' }]),
      paginated: defer(() => {
        return {
          data: [{ id: 1, title: 'Hello world' }],
          total: 10,
        }
      }).merge(),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {
          "default": [
            "user",
            "paginated",
          ],
        },
        "encryptHistory": false,
        "mergeProps": [
          "user",
          "posts",
          "paginated",
        ],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "total": 10,
          },
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('partial reload deferred and mergeable props', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['paginated'])
      .create()

    const page = await inertia.page('home', {
      user: defer(() => {
        return {
          id: 1,
          timestamps: true,
        }
      }).merge(),
      posts: merge([{ id: 1, title: 'Hello world' }]),
      paginated: defer(() => {
        return {
          data: [{ id: 1, title: 'Hello world' }],
          total: 10,
        }
      }).merge(),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [
          "paginated",
        ],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "total": 10,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })
})

test.group('Inertia.page | Transformers', () => {
  test('build page with component props using transformers', async ({ assert }) => {
    type Props = {
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        meta: {
          total: number
        }
      }
    }

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      user: UserTransformer.transform({
        id: 1,
        timestamps: true,
      }),
      posts: PostsTransformer.transform([{ id: 1, title: 'Hello world' }]),
      paginated: PostsTransformer.paginate([{ id: 1, title: 'Hello world' }], {
        total: 10,
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "meta": {
              "total": 10,
            },
          },
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('partial reload props using transformers', async ({ assert }) => {
    type Props = {
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated: {
        data: { id: number; title: string }[]
        meta: {
          total: number
        }
      }
    }

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['user'])
      .create()

    const page = await inertia.page('home', {
      user: UserTransformer.transform({
        id: 1,
        timestamps: true,
      }),
      posts: PostsTransformer.transform([{ id: 1, title: 'Hello world' }]),
      paginated: PostsTransformer.paginate([{ id: 1, title: 'Hello world' }], {
        total: 10,
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('build page with optional values using transformers', async ({ assert }) => {
    type Props = {
      user: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    class PostsTransformer extends BaseTransformer<{ id: number; title?: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const page = await inertia.page('home', {
      user: UserTransformer.transform({
        id: 1,
        timestamps: true,
      }),
      posts: PostsTransformer.transform([{ id: 1 }]),
      paginated: PostsTransformer.paginate([{ id: 1 }], {
        total: 10,
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
              },
            ],
            "meta": {
              "total": 10,
            },
          },
          "posts": [
            {
              "id": 1,
            },
          ],
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('build page with optional props using transformers', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        total: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    const page = await inertia.page('home', {
      posts: PostsTransformer.transform([{ id: 1, title: 'Hello world' }]),
    })
    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('build page with optional props using transformers via deferred helper', async ({
    assert,
  }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    class PostsTransformer extends BaseTransformer<{ id: number; title?: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const page = await inertia.page('home', {
      user: defer(() => {
        return UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      }),
      posts: PostsTransformer.transform([{ id: 1 }]),
      paginated: defer(() => {
        return PostsTransformer.paginate([{ id: 1 }], {})
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {
          "default": [
            "user",
            "paginated",
          ],
        },
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "posts": [
            {
              "id": 1,
            },
          ],
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('compute deferred props using transformers during partial reload', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['paginated'])
      .create()

    class PostsTransformer extends BaseTransformer<{ id: number; title?: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const page = await inertia.page('home', {
      user: defer(() => {
        return UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      }),
      posts: PostsTransformer.transform([{ id: 1 }]),
      paginated: defer(() => {
        return PostsTransformer.paginate([{ id: 1 }], {})
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
              },
            ],
            "meta": {},
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('build page with optional props using transformers via optional helper', async ({
    assert,
  }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    class PostsTransformer extends BaseTransformer<{ id: number; title?: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const page = await inertia.page('home', {
      user: optional(() => {
        return UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      }),
      posts: PostsTransformer.transform([{ id: 1 }]),
      paginated: optional(() => {
        return PostsTransformer.paginate([{ id: 1 }], {})
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "posts": [
            {
              "id": 1,
            },
          ],
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('compute optional props using transformers via optional helper during partial reload', async ({
    assert,
  }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title?: string }[]
      paginated?: {
        data: { id: number; title?: string }[]
        total?: number
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['paginated', 'user'])
      .create()

    class PostsTransformer extends BaseTransformer<{ id: number; title?: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const page = await inertia.page('home', {
      user: optional(() => {
        return UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      }),
      posts: PostsTransformer.transform([{ id: 1 }]),
      paginated: optional(() => {
        return PostsTransformer.paginate([{ id: 1 }], {})
      }),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
              },
            ],
            "meta": {},
          },
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('build page with required and optional props using transformers via always helper', async ({
    assert,
  }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        meta: {
          total: number
        }
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const page = await inertia.page('home', {
      user: always(
        UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      ),
      posts: always(PostsTransformer.transform([{ id: 1, title: 'Hello world' }])),
      paginated: always(
        PostsTransformer.paginate([{ id: 1, title: 'Hello world' }], {
          total: 10,
        })
      ),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "meta": {
              "total": 10,
            },
          },
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('always include props computed using transformers via always helper during partial reload', async ({
    assert,
  }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        meta: {
          total: number
        }
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['paginated'])
      .create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const page = await inertia.page('home', {
      user: always(
        UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      ),
      posts: always(PostsTransformer.transform([{ id: 1, title: 'Hello world' }])),
      paginated: always(
        PostsTransformer.paginate([{ id: 1, title: 'Hello world' }], {
          total: 10,
        })
      ),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "meta": {
              "total": 10,
            },
          },
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('allow defining required and optional props using transformers via mergeable helper', async ({
    assert,
  }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        meta: {
          total: number
        }
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const page = await inertia.page('home', {
      user: merge(
        UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      ),
      posts: merge(PostsTransformer.transform([{ id: 1, title: 'Hello world' }])),
      paginated: merge(
        PostsTransformer.paginate([{ id: 1, title: 'Hello world' }], {
          total: 10,
        })
      ),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [
          "user",
          "posts",
          "paginated",
        ],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "meta": {
              "total": 10,
            },
          },
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('partial reload mergeable props using transformers', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        meta: {
          total: number
        }
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['paginated'])
      .create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const page = await inertia.page('home', {
      user: merge(
        UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      ),
      posts: merge(PostsTransformer.transform([{ id: 1, title: 'Hello world' }])),
      paginated: merge(
        PostsTransformer.paginate([{ id: 1, title: 'Hello world' }], {
          total: 10,
        })
      ),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [
          "paginated",
        ],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "meta": {
              "total": 10,
            },
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('build page with optional props using transformers via mergeable and defer helper', async ({
    assert,
  }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        meta: {
          total: number
        }
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const page = await inertia.page('home', {
      user: defer(() => {
        return UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      }).merge(),
      posts: merge(PostsTransformer.transform([{ id: 1, title: 'Hello world' }])),
      paginated: defer(() => {
        return PostsTransformer.paginate([{ id: 1, title: 'Hello world' }], {
          total: 10,
        })
      }).merge(),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {
          "default": [
            "user",
            "paginated",
          ],
        },
        "encryptHistory": false,
        "mergeProps": [
          "user",
          "posts",
          "paginated",
        ],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "meta": {
              "total": 10,
            },
          },
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('partial reload deferred and mergeable props using transformers', async ({ assert }) => {
    type Props = {
      user?: {
        id: number
        timestamps: boolean
      }
      posts: { id: number; title: string }[]
      paginated?: {
        data: { id: number; title: string }[]
        meta: {
          total: number
        }
      }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['paginated'])
      .create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UserTransformer extends BaseTransformer<{ id: number; timestamps: boolean }> {
      toObject() {
        return this.resource
      }
    }

    const page = await inertia.page('home', {
      user: defer(() => {
        return UserTransformer.transform({
          id: 1,
          timestamps: true,
        })
      }).merge(),
      posts: merge(PostsTransformer.transform([{ id: 1, title: 'Hello world' }])),
      paginated: defer(() => {
        return PostsTransformer.paginate([{ id: 1, title: 'Hello world' }], {
          total: 10,
        })
      }).merge(),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [
          "paginated",
        ],
        "onceProps": {},
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "meta": {
              "total": 10,
            },
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })
})

test.group('Inertia.page | Once Props', () => {
  test('build page with once prop', async ({ assert }) => {
    type Props = {
      user: { id: number }
      plans?: { id: number; name: string }[]
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      user: { id: 1 },
      plans: once(() => [{ id: 1, name: 'Basic' }]),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {
          "plans": {
            "expiresAt": null,
            "prop": "plans",
          },
        },
        "props": {
          "plans": [
            {
              "id": 1,
              "name": "Basic",
            },
          ],
          "user": {
            "id": 1,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('once prop is skipped when client already has it cached', async ({ assert }) => {
    type Props = {
      user: { id: number }
      plans?: { id: number; name: string }[]
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .withCachedOnceProps(['plans'])
      .create()

    const page = await inertia.page('home', {
      user: { id: 1 },
      plans: once(() => [{ id: 1, name: 'Basic' }]),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {
          "plans": {
            "expiresAt": null,
            "prop": "plans",
          },
        },
        "props": {
          "user": {
            "id": 1,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('once prop with fresh() is always included even when cached', async ({ assert }) => {
    type Props = {
      user: { id: number }
      plans?: { id: number; name: string }[]
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .withCachedOnceProps(['plans'])
      .create()

    const page = await inertia.page('home', {
      user: { id: 1 },
      plans: once(() => [{ id: 1, name: 'Basic' }]).fresh(),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {
          "plans": {
            "expiresAt": null,
            "prop": "plans",
          },
        },
        "props": {
          "plans": [
            {
              "id": 1,
              "name": "Basic",
            },
          ],
          "user": {
            "id": 1,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('once prop with custom key via as()', async ({ assert }) => {
    type Props = {
      user: { id: number }
      memberRoles?: { id: number; name: string }[]
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      user: { id: 1 },
      memberRoles: once(() => [{ id: 1, name: 'Admin' }]).as('roles'),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {
          "roles": {
            "expiresAt": null,
            "prop": "memberRoles",
          },
        },
        "props": {
          "memberRoles": [
            {
              "id": 1,
              "name": "Admin",
            },
          ],
          "user": {
            "id": 1,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('once prop with custom key is cached using that key', async ({ assert }) => {
    type Props = {
      user: { id: number }
      memberRoles?: { id: number; name: string }[]
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .withCachedOnceProps(['roles'])
      .create()

    const page = await inertia.page('home', {
      user: { id: 1 },
      memberRoles: once(() => [{ id: 1, name: 'Admin' }]).as('roles'),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {
          "roles": {
            "expiresAt": null,
            "prop": "memberRoles",
          },
        },
        "props": {
          "user": {
            "id": 1,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('once prop is computed during partial reload when explicitly requested', async ({
    assert,
  }) => {
    type Props = {
      user: { id: number }
      plans?: { id: number; name: string }[]
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .partialReload('home')
      .only(['plans'])
      .create()

    const page = await inertia.page('home', {
      user: { id: 1 },
      plans: once(() => [{ id: 1, name: 'Basic' }]),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {
          "plans": {
            "expiresAt": null,
            "prop": "plans",
          },
        },
        "props": {
          "plans": [
            {
              "id": 1,
              "name": "Basic",
            },
          ],
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('multiple once props', async ({ assert }) => {
    type Props = {
      plans?: { id: number }[]
      countries?: { code: string }[]
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      plans: once(() => [{ id: 1 }]),
      countries: once(() => [{ code: 'US' }]).as('countryList'),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {
          "countryList": {
            "expiresAt": null,
            "prop": "countries",
          },
          "plans": {
            "expiresAt": null,
            "prop": "plans",
          },
        },
        "props": {
          "countries": [
            {
              "code": "US",
            },
          ],
          "plans": [
            {
              "id": 1,
            },
          ],
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('once prop with expiration via until()', async ({ assert }) => {
    type Props = {
      rates?: { currency: string }[]
    }

    const expiresAt = new Date('2025-01-02T12:00:00.000Z') // Fixed date for snapshot

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      rates: once(() => [{ currency: 'USD' }]).until(expiresAt),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {
          "rates": {
            "expiresAt": 1735819200000,
            "prop": "rates",
          },
        },
        "props": {
          "rates": [
            {
              "currency": "USD",
            },
          ],
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('defer().once() creates a once prop from deferred computation', async ({ assert }) => {
    type Props = {
      stats?: { count: number }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      stats: defer(() => ({ count: 42 })).once(),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {
          "default": [
            "stats",
          ],
        },
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {
          "stats": {
            "expiresAt": null,
            "prop": "stats",
          },
        },
        "props": {},
        "url": "",
        "version": "1",
      }
    `)
  })

  test('optional().once() creates a once prop from optional computation', async ({ assert }) => {
    type Props = {
      logs?: string[]
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      logs: optional(() => ['log1', 'log2']).once(),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {
          "logs": {
            "expiresAt": null,
            "prop": "logs",
          },
        },
        "props": {},
        "url": "",
        "version": "1",
      }
    `)
  })

  test('merge().once() creates a once prop from mergeable value', async ({ assert }) => {
    type Props = {
      items?: { id: number }[]
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      items: merge([{ id: 1 }]).once(),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [
          "items",
        ],
        "onceProps": {
          "items": {
            "expiresAt": null,
            "prop": "items",
          },
        },
        "props": {
          "items": [
            {
              "id": 1,
            },
          ],
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('deepMerge().once() creates a once prop from deep mergeable value', async ({ assert }) => {
    type Props = {
      settings?: { theme: string; notifications: { email: boolean } }
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      settings: deepMerge({ theme: 'dark', notifications: { email: true } }).once(),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [
          "settings",
        ],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "onceProps": {
          "settings": {
            "expiresAt": null,
            "prop": "settings",
          },
        },
        "props": {
          "settings": {
            "notifications": {
              "email": true,
            },
            "theme": "dark",
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('defer().merge().once() creates a deferred mergeable once prop', async ({ assert }) => {
    type Props = {
      activity?: { id: number; action: string }[]
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      activity: defer(() => [{ id: 1, action: 'login' }])
        .merge()
        .once(),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {
          "default": [
            "activity",
          ],
        },
        "encryptHistory": false,
        "mergeProps": [
          "activity",
        ],
        "onceProps": {
          "activity": {
            "expiresAt": null,
            "prop": "activity",
          },
        },
        "props": {},
        "url": "",
        "version": "1",
      }
    `)
  })

  test('once prop with until() using duration string', async ({ assert }) => {
    type Props = {
      cache?: string[]
    }

    // Mock Date.now to get predictable expiresAt value
    const originalNow = Date.now
    const fixedTime = 1735700000000 // Fixed timestamp for testing
    Date.now = () => fixedTime

    try {
      const inertia = new InertiaFactory<{
        home: Props
      }>().create()

      const page = await inertia.page('home', {
        cache: once(() => ['cached-data']).until('1h'),
      })

      // 1 hour = 3600000 milliseconds
      assert.snapshot(page).matchInline(`
        {
          "clearHistory": false,
          "component": "home",
          "deepMergeProps": [],
          "deferredProps": {},
          "encryptHistory": false,
          "mergeProps": [],
          "onceProps": {
            "cache": {
              "expiresAt": 1735703600000,
              "prop": "cache",
            },
          },
          "props": {
            "cache": [
              "cached-data",
            ],
          },
          "url": "",
          "version": "1",
        }
      `)
    } finally {
      Date.now = originalNow
    }
  })

  test('once prop with until() using seconds as number', async ({ assert }) => {
    type Props = {
      rates?: { currency: string }[]
    }

    // Mock Date.now to get predictable expiresAt value
    const originalNow = Date.now
    const fixedTime = 1735700000000 // Fixed timestamp for testing
    Date.now = () => fixedTime

    try {
      const inertia = new InertiaFactory<{
        home: Props
      }>().create()

      const page = await inertia.page('home', {
        rates: once(() => [{ currency: 'USD' }]).until(3600), // 3600 seconds = 1 hour
      })

      assert.snapshot(page).matchInline(`
        {
          "clearHistory": false,
          "component": "home",
          "deepMergeProps": [],
          "deferredProps": {},
          "encryptHistory": false,
          "mergeProps": [],
          "onceProps": {
            "rates": {
              "expiresAt": 1735703600000,
              "prop": "rates",
            },
          },
          "props": {
            "rates": [
              {
                "currency": "USD",
              },
            ],
          },
          "url": "",
          "version": "1",
        }
      `)
    } finally {
      Date.now = originalNow
    }
  })

  test('merge(defer()).once() is cached when client has it', async ({ assert }) => {
    type Props = {
      feed?: { id: number }[]
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>()
      .withCachedOnceProps(['feed'])
      .create()

    const page = await inertia.page('home', {
      feed: merge(defer(() => [{ id: 1 }])).once(),
    })

    // Props should be empty since client has 'feed' cached
    // But deferredProps should still list it (it's deferred)
    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {
          "default": [
            "feed",
          ],
        },
        "encryptHistory": false,
        "mergeProps": [
          "feed",
        ],
        "onceProps": {
          "feed": {
            "expiresAt": null,
            "prop": "feed",
          },
        },
        "props": {},
        "url": "",
        "version": "1",
      }
    `)
  })

  test('merge(defer()).once() is included when not cached', async ({ assert }) => {
    type Props = {
      feed?: { id: number }[]
    }

    const inertia = new InertiaFactory<{
      home: Props
    }>().create()

    const page = await inertia.page('home', {
      feed: merge(defer(() => [{ id: 1 }])).once(),
    })

    // Deferred props should be listed but not computed on standard visits
    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {
          "default": [
            "feed",
          ],
        },
        "encryptHistory": false,
        "mergeProps": [
          "feed",
        ],
        "onceProps": {
          "feed": {
            "expiresAt": null,
            "prop": "feed",
          },
        },
        "props": {},
        "url": "",
        "version": "1",
      }
    `)
  })
})
