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
│   ├── Total Sesi / Total Peserta / Total Unik
│   └── Cakupan Paket 1 / Paket 2 - MK / Paket 2 - HSE (K3) / P3 & 4
├── Tab 1: Sesi Pelatihan
│   └── Tabel Sesi
│       ├── Kolom: Paket Pelatihan, Tanggal Pelatihan, Lokasi, Total Peserta
│       └── Pencarian paket + paginasi 10 baris
├── Tab 2: Detail per Pelatihan
│   ├── Filter Jenis Pelatihan
│   ├── Filter Tanggal Pelatihan (bila paket spesifik)
│   ├── Tabel Cakupan (mode "Semua Pelatihan")
│   │   └── Kolom: ID Petani, Nama Petani, L/P, Paket 1,
│   │              Paket 2 - MK, Paket 2 - K3, Paket 3 & 4
│   └── Tabel Peserta Sesi (mode paket spesifik)
│       ├── Kolom: NO, Nama Petani, Farmer ID, Tanggal, Pre-Test, Post-Test
│       ├── "Semua Tanggal" → petani unik, baris = sesi terakhirnya
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
| Tipe | Laporan 2 tab (sesi & cakupan) |
| Guard | `requirePermission("report-training")` |
| Server action / data | `getDistrictsForTrainingReport()`, `getFarmerGroupsForTrainingReport(districtId)`, `getTrainingReport({ districtId, farmerGroupId })` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Panduan` | Tautan | `HelpHint` — ikon `?` di header menuju tutorial Bantuan untuk `report-training` (`findTutorialForMenu`), dibuka di tab baru |
| "Laporan Pelatihan" | Heading | Deskripsi "Analisis ringkasan sesi pelatihan dan cakupan petani" |
| "Parameter Laporan" | Kartu filter collapsible | Ikon `BarChart3`; klik header untuk buka/tutup (ikut menyembunyikan kartu KPI) |
| "Distrik *" | Filter (combobox + search, wajib) | Primitif `FilterCombobox` (#212); placeholder "Pilih Distrik", empty "Distrik tidak ditemukan." |
| "Lembaga Petani *" | Filter (combobox + search, wajib) | Primitif `FilterCombobox` (#212); disabled sampai Distrik dipilih; empty "Lembaga Petani tidak ditemukan." |
| "Tampilkan Laporan" | Tombol | Mereset filter paket & tanggal setelah berhasil |
| Empty state | Kartu | "Filter Wajib Belum Lengkap" — "Silakan pilih Distrik dan Lembaga Petani untuk memuat ringkasan, sesi pelatihan, dan cakupan data laporan pelatihan." |
| Header cetak | Blok print-only | "LAPORAN RINGKASAN PELATIHAN" |
| "Total Sesi" / "Total Peserta" / "Total Unik" | Kartu KPI | Badge "Sesi" / "Peserta" / "Petani" |
| "Cakupan Paket 1", "Cakupan Paket 2 - MK", "Cakupan Paket 2 - HSE (K3)", "Cakupan P3 & 4" | Kartu KPI | Nilai persen + sub-teks "`<n>` dari `<total petani>`" |
| "Sesi Pelatihan" / "Detail per Pelatihan" | Tab | Default tab `Sesi Pelatihan` |
| "Excel (2-Sheet)" & "PDF" | Tombol ekspor | Berada di baris tab, berlaku untuk kedua tab |

## Tab 1 — Sesi Pelatihan

(`DataTable`; pencarian `packageName` placeholder "Cari paket pelatihan..."; paginasi default 10 baris; tanpa tombol Excel bawaan)

| Kolom | Sortable | Keterangan |
|---|---|---|
| Paket Pelatihan | ya | Label dari `TRAINING_CATEGORY_LABELS`: "Paket 1 - BMP + P&C RSPO + NKT", "Paket 2 - MK (Manajemen Kelompok)", "Paket 2 - K3 (Keselamatan & Kesehatan Kerja)", "Paket 3&4", "Lainnya" |
| Tanggal Pelatihan | ya | Format `dd-Mmm-yy` |
| Lokasi | ya | "—" bila kosong |
| Total Peserta | ya | "`<n>` Peserta" |

## Tab 2 — Detail per Pelatihan

| Objek | Tipe | Keterangan |
|---|---|---|
| "Filter Jenis Pelatihan:" | Filter (combobox + search) | Opsi: "Semua Pelatihan (Cakupan per Petani)", "Paket 1 - BMP + P&C RSPO + NKT", "Paket 2 - MK", "Paket 2 - HSE (K3)", "Paket 3 & 4" — hanya paket yang punya sesi yang ditampilkan; empty "Jenis pelatihan tidak ditemukan." |
| "Filter Tanggal Pelatihan:" | Filter (combobox + search) | Tampil hanya bila paket spesifik dipilih; opsi "Semua Tanggal" + tanggal sesi (urut terbaru); empty "Tanggal tidak ditemukan." |

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

Bila paket spesifik dipilih → tabel peserta sesi (`DataTable`; pencarian `name` placeholder "Cari nama peserta..."; ekspor Excel `Laporan_Pelatihan_<Nama Paket>` + tombol PDF) plus blok print-only "DAFTAR PESERTA PELATIHAN" (Jenis Pelatihan, Tanggal, Lokasi). Tanggal "Semua Tanggal" → **petani unik**: yang ikut lebih dari satu sesi paket itu tampil satu baris dengan tanggal + nilai pre/post dari sesi terakhirnya — berlaku sama di tabel layar, Excel, dan PDF; kolom Tanggal selalu berisi tanggal sesi per baris:

| Kolom | Sortable |
|---|---|
| NO | tidak |
| Nama Petani | ya |
| Farmer ID | ya |
| Tanggal | ya |
| Pre-Test | ya |
| Post-Test | ya |

## Opsi ekspor

| Format | Keterangan |
|---|---|
| Excel (2-Sheet) | `exportMultiSheetToExcel`, file `Laporan_Pelatihan_<Distrik>_<Lembaga>`. Sheet "Sesi Pelatihan": Paket Pelatihan, Tanggal Pelatihan, Lokasi, Total Peserta. Sheet "Cakupan per Petani": Farmer ID, Nama Petani, Gender, Paket 1 (BMP+RSPO), Paket 2 - MK, Paket 2 - K3, Paket 3 & 4 |
| PDF | Dua bentuk. (a) Paket spesifik terpilih → "LAPORAN KEGIATAN PELATIHAN", kolom NO, Nama Petani, Farmer ID, Tanggal, Pre-Test, Post-Test; metadata Distrik, Lembaga Petani, Jenis Pelatihan, Tanggal, Lokasi. (b) Selain itu → "LAPORAN CAKUPAN PELATIHAN PETANI", kolom Farmer ID, Nama Petani, Gender, Paket 1, Paket 2 - MK, Paket 2 - K3, Paket 3 & 4 |
