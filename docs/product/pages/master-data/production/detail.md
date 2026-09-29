# Page: Detail Produksi

[← Produksi](README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Detail Produksi (/admin/master-data/production/[id])
├── Header
│   ├── Tombol kembali
│   ├── Judul: Detail Produksi
│   ├── Deskripsi: Detail catatan panen dan hasil tani
│   └── Tombol: Edit Data
├── Kartu Informasi Petani & Lahan
├── Kartu Data Produksi
└── Audit trail
```

| Atribut | Nilai |
|---|---|
| File | `production/[id]/page.tsx` |
| Tipe | Server Component (tanpa client component) |
| Guard | `requirePermission("master-data-production")` + `getUserPermissionsForMenu`; `notFound()` bila kosong |
| Server action / data | `getProductionRecordById(id)`, `getAuditUserNames(createdBy, modifiedBy)` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Detail Produksi` / `Detail catatan panen dan hasil tani` | Heading | Tombol kembali + h1 |
| Tombol `Edit Data` | Tombol | EDIT dan hanya bila record `isActive` — ke `/{id}/edit` |
| Kartu `Informasi Petani & Lahan` | Kartu | `Nama Petani` (link), `ID Petani`, `Lembaga Petani` (link), `Lahan` (link parcel atau `Tidak Terpetakan`), `Luas Lahan` (bila ada lahan) |
| Kartu `Data Produksi` | Kartu | `Periode`, `Tanggal Panen`, `Panen Ke-` (badge), `Hasil Panen` (kg), `Catatan` (`Tidak ada catatan`), `Status` (badge `Aktif`/`Nonaktif`) |
| Audit trail | Kartu | `Dibuat oleh: … pada …` dan `Terakhir diubah: … pada …` |
