# Page: Petani (daftar)

[← Petani](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Petani (/admin/master-data/farmers)
├── Header
│   ├── Judul: Petani
│   └── Deskripsi: Data petani (smallholder) yang terdaftar
├── Kartu KPI
│   ├── Total Lembaga Petani
│   ├── Total Petani
│   ├── Petani Laki-laki
│   └── Petani Perempuan
├── Toolbar
│   ├── Filter: Distrik (combobox)
│   ├── Filter: Lembaga Petani (combobox)
│   ├── Filter: Status (SUPERADMIN)
│   ├── Filter: Pencarian
│   ├── Tombol: Tambah Petani
│   ├── Tombol: Excel
│   └── Tombol: Kolom
├── Tabel
│   ├── Kolom: ID Petani, Nama, L/P, NIK, Tempat Lahir, Tanggal Lahir,
│   │          Status, Lembaga Petani, Tahun Bergabung, Distrik
│   └── Aksi baris: Lihat, Edit, Nonaktifkan
└── Dialog
    └── FarmerFormModal (Tambah / Edit Petani)
```

| Atribut | Nilai |
|---|---|
| File | `farmers/page.tsx` + `farmers/farmer-list-client.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-farmers")` |
| Server action / data | `getFarmers()` (`@/server/actions/farmer`), `getFarmerGroupOptions("master-data-farmers")`, `getDistrictsForSelect()`, `getUserPermissionsForMenu`, `isSuperAdmin` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Petani` / `Data petani (smallholder) yang terdaftar` | Heading | h1 + deskripsi |
| Kartu KPI (4) | Kartu | `Total Lembaga Petani`, `Total Petani`, `Petani Laki-laki`, `Petani Perempuan` |
| Filter Distrik | Combobox | Popover + Command, `Semua Distrik`, cari `Cari distrik...`, empty `Distrik tidak ditemukan.` |
| Filter Lembaga Petani | Combobox | `Semua Lembaga Petani`, cari `Cari lembaga petani...`, empty `Lembaga Petani tidak ditemukan.` |
| Filter Status | Select | SUPERADMIN saja |
| Pencarian | Filter | `Cari nama, ID petani, atau NIK...` (`name`, `farmerId`, `nik`) |
| Tombol `Tambah Petani` | Tombol | CREATE — buka `FarmerFormModal` |
| Tabel daftar | Tabel | Kolom: `ID Petani`, `Nama`, `L/P` (badge), `NIK` (disensor `maskNik`), `Tempat Lahir`, `Tanggal Lahir` (disensor `maskBirthDate`), `Status` (SUPERADMIN), `Lembaga Petani`, `Tahun Bergabung`, `Distrik` |
| Aksi baris | Tombol | Lihat → `/admin/master-data/farmers/{id}`; Edit → modal; Nonaktifkan → `toggleFarmerActive` |
| Ekspor | Tombol | `data-farmers` — NIK & tanggal lahir diekspor penuh (tidak disensor) |

## Dialog: `FarmerFormModal` (`farmers/farmer-form-modal.tsx`)

Judul `Tambah Petani` / `Edit Petani`; aksi `createFarmer` / `updateFarmer`; validasi `farmerSchema` / `updateFarmerSchema` (`src/validations/farmer.schema.ts`); tombol `Batal` + `Buat`/`Simpan`.

| Field | Input |
|---|---|
| `ID Petani` (wajib) | text |
| `NIK` | text |
| `Nama Petani` (wajib) | text |
| `Jenis Kelamin` | select `Laki-laki` (M) / `Perempuan` (F) |
| `Lembaga Petani` | combobox (`Pilih Lembaga Petani`) |
| `Tempat Lahir` | text |
| `Tanggal Lahir` | date |
| `Alamat` | text |
| `Tahun Bergabung` | number 1900–2100 |
