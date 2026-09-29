# Page: Edit Data Produksi

[← Produksi](README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Edit Data Produksi (/admin/master-data/production/[id]/edit)
├── Header
│   ├── Judul: Edit Data Produksi
│   └── Deskripsi: Ubah catatan hasil panen petani
├── Form (sama dengan halaman tambah)
│   ├── Petani (dikunci / disabled)
│   ├── Lahan
│   ├── Periode
│   ├── Tanggal Panen
│   ├── Panen Ke-
│   ├── Hasil Panen (kg)
│   └── Catatan
└── Footer
    ├── Tombol: Batal
    └── Tombol: Simpan Perubahan
```

| Atribut | Nilai |
|---|---|
| File | `production/[id]/edit/page.tsx` + `production/components/production-form-client.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-production")`; `notFound()` bila record tidak ada **atau** sudah nonaktif |
| Server action / data | `getProductionRecordById(id)`, `getFarmerOptions`; submit `updateProductionRecord` (validasi `productionUpdateSchema`) |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Edit Data Produksi` / `Ubah catatan hasil panen petani` | Heading | h1 + deskripsi |
| Form | Form | Field sama dengan halaman tambah; `Petani` dikunci (input disabled, tidak bisa diganti) |
| Tombol | Tombol | `Batal` (kembali ke halaman detail) + `Simpan Perubahan` |
