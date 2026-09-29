# 0005 · Produksi sebagai acuan menu & izin; akses DONOR

> Bagian dari dokumentasi **Keputusan**. Indeks: [README.md](./README.md)

- **Status:** Berlaku
- **Tanggal:** 2026-09-29 (revisi) · 2026-08-13 (#263) · 2026-09-21 (#357) · **Issue:** #263, #357, #364 · **Diputuskan:** owner

## Konteks
Menu dan izin peran diubah lewat UI Settings di produksi, dan perubahan itu tidak punya jalan pulang ke `prisma/seeds/data/*.csv`. Database baru yang di-seed dari repo lalu menguji aturan akses yang berbeda dari yang berlaku.

## Keputusan
- **Produksi adalah sumber kebenaran** menu & izin; CSV seed disamakan ke produksi, dan `npm run rbac:compare` dijalankan tiap rilis (selisih yang disengaja dicatat).
- **DONOR** (revisi 2026-09-29): VIEW + PRINT di dashboard, laporan Petani/Pelatihan/Produksi/Lahan, peta, Bantuan, dan 5 menu Master Data (Lembaga Petani, Petani, Pelatihan, Lahan, Monev BMP) — tanpa EXPORT, tanpa menulis; tanpa Report Kelompok Tani & Patok. Ini **membalik** #263 (2026-08-13), yang mencabut akses daftar petani karena memuat NIK & alamat.

## Alternatif yang ditolak
- Seed sebagai sumber kebenaran lalu menimpa produksi — membatalkan keputusan yang diambil owner lewat UI.

## Konsekuensi
DONOR melihat data individu petani (nama/NIK). Perubahan UI oleh akun lain (akun demo, #364) tetap menjadi risiko sampai ada pengaman; `menu-access.test.ts` mengunci spesifikasi DONOR di sisi seed.

## Rujukan
[../standards/rbac.md](../standards/rbac.md) · [../product/role-flows.md](../product/role-flows.md) · `scripts/compare-role-permissions.ts`
