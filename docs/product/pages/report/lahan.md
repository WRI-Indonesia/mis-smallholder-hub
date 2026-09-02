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
| "Kolom" | Dropdown selektor kolom | Pintasan **Pilih semua · Kosongkan · Bawaan** + penghitung `aktif/total` (standar `ui-ux.md`; rollout ke menu lain: #308). "Tampilkan Kolom": Kelompok Tani, Blok, Komoditas, Species, PSR, Tahun Tanam, Luas (Ha), **Surat Kepemilikan, Nama di Surat, Luas Tertera (Ha), STDB** (#296), **UL Parcel Code, Program** (#305). Default aktif: Kelompok Tani, Tahun Tanam, Luas (Ha) |
| "Cakupan Pendataan" | Filter (`select`) | `Semua lahan` (**default sejak #318**, 2026-09-02 — bawaan `Sudah didata` menyaring lahan tanpa UL Parcel Code sehingga laporan terbaca seperti roster lengkap padahal tersaring) / `Sudah didata`. "Sudah didata" = punya UL Parcel Code aktif — **proxy** untuk "sudah melalui import Detail Lahan"; ini penyebut semua persentase di kartu ringkasan, jadi persentase pada setelan bawaan sengaja "pesimis". ⚠️ Default **fungsi** `landParcelLegalWhere` tetap `mapped` (membatasi untuk apa pun selain `"all"`, sepakat dengan teks `describeLegalFilters` supaya header PDF/Excel tak pernah mengklaim batasan yang tidak ada di datanya) — halaman selalu mengirim `coverage` eksplisit, tapi pemanggil baru yang lupa akan menyaring diam-diam (#319) |
| "Status Surat" | Filter (`select`) | `Semua` / `Ada surat` / `Tanpa surat`. **"Tanpa surat" = tidak ada baris `LandParcelDocument` aktif sama sekali**; lahan yang hanya punya baris `OTHER` + `custodyNote` ("surat di bank", "lahan sudah dijual") dihitung **punya** surat |
| "Jenis Surat" | Filter (dropdown checkbox, multi) | Enum `LandDocumentType`. Semantik: **punya minimal satu** jenis terpilih — lahan ber-SHM *dan* ber-SKT muncul di kedua filter (disengaja) |
| "Status STDB" | Filter (`select`) | `Semua` / `Ada STDB` / `Tanpa STDB` / per tahap `LandStdbStage` (#306) |
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

Agregasi: baris footer "Total" berisi jumlah Luas (Ha), hanya muncul bila kolom Luas aktif.

### Di mana filter dikerjakan (#305)

Cakupan/Status Surat/Jenis Surat/Status STDB → fragment `where` Prisma lewat relasi `identity` (`landParcelLegalWhere`, `src/server/actions/report.ts`). **Selisih Luas** tidak bisa jadi `where` karena nilainya turunan (Σ luas tertera vs poligon), jadi difilter di `buildLandParcelReport` — yang juga berjalan di server dan menghitung ringkasannya sekalian. Yang haram: memfilter array hasil di klien; jumlah baris, baris Total, dan kartu ringkasan akan bercerita berbeda.

**Kerapuhan proxy (utang, lihat `tech-debt.md` TD-035):** "punya UL Parcel Code" hanya *kebetulan* setara dengan "sudah lewat import Detail Lahan" karena seluruh 6.953 baris valid membawa kolom `parcel_code`. Klien import karena itu memberi **peringatan eksplisit** bila sebuah berkas tidak punya kolom itu.

## Opsi ekspor

| Format | Keterangan |
|---|---|
| Excel | File `Laporan_Lahan_<Lembaga/Distrik/Semua>`; sheet **"Ringkasan"** di posisi pertama (kolom Bagian · Keterangan · Nilai · Catatan) berisi filter legalitas aktif + 4 angka ringkasan, lalu sheet "Lahan" berisi seluruh baris + gambar peta (PNG hasil rasterisasi SVG). Ringkasan sengaja jadi **sheet tersendiri**, bukan baris catatan di atas tabel: menyisipkan baris di atas header membuat data tak lagi mulai di baris 1 dan merusak AutoFilter/pivot (revisi owner 2026-08-29). Bila grid aktif: tambahan satu sheet per sel grid berisi subset baris sel + gambar peta sel. Kolom mengikuti selektor kolom. Bila geometri belum termuat: "Geometri lahan masih dimuat — coba lagi sebentar." Tombol digate izin `EXPORT` (#245) |
| PDF | File `Laporan_Lahan_<…>` via `exportLandParcelReportPDF`; metadata Distrik & Lembaga Petani (grid 2 kolom), lalu **blok penuh-lebar** `sections`: "Filter Legalitas" (`describeLegalFilters`) dan "Ringkasan Legalitas" (`describeLegalSummary`) — keduanya di luar grid metadata karena kolomnya hanya 90 mm sedangkan kalimat filter jauh lebih panjang, dan tiap baris dibungkus `splitTextToSize`. Tanpa filter, ekspor "tanpa surat" terbaca seperti roster lengkap; tanpa ringkasan, pembaca dapat daftar tanpa tahu proporsinya. Kolom mengikuti selektor kolom + baris Total; menyertakan halaman peta sesuai pengaturan grid & label — digate izin `PRINT` (#245) |
