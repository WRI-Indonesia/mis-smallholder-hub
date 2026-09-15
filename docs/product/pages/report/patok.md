# Page: Laporan Patok

[← Menu Report](./README.md) · [← Katalog halaman](../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `report-marker` (menu baru #331, keputusan owner 2026-09-14 — satu-satunya menu baru dari rangkaian #326–#332) |
| URL | `/admin/report/marker` |
| Icon | `Milestone` (tiang penanda; alternatif tersedia di Menu Management: `Signpost`, `Fence` — revisi owner 2026-09-15 dari `Landmark`) |
| File | `src/app/(admin)/admin/report/marker/page.tsx` · `marker-report-client.tsx` |
| Izin | VIEW layar · EXPORT unduhan Excel/spasial · PRINT PDF. Seed: `prisma/seeds/data/menu.csv` + `role-permissions.csv` (ADMIN penuh; OPERATOR/MANAGEMENT/SUPERADMIN EXPORT/PRINT/VIEW; DONOR PRINT/VIEW); DB berisi data → skrip parsial ter-track `scripts/seed/seed-menu-report-marker.mjs` (dry-run bawaan, `--apply` menulis; idempoten — hanya menambah yang belum ada, tidak memulihkan izin yang dihapus admin seperti `seed-menu-only.ts`). **Applied mis-dev & mis-staging-local 2026-09-14**; staging/prod menyusul |

## Diagram objek

```text
Page: Laporan Patok
├── Filter: Distrik (wajib) · Lembaga Petani (opsional) · Muat Data
├── Filter klien (setelah dimuat): Kondisi · NKT (semua / patok lahan NKT / bukan)
├── Unduh (EXPORT): Excel · Shapefile/GeoJSON/KML (Point) · (PRINT) PDF peta + tabel
├── KPI: Patok · Ada (terpasang) · Hilang · Rusak · Belum dipasang · Patok lahan NKT
└── Tabel: Kode · KT/Blok · Lahan (Nama Petani · ID Petani · ID Lahan #no, satu per baris) · Kondisi · Jenis · NKT · Lintang, Bujur
```

| Objek | Keterangan |
|---|---|
| Data | `getMarkerReportRows({ districtId, farmerGroupId }, mode)` — inti kueri **sama** dengan baris legenda Peta Lahan (`markerRowsForFilters`: scope akses via `AND`, lahan aktif, patok aktif, NKT turunan per patok & per lahan); `mode: "export"` memeriksa EXPORT di server sebelum baris dikirim untuk berkas |
| Tabel | `uniqueMarkerRows` — satu baris per patok fisik, lahan pemakai satu per baris (wrap), urut Kelompok Tani → Blok → kode; filter kondisi/NKT di klien; jumlah "N dari M" bila tersaring |
| KPI | Hitungan per kondisi dari daftar unik; "% dari patok" untuk Ada; patok NKT = salah satu lahan pemakai kena NKT |
| Unduh | `exportMarkerRow` (helper Peta Lahan) atas subset yang tersaring: Excel (kolom Kode Patok…), Point SHP/GeoJSON/KML, PDF landscape (peta klaster + tabel per lahan) — nama berkas `patok-<label>-<stempel>` / `patok-nkt-…` bila filter NKT |
| Bantuan | Tutorial `l-8-laporan-patok` |
