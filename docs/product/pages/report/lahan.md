# Laporan Lahan

[← Menu Report](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Laporan Lahan (/admin/report/land-parcel)
├── Header
│   └── Judul + deskripsi
├── Filter
│   ├── Distrik (combobox + search)
│   ├── Lembaga Petani (combobox + search, wajib secara efektif)
│   ├── Filter legalitas (#305): Cakupan Pendataan · Status Surat ·
│   │   Jenis Surat (multi) · Status STDB (+ per tahap #306) · Selisih Luas
│   └── Catatan filter + catatan semantik legalitas
├── Kartu KPI
│   ├── Total Petani
│   ├── Kelompok Tani
│   ├── Total Lahan
│   └── Total Luas
├── Kartu Ringkasan Legalitas (#305 — ikut filter aktif, `describeLegalSummary`;
│   sumber yang SAMA dengan blok Ringkasan di PDF & sheet Ringkasan Excel)
│   ├── Lahan (hasil filter)
│   ├── Ada Surat (n + % berlabel penyebut)
│   ├── Ada STDB (n + % berlabel penyebut, satuan persil)
│   │   Penyebut mengikuti Cakupan: `sudah didata` → totalDidata,
│   │   `semua lahan` → totalLahan (kalau tidak, persen bisa >100%)
│   └── Selisih Luas ≥ 0,5 Ha
├── Peta Cetak — Latar, Grid & Label
│   ├── Grid Index (Baris × Kolom)
│   ├── Latar Peta (#318 — Polos · StreetMap · Satellite · Hybrid)
│   ├── Kepekatan Latar (slider 0–100%, hanya saat latar aktif)
│   ├── Indikator "Menyiapkan latar peta… n/m halaman" + peringatan kunci >30 sel
│   ├── Label Poligon (No, Nama, ID Petani, ID Lahan, Kelompok Tani)
│   └── Preview peta SVG (ikhtisar + peta per sel, panah utara, skala batang,
│       atribusi penyedia latar)
├── Selektor Kolom (dropdown "Tampilkan Kolom")
├── Empty state: Pilih Lembaga Petani / Tidak Ada Data Lahan
├── Tabel Lahan
│   ├── Kolom: No, Lembaga Petani, Nama Petani, ID Petani, ID Lahan,
│   │          Kelompok Tani, Blok, Komoditas, Species,
│   │          PSR, Tahun Tanam, Luas (Ha), Surat Kepemilikan, Nama di Surat,
│   │          Luas Tertera (Ha), STDB (#296 — default mati),
│   │          UL Parcel Code, Program (#305/TD-035 — default mati)
│   └── Baris Total (tanpa paginasi & pencarian)
└── Ekspor
    ├── Sheet per (select, #371): Grid peta · Kelompok Tani · Blok — Excel saja
    ├── Excel
    └── PDF
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Sub menu | Lahan (`report-land-parcel`) |
| Route | `/admin/report/land-parcel` |
| File | `src/app/(admin)/admin/report/land-parcel/page.tsx` + `land-parcel-report-client.tsx` + `loading.tsx` |
| Tipe | Roster lahan + peta cetak (SVG) dengan grid index |
| Guard | `requirePermission("report-land-parcel")` |
| Server action / data | `getDistrictsForLandParcelReport()`, `getFarmerGroupsForLandParcelReport(districtId)`, `getLandParcelReport({ districtId, farmerGroupId })`, `getLandParcelReportGeometries(farmerGroupId)`; helper `src/lib/report-land-parcel.ts`, `src/lib/report-land-parcel-xlsx.ts`, `src/lib/report-land-parcel-pdf.ts` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Panduan` | Tautan | `HelpHint` — ikon `?` di header menuju tutorial Bantuan untuk `report-land-parcel` (`findTutorialForMenu`), dibuka di tab baru |
| "Laporan Lahan" | Heading | Deskripsi "Roster lahan per Lembaga Petani (Lembaga, Petani, ID Petani, ID Lahan, Kelompok Tani)" |
| "Distrik" | Filter (combobox + search) | Primitif `FilterCombobox` (#212); default "Semua Distrik", empty "Distrik tidak ditemukan." |
| "Lembaga Petani" | Filter (combobox + search) | Primitif `FilterCombobox` (#212); label tombol default "Semua Lembaga Petani", namun laporan baru dimuat setelah satu Lembaga dipilih (wajib secara efektif); empty "Lembaga Petani tidak ditemukan." |
| Catatan filter | Teks bantu | "Roster real-time dari data lahan aktif (1 baris = 1 lahan). Pilih Lembaga Petani (wajib) — laporan & cetakan selalu per Lembaga; filter Distrik membantu mempersempit daftar. PDF & Excel menyertakan peta lahan — atur latar, pecahan grid, dan isi label poligon di panel Peta Cetak." |
| Kartu KPI | 4 kartu | "Total Petani" (badge Petani), "Kelompok Tani" (badge KT), "Total Lahan" (badge Lahan), "Total Luas" (badge Ha) |
| "Peta Cetak — Latar, Grid & Label" | Kartu pengaturan peta | Ikon `Grid3x3` |
| "Grid Index (Baris × Kolom)" | Filter (dua input `number`) | Baris 1–26, kolom 1–20; teks bantu "maks. `<n>` peta + ikhtisar" atau "tanpa pecah" |
| "Latar Peta" | Filter (`select`) | #318 — `Polos — tanpa latar` (**default**, mempertahankan cetakan lama) / `StreetMap` / `Satellite` / `Hybrid`. Hanya basemap **raster** dari `MAP_STYLES`; `light`/`dark` adalah style vector OpenFreeMap yang tak punya tile gambar, jadi sengaja TIDAK ditawarkan. Terkunci (`disabled`) bila grid > `BASEMAP_MAX_CELLS` (30 sel) |
| "Kepekatan Latar — `<n>`%" | Filter (`input[type=range]`, 0–100 step 5) | #318 — muncul hanya saat latar aktif; default `BASEMAP_DEFAULT_DIM` = 65. Nilainya **kepekatan**, bukan peredaman: `composeReportBasemap` memakai alpha `1 - dim/100`, jadi 100% = citra penuh dan 0% = putih polos. Nilai diambil saat geseran **dilepas** (`onPointerUp`/`onKeyUp`/`onBlur`), bukan tiap langkah — satu perubahan menjahit ulang seluruh halaman peta. Kepekatan **dipanggang ke dalam JPEG**, bukan lapisan per-renderer — jsPDF tak punya alpha pada `addImage` |
| Indikator latar | Teks bantu | "Menyiapkan latar peta… `<n>`/`<m>` halaman. Ekspor tetap bisa ditekan — berkasnya menunggu sampai semua latar siap." Di atas 30 sel: peringatan amber bahwa latar dimatikan |
| "Label Poligon" | Filter (checkbox, minimal satu aktif) | Opsi: No, Nama, ID Petani, ID Lahan, Kelompok Tani (default: No) |
| Preview peta | Chart / SVG | Tanpa grid: 1 halaman peta. Dengan grid: 1 ikhtisar (garis grid + label sel + "`<n>` lahan") + satu peta per sel; dekorasi panah utara & skala batang; catatan "`<n>` lahan tanpa geometri tidak tergambar (No …)."; state "Memuat geometri lahan..." dan "Tidak ada geometri lahan yang dapat digambar." |
| "Kolom" | Dropdown selektor kolom | Pintasan **Pilih semua · Kosongkan · Bawaan** + penghitung `aktif/total` (standar `ui-ux.md`; rollout ke menu lain: #308). "Tampilkan Kolom": Kelompok Tani, Blok, Komoditas, Species, PSR, Tahun Tanam, Luas (Ha), **Surat Kepemilikan, Nama di Surat, Luas Tertera (Ha), STDB** (#296), **UL Parcel Code, Program** (#305), **NKT, Luas NKT (Ha)** (#328), **Patok** (#331), **Koordinat (Excel)** (#370 — hanya mengendalikan ekspor Excel; tabel layar & PDF tak punya kolom ini). Default aktif: Kelompok Tani, Tahun Tanam, Luas (Ha), Koordinat (Excel). Catatan: `colSpan` sel "Total" di footer hanya menghitung kolom **sebelum** Luas — kolom legalitas/NKT terletak sesudahnya (bug lama yang membuat footer bergeser, diperbaiki bersama #328) |
| "Cakupan Pendataan" | Filter (`select`) | `Semua lahan` (**default sejak #318**, 2026-09-02 — bawaan `Sudah didata` menyaring lahan tanpa UL Parcel Code sehingga laporan terbaca seperti roster lengkap padahal tersaring) / `Sudah didata`. "Sudah didata" = punya UL Parcel Code aktif — **proxy** untuk "sudah melalui import Detail Lahan"; ini penyebut semua persentase di kartu ringkasan, jadi persentase pada setelan bawaan sengaja "pesimis". ⚠️ Default **fungsi** `landParcelLegalWhere` tetap `mapped` (membatasi untuk apa pun selain `"all"`, sepakat dengan teks `describeLegalFilters` supaya header PDF/Excel tak pernah mengklaim batasan yang tidak ada di datanya) — halaman selalu mengirim `coverage` eksplisit, tapi pemanggil baru yang lupa akan menyaring diam-diam (#319) |
| "Status Surat" | Filter (`select`) | `Semua` / `Ada surat` / `Tanpa surat`. **"Tanpa surat" = tidak ada baris `LandParcelDocument` aktif sama sekali**; lahan yang hanya punya baris `OTHER` + `custodyNote` ("surat di bank", "lahan sudah dijual") dihitung **punya** surat |
| "Jenis Surat" | Filter (dropdown checkbox, multi) | Enum `LandDocumentType`. Semantik: **punya minimal satu** jenis terpilih — lahan ber-SHM *dan* ber-SKT muncul di kedua filter (disengaja) |
| "Status STDB" | Filter (`select`) | `Semua` / `Ada STDB` / `Tanpa STDB` / per tahap `LandStdbStage` (#306) |
| "NKT" | Filter (`select`, #328) | `Semua` / `Termasuk / terdampak NKT` (INCLUDED ∪ AFFECTED) / per status `LandNktStatus` / `Sudah dinilai` (ada baris) / `Belum dinilai` (tanpa baris) — `where` lewat relasi `identity.nkt`; teksnya ikut `describeLegalFilters` (invarian #305). Ikut ter-reset oleh "Reset filter legalitas" |
| "Selisih Luas" | Filter (`select`) | `Semua` / `≥ 0,50 Ha` — ambang `AREA_DIFF_THRESHOLD_HA` (`land-parcel-satellite-format.ts`), **konstanta yang sama** dengan chip amber di tab Legalitas Detail Lahan |
| "Reset filter legalitas" | Tombol (muncul bila ada filter legalitas aktif) | Mengembalikan Status Surat/Jenis/STDB/Selisih ke `Semua`; Cakupan Pendataan tidak ikut ter-reset |
| Empty state | Kartu | "Pilih Lembaga Petani untuk memuat laporan." / "Memuat laporan..."; bila tanpa baris: "Tidak Ada Data Lahan" — "Belum ada lahan aktif untuk cakupan yang dipilih." |

## Tabel

(tabel HTML manual, tanpa paginasi & pencarian; 1 baris = 1 lahan; nilai kosong ditampilkan "-")

| Kolom | Keterangan |
|---|---|
| No | Nomor urut (sinkron dengan nomor label poligon di peta) |
| Lembaga Petani | Selalu tampil |
| Nama Petani | Selalu tampil |
| ID Petani | Selalu tampil |
| ID Lahan | Selalu tampil |
| Kelompok Tani | Opsional (default aktif) |
| Blok | Opsional |
| Komoditas | Opsional |
| Species | Opsional (italic) |
| PSR | Opsional; Badge "PSR" atau teks "Non-PSR" |
| Tahun Tanam | Opsional (default aktif), rata kanan |
| Luas (Ha) | Opsional (default aktif), rata kanan, 2 desimal |
| Surat Kepemilikan | Opsional (#296), mono — ringkasan `JENIS nomor` semua dokumen aktif lahan, dipisah `; ` ("Lainnya" bila jenis tak diketahui); sumber `identity.documents` via `parcelUid` |
| Nama di Surat | Opsional (#296) — nama tertera (distinct) |
| Luas Tertera (Ha) | Opsional (#296), rata kanan — **jumlah** luas tertera lintas dokumen; sengaja terpisah dari Luas (Ha) poligon, tidak ikut baris Total |
| STDB | Opsional (#296), mono — nomor STDB (distinct) yang menutup lahan; baris pra-terbit tampil `"<Tahap> — belum bernomor"` (#306) |
| UL Parcel Code | Opsional (#305), mono — `kode (Pemeta)` distinct dari `identity.externalIds` aktif |
| Program | Opsional (#305) — `<Program> — <Status>` dari `LAND_PROGRAM_LABELS`/`LAND_PROGRAM_STATUS_LABELS` (bukan peta label kedua) |
| NKT | Opsional (#328) — `summarizeNkt`: "Terdampak NKT — NKT 4 (asesmen 2025-03-12, HJP)"; **belum dinilai ditulis "Belum dinilai"** (di layar & ekspor — sel kosong akan terbaca "tidak terdampak"); merah bila termasuk, amber bila terdampak |
| Luas NKT (Ha) | Opsional (#328) — `affected_area_ha`, 3 desimal di Excel & PDF |
| Patok · Kondisi Patok | Opsional (#331) — satu toggle → dua kolom ekspor: jumlah tautan patok aktif (`0` = belum ada) + ringkasan kondisi "2 ada · 1 hilang" (`summarizeMarkerConditions`); di layar "4 · 4 belum dipasang" / "Belum ada" |
| Jumlah Node · Koordinat | **Excel saja** (#370, flag `excelOnly`; `landParcelExportColumns(show, { excel: true })`), default nyala, di ujung kanan: seluruh node poligon `Lintang,Bujur` 6 desimal, `; ` antar-node, `\|` antar-ring (lubang/MultiPolygon), node penutup tak diulang, dipotong `… (n node lagi)` di batas sel Excel — `formatParcelNodes` (`src/lib/parcel-node-coords.ts`); Jumlah Node = jumlah penuh walau teks terpotong |

Agregasi: baris footer "Total" berisi jumlah Luas (Ha), hanya muncul bila kolom Luas aktif.

**Kolom & baris ekspor dari satu definisi** (review #339, 2026-09-15): `LAND_PARCEL_EXPORT_COLUMNS` / `landParcelExportColumns(show)` / `landParcelExportRow(row, i, decimal, empty)` di `src/lib/report-land-parcel.ts` — dipakai Excel (sheet Lahan + sheet per sel; desimal `Number`), dan PDF (desimal string id-ID). Sebelumnya kolom didefinisikan di satu tempat dan baris ditulis di dua tempat (Excel & PDF) sehingga kolom **Patok/Kondisi Patok terbit kosong** di keduanya tanpa error (kelas #323/TD-039). `report-land-parcel-export.test.ts` menjaga setiap kunci kolom punya nilai di baris.

### Di mana filter dikerjakan (#305)

Cakupan/Status Surat/Jenis Surat/Status STDB/NKT → fragment `where` Prisma lewat relasi `identity` (`landParcelLegalWhere`, `src/server/actions/report.ts`). **Selisih Luas** tidak bisa jadi `where` karena nilainya turunan (Σ luas tertera vs poligon), jadi difilter di `buildLandParcelReport` — yang juga berjalan di server dan menghitung ringkasannya sekalian. Yang haram: memfilter array hasil di klien; jumlah baris, baris Total, dan kartu ringkasan akan bercerita berbeda.

**Kerapuhan proxy (utang, lihat `tech-debt.md` TD-035):** "punya UL Parcel Code" hanya *kebetulan* setara dengan "sudah lewat import Detail Lahan" karena seluruh 6.953 baris valid membawa kolom `parcel_code`. Klien import karena itu memberi **peringatan eksplisit** bila sebuah berkas tidak punya kolom itu.

## Opsi ekspor

| Format | Keterangan |
|---|---|
| Excel | File `Laporan_Lahan_<Lembaga/Distrik/Semua>`; sheet **"Ringkasan"** di posisi pertama (kolom Bagian · Keterangan · Nilai · Catatan) berisi filter legalitas aktif + 4 angka ringkasan, lalu sheet "Lahan" berisi seluruh baris + gambar peta (PNG hasil rasterisasi SVG). Ringkasan sengaja jadi **sheet tersendiri**, bukan baris catatan di atas tabel: menyisipkan baris di atas header membuat data tak lagi mulai di baris 1 dan merusak AutoFilter/pivot (revisi owner 2026-08-29). Bila grid aktif: tambahan satu sheet per sel grid berisi subset baris sel + gambar peta sel. **Sheet per** (#371, select di samping tombol Excel, bawaan *Grid peta* = perilaku di atas): *Kelompok Tani* / *Blok* mengganti sheet sel grid dengan satu sheet per grup (`groupLandParcelRows` — nama sheet = nama KT / nama Blok saja; per Blok **lintas KT** (owner 2026-09-23, revisi dari `KT – Blok` di issue: uji Sei Galuh memotong kode Blok di batas 31 karakter); kunci tak peka huruf besar-kecil/spasi ganda, isian "Tidak Ada"/"-" = kosong; urutan natural, grup "Tanpa KT"/"Tanpa Blok" di akhir), tabel saja tanpa gambar peta, No mulai 1 per sheet, baris Total per sheet bila Luas menyala; nama sheet via `safeSheetName` (≤ 31 karakter — dipendekkan dengan "…", tanpa `[ ] : * ? / \`, bentrok tak peka huruf besar-kecil — termasuk dengan "Lahan"/"Ringkasan" — diberi akhiran ` (2)`); sheet Ringkasan memuat baris "Pecah sheet: <mode> (<n> sheet)"; nama berkas berakhiran `_per_KT` / `_per_Blok`. Kolom mengikuti selektor kolom. Bila geometri belum termuat: "Geometri lahan masih dimuat — coba lagi sebentar." Tombol digate izin `EXPORT` (#245) |
| PDF | File `Laporan_Lahan_<…>` via `exportLandParcelReportPDF`; metadata Distrik & Lembaga Petani (grid 2 kolom), lalu **blok penuh-lebar** `sections`: "Filter Legalitas" (`describeLegalFilters`) dan "Ringkasan Legalitas" (`describeLegalSummary`) — keduanya di luar grid metadata karena kolomnya hanya 90 mm sedangkan kalimat filter jauh lebih panjang, dan tiap baris dibungkus `splitTextToSize`. Tanpa filter, ekspor "tanpa surat" terbaca seperti roster lengkap; tanpa ringkasan, pembaca dapat daftar tanpa tahu proporsinya. Kolom mengikuti selektor kolom + baris Total; menyertakan halaman peta sesuai pengaturan grid & label — digate izin `PRINT` (#245) |

## Laporan NKT per Lembaga (PDF, #332)

Tombol **Laporan NKT** (ikon perisai, merah) di toolbar ekspor — muncul bersama Excel/PDF bila ada baris; digate izin `PRINT` yang sama (`report-land-parcel`). **Pintu kedua:** tombol yang sama di Detail Lembaga › tab Lahan (gate `master-data-groups:PRINT`, action `getFarmerGroupNktReportData`); keduanya memakai pemuat bersama `loadNktReportData` (`src/lib/nkt-report-query.ts`) — menu key di-hardcode per entry point (#313). Berbeda dari PDF laporan legalitas: **tidak mengikuti filter** — sumbernya `getNktReportData(farmerGroupId)` (`src/server/actions/report.ts`: PRINT + cakupan akses Lembaga + `isActive`) yang memuat **seluruh lahan aktif Lembaga** (`identity.nkt` + geometri). Builder murni `buildNktReportDoc` (`src/lib/nkt-report.ts`) menyusun `LayerReportInput` untuk `buildLayerReportDoc` (landscape A4, pola PDF legenda Peta Lahan #331):

| Bagian | Isi |
|---|---|
| Kop | Kicker "SMALLHOLDER HUB · LAPORAN NKT", judul "Laporan NKT — <nama Lembaga>", subjudul kode · Distrik · **sumber asesmen** (gabungan asesor/sumber unik dari baris NKT) · waktu cetak WIB |
| KPI (3 kotak — revisi owner 2026-09-15) | **Total lahan** (catatan: sudah dinilai · belum) · **Lahan NKT** (catatan: Σ luas poligon) · **Luas NKT** (Σ `affected_area_ha`). Kotak Sudah dinilai / Panjang / Patok NKT dicoret — panjang tetap per baris tabel; hitungan patok NKT tidak lagi dimuat (`getNktReportData` tanpa `landMarker.count`) |
| Peta | Semua lahan Lembaga sebagai **konteks** ungu tipis (12 %) berlabel nama petani; lahan NKT **merah bernomor** (nomor = urutan tabel); halaman **peta rinci per klaster** bila fitur < 6 mm; graticule + skala + panah utara. Centroid jangkar nomor = **centroid luasan** (shoelace), bukan rata-rata simpul — sisi yang didigitasi rapat menarik rata-rata simpul ke tepi dan nomor menabrak nama |
| Tabel lahan NKT | Hanya lahan `isNktAffected` (INCLUDED ∪ AFFECTED): No · ID Lahan · Petani · ID Petani · KT / Blok · Luas (ha) · Status · Kategori (`NKT 4`) · Luas NKT (ha) · Panjang (m) · **Tanggal · Catatan** — asesor/sumber dicantumkan per baris **hanya bila tidak seragam** (seragam → cukup di kop; menulisnya 21× dinilai boros) |
| Ringkasan | Tabel "Ringkasan per kategori NKT": kategori · keterangan (`NKT_CATEGORY_DESCRIPTIONS`) · jumlah lahan (lahan dua kategori dihitung di keduanya) |
| Berkas | `Laporan_NKT_<kode Lembaga aman>_<yyyymmdd>.pdf` (`nktReportFilename`) |

Lahan NKT tanpa poligon tetap masuk tabel (tidak digambar). Lahan tanpa baris NKT = "belum dinilai" — masuk KPI, tidak masuk tabel.

## Patok (#331)

| Objek | Keterangan |
|---|---|
| Filter **Patok** | `all` · `with` (≥ 1 tautan patok aktif) · `without` · `installed` (ada patok dan tak satu pun selain `PRESENT`) · `problem` (ada patok `MISSING`/`DAMAGED`/`NOT_INSTALLED`) — `landParcelLegalWhere` lewat `identity.markers`; teks filter di `describeLegalFilters` (ikut PDF/Excel) |
| Kolom **Patok** (opsional, default mati) | `patok` (jumlah tautan aktif) + `patokKondisi` ("2 ada · 1 hilang · 1 belum dipasang", urutan tetap Ada · Hilang · Rusak · Belum) — layar satu sel "4 · 2 ada · …", ekspor dua kolom (`Patok`, `Kondisi Patok`) |
| Kartu **Ada Patok** | Kartu keenam ringkasan legalitas (grid 3 kolom): lahan ber-patok, `%` dari lahan hasil filter (patok wajar ada di semua lahan, bukan hanya yang didata) · jumlah tautan patok (patok bersama dihitung per lahan) |
