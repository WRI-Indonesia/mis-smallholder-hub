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
| "Upload Massal Lahan" | Heading (`h2`) | Deskripsi: *"Poligon lahan dari ZIP Shapefile (.shp, .dbf, .shx, .prj), atau detail lahan — surat kepemilikan, STDB, UL Parcel Code — dari Excel untuk lahan yang sudah terdaftar."* |
| Tabs | `Tabs` (`@/components/ui/tabs`) | *"Poligon (Shapefile ZIP)"* (bawaan) · *"Detail Lahan (Excel)"* — satu menu key, satu set izin (keputusan owner 2026-08-27: tanpa menu baru) |
| `Panduan` | Tautan | `HelpHint` (`src/app/(admin)/admin/help/help-hint.tsx`) — ikon `?` di header menuju tutorial Bantuan untuk `bulk-upload-parcels` (`findTutorialForMenu`), dibuka di tab baru |
| "1. Pilih ZIP Shapefile" | Card + Input `type="file"` (`accept=".zip"`) | Keterangan *"Unggah arsip ZIP (.zip) yang berisi berkas .shp, .dbf, .shx, dan .prj dari shapefile lahan."* |
| Info berkas | Teks | *"Shapefile: **nama.zip** (N fitur/baris terdeteksi)"* |
| Toast parsing | Toast | Sukses *"Berhasil mengurai shapefile: N geometri lahan terdeteksi"*; kosong *"Shapefile tidak mengandung data geometri/fitur"*; gagal *"Gagal mengurai file shapefile"* / *"Gagal membaca berkas ZIP"* |
| "2. Petakan Atribut Kolom" | Card + grid Select | Subjudul *"Cocokkan kolom dari tabel atribut DBF shapefile dengan data target sistem."* |
| Target field | 11 field | `ID Lahan`* (unik per petani), `ID Petani`*, `Luas (ha)`, `Status Kepemilikan` (Owned/Leased/Shared), `Komoditas` (boleh tak dipetakan — kosong → `Kelapa Sawit`, `DEFAULT_CROP_TYPE`), `Tahun Tanam` (1900-2100), `Kelompok Tani` (`subGroupLv2`), `Blok`, `Revisi` (default 0), `Catatan` |
| "Validasi Data Shapefile" | Tombol | Loading *"Memproses..."*; sukses toast *"Validasi selesai"* |
| "3. Hasil Validasi & Tinjauan" | Card | Subjudul *"Tinjau kembali hasil pemetaan dan validasi spasial/atribut sebelum menyimpannya ke database."* |
| Ringkasan hasil | Badge/pill | *"N Lahan Valid"* / *"N Lahan Error"* |
| Filter hasil | 3 tombol | *"Semua (N)"*, *"Valid (N)"*, *"Error (N)"* |
| "Download Semua Data" / "Download Data Error Saja" | Tombol | `bulk_upload_lahan_full.xlsx` / `bulk_upload_lahan_error_only.xlsx` (sheet `Data Lahan`) |
| "Simpan N Lahan Valid" | Tombol (hijau) | Hanya bila permission `CREATE` |
| Peta preview | MapLibre (`ParcelBulkUploadMap`) | Tinggi 384px; poligon diwarnai hijau bila valid, merah bila error; mengikuti filter aktif; disembunyikan bila tidak ada geometri. Basemap ikut set 5 pilihan bersama (#307, `MAP_STYLES`) |
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
| Sheet yang dibaca | Sheet **tersembunyi dilewati** (template Excel kerap menaruh daftar dropdown di sheet hidden bernama `Data` — tanpa saringan ini importer membaca daftar itu); dari yang tersisa, sheet bernama `Data` dicoba lebih dulu lalu sisanya berurutan, dan sebuah sheet dianggap gagal bila **tidak menghasilkan header**, bukan karena `rowCount` kecil (#301) — `rowCount` exceljs berbohong pada sheet kosong berformat: `MIS_KAMPAR_data-lahan.xlsx` punya `Sheet1` ber-`rowCount` 1000 yang seluruhnya kosong |
| Baris header | **Tidak** diasumsikan baris fisik 1 (#301, `readSpreadsheetFile`): dicari baris pertama yang label-labelnya dikenali auto-match, lalu baris pertama dengan ≥2 sel terisi, lalu baris terisi pertama. Header di baris >1 → toast *"Header ditemukan di baris X"*; tanpa header sama sekali → *"Tidak menemukan baris header pada berkas ini"*. Nomor **Baris** di pratinjau & unduhan error memakai nomor baris **fisik** yang dibawa pembaca (`SheetReadResult.rowNumbers` → `validateParcelDetailRows(..., rowNumbers)`), bukan dihitung ulang dari indeks — baris kosong di tengah data dibuang, jadi indeks akan menggeser nomornya |
| Peringatan `parcel_code` | Bila kolom UL Parcel Code tidak terpetakan, validasi memunculkan **toast peringatan** (#305): lahannya tetap tersimpan, tetapi tidak terhitung "sudah didata" di Laporan Lahan sehingga persentase legalitas di sana lebih rendah dari kenyataan. Peredam kerapuhan proxy — lihat `tech-debt.md` TD-035 |
| Target field (9) | `ID Lahan`*, `ID Petani`*, `Jenis Surat Tanah`, `Nomor Surat`, `Nama tertera di Surat`, `Luas tertera di Surat (ha)`, `Nomor STDB`, `UL Parcel Code (parcel_code)`, `Nama Kelompok Tani` (→ `LandParcel.subGroupLv2`, **isi hanya bila kosong**, update in-place tanpa revisi; pratinjau menandai "(sudah ada)") — auto-match `PARCEL_DETAIL_AUTO_MATCH_RULES` (`src/lib/land-parcel-detail-import.ts`), termasuk header DBF terpotong `parcel_cod` |
| Normalisasi | Jenis surat 19 ejaan → enum `LandDocumentType` + `typeRaw` (jenis kosong tapi nomor/nama/luas terisi → `OTHER`); "Lahan sudah dijual"/"Surat lahan di bank" → `custodyNote` (dokumen `OTHER` tanpa nomor); token benar-benar kosong `0`/`-`/`null` = kosong, sedangkan token **pra-terbit** `n/a`/`Belum dapat`/`belum ada`/`tidak ada` sejak **#306** menghasilkan baris STDB `PERSIAPAN_DATA` tanpa nomor (329 baris sumber yang dulu hilang diam-diam) — kecuali bila petaninya sudah punya STDB aktif, maka barisnya dilewati (29 dari 103 petani ber-token pending ternyata juga punya nomor resmi, diukur 2026-08-29); satu berkas terbuka per petani (partial index `uniq_land_stdb_farmer_open`); STDB `…/M/YYYY` → `issuedYear` |
| Tabel preview | `No`, `ID Lahan`, `ID Petani`, `Nama Petani (DB)`, `Jenis Surat` (label ternormalisasi; catatan penguasaan miring), `Nomor Surat`, `Nama di Surat`, `Luas Surat (ha)`, `STDB`, `UL Parcel Code`, `Kelompok Tani` ("(sudah ada)" bila DB sudah terisi), `Status`, `Detail Error` (100 baris pertama) |
| Unduhan | `detail_lahan_semua.xlsx` / `detail_lahan_error.xlsx` (kolom target + Status + Detail Error) |
| Simpan | *"Simpan N Baris Valid"* (CREATE) → **chunk 500 baris per transaksi** (timeout 60 dtk/chunk, #300): tiap chunk = prefetch 5 `findMany` → planner murni `planLandParcelDetailRows` (dedup dalam batch, lewati yang tidak berubah). Himpunan petani ber-STDB bernomor dihitung **atas seluruh berkas sebelum dipecah** (`farmersWithNumberedStdbIn`) lalu diteruskan ke tiap chunk — kalau dihitung per chunk, petani yang baris `n/a`-nya jatuh di chunk 1 dan baris bernomornya di chunk 2 tetap mendapat berkas `PERSIAPAN_DATA` → `createMany` + `update` hanya yang berubah; chunk gagal tidak membatalkan chunk sebelumnya (pesan menyebut N baris tersimpan; unggah ulang aman karena upsert). Toast ringkasan: surat baru/diperbarui/tanpa perubahan, STDB baru + tautan (termasuk hitungan baris pra-terbit dibuat/dilewati, #306), UL Parcel Code baru/diperbarui/tanpa perubahan/dilewati, kelompok tani terisi |
| Pemeta (2026-08-28) | Selektor **Pemeta** di kartu 3 (Meridia / WRI / Swadaya / isian bebas, default `MERIDIA`) → `LandParcelExternalId.source` untuk SELURUH baris berkas; dikirim sebagai argumen kedua `bulkSaveLandParcelDetails(rows, source)`, divalidasi `parcelMapperSchema` (2–60 karakter), diteruskan ke `applyLandParcelDetailRows(..., source)` |
| Semantik simpan | **Upsert**: dokumen kunci `(parcelUid, type, number)` aktif → update; STDB unik per petani lewat **dua partial index** sejak #306 (`uniq_land_stdb_farmer_number` untuk baris aktif bernomor, `uniq_land_stdb_farmer_open` untuk satu berkas terbuka per petani) — bukan lagi `@@unique(farmerId, number)`; tautan unik `(parcelUid, stdbId)`; UL Parcel Code unik `(source, code)` dengan `source` = pemeta berkas → `parcelUid` dipindah bila berubah; kode sama dari pemeta berbeda hidup berdampingan |
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
| Tanpa surat, STDB, kode, maupun KT | *"Tidak ada data detail (surat, STDB, UL Parcel Code, atau kelompok tani) untuk disimpan"* |
