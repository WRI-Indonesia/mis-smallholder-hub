# Laporan Produksi

[← Menu Report](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Laporan Produksi (/admin/report/production)
├── Header
│   └── Judul + deskripsi
├── Filter
│   ├── Distrik * (combobox + search)
│   ├── Lembaga Petani * (combobox + search)
│   ├── Periode Awal * (input month)
│   ├── Periode Akhir * (input month)
│   ├── Tombol Tampilkan Laporan
│   └── Catatan filter (maks. 24 bulan)
├── Kartu KPI
│   ├── Total Petani
│   ├── Total Baris Lahan
│   ├── Total Produksi
│   └── Jumlah Bulan
├── Empty state: Filter Wajib Belum Lengkap / Tidak Ada Data Produksi
├── Tabel Matriks Produksi
│   ├── Kolom: No, Nama Petani, Id Petani, Id Lahan, Luas (Ha),
│   │          <Bulan> (satu kolom per periode), Total
│   └── Baris Total per Bulan (tanpa paginasi, scroll horizontal)
└── Ekspor
    ├── Excel
    └── PDF
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Sub menu | Produksi (`report-production`) |
| Route | `/admin/report/production` |
| File | `src/app/(admin)/admin/report/production/page.tsx` + `production-report-client.tsx` |
| Tipe | Matriks produksi bulanan (tabel HTML manual, bukan `DataTable`) |
| Guard | `requirePermission("report-production")` |
| Server action / data | `getDistrictsForProductionReport()`, `getFarmerGroupsForProductionReport(districtId)`, `getProductionReport({ districtId, farmerGroupId, periodStart, periodEnd })`; helper `src/lib/report-production.ts` (`PRODUCTION_REPORT_MAX_MONTHS = 24`) |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| "Laporan Produksi" | Heading | Deskripsi "Matriks produksi bulanan per petani/lahan dalam satu Lembaga Petani" |
| "Distrik *" | Filter (combobox + search, wajib) | Placeholder "Pilih Distrik" |
| "Lembaga Petani *" | Filter (combobox + search, wajib) | Disabled sampai Distrik dipilih |
| "Periode Awal *" | Filter (`input type="month"`, wajib) | `max` = Periode Akhir |
| "Periode Akhir *" | Filter (`input type="month"`, wajib) | `min` = Periode Awal |
| "Tampilkan Laporan" | Tombol | Validasi klien: "Periode Akhir harus sama dengan atau setelah Periode Awal" dan "Rentang periode maksimal 24 bulan"; server memvalidasi ulang |
| Catatan filter | Teks bantu | "Pilih Lembaga Petani dan rentang bulan (maksimal 24 bulan) untuk menampilkan matriks produksi." |
| "Total Petani" | Kartu KPI | Badge "Petani" |
| "Total Baris Lahan" | Kartu KPI | Badge "Baris" |
| "Total Produksi" | Kartu KPI | Badge "kg" |
| "Jumlah Bulan" | Kartu KPI | Badge "Bulan" |
| Empty state filter | Kartu | "Filter Wajib Belum Lengkap" — "Silakan pilih Distrik, Lembaga Petani, dan rentang periode untuk memuat matriks produksi bulanan." |
| Empty state data | Kartu | "Tidak Ada Data Produksi" — "Tidak ada catatan produksi untuk Lembaga Petani dan rentang periode yang dipilih." |

## Tabel matriks

(tanpa paginasi & tanpa pencarian; scroll horizontal; kolom No sticky)

| Kolom | Keterangan |
|---|---|
| No | Nomor urut |
| Nama Petani | |
| Id Petani | mono |
| Id Lahan | "-" bila kosong |
| Luas (Ha) | 2 desimal, rata kanan |
| `<Bulan>` (satu kolom per periode) | Label periode dari `formatPeriodLabel`; sel tanpa data dibiarkan kosong (bukan 0) |
| Total | Total per baris |

Agregasi: baris footer "Total per Bulan" berisi total luas, `columnTotals` per bulan, dan `grandTotal`.

## Opsi ekspor

(toolbar di atas tabel)

| Format | Keterangan |
|---|---|
| Excel | Sheet "Produksi", file `Laporan_Produksi_<Lembaga>_<periodStart>_sd_<periodEnd>`; kolom No, Nama Petani, Id Petani, Id Lahan, Luas (Ha), kolom bulan, Total + baris "Total per Bulan" |
| PDF | Judul "CATATAN PRODUKSI PETANI", orientasi landscape, metadata Distrik / Lembaga Petani / Periode; kolom sama dengan Excel; ukuran font mengecil bila lebih dari 12 bulan |
