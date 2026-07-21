# Page: Detail Petani

[← Petani](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Detail Petani (/admin/master-data/farmers/[id])
├── Header
│   ├── BreadcrumbOverride
│   ├── Tombol kembali, avatar inisial, nama, ID petani
│   ├── Badge: L/P, Lembaga, Gapoktan, Kelompok Tani, Aktif/Nonaktif
│   └── Tombol: Edit
├── Kartu ringkasan
│   ├── Lahan
│   ├── Produksi
│   ├── Pelatihan
│   ├── Kelengkapan Profil
│   └── Produktivitas Terakhir
├── Tabs
│   ├── Ringkasan
│   │   └── Kartu profil
│   ├── Lahan
│   │   ├── Tabel: Daftar Lahan (n) + tombol PDF per baris
│   │   └── Peta: Sebaran Lahan (ParcelsDistributionMap)
│   ├── Pelatihan
│   │   ├── Checklist: Paket Wajib
│   │   └── Tabel: Riwayat Partisipasi (n)
│   └── Produksi
│       ├── Tabel: Produksi per Tahun (expandable bulanan)
│       └── Kartu: Ketersediaan Data Produksi per Lahan
└── Dialog
    └── FarmerFormModal (Edit Petani)
```

| Atribut | Nilai |
|---|---|
| File | `farmers/[id]/page.tsx` + `farmers/[id]/farmer-detail-client.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-farmers")`; `hasPermission(...,"EDIT")` untuk tombol Edit; `notFound()` bila kosong |
| Server action / data | `getFarmerDetail(id)` → `{ farmer, detail, parcels, mapParcels }`, `getFarmerGroupOptions` (bila boleh edit), `getFarmerParcelPassport(parcelId)` untuk PDF |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `BreadcrumbOverride` | Navigasi | Menampilkan ID Petani, bukan CUID |
| Header | Heading | Tombol kembali, avatar inisial (placeholder, TD-017), nama, ID petani, badge L/P + Lembaga (link) + Gapoktan + Kelompok Tani + `Aktif`/`Nonaktif` |
| Tombol `Edit` | Tombol | EDIT — buka `FarmerFormModal` |
| Kartu ringkasan (5) | Kartu | `Lahan` (persil + Ha), `Produksi` (Ton), `Pelatihan` (n/n paket), `Kelengkapan Profil` (n/n + field yang belum), `Produktivitas Terakhir` (Ton/Ha) |
| Tabs | Tab | `Ringkasan`, `Lahan`, `Pelatihan`, `Produksi` |
| Tab Ringkasan | Kartu | Field: `Lembaga Petani` (link), `Distrik`, `Jenis Kelamin`, `NIK` (disensor), `Tempat, Tanggal Lahir` (+ umur), `Tahun Bergabung`, `Alamat`, `Dibuat`, `Terakhir Diubah` |
| Tab Lahan — `Daftar Lahan (n)` | Tabel | `Kode Lahan`, `Kelompok Tani`, `Gapoktan/KUD`, `Blok`, `Luas (Ha)`, `Tahun Tanam`, `Revisi`, `Profil Lahan`; empty state `Petani ini belum memiliki lahan.` |
| Tombol `PDF` per baris lahan | Tombol | Unduh Farm Passport via `getFarmerParcelPassport` + `generateFarmPassportPdf` |
| Tab Lahan — `Sebaran Lahan` | Peta | `ParcelsDistributionMap` (dynamic, ssr:false) |
| Tab Pelatihan — `Paket Wajib` | Checklist | Per paket: ikon ✓/✗, label, jumlah partisipasi (`n×`) atau `Belum` |
| Tab Pelatihan — `Riwayat Partisipasi (n)` | Tabel | `Tanggal`, `Paket`, `Lokasi`, `Pre → Post Test`; empty state `Belum pernah mengikuti pelatihan.` |
| Tab Produksi | Tabel + kartu | Sama pola dengan detail Lembaga: `Produksi per Tahun` (expandable bulanan) + `Ketersediaan Data Produksi per Lahan`; empty state `Belum ada data produksi untuk petani ini.` |

Dialog `FarmerFormModal` (field lengkap) didokumentasikan di [daftar.md](./daftar.md#dialog-farmerformmodal-farmersfarmer-form-modaltsx).
