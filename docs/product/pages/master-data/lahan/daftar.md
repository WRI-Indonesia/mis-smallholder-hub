# Page: Lahan (daftar)

[← Lahan](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Lahan (/admin/master-data/parcels)
├── Header
│   ├── Judul: Lahan
│   └── Deskripsi: Data lahan petani (land parcels) yang terdaftar
├── Toolbar
│   ├── Filter: Distrik (combobox)
│   ├── Filter: Lembaga Petani (combobox, cascade dari Distrik)
│   ├── Filter: NKT (Semua / Termasuk-terdampak / Termasuk / Terdampak / Tidak / Belum dinilai, #330)
│   ├── Filter: Patok (Semua / Sudah ada / Belum ada, #330)
│   ├── Filter: Status (SUPERADMIN)
│   ├── Filter: Pencarian
│   ├── Tombol: Tambah Lahan
│   ├── Dropdown: Unduh Lahan (SHP ZIP / GeoJSON / KML) — izin EXPORT (#313)
│   ├── Tombol: Excel
│   └── Tombol: Kolom
├── Tabel
│   ├── Kolom: ID Lahan, Blok, Nama Petani, ID Petani, Lembaga Petani,
│   │          Kelompok Tani, Luas (ha), Status Kepemilikan,
│   │          Komoditas, Species, PSR, Tahun Tanam, Revisi, Status
│   └── Aksi baris: Lihat, Edit, Nonaktifkan
└── Dialog
    └── ParcelFormModal (Tambah / Edit Lahan)
```

| Atribut | Nilai |
|---|---|
| File | `parcels/page.tsx` + `parcels/components/parcel-list-client.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-parcels")` |
| Server action / data | `getLandParcels()` (`@/server/actions/land-parcel`), `getFarmerOptions`, `getFarmerGroupOptions`, `getDistrictsForSelect`, `getUserPermissionsForMenu`, `isSuperAdmin` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Lahan` / `Data lahan petani (land parcels) yang terdaftar` | Heading | h1 + deskripsi |
| `Panduan` | Tautan | `HelpHint` (`src/app/(admin)/admin/help/help-hint.tsx`) — ikon `?` di header menuju tutorial Bantuan untuk `master-data-parcels` (`findTutorialForMenu`), dibuka di tab baru |
| Filter Distrik | Combobox | `Semua Distrik` (`DistrictGroupFilter`, `src/components/shared/district-group-filter.tsx`) |
| Filter Lembaga Petani | Combobox | `Semua Lembaga Petani` — daftar ikut menyempit saat Distrik dipilih; pilihan yang tidak cocok di-reset ke `Semua` |
| Filter NKT | Select (#330) | Klien atas payload list: `all` · `affected` (INCLUDED+AFFECTED, `isNktAffected`) · satu status · `none` (belum dinilai = tanpa baris NKT). `getLandParcels` membawa `identity.nkt.status` saja |
| Filter Patok | Select (#330/#331) | `all` · `with` (`markerCount > 0`) · `without`; `markerCount` = `_count.markers WHERE is_active` dari identitas |
| Filter Status | Select | SUPERADMIN saja; label "Semua Status / Aktif / Nonaktif" (function-child `SelectValue`, sebelumnya nilai mentah "active") |
| Pencarian | Filter | `Cari ID Lahan atau nama petani...` (parcelId, nama & ID petani) |
| Tombol `Tambah Lahan` | Tombol | CREATE — buka `ParcelFormModal` |
| Tabel daftar | Tabel | Kolom: `ID Lahan` (+ **badge NKT** merah/amber bila termasuk/terdampak, #330), `NKT` (hidden; label pendek / "Belum dinilai"), `Patok` (hidden; jumlah patok aktif), `Blok` (hidden default), `Nama Petani`, `ID Petani`, `Lembaga Petani`, `Kelompok Tani` (hidden), `Luas (ha)`, `Status Kepemilikan`, `Komoditas`, `Species`, `PSR` (badge PSR/Non-PSR), `Tahun Tanam`, `Revisi`, `Status` (SUPERADMIN); ekspor Excel ikut kolom NKT & Patok |
| Aksi baris | Tombol | Lihat → `/admin/master-data/parcels/{id}`; Edit → modal; Nonaktifkan → `toggleLandParcelActive` |
| Ekspor | Tombol | `data-lahan` (termasuk kolom distrik) |
| Unduh Lahan | Dropdown (`ParcelExportMenu`) | Ekspor spasial SHP ZIP / GeoJSON / KML (#313), gate izin `EXPORT`; **nonaktif selama filter Distrik & Lembaga masih "Semua"** (tooltip "Pilih Distrik atau Lembaga Petani terlebih dahulu"); memanggil `getMasterDataParcelExportData(filters)` (menu key `master-data-parcels` di-hardcode di server) — atribut lengkap termasuk legalitas, hanya lahan ber-poligon. Selalu **revisi aktif saja** — filter Status (SUPERADMIN) tidak berlaku di sini, berbeda dengan tombol Excel yang mengekspor baris tabel apa adanya |
| Tidak ada kartu KPI | — | Halaman ini langsung ke tabel |

## Dialog: `ParcelFormModal` (`parcels/components/parcel-form-modal.tsx`)

Judul `Tambah Lahan` / `Edit Lahan`; aksi `createLandParcel` / `updateLandParcel`; validasi `landParcelSchema` / `updateLandParcelSchema` (`src/validations/land-parcel.schema.ts`). Geometry tidak dikirim dari form — polygon existing dipertahankan server.

| Field | Input |
|---|---|
| `Petani` | combobox (`Pilih Petani`, wajib — toast `Petani wajib dipilih`) |
| `ID Lahan` (wajib) | text |
| `Luas (Hektar)` | number step 0.01, min 0 |
| `Blok` | text |
| `Status Kepemilikan` | select `Milik Sendiri (Owned)` / `Sewa (Leased)` / `Bagi Hasil (Shared)` |
| `Komoditas` | text (`Contoh: Kelapa Sawit`) — **terisi `Kelapa Sawit` secara default** pada form lahan baru; dikosongkan pun `landParcelSchema` mengisinya kembali (`DEFAULT_CROP_TYPE`, keputusan owner 2026-09-01) |
| `Species` | text (`Contoh: Elaeis guineensis`) |
| `PSR (Peremajaan Sawit Rakyat)` | checkbox `Lahan sedang PSR (replanting)` |
| `Tahun Tanam` | number 1900–2100 |
| `Revisi` | read-only (`otomatis bertambah saat disimpan`) |
| `Kelompok Tani` (`subGroupLv2`) | text |
| `Catatan` | textarea |
