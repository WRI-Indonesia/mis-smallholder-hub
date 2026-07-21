# Laporan Pelatihan

[← Menu Report](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Laporan Pelatihan (/admin/report/training)
├── Header
│   └── Judul + deskripsi
├── Filter (kartu "Parameter Laporan", collapsible)
│   ├── Distrik * (combobox + search)
│   ├── Lembaga Petani * (combobox + search)
│   └── Tombol Tampilkan Laporan
├── Empty state: Filter Wajib Belum Lengkap
├── Header cetak (print-only): LAPORAN RINGKASAN PELATIHAN
├── Kartu KPI
│   ├── Total Kegiatan / Total Peserta / Total Unik
│   └── Cakupan Paket 1 / Paket 2 - MK / Paket 2 - HSE (K3) / P3 & 4
├── Tab 1: Kegiatan Pelatihan
│   └── Tabel Kegiatan
│       ├── Kolom: Paket Pelatihan, Tanggal Pelatihan, Lokasi, Total Peserta
│       └── Pencarian paket + paginasi 10 baris
├── Tab 2: Cakupan per Petani
│   ├── Filter Jenis Pelatihan
│   ├── Filter Tanggal Pelatihan (bila paket spesifik)
│   ├── Tabel Cakupan (mode "Semua Pelatihan")
│   │   └── Kolom: ID Petani, Nama Petani, L/P, Paket 1,
│   │              Paket 2 - MK, Paket 2 - K3, Paket 3 & 4
│   └── Tabel Peserta Kegiatan (mode paket spesifik)
│       ├── Kolom: NO, Nama Petani, Farmer ID, Tanggal, Pre-Test, Post-Test
│       └── Blok print-only DAFTAR PESERTA PELATIHAN
└── Ekspor
    ├── Excel (2-Sheet)
    └── PDF
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Sub menu | Pelatihan (`report-training`) |
| Route | `/admin/report/training` |
| File | `src/app/(admin)/admin/report/training/page.tsx` + `training-report-client.tsx` + `loading.tsx` |
| Tipe | Laporan 2 tab (kegiatan & cakupan) |
| Guard | `requirePermission("report-training")` |
| Server action / data | `getDistrictsForTrainingReport()`, `getFarmerGroupsForTrainingReport(districtId)`, `getTrainingReport({ districtId, farmerGroupId })` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| "Laporan Pelatihan" | Heading | Deskripsi "Analisis ringkasan kegiatan pelatihan dan cakupan petani" |
| "Parameter Laporan" | Kartu filter collapsible | Ikon `BarChart3`; klik header untuk buka/tutup (ikut menyembunyikan kartu KPI) |
| "Distrik *" | Filter (combobox + search, wajib) | Placeholder "Pilih Distrik" |
| "Lembaga Petani *" | Filter (combobox + search, wajib) | Disabled sampai Distrik dipilih |
| "Tampilkan Laporan" | Tombol | Mereset filter paket & tanggal setelah berhasil |
| Empty state | Kartu | "Filter Wajib Belum Lengkap" — "Silakan pilih Distrik dan Lembaga Petani untuk memuat ringkasan, kegiatan pelatihan, dan cakupan data laporan pelatihan." |
| Header cetak | Blok print-only | "LAPORAN RINGKASAN PELATIHAN" |
| "Total Kegiatan" / "Total Peserta" / "Total Unik" | Kartu KPI | Badge "Kegiatan" / "Peserta" / "Petani" |
| "Cakupan Paket 1", "Cakupan Paket 2 - MK", "Cakupan Paket 2 - HSE (K3)", "Cakupan P3 & 4" | Kartu KPI | Nilai persen + sub-teks "`<n>` dari `<total petani>`" |
| "Kegiatan Pelatihan" / "Cakupan per Petani" | Tab | Default tab `Kegiatan Pelatihan` |
| "Excel (2-Sheet)" & "PDF" | Tombol ekspor | Berada di baris tab, berlaku untuk kedua tab |

## Tab 1 — Kegiatan Pelatihan

(`DataTable`; pencarian `packageName` placeholder "Cari paket pelatihan..."; paginasi default 10 baris; tanpa tombol Excel bawaan)

| Kolom | Sortable | Keterangan |
|---|---|---|
| Paket Pelatihan | ya | Label dari `TRAINING_CATEGORY_LABELS`: "Paket 1 - BMP + P&C RSPO + NKT", "Paket 2 - MK (Manajemen Kelompok)", "Paket 2 - K3 (Keselamatan & Kesehatan Kerja)", "Paket 3&4", "Lainnya" |
| Tanggal Pelatihan | ya | Format `dd-Mmm-yy` |
| Lokasi | ya | "—" bila kosong |
| Total Peserta | ya | "`<n>` Peserta" |

## Tab 2 — Cakupan per Petani

| Objek | Tipe | Keterangan |
|---|---|---|
| "Filter Jenis Pelatihan:" | Filter (combobox + search) | Opsi: "Semua Pelatihan (Cakupan per Petani)", "Paket 1 - BMP + P&C RSPO + NKT", "Paket 2 - MK", "Paket 2 - HSE (K3)", "Paket 3 & 4" — hanya paket yang punya kegiatan yang ditampilkan; empty "Jenis pelatihan tidak ditemukan." |
| "Filter Tanggal Pelatihan:" | Filter (combobox + search) | Tampil hanya bila paket spesifik dipilih; opsi "Semua Tanggal" + tanggal kegiatan (urut terbaru); empty "Tanggal tidak ditemukan." |

Bila filter jenis = "Semua Pelatihan" → tabel cakupan (`DataTable`; pencarian `name` placeholder "Cari nama petani..."; ekspor Excel `Laporan_Cakupan_Pelatihan_<Distrik>_<Lembaga>` + tombol PDF):

| Kolom | Sortable | Keterangan |
|---|---|---|
| ID Petani | ya | mono |
| Nama Petani | ya | |
| L/P | ya | Badge "Laki-laki"/"Perempuan" |
| Paket 1 | ya | Tanggal atau "-belum-" |
| Paket 2 - MK | ya | Tanggal atau "-belum-" |
| Paket 2 - K3 | ya | Tanggal atau "-belum-" |
| Paket 3 & 4 | ya | Tanggal atau "-belum-" |

Bila paket spesifik dipilih → tabel peserta kegiatan (`DataTable`; pencarian `name` placeholder "Cari nama peserta..."; ekspor Excel `Laporan_Pelatihan_<Nama Paket>` + tombol PDF) plus blok print-only "DAFTAR PESERTA PELATIHAN" (Jenis Pelatihan, Tanggal, Lokasi):

| Kolom | Sortable |
|---|---|
| NO | tidak |
| Nama Petani | ya |
| Farmer ID | ya |
| Tanggal | tidak |
| Pre-Test | ya |
| Post-Test | ya |

## Opsi ekspor

| Format | Keterangan |
|---|---|
| Excel (2-Sheet) | `exportMultiSheetToExcel`, file `Laporan_Pelatihan_<Distrik>_<Lembaga>`. Sheet "Kegiatan Pelatihan": Paket Pelatihan, Tanggal Pelatihan, Lokasi, Total Peserta. Sheet "Cakupan per Petani": Farmer ID, Nama Petani, Gender, Paket 1 (BMP+RSPO), Paket 2 - MK, Paket 2 - K3, Paket 3 & 4 |
| PDF | Dua bentuk. (a) Paket spesifik terpilih → "LAPORAN KEGIATAN PELATIHAN", kolom NO, Nama Petani, Farmer ID, Tanggal, Pre-Test, Post-Test; metadata Distrik, Lembaga Petani, Jenis Pelatihan, Tanggal, Lokasi. (b) Selain itu → "LAPORAN CAKUPAN PELATIHAN PETANI", kolom Farmer ID, Nama Petani, Gender, Paket 1, Paket 2 - MK, Paket 2 - K3, Paket 3 & 4 |
