# Page: Produksi (daftar)

[← Produksi](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Produksi (/admin/master-data/production)
├── Header
│   ├── Judul: Produksi
│   └── Deskripsi: Data panen dan produksi hasil tani (yield) per petani
├── Toolbar
│   ├── Filter: Distrik (combobox)
│   ├── Filter: Lembaga Petani (combobox, cascade dari Distrik)
│   ├── Filter: Periode (month)
│   ├── Filter: Lahan
│   ├── Filter: Status (SUPERADMIN)
│   ├── Filter: Pencarian
│   ├── Tombol: Tambah Data
│   ├── Tombol: Excel
│   └── Tombol: Kolom
└── Tabel
    ├── Kolom: Petani, Lembaga Petani, Lahan, Periode, Tanggal Panen,
    │          Panen Ke-, Hasil (kg), Status
    └── Aksi baris: Lihat, Edit, Nonaktifkan
```

| Atribut | Nilai |
|---|---|
| File | `production/page.tsx` + `production/components/production-list-client.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-production")` |
| Server action / data | `getProductionRecords({ search, farmerGroupId, period, hasParcel, status })` (`@/server/actions/production`), `getFarmerGroupOptions`, `getDistrictsForSelect`, `getUserPermissionsForMenu`, `isSuperAdmin`; menerima `searchParams` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Produksi` / `Data panen dan produksi hasil tani (yield) per petani` | Heading | h1 + deskripsi |
| `Panduan` | Tautan | `HelpHint` (`src/app/(admin)/admin/help/help-hint.tsx`) — ikon `?` di header menuju tutorial Bantuan untuk `master-data-production` (`findTutorialForMenu`), dibuka di tab baru |
| Filter Distrik | Combobox | `Semua Distrik` (`DistrictGroupFilter`, `src/components/shared/district-group-filter.tsx`) |
| Filter Lembaga Petani | Combobox | `Semua Lembaga Petani` — daftar ikut menyempit saat Distrik dipilih; pilihan yang tidak cocok di-reset ke `Semua` |
| Filter Periode | Input | `type="month"` |
| Filter Lahan | Select | `Semua Lahan` / `Terpetakan` / `Belum Terpetakan` |
| Filter Status | Select | SUPERADMIN saja |
| Pencarian | Filter | `Cari nama petani atau ID petani...` |
| Tombol `Tambah Data` | Tombol | CREATE — navigasi ke `/admin/master-data/production/new` |
| Tabel daftar | Tabel | Kolom: `Petani` (nama + ID), `Lembaga Petani`, `Lahan` (badge parcelId atau `—`), `Periode` (bulan-tahun ID), `Tanggal Panen`, `Panen Ke-` (badge), `Hasil (kg)`, `Status` (SUPERADMIN) |
| Aksi baris | Tombol | Lihat → `/{id}`; Edit → `/{id}/edit`; Nonaktifkan → `toggleProductionRecordActive` |
| Ekspor | Tombol | `data-produksi` |
