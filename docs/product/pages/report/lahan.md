# Laporan Lahan

[← Menu Report](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Laporan Lahan (/admin/report/land-parcel)
├── Header
│   └── Judul + deskripsi
├── Filter
│   ├── Distrik (combobox + search)
│   ├── Lembaga Petani (combobox + search, wajib secara efektif)
│   └── Catatan filter
├── Kartu KPI
│   ├── Total Petani
│   ├── Kelompok Tani
│   ├── Total Lahan
│   └── Total Luas
├── Peta Cetak — Grid & Label
│   ├── Grid Index (Baris × Kolom)
│   ├── Label Poligon (No, Nama, ID Petani, ID Lahan, Kelompok Tani)
│   └── Preview peta SVG (ikhtisar + peta per sel, panah utara, skala batang)
├── Selektor Kolom (dropdown "Tampilkan Kolom")
├── Empty state: Pilih Lembaga Petani / Tidak Ada Data Lahan
├── Tabel Lahan
│   ├── Kolom: No, Lembaga Petani, Nama Petani, ID Petani, ID Lahan,
│   │          Kelompok Tani, Blok, Komoditas, Species,
│   │          PSR, Tahun Tanam, Luas (Ha)
│   └── Baris Total (tanpa paginasi & pencarian)
└── Ekspor
    ├── Excel
    └── PDF
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Sub menu | Lahan (`report-land-parcel`) |
| Route | `/admin/report/land-parcel` |
| File | `src/app/(admin)/admin/report/land-parcel/page.tsx` + `land-parcel-report-client.tsx` + `loading.tsx` |
| Tipe | Roster lahan + peta cetak (SVG) dengan grid index |
| Guard | `requirePermission("report-land-parcel")` |
| Server action / data | `getDistrictsForLandParcelReport()`, `getFarmerGroupsForLandParcelReport(districtId)`, `getLandParcelReport({ districtId, farmerGroupId })`, `getLandParcelReportGeometries(farmerGroupId)`; helper `src/lib/report-land-parcel.ts`, `src/lib/report-land-parcel-xlsx.ts`, `src/lib/report-land-parcel-pdf.ts` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| "Laporan Lahan" | Heading | Deskripsi "Roster lahan per Lembaga Petani (Lembaga, Petani, ID Petani, ID Lahan, Kelompok Tani)" |
| "Distrik" | Filter (combobox + search) | Default "Semua Distrik" |
| "Lembaga Petani" | Filter (combobox + search) | Label tombol default "Semua Lembaga Petani", namun laporan baru dimuat setelah satu Lembaga dipilih (wajib secara efektif) |
| Catatan filter | Teks bantu | "Roster real-time dari data lahan aktif (1 baris = 1 lahan). Pilih Lembaga Petani (wajib) — laporan & cetakan selalu per Lembaga; filter Distrik membantu mempersempit daftar. PDF & Excel menyertakan peta lahan — atur pecahan grid dan isi label poligon di panel Peta Cetak." |
| Kartu KPI | 4 kartu | "Total Petani" (badge Petani), "Kelompok Tani" (badge KT), "Total Lahan" (badge Lahan), "Total Luas" (badge Ha) |
| "Peta Cetak — Grid & Label" | Kartu pengaturan peta | Ikon `Grid3x3` |
| "Grid Index (Baris × Kolom)" | Filter (dua input `number`) | Baris 1–26, kolom 1–20; teks bantu "maks. `<n>` peta + ikhtisar" atau "tanpa pecah" |
| "Label Poligon" | Filter (checkbox, minimal satu aktif) | Opsi: No, Nama, ID Petani, ID Lahan, Kelompok Tani (default: No) |
| Preview peta | Chart / SVG | Tanpa grid: 1 halaman peta. Dengan grid: 1 ikhtisar (garis grid + label sel + "`<n>` lahan") + satu peta per sel; dekorasi panah utara & skala batang; catatan "`<n>` lahan tanpa geometri tidak tergambar (No …)."; state "Memuat geometri lahan..." dan "Tidak ada geometri lahan yang dapat digambar." |
| "Kolom" | Dropdown selektor kolom | "Tampilkan Kolom": Kelompok Tani, Blok, Komoditas, Species, PSR, Tahun Tanam, Luas (Ha). Default aktif: Kelompok Tani, Tahun Tanam, Luas (Ha) |
| Empty state | Kartu | "Pilih Lembaga Petani untuk memuat laporan." / "Memuat laporan..."; bila tanpa baris: "Tidak Ada Data Lahan" — "Belum ada lahan aktif untuk cakupan yang dipilih." |

## Tabel

(tabel HTML manual, tanpa paginasi & pencarian; 1 baris = 1 lahan; nilai kosong ditampilkan "-")

| Kolom | Keterangan |
|---|---|
| No | Nomor urut (sinkron dengan nomor label poligon di peta) |
| Lembaga Petani | Selalu tampil |
| Nama Petani | Selalu tampil |
| ID Petani | Selalu tampil |
| ID Lahan | Selalu tampil |
| Kelompok Tani | Opsional (default aktif) |
| Blok | Opsional |
| Komoditas | Opsional |
| Species | Opsional (italic) |
| PSR | Opsional; Badge "PSR" atau teks "Non-PSR" |
| Tahun Tanam | Opsional (default aktif), rata kanan |
| Luas (Ha) | Opsional (default aktif), rata kanan, 2 desimal |

Agregasi: baris footer "Total" berisi jumlah Luas (Ha), hanya muncul bila kolom Luas aktif.

## Opsi ekspor

| Format | Keterangan |
|---|---|
| Excel | File `Laporan_Lahan_<Lembaga/Distrik/Semua>`; sheet "Lahan" berisi seluruh baris + gambar peta (PNG hasil rasterisasi SVG). Bila grid aktif: tambahan satu sheet per sel grid berisi subset baris sel + gambar peta sel. Kolom mengikuti selektor kolom. Bila geometri belum termuat: "Geometri lahan masih dimuat — coba lagi sebentar." |
| PDF | File `Laporan_Lahan_<…>` via `exportLandParcelReportPDF`; metadata Distrik & Lembaga Petani; kolom mengikuti selektor kolom + baris Total; menyertakan halaman peta sesuai pengaturan grid & label |
