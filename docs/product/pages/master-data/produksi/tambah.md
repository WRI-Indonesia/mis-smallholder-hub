# Page: Tambah Data Produksi

[← Produksi](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Tambah Data Produksi (/admin/master-data/production/new)
├── Header
│   ├── Judul: Tambah Data Produksi
│   └── Deskripsi: Catat hasil panen petani baru
├── Seksi: Informasi Petani & Lahan
│   ├── Petani (combobox)
│   └── Lahan (select)
├── Seksi: Data Produksi
│   ├── Periode
│   ├── Tanggal Panen
│   ├── Panen Ke-
│   ├── Hasil Panen (kg)
│   └── Catatan
└── Footer
    ├── Tombol: Batal
    └── Tombol: Simpan
```

| Atribut | Nilai |
|---|---|
| File | `production/new/page.tsx` + `production/components/production-form-client.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-production")` |
| Server action / data | `getFarmerOptions("master-data-production")`; submit `createProductionRecord` (validasi `productionSchema`, `src/validations/production.schema.ts`); `getFarmerParcels(farmerId)` untuk isi dropdown lahan |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Tambah Data Produksi` / `Catat hasil panen petani baru` | Heading | h1 + deskripsi |
| Seksi `Informasi Petani & Lahan` | Form | `Petani` (combobox `Pilih Petani`, wajib); `Lahan` (select, opsi `— Tidak terpetakan —` + daftar persil `{parcelId} ({luas} ha)`, disabled sampai petani dipilih) |
| Seksi `Data Produksi` | Form | `Periode` (input month, wajib); `Tanggal Panen` (Calendar, locale `id`); `Panen Ke-` (select `Panen Ke-1`…`Ke-4`); `Hasil Panen (kg)` (number step 0.1, min 0.1, wajib); `Catatan` (textarea) |
| Tombol | Tombol | `Batal` (kembali ke daftar) + `Simpan` |
