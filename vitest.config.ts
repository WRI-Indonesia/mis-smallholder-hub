import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Seluruh suite = pure logic (0 test menyentuh DOM/render) — jsdom hanya
    // menambah ± 10 s per run (#353); devDep `jsdom` ikut dihapus. Test komponen
    // kelak: pasang lagi `jsdom` (devDep) lalu `// @vitest-environment jsdom` per berkas.
    environment: 'node',
    globals: true,
    // Zona waktu runner dipin (#288): test tanggal (NIK ↔ tanggal lahir +12 jam,
    // WIB vs UTC di snapshot/laporan) tidak boleh bergantung TZ mesin.
    env: { TZ: 'UTC' },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
