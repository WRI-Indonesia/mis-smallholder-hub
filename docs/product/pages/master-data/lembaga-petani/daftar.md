# Page: Lembaga Petani (daftar)

[← Lembaga Petani](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Lembaga Petani (/admin/master-data/groups)
├── Header
│   ├── Judul: Lembaga Petani
│   └── Deskripsi: Data lembaga petani yang terdaftar
├── Kartu KPI
│   ├── Total Lembaga Petani
│   ├── Total Petani
│   ├── Total Persil Lahan
│   └── Total Luas Lahan
├── Toolbar
│   ├── Filter: Distrik
│   ├── Filter: Status (SUPERADMIN)
│   ├── Filter: Pencarian
│   ├── Tombol: Tambah Lembaga Petani
│   ├── Tombol: Excel
│   └── Tombol: Kolom
├── Tabel
│   ├── Kolom: Kode, Nama, Distrik, Tipe Grup, Kategori, Total Petani,
│   │          Total Persil, Luas Lahan, Tahun Bergabung Program,
│   │          Tahun Berdiri Lembaga, Sertifikasi RSPO, Sertifikasi ISPO,
│   │          Assurance SAP/MAP, Lat, Long, Status
│   └── Aksi baris: Lihat, Edit, Nonaktifkan
└── Dialog
    └── GroupFormModal (Tambah / Edit Lembaga Petani)
```

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/master-data/groups/page.tsx` |
| Tipe | Server Component + client component `group-list-client.tsx` |
| Guard | `requirePermission("master-data-groups")` |
| Server action / data | `getFarmerGroups()`, `getDistrictsForSelect()` (`@/server/actions/farmer-group`), `getUserPermissionsForMenu`, `isSuperAdmin` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Lembaga Petani` / `Data lembaga petani yang terdaftar` | Heading | h1 + deskripsi |
| Kartu KPI (4) | Kartu | `Total Lembaga Petani`, `Total Petani` (orang), `Total Persil Lahan` (persil), `Total Luas Lahan` (Ha) — dihitung dari baris terfilter |
| Filter Distrik | Select | `Semua Distrik` + daftar distrik |
| Filter Status | Select | SUPERADMIN saja (lihat objek bersama) |
| Pencarian | Filter | `Cari nama, kode, atau singkatan...` (`name`, `code`, `abrv`) |
| Tombol `Tambah Lembaga Petani` | Tombol | CREATE — buka `GroupFormModal` mode tambah |
| Tabel daftar | Tabel | Kolom: `Kode`, `Nama`, `Distrik`, `Tipe Grup` (badge), `Kategori` (Ex Plasma/Swadaya), `Total Petani`, `Total Persil` (hidden default), `Luas Lahan`, `Tahun Bergabung Program`, `Tahun Berdiri Lembaga`, `Sertifikasi RSPO`, `Sertifikasi ISPO`, `Assurance SAP/MAP`, `Lat` (hidden), `Long` (hidden), `Status` (SUPERADMIN) |
| Aksi baris | Tombol | Lihat → `/admin/master-data/groups/{id}`; Edit → modal; Nonaktifkan → `toggleFarmerGroupActive` |
| Ekspor | Tombol | `data-farmer-groups` |
| `GroupFormModal` | Dialog | Lihat di bawah |

## Dialog: `GroupFormModal` (`groups/group-form-modal.tsx`)

Judul `Tambah Lembaga Petani` / `Edit Lembaga Petani`; aksi `createFarmerGroup` / `updateFarmerGroup`; validasi `farmerGroupSchema` / `updateFarmerGroupSchema` (`src/validations/farmer-group.schema.ts`); tombol `Batal` + `Buat`/`Simpan`.

| Seksi | Field | Input |
|---|---|---|
| Identitas | `Nama Lembaga Petani` (wajib), `Kode`, `Singkatan`, `Abrv 3ID` | text |
| Klasifikasi | `Distrik` (select, placeholder `Pilih distrik`), `Kategori` (`Ex Plasma`/`Swadaya`), `Tipe Grup` (`—`/`Asosiasi`/`Koperasi`) | select |
| Tahun | `Tahun Berdiri Lembaga`, `Tahun Bergabung Program` | number 1900–2100 |
| Sertifikasi & Assurance | Baris `RSPO`, `ISPO`, `SAP/MAP` — masing-masing status (`—`/`Tersertifikasi`/`Plan`) + tahun | select + number 1900–2100 |
| Lokasi | `Latitude`, `Longitude` | number step any |
