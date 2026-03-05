/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseTransformer } from '@adonisjs/core/transformers'
import { test } from '@japa/runner'

import { InertiaFactory } from '../factories/inertia_factory.ts'
import { always, deepMerge, defer, merge, optional, scroll } from '../src/props.ts'
import { makePaginatedData } from './helpers.ts'

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
        "prependProps": [],
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
        "scrollProps": {},
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
        "prependProps": [],
        "props": {
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "scrollProps": {},
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
        "prependProps": [],
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
        "scrollProps": {},
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
        "prependProps": [],
        "props": {
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
        },
        "scrollProps": {},
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
        "prependProps": [],
        "props": {
          "posts": [
            {
              "id": 1,
            },
          ],
        },
        "scrollProps": {},
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
        "prependProps": [],
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
              },
            ],
          },
        },
        "scrollProps": {},
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
        "prependProps": [],
        "props": {
          "posts": [
            {
              "id": 1,
            },
          ],
        },
        "scrollProps": {},
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
        "prependProps": [],
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
        "scrollProps": {},
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
        "prependProps": [],
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
        "scrollProps": {},
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
        "prependProps": [],
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
        "scrollProps": {},
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
        "prependProps": [],
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
        "scrollProps": {},
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
        "prependProps": [],
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
        "scrollProps": {},
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
        "prependProps": [],
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
        "scrollProps": {},
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
        "prependProps": [],
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
        "scrollProps": {},
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
        "prependProps": [],
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
        "scrollProps": {},
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
        "prependProps": [],
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
        "scrollProps": {},
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
        metadata: {
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
        "prependProps": [],
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "metadata": {
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
        "scrollProps": {},
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
        metadata: {
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
        "prependProps": [],
        "props": {
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "scrollProps": {},
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
        "prependProps": [],
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
              },
            ],
            "metadata": {
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
        "scrollProps": {},
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
        "prependProps": [],
        "props": {
          "posts": [
            {
              "id": 1,
              "title": "Hello world",
            },
          ],
        },
        "scrollProps": {},
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
        "prependProps": [],
        "props": {
          "posts": [
            {
              "id": 1,
            },
          ],
        },
        "scrollProps": {},
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
        "prependProps": [],
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
              },
            ],
            "metadata": {},
          },
        },
        "scrollProps": {},
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
        "prependProps": [],
        "props": {
          "posts": [
            {
              "id": 1,
            },
          ],
        },
        "scrollProps": {},
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
        "prependProps": [],
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
              },
            ],
            "metadata": {},
          },
          "user": {
            "id": 1,
            "timestamps": true,
          },
        },
        "scrollProps": {},
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
        metadata: {
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
        "prependProps": [],
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "metadata": {
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
        "scrollProps": {},
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
        metadata: {
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
        "prependProps": [],
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "metadata": {
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
        "scrollProps": {},
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
        metadata: {
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
        "prependProps": [],
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "metadata": {
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
        "scrollProps": {},
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
        metadata: {
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
        "prependProps": [],
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "metadata": {
              "total": 10,
            },
          },
        },
        "scrollProps": {},
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
        metadata: {
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
        "prependProps": [],
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "metadata": {
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
        "scrollProps": {},
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
        metadata: {
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
        "prependProps": [],
        "props": {
          "paginated": {
            "data": [
              {
                "id": 1,
                "title": "Hello world",
              },
            ],
            "metadata": {
              "total": 10,
            },
          },
        },
        "scrollProps": {},
        "url": "",
        "version": "1",
      }
    `)
  })
})

test.group('Inertia.page | scroll helper', () => {
  test('emit scrollProps metadata and serialize data on initial load', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    const postsData = makePaginatedData(1, 3)

    const page = await inertia.page('home', {
      posts: scroll(() => PostsTransformer.paginate(postsData.data, postsData.meta)),
    })

    assert.snapshot(page).matchInline(`
      {
        "clearHistory": false,
        "component": "home",
        "deepMergeProps": [],
        "deferredProps": {},
        "encryptHistory": false,
        "mergeProps": [],
        "prependProps": [],
        "props": {
          "posts": {
            "data": [
              {
                "id": 1,
                "title": "Post 1",
              },
            ],
            "metadata": {
              "currentPage": 1,
              "firstPage": 1,
              "firstPageUrl": "/?page=1",
              "lastPage": 3,
              "lastPageUrl": "/?page=3",
              "nextPageUrl": "/?page=2",
              "perPage": 10,
              "previousPageUrl": null,
              "total": 30,
            },
          },
        },
        "scrollProps": {
          "posts": {
            "currentPage": 1,
            "nextPage": 2,
            "pageName": "page",
            "previousPage": null,
          },
        },
        "url": "",
        "version": "1",
      }
    `)
  })

  test('no mergeProps or prependProps on initial load (no header)', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    const postsData = makePaginatedData(1, 3)

    const page = await inertia.page('home', {
      posts: scroll(() => PostsTransformer.paginate(postsData.data, postsData.meta)),
    })

    assert.deepEqual(page.mergeProps, [])
    assert.deepEqual(page.prependProps, [])
  })

  test('add posts.data to mergeProps when intent is "append"', async ({ assert }) => {
    const inertia = new InertiaFactory().scrollIntent('append').create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    const postsData = makePaginatedData(2, 3)

    const page = await inertia.page('home', {
      posts: scroll(() => PostsTransformer.paginate(postsData.data, postsData.meta)),
    })

    assert.deepEqual(page.mergeProps, ['posts.data'])
    assert.deepEqual(page.prependProps, [])
  })

  test('add posts.data to prependProps when intent is "prepend"', async ({ assert }) => {
    const inertia = new InertiaFactory().scrollIntent('prepend').create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    const postsData = makePaginatedData(2, 3)

    const page = await inertia.page('home', {
      posts: scroll(() => PostsTransformer.paginate(postsData.data, postsData.meta)),
    })

    assert.deepEqual(page.prependProps, ['posts.data'])
    assert.deepEqual(page.mergeProps, [])
  })

  test('nextPage is null on last page', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    const postsData = makePaginatedData(3, 3)

    const page = await inertia.page('home', {
      posts: scroll(() => PostsTransformer.paginate(postsData.data, postsData.meta)),
    })

    assert.isNull((page.scrollProps as any).posts.nextPage)
    assert.equal((page.scrollProps as any).posts.previousPage, 2)
  })

  test('previousPage is null on first page', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    const postsData = makePaginatedData(1, 3)

    const page = await inertia.page('home', {
      posts: scroll(() => PostsTransformer.paginate(postsData.data, postsData.meta)),
    })

    assert.isNull((page.scrollProps as any).posts.previousPage)
    assert.equal((page.scrollProps as any).posts.nextPage, 2)
  })

  test('custom pageName is reflected in scrollProps', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    const postsData = makePaginatedData(1, 3)

    const page = await inertia.page('home', {
      posts: scroll(() => PostsTransformer.paginate(postsData.data, postsData.meta), {
        pageName: 'postsPage',
      }),
    })

    assert.equal((page.scrollProps as any).posts.pageName, 'postsPage')
  })

  test('accept a direct value (non-lazy)', async ({ assert }) => {
    const inertia = new InertiaFactory().create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    const postsData = makePaginatedData(1, 3)

    const page = await inertia.page('home', {
      posts: scroll(PostsTransformer.paginate(postsData.data, postsData.meta)),
    })

    assert.equal((page.scrollProps as any).posts.currentPage, 1)
    assert.equal((page.scrollProps as any).posts.nextPage, 2)
  })

  test('multiple scroll props emit independent scrollProps and mergeProps', async ({ assert }) => {
    const inertia = new InertiaFactory().scrollIntent('append').create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    class UsersTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    const postsData = makePaginatedData(1, 3)
    const usersData = makePaginatedData(2, 5)

    const page = await inertia.page('home', {
      posts: scroll(() => PostsTransformer.paginate(postsData.data, postsData.meta), {
        pageName: 'postsPage',
      }),
      users: scroll(() => UsersTransformer.paginate(usersData.data, usersData.meta), {
        pageName: 'usersPage',
      }),
    })

    assert.equal((page.scrollProps as any).posts.pageName, 'postsPage')
    assert.equal((page.scrollProps as any).users.pageName, 'usersPage')
    assert.includeMembers(page.mergeProps ?? [], ['posts.data', 'users.data'])
  })

  test('scroll prop is included and scrollProps emitted during partial reload', async ({
    assert,
  }) => {
    const inertia = new InertiaFactory().partialReload('home').only(['posts']).create()

    class PostsTransformer extends BaseTransformer<{ id: number; title: string }> {
      toObject() {
        return this.resource
      }
    }

    const postsData = makePaginatedData(2, 3)

    const page = await inertia.page('home', {
      posts: scroll(() => PostsTransformer.paginate(postsData.data, postsData.meta)),
      filters: { search: '' },
    })

    assert.exists((page.props as any).posts)
    assert.notExists((page.props as any).filters)
    assert.equal((page.scrollProps as any).posts.currentPage, 2)
  })
})
