# Page: Detail Lembaga Petani

[← Lembaga Petani](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Detail Lembaga Petani (/admin/master-data/groups/[id])
├── Header
│   ├── BreadcrumbOverride
│   ├── Tombol kembali, nama lembaga, kode
│   ├── Badge: RSPO, ISPO, SAP/MAP, Aktif/Nonaktif
│   └── Tombol: Edit
├── Kartu ringkasan
│   ├── Total Petani
│   ├── Kelompok Tani
│   ├── Persil Lahan
│   ├── Produksi
│   └── Kelengkapan Data
├── Tabs
│   ├── Ringkasan
│   │   ├── Kartu profil
│   │   └── Tabel: Struktur Kelembagaan (dari lahan)
│   ├── Petani
│   │   └── Kartu + tautan
│   ├── Lahan
│   │   ├── Kartu ringkas
│   │   └── Peta: Sebaran Lahan (ParcelsDistributionMap)
│   ├── Pelatihan
│   │   ├── Tabel: Cakupan per Paket
│   │   └── Tabel: Aktivitas Pelatihan (n)
│   └── Produksi
│       ├── Tabel: Produksi per Tahun (expandable bulanan)
│       └── Kartu: Ketersediaan Data Produksi per Lahan
└── Dialog
    └── GroupFormModal (Edit Lembaga Petani)
```

| Atribut | Nilai |
|---|---|
| File | `groups/[id]/page.tsx` + `groups/[id]/group-detail-client.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-groups")`; `hasPermission("master-data-groups","EDIT")` untuk tombol Edit; `notFound()` bila data tidak ada |
| Server action / data | `getFarmerGroupDetail(id)` → `{ group, detail, completeness, mapParcels }`, `getDistrictsForSelect()` (hanya bila boleh edit) |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `BreadcrumbOverride` | Navigasi | Menampilkan nama Lembaga, bukan id URL |
| Header | Heading | Tombol kembali, nama lembaga, kode (mono), badge `RSPO`/`ISPO`/`SAP/MAP` + `Aktif`/`Nonaktif` |
| Tombol `Edit` | Tombol | EDIT — buka `GroupFormModal` |
| Kartu ringkasan (5) | Kartu | `Total Petani` (L/P), `Kelompok Tani` (Gapoktan/KUD · Blok), `Persil Lahan` (Ha), `Produksi` (Ton, tahun ber-data), `Kelengkapan Data` (% + anomali, link ke `/admin/data-analyst/data-completeness`) |
| Tabs | Tab | `Ringkasan`, `Petani`, `Lahan`, `Pelatihan`, `Produksi` |
| Tab Ringkasan — profil | Kartu | Field: `Distrik`, `Kategori`, `Tipe Grup`, `Singkatan`, `Tahun Berdiri Lembaga`, `Tahun Bergabung Program`, `Sertifikasi RSPO`, `Sertifikasi ISPO`, `Assurance SAP/MAP`, `Koordinat`, `Dibuat`, `Terakhir Diubah` |
| Tab Ringkasan — `Struktur Kelembagaan (dari lahan)` | Tabel | Kolom `Gapoktan/KUD` (auto-hide bila kosong), `Kelompok Tani`, `Petani`, `Lahan`, `Luas (Ha)`; link `Lihat roster lengkap →`; empty state `Belum ada data Gapoktan/KUD & Kelompok Tani dari lahan.` |
| Tab Petani | Kartu + teks | `Total Petani`, `Laki-laki / Perempuan`, `Petani Tanpa Lahan` + tautan ke Master Data Petani & Ringkasan Petani |
| Tab Lahan | Kartu + peta | `Persil Lahan`, `Kelompok Tani / Gapoktan`, `Blok`; `Sebaran Lahan` = `ParcelsDistributionMap` (dynamic, ssr:false) |
| Tab Pelatihan — `Cakupan per Paket` | Tabel | `Paket`, `Petani Terlatih`, `Cakupan`, `Rataan Pre Test`, `Rataan Post Test` |
| Tab Pelatihan — `Aktivitas Pelatihan (n)` | Tabel | `Tanggal`, `Paket`, `Lokasi`, `Peserta`, `Rata-rata Pre → Post`; empty state `Belum ada aktivitas pelatihan untuk Lembaga ini.` |
| Tab Produksi — `Produksi per Tahun` | Tabel | `Tahun` (expandable → rincian bulanan), `Produksi (kg)`, `Record`, `Lahan Melapor`, `Luas Melapor (Ha)`, `Produktivitas (Ton/Ha)`; catatan kaki rumus; empty state `Belum ada data produksi untuk Lembaga ini.` |
| Tab Produksi — `Ketersediaan Data Produksi per Lahan` | Kartu | 4 kategori: `Baik (>24 bln)`, `Cukup (12–24 bln)`, `Kurang (<12 bln)`, `Tanpa Data` + tautan Peta BMP / Report Produksi / BMP Dashboard |

Dialog `GroupFormModal` (field lengkap) didokumentasikan di [daftar.md](./daftar.md#dialog-groupformmodal-groupsgroup-form-modaltsx).
