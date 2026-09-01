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
│       ├── Tombol filter: Semua Lahan / Exclude (PSR & tanaman <3 thn)
│       ├── Matriks: Produksi Bulanan (Ton) — collapsible (#239)
│       ├── Matriks: Ketersediaan Data Bulanan — collapsible (#239)
│       └── Kartu: Ketersediaan Data Produksi per Lahan
└── Dialog
    └── GroupFormModal (Edit Lembaga Petani)
```

| Atribut | Nilai |
|---|---|
| File | `groups/[id]/page.tsx` + `groups/[id]/group-detail-client.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-groups")`; `hasPermission("master-data-groups","EDIT")` untuk tombol Edit; `hasPermission("master-data-parcels", "VIEW"/"EDIT")` → prop `canViewParcel`/`canEditParcel` (gate aksi popup peta); `notFound()` bila data tidak ada |
| Server action / data | `getFarmerGroupDetail(id)` → `{ group, detail, completeness, mapParcels }`, `getDistrictsForSelect()` (hanya bila boleh edit) |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `BreadcrumbOverride` | Navigasi | Menampilkan nama Lembaga, bukan id URL |
| Header | Heading | Tombol kembali, nama lembaga, kode (mono), badge `RSPO`/`ISPO`/`SAP/MAP` + `Aktif`/`Nonaktif` |
| Tombol `Edit` | Tombol | EDIT — buka `GroupFormModal` |
| Kartu ringkasan (5) | Kartu | `Total Petani` (L/P), `Kelompok Tani` (Blok), `Persil Lahan` (Ha), `Produksi` (Ton, tahun ber-data), `Kelengkapan Data` (% + anomali, link ke `/admin/data-analyst/data-completeness`) |
| Tabs | Tab | `Ringkasan`, `Petani`, `Lahan`, `Pelatihan`, `Produksi` |
| Tab Ringkasan — profil | Kartu | Field: `Distrik`, `Kategori`, `Tipe Grup`, `Singkatan`, `Tahun Berdiri Lembaga`, `Tahun Bergabung Program`, `Sertifikasi RSPO`, `Sertifikasi ISPO`, `Assurance SAP/MAP`, `Koordinat`, `Dibuat`, `Terakhir Diubah` |
| Tab Ringkasan — `Struktur Kelembagaan (dari lahan)` | Tabel | Kolom `Kelompok Tani`, `Petani`, `Lahan`, `Luas (Ha)`; link `Lihat roster lengkap →`; empty state `Belum ada data Kelompok Tani dari lahan.` |
| Tab Petani | Kartu + teks | `Total Petani`, `Laki-laki / Perempuan`, `Petani Tanpa Lahan` + tautan ke Master Data Petani & Ringkasan Petani |
| Tab Lahan | Kartu + peta | `Persil Lahan`, `Kelompok Tani`, `Blok`; `Sebaran Lahan` = `ParcelsDistributionMap` (dynamic, ssr:false); popup lahan memakai primitif standar `src/components/shared/map-popup.tsx` (TD-028), termasuk pegangan geser popup (`useMapPopupDrag`/`MapPopupDragHandle`, #314) + footer aksi `ParcelPopupActions` ("Lihat Detail" gate `canViewParcel`, "Edit Lahan" gate `canEditParcel`) + modal `ParcelEditModalHost`; setelah simpan poligon disegarkan via `router.refresh()` (server props) |
| Tab Pelatihan — `Cakupan per Paket` | Tabel | `Paket`, `Petani Terlatih`, `Cakupan`, `Rataan Pre Test`, `Rataan Post Test` |
| Tab Pelatihan — `Aktivitas Pelatihan (n)` | Tabel | `Tanggal`, `Paket`, `Lokasi`, `Peserta`, `Rata-rata Pre → Post`; empty state `Belum ada aktivitas pelatihan untuk Lembaga ini.` |
| Tab Produksi — filter varian | Tombol | `Semua Lahan` / `Exclude (PSR & tanaman <3 thn)` — menyaring kedua matriks; varian Exclude dihitung server-side (`buildExcludeVariant`, lahan PSR/muda dibuang beserta record-nya, record tanpa lahan tetap, penyebut ikut varian) (#239) |
| Tab Produksi — `Produksi Bulanan (Ton)` | Matriks (collapsible) | `ProductionMonthlyMatrix` (`components/shared/production-monthly-matrix.tsx`): baris = tahun kontinu s.d. tahun berjalan (tanpa data = "—"), kolom `Jan`–`Des` (Ton, 0 desimal, gradasi hijau relatif sel tertinggi) + `Total` + `Ton/Ha` (tooltip "Produktivitas (Ton/Ha)"); catatan kaki rumus; empty state `Belum ada data produksi untuk Lembaga ini.` (#239) |
| Tab Produksi — `Ketersediaan Data Bulanan` | Matriks (collapsible) | Baris = tahun, sel bulanan = jumlah lahan pelapor + % (baris bawah) berwarna threshold (hijau ≥80 / kuning 50–79 / oranye 1–49 / abu 0) + ringkasan tahunan `Record`, `Lahan`, `Luas (Ha)` (persen di baris bawah) + legenda warna (#239) |
| Tab Produksi — `Ketersediaan Data Produksi per Lahan` | Kartu | 4 kategori: `Baik (>24 bln)`, `Cukup (12–24 bln)`, `Kurang (<12 bln)`, `Tanpa Data` + tautan Peta BMP / Report Produksi / BMP Dashboard |

Dialog `GroupFormModal` (field lengkap) didokumentasikan di [daftar.md](./daftar.md#dialog-groupformmodal-groupsgroup-form-modaltsx).
