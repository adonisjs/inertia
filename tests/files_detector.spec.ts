import { join } from 'node:path'
import { test } from '@japa/runner'
import { AppFactory } from '@adonisjs/core/factories/app'

import { FilesDetector } from '../src/files_detector.js'

test.group('Files detector', () => {
  test('detect entrypoint', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    const detector = new FilesDetector(app)

    await fs.create('resources/app.ts', '')

    const entrypoint = await detector.detectEntrypoint('resources/foo.ts')

    assert.deepEqual(entrypoint, join(fs.basePath, 'resources/app.ts'))
  })

  test('detect tsx entrypoint', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    const detector = new FilesDetector(app)

    await fs.create('resources/app.tsx', '')

    const entrypoint = await detector.detectEntrypoint('resources/foo.ts')

    assert.deepEqual(entrypoint, join(fs.basePath, 'resources/app.tsx'))
  })

  test('detect ssr entrypoint', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    const detector = new FilesDetector(app)

    await fs.create('resources/ssr.ts', '')

    const entrypoint = await detector.detectSsrEntrypoint('resources/foo.ts')

    assert.deepEqual(entrypoint, join(fs.basePath, 'resources/ssr.ts'))
  })

  test('detect ssr bundle', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    const detector = new FilesDetector(app)

    await fs.create('ssr/ssr.js', '')

    const entrypoint = await detector.detectSsrBundle('ssr/foo.js')

    assert.deepEqual(entrypoint, join(fs.basePath, 'ssr/ssr.js'))
  })
})
