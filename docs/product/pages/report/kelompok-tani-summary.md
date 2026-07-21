# Laporan Kelompok Tani (Ringkasan)

[← Menu Report](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Laporan Kelompok Tani (Ringkasan) (/admin/report/kelompok-tani)
├── Header
│   └── Judul + deskripsi
├── Filter
│   ├── Distrik (opsional, combobox + search)
│   ├── Lembaga Petani (opsional, combobox + search)
│   ├── Cari (input teks, filter sisi klien)
│   └── Catatan filter
├── Kartu KPI
│   ├── Lembaga Petani
│   ├── Gapoktan/KUD
│   ├── Kelompok Tani
│   ├── Total Petani
│   ├── Total Lahan
│   └── Total Luas
├── Selektor Kolom (dropdown "Tampilkan Kolom")
├── Empty state: Tidak Ada Data Kelompok Tani
├── Tabel Kelompok Tani
│   ├── Kolom: No, Lembaga Petani, Gapoktan/KUD, Kelompok Tani,
│   │          Total Petani, Total Lahan, Total Luas (Ha)
│   └── Baris Total (tanpa paginasi)
└── Ekspor
    ├── Excel
    └── PDF
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Sub menu | Kelompok Tani (Summary) (`report-kelompok-tani`) |
| Route | `/admin/report/kelompok-tani` |
| File | `src/app/(admin)/admin/report/kelompok-tani/page.tsx` + `kelompok-tani-report-client.tsx` + `loading.tsx` |
| Tipe | Rekap real-time (auto-load saat mount & saat filter berubah) |
| Guard | `requirePermission("report-kelompok-tani")` |
| Server action / data | `getDistrictsForKtReport()`, `getFarmerGroupsForKtReport(districtId)`, `getKelompokTaniReport({ districtId, farmerGroupId })` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| "Laporan Kelompok Tani (Ringkasan)" | Heading | Deskripsi "Rekap Gapoktan/KUD & Kelompok Tani turunan dari data lahan (per Lembaga Petani)" |
| "Distrik" | Filter (combobox + search, opsional) | Default "Semua Distrik" |
| "Lembaga Petani" | Filter (combobox + search, opsional) | Default "Semua Lembaga Petani"; empty "Lembaga petani tidak ditemukan." |
| "Cari" | Filter (input teks) | Placeholder "Lembaga / Gapoktan/KUD / KT..."; filter di sisi klien pada kolom Lembaga Petani, Gapoktan/KUD, Kelompok Tani |
| Catatan filter | Teks bantu | "Rekap real-time turunan dari data lahan aktif. Filter Distrik/Lembaga bersifat opsional." |
| Kartu KPI | 6 kartu | "Lembaga Petani" (badge Lembaga), "Gapoktan/KUD" (badge Gapoktan/KUD), "Kelompok Tani" (badge KT), "Total Petani" (badge Petani), "Total Lahan" (badge Lahan), "Total Luas" (badge Ha) |
| "Kolom" | Dropdown selektor kolom | "Tampilkan Kolom": Gapoktan/KUD, Kelompok Tani, Total Petani, Total Lahan, Total Luas (semua aktif secara default) |
| Empty state | Kartu | "Tidak Ada Data Kelompok Tani" — "Belum ada lahan aktif dengan data Gapoktan/KUD atau Kelompok Tani untuk cakupan yang dipilih."; bila pencarian tak cocok: "Tidak ada baris yang cocok dengan pencarian." |

## Tabel

(tabel HTML manual, tanpa paginasi; nilai kosong ditampilkan "(tidak diketahui)")

| Kolom | Keterangan |
|---|---|
| No | Nomor urut |
| Lembaga Petani | Selalu tampil |
| Gapoktan/KUD | Opsional (selektor kolom) |
| Kelompok Tani | Opsional |
| Total Petani | Opsional, rata kanan |
| Total Lahan | Opsional, rata kanan |
| Total Luas (Ha) | Opsional, rata kanan |

Agregasi: baris footer "Total" dihitung dari baris hasil pencarian (`filteredTotals`).

## Opsi ekspor

| Format | Keterangan |
|---|---|
| Excel | Sheet "Kelompok Tani", file `Laporan_Kelompok_Tani_<Lembaga/Distrik/Semua>`; kolom mengikuti selektor kolom + baris Total |
| PDF | Judul "LAPORAN KELOMPOK TANI", metadata Distrik & Lembaga Petani; kolom mengikuti selektor + baris Total |
