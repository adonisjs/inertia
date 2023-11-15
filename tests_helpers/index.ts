import { HttpContext } from '@adonisjs/core/http'
import { getActiveTest } from '@japa/runner'
import { IncomingMessage, ServerResponse, createServer } from 'node:http'

/**
 * Create a http server that will be closed automatically
 * when the test ends
 */
export const httpServer = {
  create(callback: (req: IncomingMessage, res: ServerResponse) => any) {
    const server = createServer(callback)
    getActiveTest()?.cleanup(async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
    })
    return server
  },
}

/**
 * Mock the `view` macro on HttpContext to return a fake
 */
export function setupViewMacroMock() {
  // @ts-expect-error
  HttpContext.getter('view', () => ({ render: (view: any, props: any) => ({ view, props }) }))
  getActiveTest()?.cleanup(() => {
    // @ts-expect-error
    delete HttpContext.prototype.view
  })
}
