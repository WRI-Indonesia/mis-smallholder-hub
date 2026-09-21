import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Seluruh suite = pure logic (0 test menyentuh DOM/render) — jsdom hanya
    // menambah ± 10 s per run (#353). Test komponen kelak: `// @vitest-environment jsdom`.
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
