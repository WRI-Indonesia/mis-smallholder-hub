# Page: Pelatihan (daftar)

[← Pelatihan](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Pelatihan (/admin/master-data/training)
├── Header
│   ├── Judul: Pelatihan
│   └── Deskripsi: Data kegiatan pelatihan lembaga tani yang terdaftar
├── Kartu KPI
│   ├── Total Lembaga Petani
│   ├── Total Kegiatan Training
│   ├── Total Peserta
│   └── Total Peserta Unik
├── Toolbar
│   ├── Filter: Distrik (combobox)
│   ├── Filter: Lembaga Petani (combobox)
│   ├── Filter: Paket Pelatihan (combobox)
│   ├── Filter: Status (SUPERADMIN)
│   ├── Filter: Pencarian
│   ├── Tombol: Tambah Pelatihan
│   ├── Tombol: Excel
│   └── Tombol: Kolom
├── Tabel
│   ├── Kolom: Paket Pelatihan, Lembaga Petani, Tanggal Pelatihan,
│   │          Lokasi, Total Peserta, Status
│   └── Aksi baris: Lihat, Edit, Nonaktifkan
└── Dialog
    └── TrainingFormModal (Tambah / Edit Pelatihan)
```

| Atribut | Nilai |
|---|---|
| File | `training/page.tsx` + `training/training-list-client.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-training")` |
| Server action / data | `getTrainingActivities()`, `getTrainingPackagesForSelect()` (`@/server/actions/training`), `getFarmerGroupOptions`, `getDistrictsForSelect`, `getUserPermissionsForMenu`, `isSuperAdmin` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Pelatihan` / `Data kegiatan pelatihan lembaga tani yang terdaftar` | Heading | h1 + deskripsi |
| Kartu KPI (4) | Kartu | `Total Lembaga Petani`, `Total Kegiatan Training`, `Total Peserta`, `Total Peserta Unik` |
| Filter Distrik | Combobox | `Semua Distrik` |
| Filter Lembaga Petani | Combobox | `Semua Lembaga Petani` |
| Filter Paket Pelatihan | Combobox | `Semua Paket Pelatihan`, empty `Paket pelatihan tidak ditemukan.` |
| Filter Status | Select | SUPERADMIN saja |
| Pencarian | Filter | `Cari lokasi, lembaga petani atau paket...` |
| Tombol `Tambah Pelatihan` | Tombol | CREATE — buka `TrainingFormModal` |
| Tabel daftar | Tabel | Kolom: `Paket Pelatihan` (label `TRAINING_CATEGORY_LABELS`), `Lembaga Petani`, `Tanggal Pelatihan`, `Lokasi`, `Total Peserta` (orang), `Status` (SUPERADMIN) |
| Aksi baris | Tombol | Lihat → `/admin/master-data/training/{id}`; Edit → modal; Nonaktifkan → `toggleTrainingActivityActive` |
| Ekspor | Tombol | `data-training-activities` |

Label paket (`TRAINING_CATEGORY_LABELS`): `Paket 1 - BMP + P&C RSPO + NKT`, `Paket 2 - MK (Manajemen Kelompok)`, `Paket 2 - K3 (Keselamatan & Kesehatan Kerja)`, `Paket 3&4`, `Lainnya`.

## Dialog: `TrainingFormModal` (`training/training-form-modal.tsx`)

Judul `Tambah Pelatihan` / `Edit Pelatihan`; aksi `createTrainingActivity` / `updateTrainingActivity` + `uploadTrainingEvidence`; validasi `trainingActivitySchema` / `updateTrainingActivitySchema` (`src/validations/training-activity.schema.ts`).

| Field | Input |
|---|---|
| `Paket Pelatihan` | select paket |
| `Lembaga Petani` | combobox (`Pilih Lembaga Petani`; wajib — error `Kelompok tani wajib dipilih`) |
| `Tanggal Pelatihan` | date picker (Calendar, locale `id`) |
| `Lokasi` | text (`Contoh: Balai Desa`) |
| `Evidence (Notulen PDF, maks 10MB)` | file — validasi klien: hanya `application/pdf`, maks 10 MB |
