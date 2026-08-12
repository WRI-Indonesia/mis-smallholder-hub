# Pohon Sawit

[← Menu Bulk Upload](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Pohon Sawit (/admin/bulk-upload/trees)
├── Header
│   └── h2 "Upload Massal Pohon Sawit" + HelpHint + deskripsi
├── Langkah 1 — Pilih ZIP Shapefile titik
│   ├── Input type="file" (accept=".zip" — .shp/.dbf/.shx/.prj, tipe Point WGS84)
│   ├── Keterangan atribut yang dibaca (parcel_id wajib; tree_id, no, lon/lat,
│   │   category, vigor, source, model_ver opsional)
│   └── Toast parsing: sukses (N titik pada M lahan) / kosong / gagal
└── Langkah 2 — Pratinjau per lahan (Card)
    ├── Tabel: ID Lahan (parcel_id) · Petani · Titik Pohon · Luas (Ha) ·
    │   Kerapatan (pohon/ha) · Status (Baru / Revisi / Lahan tidak ditemukan)
    ├── Peringatan lahan tidak ditemukan (dilewati saat menyimpan)
    ├── Catatan titik dilewati (parcel_id kosong / koordinat tidak valid)
    ├── Tombol "Reset"
    └── Tombol "Simpan N Pohon (M lahan)" (hanya permission CREATE)
```

## Atribut sub menu

| Atribut | Nilai |
|---|---|
| Menu key | `bulk-upload-trees` |
| URL | `/admin/bulk-upload/trees` |
| Icon | `TreePine` |
| Order | `4` |

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/bulk-upload/trees/page.tsx` + `components/tree-bulk-upload-client.tsx` (`"use client"`) |
| Tipe | Unggah massal spasial 2 langkah (tanpa mapping kolom — atribut DBF baku) |
| Guard | `requirePermission("bulk-upload-trees")`; aksi guard `hasPermission("bulk-upload-trees", …)` |
| Server action / data | `parseTreeShapefile()`, `matchTreeUploadParcels(parcelIds)` (dipanggil setelah parse, hanya untuk `parcel_id` yang ada di file — pengganti `getTreeUploadParcels` yang mengirim semua lahan scope, #241), `bulkCreateTrees()` — `src/server/actions/bulk-upload-tree.ts`; helper murni `src/lib/tree-upload.ts` |

## Perilaku khusus

- **Pengelompokan otomatis** — titik dikelompokkan per atribut `parcel_id`; satu ZIP boleh memuat beberapa lahan. Pencocokan ke lahan **aktif** dalam scope akses user (`farmerRelationAccessFilter`); `parcel_id` yang tidak cocok dilewati saat simpan, sisanya tetap tersimpan. Ambiguitas `parcel_id` (terdaftar >1 petani) dicek **global** — sama dengan penolakan `bulkCreateTrees` — dan ditandai dini di pratinjau (#240/#241); grup dengan >50.000 titik per lahan (batas zod) juga ditolak dini di pratinjau dengan pesan jelas (#241).
- **Revisi per-set** — upload ulang untuk lahan yang sama menonaktifkan **seluruh** set titik lama lahan tsb (`isActive = false`) dan menyisipkan set baru dengan `revision + 1`. Tidak ada penggabungan per titik.
- **Repoint saat lahan direvisi** — revisi lahan via bulk upload membuat baris lahan ber-`id` baru; seluruh titik pohon (semua revisi) ikut dipindahkan ke `landParcelId` baru (pola sama dengan `productionRecord`, lihat `bulkCreateLandParcels`).
- **Normalisasi DBF** — nilai NULL numerik DBF (`********`) dan string kosong → `null`; koordinat diambil dari geometri Point, fallback atribut `lon`/`lat`; titik di luar rentang WGS84 dilewati dengan alasan.
- Hasil tampil di **Detail Lahan** (kartu ringkasan Pohon Sawit — jumlah + kerapatan; titik kuning langsung di peta Informasi Lahan; kolom Jumlah Pohon di tabel Lahan Lain Milik Petani) dan **Detail Petani** tab Lahan (kolom Jumlah Pohon di tabel Daftar Lahan + titik kuning di peta Sebaran Lahan).
- `Panduan` — `HelpHint` di header menuju tutorial Bantuan `unggah-pohon` untuk `bulk-upload-trees` (`findTutorialForMenu`), dibuka di tab baru.
