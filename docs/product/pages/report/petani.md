# Laporan Petani

[← Menu Report](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Laporan Petani (/admin/report/farmer)
├── Header
│   └── Judul + deskripsi (print:hidden)
├── Filter
│   ├── Distrik * (combobox + search)
│   ├── Lembaga Petani * (combobox + search)
│   └── Tombol Tampilkan Laporan
├── Empty state: Filter Wajib Belum Lengkap
├── Header cetak (print-only): LAPORAN RINGKASAN PETANI
├── Kartu KPI
│   ├── Total Petani
│   ├── Total Lahan
│   ├── Total Luas Lahan
│   └── Rata-rata Luas
├── Tabel Petani
│   ├── Kolom: ID Petani, Nama Petani, L/P, NIK, Tahun Bergabung,
│   │          Jumlah Lahan (Persil), Total Luas (Ha)
│   └── Pencarian nama + paginasi 10/25/50/100
└── Ekspor
    ├── Excel
    └── PDF
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Sub menu | Petani (`report-farmer`) |
| Route | `/admin/report/farmer` |
| File | `src/app/(admin)/admin/report/farmer/page.tsx` + `farmer-report-client.tsx` + `loading.tsx` |
| Tipe | Laporan (filter wajib → kartu KPI + tabel) |
| Guard | `requirePermission("report-farmer")` |
| Server action / data | `getDistrictsForReport()`, `getFarmerGroupsForReport(districtId)`, `getFarmerReport({ districtId, farmerGroupId })` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| "Laporan Petani" | Heading | `h1`; deskripsi "Analisis ringkasan dan rincian data petani"; disembunyikan saat cetak (`print:hidden`) |
| "Distrik *" | Filter (combobox + search, wajib) | Placeholder tombol "Pilih Distrik"; placeholder cari "Cari distrik..."; empty "Distrik tidak ditemukan." |
| "Lembaga Petani *" | Filter (combobox + search, wajib) | Disabled sampai Distrik dipilih; placeholder "Pilih Lembaga Petani"; cari "Cari lembaga petani..."; empty "Kelompok tani tidak ditemukan." |
| "Tampilkan Laporan" | Tombol | Disabled sampai kedua filter terisi; toast "Laporan berhasil dimuat" |
| Empty state | Kartu | "Filter Wajib Belum Lengkap" — "Silakan pilih Distrik dan Lembaga Petani untuk memuat ringkasan dan rincian data laporan petani." |
| Header cetak | Blok print-only | "LAPORAN RINGKASAN PETANI" + subtitle + Distrik & Lembaga Petani |
| "Total Petani" | Kartu KPI | Badge "Petani" |
| "Total Lahan" | Kartu KPI | Badge "Persil" |
| "Total Luas Lahan" | Kartu KPI | Badge "Ha" |
| "Rata-rata Luas" | Kartu KPI | Badge "Ha / Petani" |

## Tabel

(`DataTable`; pencarian pada `name` dengan placeholder "Cari nama petani..."; paginasi default 10 baris, opsi 10/25/50/100)

| Kolom | Sortable | Keterangan |
|---|---|---|
| ID Petani | ya | mono |
| Nama Petani | ya | |
| L/P | ya | Badge "Laki-laki"/"Perempuan" |
| NIK | ya | Disensor di layar (`maskNik`); ekspor tetap penuh |
| Tahun Bergabung | ya | "—" bila kosong |
| Jumlah Lahan (Persil) | ya | |
| Total Luas (Ha) | ya | format `id-ID` 2 desimal + " Ha" |

## Opsi ekspor

| Format | Keterangan |
|---|---|
| Excel | Tombol bawaan `DataTable`; nama file `Laporan_Petani_<Distrik>_<Lembaga>` |
| PDF | Tombol "PDF" di toolbar tabel; judul "LAPORAN RINGKASAN DATA PETANI"; kolom ID Petani, Nama Petani, Gender, NIK, Tahun Bergabung, Lahan (Persil), Total Luas (Ha); metadata Distrik & Lembaga Petani |
