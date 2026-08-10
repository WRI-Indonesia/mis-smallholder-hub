# Page: Detail Petani

[← Petani](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Detail Petani (/admin/master-data/farmers/[id])
├── Header
│   ├── BreadcrumbOverride
│   ├── Tombol kembali, avatar inisial, nama, ID petani
│   ├── Badge: L/P, Lembaga, Kelompok Tani, Aktif/Nonaktif
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
│   │   ├── Tabel: Daftar Lahan (n) + kolom Jumlah Pohon (#238) + tombol PDF per baris
│   │   └── Peta: Sebaran Lahan (ParcelsDistributionMap + titik pohon kuning, #238)
│   ├── Pelatihan
│   │   ├── Checklist: Paket Wajib
│   │   └── Tabel: Riwayat Partisipasi (n)
│   └── Produksi
│       ├── Tombol filter: Semua Lahan / Exclude + switch Tahun › Lahan / Lahan › Tahun
│       ├── Matriks: Produksi Bulanan (Kg) — collapsible, expandable per lahan (#239)
│       ├── Matriks: Ketersediaan Data Bulanan — collapsible, expandable per lahan (#239)
│       └── Kartu: Ketersediaan Data Produksi per Lahan
└── Dialog
    └── FarmerFormModal (Edit Petani)
```

| Atribut | Nilai |
|---|---|
| File | `farmers/[id]/page.tsx` + `farmers/[id]/farmer-detail-client.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-farmers")`; `hasPermission(...,"EDIT")` untuk tombol Edit; `hasPermission("master-data-parcels", "VIEW"/"EDIT")` → prop `canViewParcel`/`canEditParcel` (gate aksi popup peta); `notFound()` bila kosong |
| Server action / data | `getFarmerDetail(id)` → `{ farmer, detail, parcels, mapParcels }`, `getFarmerTreeSummary(id)` + `getFarmerTreePoints(id)` (`src/server/actions/tree.ts`, #238), `getFarmerGroupOptions` (bila boleh edit), `getFarmerParcelPassport(parcelId)` untuk PDF |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `BreadcrumbOverride` | Navigasi | Menampilkan ID Petani, bukan CUID |
| Header | Heading | Tombol kembali, avatar inisial (placeholder, TD-017), nama, ID petani, badge L/P + Lembaga (link) + Kelompok Tani + `Aktif`/`Nonaktif` |
| Tombol `Edit` | Tombol | EDIT — buka `FarmerFormModal` |
| Kartu ringkasan (5) | Kartu | `Lahan` (persil + Ha), `Produksi` (Ton), `Pelatihan` (n/n paket), `Kelengkapan Profil` (n/n + field yang belum), `Produktivitas Terakhir` (Ton/Ha) |
| Tabs | Tab | `Ringkasan`, `Lahan`, `Pelatihan`, `Produksi` |
| Tab Ringkasan | Kartu | Field: `Lembaga Petani` (link), `Distrik`, `Jenis Kelamin`, `NIK` (disensor), `Tempat, Tanggal Lahir` (+ umur), `Tahun Bergabung`, `Alamat`, `Dibuat`, `Terakhir Diubah` |
| Tab Lahan — `Daftar Lahan (n)` | Tabel | `Kode Lahan` (link detail lahan **tab baru** — pola #224, gate `canViewParcel`), `Kelompok Tani`, `Blok`, `Luas (Ha)`, `Tahun Tanam`, `Jumlah Pohon` (agregat `getFarmerTreeSummary`, "—" bila belum ada, #238), `Revisi`, `Profil Lahan`; empty state `Petani ini belum memiliki lahan.` |
| Tombol `PDF` per baris lahan | Tombol | Unduh Farm Passport via `getFarmerParcelPassport` + `generateFarmPassportPdf` |
| Tab Lahan — `Sebaran Lahan` | Peta | `ParcelsDistributionMap` (dynamic, ssr:false) + titik pohon kuning non-interaktif via prop `treePoints` (`getFarmerTreePoints`, counter "N titik pohon" di badge kiri-bawah, #238); popup lahan memakai primitif standar `src/components/shared/map-popup.tsx` (TD-028) + footer aksi `ParcelPopupActions` ("Lihat Detail" gate `canViewParcel`, "Edit Lahan" gate `canEditParcel`) + modal `ParcelEditModalHost`; setelah simpan poligon disegarkan via `router.refresh()` (server props) |
| Tab Pelatihan — `Paket Wajib` | Checklist | Per paket: ikon ✓/✗, label, jumlah partisipasi (`n×`) atau `Belum` |
| Tab Pelatihan — `Riwayat Partisipasi (n)` | Tabel | `Tanggal`, `Paket`, `Lokasi`, `Pre → Post Test`; empty state `Belum pernah mengikuti pelatihan.` |
| Tab Produksi | Matriks + kartu | Pola detail Lembaga (`ProductionMonthlyMatrix` #239) dengan perbedaan Petani: satuan sel bulanan & Total = **Kg**; kolom `Luas (Ha)` + `Umur/PSR` di kanan kolom pertama matriks produksi; prop `parcelBreakdown` (`buildParcelYearBreakdown` — per lahan per tahun, record tanpa lahan = baris "Tanpa Lahan") mengaktifkan **switch grouping** `Tahun › Lahan` (baris tahun → expand sub-baris per lahan) / `Lahan › Tahun` (baris lahan → expand per tahun; Produktivitas baris lahan = rata-rata tahunan Σproduksi ÷ luas ÷ tahun ber-data); empty state `Belum ada data produksi untuk petani ini.` |

Dialog `FarmerFormModal` (field lengkap) didokumentasikan di [daftar.md](./daftar.md#dialog-farmerformmodal-farmersfarmer-form-modaltsx).
