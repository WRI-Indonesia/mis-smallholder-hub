# 0005 · Produksi sebagai acuan menu & izin; akses DONOR

> Bagian dari dokumentasi **Keputusan**. Indeks: [README.md](./README.md)

- **Status:** Berlaku
- **Tanggal:** 2026-09-29 (revisi DONOR; revisi #364) · 2026-08-13 (#263) · 2026-09-21 (#357) · **Issue:** #263, #357, #364 · **Diputuskan:** owner

## Konteks
Menu dan izin peran diubah lewat UI Settings di produksi, dan perubahan itu tidak punya jalan pulang ke `prisma/seeds/data/*.csv`. Database baru yang di-seed dari repo lalu menguji aturan akses yang berbeda dari yang berlaku.

## Keputusan
- **Produksi adalah sumber kebenaran** menu & izin; CSV seed disamakan ke produksi, dan `npm run rbac:compare` dijalankan tiap rilis (selisih yang disengaja dicatat).
- **DONOR** (revisi 2026-09-29): VIEW + PRINT di dashboard, laporan Petani/Pelatihan/Produksi/Lahan, peta, Bantuan, dan 5 menu Master Data (Lembaga Petani, Petani, Pelatihan, Lahan, Monev BMP) — tanpa EXPORT, tanpa menulis; tanpa Report Kelompok Tani & Patok. Ini **membalik** #263 (2026-08-13), yang mencabut akses daftar petani karena memuat NIK & alamat.

- **Label & urutan menu (#364, 2026-09-29):** label prod diterima apa adanya (`data-analyst-data-availability` "Data — All Lembaga", `data-analyst-data-completeness` "Data — Per Lembaga"; judul halaman tetap "Ketersediaan Data — …"), lalu **`title` & `order` dikunci dari UI** Menu Management (opsi b): setelah CSV disamakan, perubahan judul/urutan hanya lewat `menu.csv` + seed. Ikon, induk, URL, dan Aktif/Visible tetap bisa diubah dari UI.

## Alternatif yang ditolak
- Seed sebagai sumber kebenaran lalu menimpa produksi — membatalkan keputusan yang diambil owner lewat UI.

## Konsekuensi
DONOR melihat data individu petani (nama/NIK). Perubahan judul/urutan menu oleh akun lain (akun demo, #364) tertutup oleh kunci `title`/`order` di server; perubahan izin & struktur lain lewat UI masih mungkin (akun demo tetap SUPERADMIN — opsi a tidak dipilih); `menu-access.test.ts` mengunci spesifikasi DONOR di sisi seed.

## Rujukan
[../standards/rbac.md](../standards/rbac.md) · [../product/role-flows.md](../product/role-flows.md) · `scripts/compare-role-permissions.ts`
