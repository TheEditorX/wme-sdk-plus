import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/module-ui--sidebar-manager',
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: resolve(__dirname, 'tsconfig.lib.json'),
    }),
  ],
  build: {
    outDir: './dist',
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'module-ui--sidebar-manager',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        '@wme-enhanced-sdk/method-interceptor',
        '@wme-enhanced-sdk/sdk-patcher',
        'wme-sdk-typings',
      ],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/module-ui--sidebar-manager',
      provider: 'v8',
    },
  },
});
