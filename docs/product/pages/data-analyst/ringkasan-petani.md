# Ringkasan Petani

[← Menu Data Analyst](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Ringkasan Petani (/admin/data-analyst/farmer-summary)
├── Header
│   └── Judul + deskripsi
├── Filter
│   ├── Distrik (combobox + search, default Semua Distrik)
│   ├── Lembaga Petani (ISH) (combobox + search, cascading, default Semua ISH)
│   └── Tombol Analisa
├── Empty state awal + Toast
├── Tab 1: Detail Petani
│   ├── Kartu KPI: Total Lembaga Petani, Total Petani, Total Persil, Luas Lahan
│   └── Tabel Detail Petani
│       ├── Kolom: Nama Lembaga Petani, ID Petani, Nama Petani, Total Persil
│       └── Pencarian petani + paginasi 10/25/50/100 (default 25)
├── Tab 2: Petani Tanpa Lahan
│   ├── Kartu KPI: Total Lembaga Petani, Petani Tanpa Lahan, % dari Total Petani
│   └── Tabel Petani Tanpa Lahan
│       ├── Kolom: Nama Lembaga Petani, ID Petani, Nama Petani, Status Lahan
│       └── Pencarian petani + paginasi default 25
└── Ekspor
    └── Excel (per tab)
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Sub menu | Ringkasan Petani (`data-analyst-farmer-summary`) |
| Route | `/admin/data-analyst/farmer-summary` |
| File | `src/app/(admin)/admin/data-analyst/farmer-summary/page.tsx` (Server Component) + `farmer-summary-client.tsx` (Client Component) + `loading.tsx` |
| Tipe | Halaman analisis (filter → tombol Analisa → 2 tab hasil) |
| Guard | `requirePermission("data-analyst-farmer-summary")` |
| Server action / data | `getDistrictsForAnalyst()`, `getFarmerGroupsForAnalyst(districtId)`, `getFarmerSummary({ districtId, farmerGroupId })`, `getFarmersWithoutParcels({ districtId, farmerGroupId })` — semua di `src/server/actions/data-analyst.ts`, guard `hasPermission("data-analyst-farmer-summary", "VIEW")` + `getAccessContext()` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| "Ringkasan Petani" | Heading | `h1`; deskripsi: "Analisis data petani berdasarkan district dan Lembaga Petani" |
| "Distrik" | Filter (combobox popover + search) | Placeholder cari: "Cari distrik..."; opsi "Semua Distrik" + daftar distrik; empty state "Distrik tidak ditemukan."; default `Semua Distrik` |
| "Lembaga Petani (ISH)" | Filter (combobox popover + search) | Placeholder cari: "Cari lembaga petani..."; opsi "Semua ISH" + daftar lembaga (cascading: dimuat ulang saat Distrik berubah); empty state "Lembaga Petani tidak ditemukan."; default `Semua ISH` |
| "Analisa" | Tombol | Ikon `Search`; label berubah jadi "Menganalisa..." saat pending; memuat kedua tab sekaligus |
| Empty state awal | Kartu | Ikon `Building` + teks "Klik tombol Analisa untuk memulai" |
| Toast | Notifikasi | Sukses: "Analisis data berhasil dimuat"; gagal: "Gagal memuat analisis data" / "Gagal memuat Lembaga Petani" |
| "Detail Petani" / "Petani Tanpa Lahan" | Tab | 2 tab, default `Detail Petani` |

## Tab: Detail Petani

**Kartu KPI** (4 kartu)

| Objek | Tipe | Keterangan |
|---|---|---|
| "Total Lembaga Petani" | Kartu KPI | Ikon `Building`; nilai + satuan "Lembaga Petani" |
| "Total Petani" | Kartu KPI | Ikon `Users`; nilai + satuan "petani" |
| "Total Persil" | Kartu KPI | Ikon `Layers`; nilai + satuan "persil" |
| "Luas Lahan" | Kartu KPI | Ikon `Trees`; format `id-ID` 2 desimal + " ha" |

**Tabel** (`DataTable`, pencarian pada `farmerName` dengan placeholder "Cari petani...", paginasi default 25 baris, opsi ukuran halaman 10/25/50/100, ekspor Excel dengan nama file `detail-petani-<yyyyMMdd>`)

| Kolom | Sortable |
|---|---|
| Nama Lembaga Petani | ya |
| ID Petani | ya |
| Nama Petani | ya |
| Total Persil | ya |

## Tab: Petani Tanpa Lahan

**Kartu KPI** (3 kartu)

| Objek | Tipe | Keterangan |
|---|---|---|
| "Total Lembaga Petani" | Kartu KPI | Ikon `Building`; satuan "Lembaga Petani" |
| "Petani Tanpa Lahan" | Kartu KPI | Ikon `Users`; satuan "petani" |
| "% dari Total Petani" | Kartu KPI | Ikon `Layers`; format persen 1 desimal |

**Tabel** (`DataTable`, pencarian pada `farmerName` placeholder "Cari petani...", paginasi default 25 baris, ekspor Excel dengan nama file `petani-tanpa-lahan-<yyyyMMdd>`)

| Kolom | Sortable | Keterangan |
|---|---|---|
| Nama Lembaga Petani | ya | |
| ID Petani | ya | |
| Nama Petani | ya | |
| Status Lahan | tidak | Badge tetap "Belum ada lahan" |
