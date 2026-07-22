# Lahan

[← Menu Bulk Upload](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Lahan (/admin/bulk-upload/parcels)
├── Header
│   └── h2 "Upload Massal Lahan" + deskripsi
├── Langkah 1 — Pilih ZIP Shapefile
│   ├── Input type="file" (accept=".zip" — .shp/.dbf/.shx/.prj)
│   ├── Info berkas: "Shapefile: nama.zip (N fitur/baris terdeteksi)"
│   └── Toast parsing: sukses / kosong / gagal
├── Langkah 2 — Petakan Atribut Kolom
│   ├── Grid Select per target field (11 field, dari tabel atribut DBF)
│   └── Tombol "Validasi Data Shapefile"
├── Langkah 3 — Hasil Validasi & Tinjauan
│   ├── Ringkasan: "N Lahan Valid" / "N Lahan Error"
│   ├── Filter: "Semua (N)" · "Valid (N)" · "Error (N)"
│   ├── Tombol "Download Semua Data" / "Download Data Error Saja"
│   ├── Peta preview MapLibre (ParcelBulkUploadMap, tinggi 384px)
│   │   ├── Poligon hijau = valid, merah = error (ikut filter aktif)
│   │   ├── Basemap switcher: HYBRID · SATELLITE · LIGHT · DARK
│   │   ├── Tombol "Fokus Semua"
│   │   └── Popup "Detail Lahan": badge Valid/Error, ID, Petani, Error Detail
│   └── Tabel preview (kolom: No, ID Lahan, ID Petani (Asal),
│       Nama Petani (DB), Luas (ha), Status Kepemilikan, Komoditas,
│       Tahun Tanam, Kelompok Tani, Blok, Revisi,
│       Status, Detail Error)
└── Tombol simpan "Simpan N Lahan Valid" (hijau, hanya permission CREATE)
```

## Atribut sub menu

| Atribut | Nilai |
|---|---|
| Menu key | `bulk-upload-parcels` |
| URL | `/admin/bulk-upload/parcels` |
| Icon | `Map` |
| Order | `3` |

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/bulk-upload/parcels/page.tsx` + `components/parcel-bulk-upload-client.tsx` (`"use client"`) + `components/parcel-bulk-upload-map.tsx` |
| Tipe | Wizard unggah massal spasial 3 langkah + peta preview |
| Guard | `requirePermission("bulk-upload-parcels")`; aksi guard `hasPermission("bulk-upload-parcels", …)` |
| Server action / data | `parseShapefile()`, `getFarmersForMapping()`, `getExistingParcelIds()`, `bulkCreateLandParcels()` — `src/server/actions/bulk-upload-parcel.ts` |
| Helper | `PARCEL_AUTO_MATCH_RULES`, `autoMatchColumns()`, `normalizeAttr()` dari `src/lib/parcel-bulk-mapping.ts` |
| Format file diterima | **Hanya** ZIP Shapefile `.zip` berisi `.shp`, `.dbf`, `.shx`, `.prj`; selain itu toast *"Hanya mendukung berkas ZIP Shapefile (.zip)"* |
| Tombol unduh template | **Tidak ada** (sumber data adalah shapefile) |
| Redirect setelah simpan | `/admin/master-data/parcels` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| "Upload Massal Lahan" | Heading (`h2`) | Deskripsi: *"Unggah data spasial lahan petani menggunakan ZIP Shapefile (.zip berisi berkas .shp, .dbf, .shx, .prj) dengan pencocokan kolom dinamis."* |
| "1. Pilih ZIP Shapefile" | Card + Input `type="file"` (`accept=".zip"`) | Keterangan *"Unggah arsip ZIP (.zip) yang berisi berkas .shp, .dbf, .shx, dan .prj dari shapefile lahan."* |
| Info berkas | Teks | *"Shapefile: **nama.zip** (N fitur/baris terdeteksi)"* |
| Toast parsing | Toast | Sukses *"Berhasil mengurai shapefile: N geometri lahan terdeteksi"*; kosong *"Shapefile tidak mengandung data geometri/fitur"*; gagal *"Gagal mengurai file shapefile"* / *"Gagal membaca berkas ZIP"* |
| "2. Petakan Atribut Kolom" | Card + grid Select | Subjudul *"Cocokkan kolom dari tabel atribut DBF shapefile dengan data target sistem."* |
| Target field | 11 field | `ID Lahan`* (unik per petani), `ID Petani`*, `Luas (ha)`, `Status Kepemilikan` (Owned/Leased/Shared), `Komoditas`, `Tahun Tanam` (1900-2100), `Kelompok Tani` (`subGroupLv2`), `Blok`, `Revisi` (default 0), `Catatan` |
| "Validasi Data Shapefile" | Tombol | Loading *"Memproses..."*; sukses toast *"Validasi selesai"* |
| "3. Hasil Validasi & Tinjauan" | Card | Subjudul *"Tinjau kembali hasil pemetaan dan validasi spasial/atribut sebelum menyimpannya ke database."* |
| Ringkasan hasil | Badge/pill | *"N Lahan Valid"* / *"N Lahan Error"* |
| Filter hasil | 3 tombol | *"Semua (N)"*, *"Valid (N)"*, *"Error (N)"* |
| "Download Semua Data" / "Download Data Error Saja" | Tombol | `bulk_upload_lahan_full.xlsx` / `bulk_upload_lahan_error_only.xlsx` (sheet `Data Lahan`) |
| "Simpan N Lahan Valid" | Tombol (hijau) | Hanya bila permission `CREATE` |
| Peta preview | MapLibre (`ParcelBulkUploadMap`) | Tinggi 384px; poligon diwarnai hijau bila valid, merah bila error; mengikuti filter aktif; disembunyikan bila tidak ada geometri |
| Basemap switcher | Overlay tombol | `HYBRID`, `SATELLITE`, `LIGHT`, `DARK` |
| "Fokus Semua" | Tombol overlay peta | Title *"Fokus ke Semua Lahan"* — memusatkan viewport ke rata-rata koordinat |
| Popup peta | Popup | Judul *"Detail Lahan"* + badge `Valid`/`Error`, baris `ID:`, `Petani:`, dan `Error Detail:` bila ada |
| Tabel preview | Tabel | Kolom: `No`, `ID Lahan`, `ID Petani (Asal)`, `Nama Petani (DB)`, `Luas (ha)`, `Status Kepemilikan`, `Komoditas`, `Tahun Tanam`, `Kelompok Tani`, `Blok`, `Revisi`, `Status`, `Detail Error` |
| Kolom ekspor Excel | 15 kolom | `Baris Asal`, `ID Lahan`, `ID Petani Asal`, `Nama Petani`, `Luas (ha)`, `Status Kepemilikan`, `Komoditas`, `Tahun Tanam`, `Kelompok Tani`, `Blok`, `Revisi`, `Catatan`, `Status Validasi`, `Detail Error` |

## Aturan validasi & pesan error (client)

| Kondisi | Pesan |
|---|---|
| ID Petani kosong / tak dikenal | *"ID Petani wajib diisi"* / *"ID Petani "X" tidak terdaftar di database"* |
| ID Lahan kosong | *"ID Lahan wajib diisi"* |
| Duplikat dalam file (petani + ID lahan) | *"ID Lahan duplikat di dalam file: "X" untuk petani ini"* |
| Duplikat di database, geometri sama | *"ID Lahan "X" sudah terdaftar dengan polygon yang sama di database"* |
| Duplikat di database, geometri berbeda | **Bukan error** — baris ditandai revisi baru (`revision = revisi lama + 1`) |
| Luas ≤ 0 / bukan angka | *"Luas lahan tidak valid: "X" (Luas harus berupa angka lebih dari 0)"* |
| Tahun tanam di luar 1900-2100 | *"Tahun tanam tidak valid: "X" (Gunakan tahun antara 1900-2100)"* |
| Revisi negatif / bukan angka | *"Revisi tidak valid: "X" (Gunakan angka non-negatif)"* |
| Geometri bukan Polygon/MultiPolygon | *"Geometri tidak valid (Harus bertipe Polygon atau MultiPolygon)"* |

## Alur upload

1. Pilih berkas `.zip` shapefile → dibaca sebagai base64 di client → dikirim ke server action `parseShapefile()` (`shpjs` mengurai buffer ZIP langsung; ada polyfill `self` dan alias proyeksi `cylindrical_equal_area` pada proj4).
2. Kunci properti fitur pertama dipakai sebagai daftar header → auto-match ke target field via `autoMatchColumns()`.
3. Perbaiki pemetaan kolom pada kartu "2. Petakan Atribut Kolom".
4. Klik **Validasi Data Shapefile** → validasi atribut + geometri, cek duplikat dalam file dan di database (perbandingan geometri lewat `isGeometryEqual`), penentuan nomor revisi.
5. Tinjau hasil di peta preview dan tabel; filter Semua/Valid/Error; unduh hasil bila perlu.
6. Klik **Simpan N Lahan Valid** → `bulkCreateLandParcels()`: guard `CREATE` → cek scope access-context semua `farmerId` → validasi Zod `landParcelSchema` → dalam satu `prisma.$transaction`, untuk tiap baris: jika ada duplikat aktif dengan geometri sama → gagal; jika geometri berbeda → baris lama di-`isActive: false` dan baris baru dibuat dengan `revision + 1`; selain itu insert biasa dengan `createdBy`.
7. Sukses → toast *"Berhasil menyimpan N data lahan"* + redirect ke daftar lahan.
