import type {} from '@tuyau/core/types'

type Registry = {
  routes: {
    'users.index': {
      methods: ['GET', 'HEAD']
      pattern: '/'
      tokens: [{ old: '/'; type: 0; val: '/'; end: '' }]
      types: {
        body: {}
        paramsTuple: []
        params: {}
        query: {}
        response: unknown
      }
    }
    'users.store': {
      methods: ['POST']
      pattern: '/users'
      tokens: [{ old: '/users'; type: 0; val: 'users'; end: '' }]
      types: {
        body: { email: string; remember?: boolean }
        paramsTuple: []
        params: {}
        query: {}
        response: unknown
      }
    }
  }
  $tree: unknown
}

declare module '@tuyau/core/types' {
  interface UserRegistry extends Registry {}
}
