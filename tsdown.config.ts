import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './index.ts',
    './src/types.ts',
    './src/client/vite.ts',
    './src/client/helpers.ts',
    './factories/main.ts',
    './src/inertia_middleware.ts',
    './providers/inertia_provider.ts',
    './src/plugins/edge/plugin.ts',
    './src/plugins/japa/api_client.ts',
    './src/client/react/index.tsx',
    './src/client/vue/index.ts',
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
})
