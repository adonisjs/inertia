/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Emits declaration files for the svelte client adapter.
 *
 * `tsc --emitDeclarationOnly` (the rest of `compile`) cannot cover this
 * folder: it runs against the root tsconfig.json, which excludes
 * src/client/svelte wholesale (see the comment there) because
 * `@inertiajs/svelte` only resolves under Bundler resolution. svelte2tsx's
 * `emitDts` is used instead, pointed at the same bundler-resolution tsconfig
 * svelte-check already uses (tests/types/svelte/tsconfig.json), so the two
 * stay in lockstep by construction.
 *
 * The v4 shims file is required, not the default one: against
 * `svelte-shims.d.ts` (the pre-v4/legacy shim), emitDts cannot introspect
 * Svelte 5 runes-mode `$props()` destructuring at all — every component's
 * emitted props collapse to `Record<string, never>`, and Form's `export
 * const` bindings (submit, reset, ...) get misread as props instead of
 * component exports. Verified: `svelte-shims-v4.d.ts` fixes both, and is
 * also what produces the generic `$$IsomorphicComponent` shape that keeps
 * Link/Form's per-route generic (`Route extends keyof Routes`) intact in the
 * emitted .d.ts, referencing this package's own `LinkProps<Route>` /
 * `FormProps<Route>` from types.ts rather than flattening them.
 *
 * These .svelte.d.ts files are a fallback for tooling without a Svelte
 * language plugin. A properly configured Svelte + TypeScript consumer (any
 * real one — svelte-check, the Svelte VS Code/IDE extensions, SvelteKit's
 * own tsconfig setup) resolves `.svelte` imports by analysing the shipped
 * source directly, the same way this package's own svelte-check run does,
 * and never consults these declaration files at all.
 */
import { emitDts } from 'svelte2tsx'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

await emitDts({
  declarationDir: path.join(root, 'build/src/client/svelte'),
  svelteShimsPath: require.resolve('svelte2tsx/svelte-shims-v4.d.ts'),
  libRoot: path.join(root, 'src/client/svelte'),
  tsconfig: path.join(root, 'tests/types/svelte/tsconfig.json'),
})
