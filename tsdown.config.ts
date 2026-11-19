import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './index.ts',
    './src/types.ts',
    './src/client/helpers.ts',
    './factories/main.ts',
    './src/inertia_middleware.ts',
    './providers/inertia_provider.ts',
    './src/plugins/edge/plugin.ts',
    './src/plugins/japa/api_client.ts',
    './src/client/react/index.tsx',
    './src/client/vue/index.ts',
    './src/client/svelte/index.ts',
    './src/client/svelte/internals.ts',
    './commands/make_page.ts',
  ],
  outDir: './build',
  clean: true,
  format: 'esm',
  minify: 'dce-only',
  fixedExtension: false,
  dts: false,
  treeshake: false,
  sourcemap: false,
  target: 'esnext',
  inputOptions: {
    transform: {
      jsx: 'react-jsx',
    },
  },
  /**
   * `.svelte` imports inside src/client/svelte are left untouched rather than
   * compiled: unlike the vue wrappers (plain `.ts`, built on `h()`), svelte
   * has no render-function escape hatch, so the wrappers are genuine `.svelte`
   * SFCs. They ship uncompiled — `copy:svelte` (package.json) copies the raw
   * files alongside the compiled `index.js` — and the consuming app's own
   * Vite + svelte plugin compiles them, exactly how Svelte component
   * libraries are conventionally published. Compiling them here would bake in
   * a client- or server-only build and fight the app's own dev/prod, CSR/SSR
   * split.
   */
  deps: {
    neverBundle: [/\.svelte$/],
  },
})
