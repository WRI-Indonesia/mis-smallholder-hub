# Laporan Kelompok Tani (Detail)

[← Menu Report](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Laporan Kelompok Tani (Detail) (/admin/report/kelompok-tani-detail)
├── Header
│   └── Judul + deskripsi
├── Filter
│   ├── Distrik (opsional, combobox + search)
│   ├── Lembaga Petani * (combobox + search, auto-load)
│   └── Catatan filter
├── Kartu KPI
│   ├── Kelompok Tani
│   ├── Total Petani
│   ├── Total Lahan
│   └── Total Luas
├── Kontrol: Buka semua / Tutup semua
├── Empty state: Pilih Lembaga Petani / Tidak Ada Data
├── Roster collapsible
│   │   └── Seksi Kelompok Tani
│   │       └── Tabel Petani
│   │           └── Kolom: No, Nama Petani, ID Petani, Jml Lahan, Luas (Ha)
│   └── Seksi Kelompok Tani → Tabel Petani
└── Ekspor
    ├── Excel
    └── PDF
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Sub menu | Kelompok Tani (Detail) (`report-kelompok-tani-detail`) |
| Route | `/admin/report/kelompok-tani-detail` |
| File | `src/app/(admin)/admin/report/kelompok-tani-detail/page.tsx` + `kelompok-tani-detail-report-client.tsx` + `loading.tsx` |
| Tipe | Roster hierarkis collapsible (Kelompok Tani → Petani) |
| Guard | `requirePermission("report-kelompok-tani-detail")` |
| Server action / data | `getDistrictsForKtReport()`, `getFarmerGroupsForKtReport(districtId)`, `getKelompokTaniDetailReport(farmerGroupId)` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| "Laporan Kelompok Tani (Detail)" | Heading | Deskripsi "Roster per Lembaga Petani: rincian Kelompok Tani → daftar Petani (turunan data lahan)" |
| "Distrik" | Filter (combobox + search, opsional) | Default "Semua Distrik" |
| "Lembaga Petani *" | Filter (combobox + search, wajib) | Placeholder "Pilih Lembaga Petani"; memilih nilai langsung memuat laporan |
| Catatan filter | Teks bantu | "Pilih satu Lembaga Petani untuk menampilkan roster rinci. Filter Distrik opsional (mempersempit daftar Lembaga)." |
| Kartu KPI | 4 kartu | "Kelompok Tani", "Total Petani", "Total Lahan", "Total Luas" |
| "Buka semua" / "Tutup semua" | Tombol | Default semua seksi tertutup |
| Seksi collapsible | Header seksi | Satu seksi per Kelompok Tani dengan "`<n>` Petani · `<n>` Lahan · `<n>` Ha". Nilai kosong ditampilkan "(tidak diketahui)" |
| Empty state | Kartu | "Pilih Lembaga Petani" / saat memuat "Memuat laporan..."; bila tanpa data: "Tidak Ada Data" — "Lembaga Petani ini belum memiliki lahan aktif dengan data Kelompok Tani." |

## Tabel petani per Kelompok Tani

(tanpa paginasi & pencarian)

| Kolom | Keterangan |
|---|---|
| No | Nomor urut dalam KT |
| Nama Petani | |
| ID Petani | mono |
| Jml Lahan | rata kanan |
| Luas (Ha) | rata kanan, 2 desimal |

## Opsi ekspor

(data diratakan ke satu tabel)

| Format | Keterangan |
|---|---|
| Excel | Sheet "Detail KT", file `Laporan_Kelompok_Tani_Detail_<Lembaga>`; kolom No, Kelompok Tani, Nama Petani, ID Petani, Jml Lahan, Luas (Ha) + baris Total |
| PDF | Judul "LAPORAN KELOMPOK TANI (DETAIL)", metadata Lembaga Petani & Distrik; kolom sama + baris Total |
