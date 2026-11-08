/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type AdonisEndpoint } from '@tuyau/core/types'

import type { PageObject } from '../../../src/types.ts'

/**
 * Page registry fixture for the instant-visit assertions. Augmented here
 * rather than in a fixture so every file in the svelte typecheck program
 * sees the same pages.
 */
declare module '../../../src/types.ts' {
  interface InertiaPages {
    'users/index': { users: { id: number }[] }
    'users/show': { user: { id: number } }
    'users/limited': { reason: string }
    'posts/index': { posts?: string[] }
  }
}

export const routes = {
  'users.index': {
    methods: ['GET', 'HEAD'],
    pattern: '/users',
    tokens: [{ old: '/users', type: 0, val: 'users', end: '' }],
    types: null as any as {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: string | PageObject<{ users: { id: number }[] }, 'users/index'>
    },
  },
  'users.show': {
    methods: ['GET', 'HEAD'],
    pattern: '/users/:id',
    tokens: [
      { old: '/users', type: 0, val: 'users', end: '/' },
      { old: ':id', type: 1, val: 'id', end: '' },
    ],
    types: null as any as {
      body: {}
      paramsTuple: [string]
      params: { id: string }
      query: {}
      response:
        | string
        | PageObject<{ user: { id: number } }, 'users/show'>
        | PageObject<{ reason: string }, 'users/limited'>
    },
  },
  'users.comments.edit': {
    methods: ['GET', 'HEAD'],
    pattern: '/users/:id/comments/:comment_id/edit',
    tokens: [
      { old: '/users', type: 0, val: 'users', end: '/' },
      { old: ':id', type: 1, val: 'id', end: '/' },
      { old: '/comments', type: 0, val: 'comments', end: '/' },
      { old: ':comment_id', type: 1, val: 'comment_id', end: '/edit' },
      { old: '/edit', type: 0, val: 'edit', end: '' },
    ],
    types: null as any as {
      body: {}
      paramsTuple: [string, string]
      params: { id: string; comment_id: string }
      query: {}
      response: unknown
    },
  },
  'posts.index': {
    methods: ['GET', 'HEAD'],
    pattern: '/posts',
    tokens: [{ old: '/posts', type: 0, val: 'posts', end: '' }],
    types: null as any as {
      body: {}
      paramsTuple: []
      params: {}
      query: { page?: number; status?: string }
      response: string | PageObject<{ posts?: string[] }, 'posts/index'>
    },
  },
  'users.store': {
    methods: ['POST'],
    pattern: '/users',
    tokens: [{ old: '/users', type: 0, val: 'users', end: '' }],
    types: null as any as {
      body: { email: string; remember?: boolean }
      paramsTuple: []
      params: {}
      query: {}
      response: { id: number; email: string }
    },
  },
  'posts.update': {
    methods: ['PUT', 'PATCH'],
    pattern: '/posts/:id',
    tokens: [
      { old: '/posts', type: 0, val: 'posts', end: '/' },
      { old: ':id', type: 1, val: 'id', end: '' },
    ],
    types: null as any as {
      body: { title: string }
      paramsTuple: [string]
      params: { id: string }
      query: {}
      response: unknown
    },
  },
} as const satisfies Record<string, AdonisEndpoint>

export const registry = {
  routes,
  $tree: {} as any,
}

declare module '@tuyau/core/types' {
  type Registry = typeof registry
  export interface UserRegistry extends Registry {}
}
