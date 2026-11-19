/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Node ESM loader hook that compiles `.svelte` files on the fly for the test
 * suite, via `svelte/compiler`'s `compile()` directly (server output, since
 * tests run in Node, not a browser).
 *
 * This is test-only infrastructure, not something the shipped package needs:
 * the built package ships `.svelte` files uncompiled on purpose (see
 * tsdown.config.ts), and a real consuming app's own Vite + svelte plugin
 * compiles them at that app's build time. This loader exists purely so
 * tests/svelte_components.spec.ts can import the wrapper components
 * directly under plain Node (via `node --import=@poppinss/ts-exec`, which
 * has no idea how to parse `.svelte` syntax on its own) without requiring a
 * full app/Vite harness just to prove the components render.
 */
import { compile, compileModule } from 'svelte/compiler'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/**
 * `@inertiajs/svelte`'s own published `dist/index.js` re-exports some of its
 * internals with extensionless relative specifiers (e.g. `from
 * './components/createForm'`), which only resolves through a bundler's
 * auto-extension resolution (Vite, which every real Svelte app builds with).
 * Plain Node ESM requires the exact extension. This adds exactly that one
 * fallback — retry a failed relative resolution with a handful of common
 * extensions — scoped to resolution failures only, so it changes nothing for
 * specifiers that already resolve.
 */
const FALLBACK_EXTENSIONS = ['.js', '/index.js']

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    const isRelative =
      specifier === '.' ||
      specifier === '..' ||
      specifier.startsWith('./') ||
      specifier.startsWith('../')
    if (!isRelative) {
      throw error
    }

    // Directory import (e.g. `from '..'`): Node's error carries the resolved
    // directory URL, so retry that exact directory's index.js rather than
    // guessing a path by string-concatenating the original specifier.
    if (error?.code === 'ERR_UNSUPPORTED_DIR_IMPORT' && error?.url) {
      try {
        return await nextResolve(`${error.url}index.js`, context)
      } catch {
        throw error
      }
    }

    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      for (const ext of FALLBACK_EXTENSIONS) {
        try {
          return await nextResolve(`${specifier}${ext}`, context)
        } catch {
          continue
        }
      }
    }

    throw error
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.svelte')) {
    const filename = fileURLToPath(url)
    const source = await readFile(filename, 'utf-8')
    const { js } = compile(source, {
      filename,
      generate: 'server',
      css: 'injected',
    })

    return {
      format: 'module',
      source: js.code,
      shortCircuit: true,
    }
  }

  /**
   * Svelte 5 "universal reactivity" modules (`*.svelte.js` / `*.svelte.ts`)
   * use rune syntax (`$state`, `$derived`, ...) outside a component, which is
   * not valid JavaScript until compiled with `compileModule` — a separate
   * entrypoint from `compile` (components) in `svelte/compiler`.
   * `@inertiajs/svelte` ships several of these (page/useForm/useHttp/...).
   */
  if (url.endsWith('.svelte.js') || url.endsWith('.svelte.ts')) {
    const filename = fileURLToPath(url)
    const source = await readFile(filename, 'utf-8')
    const { js } = compileModule(source, { filename, generate: 'server' })

    return {
      format: 'module',
      source: js.code,
      shortCircuit: true,
    }
  }

  return nextLoad(url, context)
}
