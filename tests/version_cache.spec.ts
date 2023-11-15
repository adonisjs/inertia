/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { randomBytes } from 'node:crypto'

import { VersionCache } from '../src/version_cache.js'

test.group('Version Cache', () => {
  test('compute hash from manifest file', async ({ assert, fs }) => {
    const version = new VersionCache(fs.baseUrl)

    await fs.create('public/assets/manifest.json', randomBytes(1024 * 1024).toString('hex'))
    await version.computeVersion()

    assert.isDefined(version.getVersion())
  })

  test('hash is the same if manifest file does not change', async ({ assert, fs }) => {
    const version = new VersionCache(fs.baseUrl)

    await fs.create('public/assets/manifest.json', randomBytes(1024 * 1024).toString('hex'))

    await version.computeVersion()
    const r1 = version.getVersion()
    version.setVersion(undefined)
    await version.computeVersion()

    assert.equal(r1, version.getVersion())
  })

  test('hash is different if manifest file changes', async ({ assert, fs }) => {
    const version = new VersionCache(fs.baseUrl)

    await fs.create('public/assets/manifest.json', randomBytes(1024 * 1024).toString('hex'))

    await version.computeVersion()
    const r1 = version.getVersion()

    await fs.create('public/assets/manifest.json', randomBytes(1024 * 1024).toString('hex'))
    version.setVersion(undefined)
    await version.computeVersion()

    assert.notEqual(r1, version.getVersion())
  })
})
