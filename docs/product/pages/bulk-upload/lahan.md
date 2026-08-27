# Lahan

[← Menu Bulk Upload](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Lahan (/admin/bulk-upload/parcels)
├── Header
│   └── h2 "Upload Massal Lahan" + deskripsi
├── Tabs (#296): "Poligon (Shapefile ZIP)" [bawaan] · "Detail Lahan (Excel)"
│   └── (tab Detail — lihat bagian "Tab Detail Lahan (Excel)" di bawah)
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
| File | `src/app/(admin)/admin/bulk-upload/parcels/page.tsx` (Tabs) + `components/parcel-bulk-upload-client.tsx` (`"use client"`) + `components/parcel-bulk-upload-map.tsx` + `components/parcel-detail-upload-client.tsx` (tab Excel, #296) |
| Tipe | Dua tab dalam satu menu/izin: wizard unggah spasial 3 langkah + peta preview; wizard detail lahan Excel 3 langkah |
| Guard | `requirePermission("bulk-upload-parcels")`; aksi guard `hasPermission("bulk-upload-parcels", …)` |
| Server action / data | `parseShapefile()`, `getFarmersForMapping()`, `getExistingParcelIds()`, `bulkCreateLandParcels()` — `src/server/actions/bulk-upload-parcel.ts`; tab Excel: `getParcelsForDetailMapping()` (lazy saat tab dibuka), `bulkSaveLandParcelDetails()` — `src/server/actions/bulk-upload-parcel-detail.ts` |
| Helper | `PARCEL_AUTO_MATCH_RULES`, `autoMatchColumns()`, `normalizeAttr()` dari `src/lib/parcel-bulk-mapping.ts` |
| Format file diterima | Tab Poligon: **hanya** ZIP Shapefile `.zip` berisi `.shp`, `.dbf`, `.shx`, `.prj`; selain itu toast *"Hanya mendukung berkas ZIP Shapefile (.zip)"* |
| Tombol unduh template | Tab Poligon: **tidak ada** (sumber data adalah shapefile); tab Detail: `template_detail_lahan.xlsx` |
| Redirect setelah simpan | `/admin/master-data/parcels` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| "Upload Massal Lahan" | Heading (`h2`) | Deskripsi: *"Poligon lahan dari ZIP Shapefile (.shp, .dbf, .shx, .prj), atau detail lahan — surat kepemilikan, STDB, kode vendor — dari Excel untuk lahan yang sudah terdaftar."* |
| Tabs | `Tabs` (`@/components/ui/tabs`) | *"Poligon (Shapefile ZIP)"* (bawaan) · *"Detail Lahan (Excel)"* — satu menu key, satu set izin (keputusan owner 2026-08-27: tanpa menu baru) |
| `Panduan` | Tautan | `HelpHint` (`src/app/(admin)/admin/help/help-hint.tsx`) — ikon `?` di header menuju tutorial Bantuan untuk `bulk-upload-parcels` (`findTutorialForMenu`), dibuka di tab baru |
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

## Tab Detail Lahan (Excel) — #296

Mengisi satelit lahan (`tbl_land_parcel_document`, `tbl_land_stdb` + `tbl_land_parcel_stdb`, `tbl_land_parcel_external_id`) yang menempel ke `parcelUid` (identitas stabil antar revisi), untuk lahan yang **sudah terdaftar & aktif**. Sumber: `MIS_<KAB>_data-lahan.xlsx`.

| Objek | Keterangan |
|---|---|
| Daftar lahan | Dimuat malas saat tab dibuka (`getParcelsForDetailMapping`, scope `farmerRelationAccessFilter`); jumlah tampil di Langkah 1; tombol validasi nonaktif sampai selesai |
| Sheet yang dibaca | Sheet bernama `Data` bila ada dan berisi; kalau tidak, sheet pertama yang berisi (berkas sumber punya `Sheet1` kosong) |
| Target field (8) | `ID Lahan`*, `ID Petani`*, `Jenis Surat Tanah`, `Nomor Surat`, `Nama tertera di Surat`, `Luas tertera di Surat (ha)`, `Nomor STDB`, `Kode Vendor (parcel_code)` — auto-match `PARCEL_DETAIL_AUTO_MATCH_RULES` (`src/lib/land-parcel-detail-import.ts`), termasuk header DBF terpotong `parcel_cod` |
| Normalisasi | Jenis surat 19 ejaan → enum `LandDocumentType` + `typeRaw` (jenis kosong tapi nomor/nama/luas terisi → `OTHER`); "Lahan sudah dijual"/"Surat lahan di bank" → `custodyNote` (dokumen `OTHER` tanpa nomor); token `0`/`n/a`/`-`/`Belum dapat` = kosong; STDB `…/M/YYYY` → `issuedYear` |
| Tabel preview | `No`, `ID Lahan`, `ID Petani`, `Nama Petani (DB)`, `Jenis Surat` (label ternormalisasi; catatan penguasaan miring), `Nomor Surat`, `Nama di Surat`, `Luas Surat (ha)`, `STDB`, `Kode Vendor`, `Status`, `Detail Error` (100 baris pertama) |
| Unduhan | `detail_lahan_semua.xlsx` / `detail_lahan_error.xlsx` (kolom target + Status + Detail Error) |
| Simpan | *"Simpan N Baris Valid"* (CREATE) → satu transaksi (timeout 600 dtk); toast ringkasan: surat baru/diperbarui, STDB baru + tautan, kode vendor baru/diperbarui |
| Semantik simpan | **Upsert**: dokumen kunci `(parcelUid, type, number)` aktif → update; STDB unik `(farmerId, number)`; tautan unik `(parcelUid, stdbId)`; kode vendor unik `(source="parcel_code", code)` → `parcelUid` dipindah bila berubah |
| Guard server | `hasPermission("bulk-upload-parcels", CREATE)`; Zod `landParcelDetailBatchSchema` (≤ 20.000 baris); setiap `parcelUid` dicek milik lahan aktif dalam scope **dan** `farmerDbId` = pemilik identitas (klien tidak dipercaya) |

### Aturan validasi & pesan error (client, `validateParcelDetailRows`)

| Kondisi | Pesan |
|---|---|
| ID Lahan / ID Petani kosong | *"ID Lahan wajib diisi"* / *"ID Petani wajib diisi"* |
| ID Petani tak dikenal / di luar scope | *"ID Petani "X" tidak ditemukan dalam database atau akses Anda"* |
| Pasangan (petani, lahan) tak ada | *"ID Lahan "X" tidak terdaftar untuk petani "Y""* |
| ID Lahan sama, ID Petani berbeda di file | **Semua** barisnya: *"ID Lahan "X" muncul di file dengan ID Petani berbeda — perbaiki sumber"* (20 kasus di data Kampar) |
| Nomor STDB sama, ID Petani berbeda | **Semua** barisnya: *"Nomor STDB "X" dipakai ID Petani berbeda di file — STDB terbit per petani"* (64 kasus HJP) |
| STDB sama, petani sama, lahan berbeda | **Bukan error** — STDB per petani menutup beberapa persil |
| Nomor/nama/luas terisi, jenis kosong | **Bukan error** — disimpan sebagai `OTHER` dengan `typeRaw` null (1.046 baris di data sumber; keputusan: jenis tak diketahui ≠ tak ada surat) |
| Luas tertera bukan angka | *"Luas tertera tidak valid: "X""* (0 = kosong, bukan error) |
| Tanpa surat, STDB, maupun kode | *"Tidak ada data detail (surat, STDB, atau kode vendor) untuk disimpan"* |
