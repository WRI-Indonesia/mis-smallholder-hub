# Proyek — Technical Debt & Bug Register

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [brief.md](./brief.md) · [roadmap.md](./roadmap.md) · [sprint.md](./sprint.md) · [changelog.md](./changelog.md) · [contributing.md](./contributing.md)

## Summary

Kondisi per **2026-08-08** (audit menyeluruh): register bug lama **7/7 selesai**; **1 bug open** sebagai issue — **#237** tombol "Aktifkan kembali" Menu Management memanggil `deleteMenuItem` (reaktivasi tak pernah terjadi; temuan penulisan tutorial `a-5` di #207) — termasuk semua celah guard/scope RBAC P0 dari audit 2026-07-10. Tersisa **13 debt aktif** (semua diverifikasi ulang terhadap kode 2026-08-08 — tidak ada yang diam-diam sudah selesai); **TD-030/TD-031 dibuka 2026-08-05** dari #215/#217 (overlay hilang tanpa padanan publik & legend hardcoded); **TD-032 dibuka 2026-08-08** menampung 3 item mikro sisa issue #136 yang ditutup (debounce panel lahan, aria-label, lahan tetangga PDF); **TD-033 dibuka & diselesaikan 2026-08-10** (review pra-close #239 → lanjutan hari yang sama: ekstraksi `MatrixBody` + trim `ProductionMonthRow`). Tidak ada yang memblokir fitur berjalan. Risiko terbesar bersifat **struktural**: TD-014 (level Kelompok Tani belum dimodelkan sebagai tabel — interim per-lahan sudah jalan; hierarki **final 3 level** diputuskan #189, refactor penuh menunggu data lengkap); selebihnya debt kualitas berukuran kecil–sedang.

**Pembaruan per 2026-08-20** (review kode pasca-rilis v0.27.0, #278): **bug open 1 → 6 → 4** — **#237** (lama) · **#270** drift checksum migrasi lokal · **#273 `priority: high`** font Acumin berlisensi ter-commit & tersaji publik di repo PUBLIC — 4 berkas `.otf` yang tidak dipakai kode **sudah dihapus 2026-08-20**, sisa keputusan owner untuk berkas yang dipakai runtime + rewrite riwayat (**ditunda** atas keputusan owner) · **#277** `deploy-staging.yml` tanpa `migrate deploy` · **#280** klip titik api memakai `geojson` tersimplifikasi (celah antar-kabupaten bisa menelan titik) — dibuka dari review pasca-rilis v0.27.0 bersama **#281** (label rentang meleset sehari 00:00–07:00 WIB), yang **ditutup 2026-08-24** via #284 (`hotspotWindowStart` berbasis tanggal UTC, satuan yang sama dengan FIRMS). **#276 ditutup 2026-08-20** (progres per lembaga + `AbortController` pada cetak PDF Fire Alert; batas lampiran sengaja tidak diambil — keputusan data, bukan UX). **Ditutup 2026-08-20:** **#275** `geojson` boundary di-cast tanpa validasi → skip + `console.warn` per baris cacat (pola `resolveHelpMedia`); **#274** `countHotspotsByGroup` satu baris per baris boundary → agregasi per `farmerGroupId`, sekaligus menutup akar yang lebih dalam di `classifyHotspots` (hit per baris boundary → titik dobel & salah tertandai "bersama"); keduanya tanpa migrasi DB atas keputusan owner (partial unique index tidak diambil). Debt aktif tetap **13** — tidak ada TD baru dibuka; temuan-temuan di atas dilacak sebagai issue, bukan debt. Ditambah **#279** (`enhancement`) — skrip seed geospasial tersembunyi di `/scripts/local` yang gitignored (bus factor 1, docs merujuk berkas yang tak ada di repo); **ditutup 2026-08-20** — 3 skrip + `boundary-mapping.csv` (diaudit bebas PII) dipindah ke `scripts/seed/` yang di-track, path data lewat `--data`/`SEED_DATA_DIR` dengan gagal-terang bila absen; usulan mengubah pola ignore jadi berbasis data **ditolak** (akan melepas ~70 skrip `debug/`+`other/` ke repo publik), `/scripts/local` tetap di-ignore utuh.

**Pembaruan per 2026-08-24** (#284 rentang titik api 10/30 hari + review pasca-rilis v0.28.0, #285): **#281 ditutup** via #284 (`hotspotWindowStart` berbasis tanggal UTC). Review #285 menemukan 1 HIGH (jendela terbaru tanpa `DATE` bisa menyisakan celah sehari bila "hari ini" FIRMS ≠ tanggal server → semua jendela kini ber-`DATE`), `Cache-Control: public` pada respons ber-permission → `private`, abort yang membatalkan cache jendela sukses, dan 11 temuan kecil — semua diperbaiki. Dibuka **#286** (`priority:P1`) skala rentang 30 hari saat musim karhutla — data cache Next menolak entri >2 MB **dan mencetak URL ber-`FIRMS_MAP_KEY_FREE` ke log**, payload tanpa cap, klasifikasi PiP di main thread, modal/PDF tanpa cap; **#287** keputusan owner batasi cetak PDF 30 hari → **ditutup hari yang sama: tidak dibatasi** (mengandalkan progres + Batalkan #276); **#288** `tsc --noEmit` merah di `dashboard*.test.ts` (drift fixture, tak tertangkap gate) + pin `TZ` vitest. Debt aktif **13 → 14**: **TD-034** dibuka — kontrak `DATE` FIRMS (= hari pertama jendela) hanya terverifikasi manual.

**Rekomendasi:**

| Horizon | Fokus | Alasan |
| --- | --- | --- |
| **Jangka pendek** (sprint berjalan) | **TD-026** (a11y matriks) & **TD-027** (N+1 kaskade `setRolePermissions`); **TD-008** (helper parsing angka form) — kerjakan menumpang saat menyentuh file terkait (**TD-015 ✅ 2026-09-02** lewat #323, setelah gigitan ketiga); **TD-002** (visual audit `text-white`) sekali jalan | Sisa #187B (TD-026/027) sudah ber-scope jelas; sisanya kecil, murah, mencegah silent-fail berulang (TD-015 menggigit 3× — dua di #160, lalu #323). TD-029 ✅ selesai 2026-07-28 |
| **Jangka menengah** (1–2 sprint) | **TD-010 sisa** — pisah `error:string` + `fieldErrors` di tipe `ActionResult` (32 baris `fieldErrors` / 13 file actions / ~10 form); **TD-004** (i18n) bila jadi kebutuhan produk | Perubahan kontrak lintas form — butuh PR khusus ber-scope jelas, bukan tumpangan; i18n perlu keputusan produk dulu |
| **Jangka panjang** (menunggu data) | **TD-014** refactor hierarki penuh (Jalur B: **KT** jadi tabel, `FarmerGroup`→`FarmerInstitution`, export→rebuild→re-import) — **tanpa** entitas Gapoktan (3 level final #189) | Blocker: data KT lengkap (keputusan 3-vs-4-level **sudah final: 3**); interim per-lahan (#146/#150) sudah menopang report/dashboard/detail sampai saat itu |

---

Debt/bug di halaman ini berasal dari audit code. Item masuk sprint jika sudah punya owner, priority, dan definition of done.

**Cara baca:** item yang **masih aktif** tampil langsung di atas (itu yang perlu ditindaklanjuti); item yang **sudah selesai** dipisah ke **Arsip** di bawah (collapsed, dibuka hanya bila perlu riwayat).

## Ringkasan

| Kategori | 🔴 Aktif | ✅ Selesai | Total |
| --- | --- | --- | --- |
| **Bug** (BUG-001…007) | 0 | 7 | 7 |
| **Debt** (TD-001…038) | **16** | 22 | 38 |

Debt aktif: **TD-010** 🟡 · **TD-014** 🟡 · TD-002 · TD-004 · TD-008 · TD-016 · TD-017 · TD-026 · TD-027 · TD-030 · TD-031 (dibuka 2026-08-05 dari #215/#216 — overlay hilang tanpa padanan publik & legend hardcoded) · TD-032 (dibuka 2026-08-08 dari penutupan #136). · **TD-034** (dibuka 2026-08-24 dari review #285 — kontrak `DATE` FIRMS terverifikasi manual saja) · **TD-037** (dibuka 2026-09-01 dari #313 — penulis SHP `@mapbox/shp-write`: DBF ASCII-only & MultiPolygon dipecah) · **TD-038** (dibuka 2026-09-02 dari #318 — penjahitan mosaik latar peta cetak tak bisa diuji di jsdom) · **TD-035** (dibuka 2026-08-27 dari penutupan #296 — `fileUrl`/`rawGeometry` tanpa UI; bagian kolom report UL Parcel Code/Program ✅ #305 2026-08-29, diganti utang baru: **proxy "sudah didata" = punya UL Parcel Code**) (**TD-036 ✅ 2026-08-28** — `MAP_STYLES` satu sumber di `src/lib/map-style.ts`, dari #307.) (**TD-033 ✅ 2026-08-10** — dedup tbody matriks produksi + trim payload bulanan, dari review #239; dibuka & diselesaikan di hari yang sama.) (TD-018/TD-019 ✅ #180 2026-07-20; **TD-020…TD-025 ✅ 2026-07-21** — dari DASH-06, audit asimetri, dan review HELP-02; TD-021 sebagian. **TD-026/TD-027** dibuka dari #187B — aksesibilitas matriks & N+1 kaskade; **TD-028 ✅ #188** — migrasi primitif popup, langsung selesai. **TD-029 ✅ 2026-07-28** — scope leak combobox bulk upload petani, follow-up TD-024; dibuka & diselesaikan di hari yang sama.)

## Debt Register — 🔴 Aktif

### TD-010 · 🟡 Partial — Return `ActionResult` ad-hoc: sisa `error: fieldErrors` (P2)

- **Masalah awal:** audit fields tidak diisi di sebagian mutasi (`user.ts`, `menu.ts`, `role-permission.ts`, toggle region, assignment) + return `ActionResult` ad-hoc.
- **Sudah selesai:** payload ad-hoc `{granted}`/`{count}` → ✅ #129 (dipindah ke `data` + anotasi tipe); audit fields `createdBy`/`modifiedBy` → ✅ #130 (diisi dari `auth()` di user/menu/role-permission/region-toggle/user-data-access/user-menu-access + `toggleFarmerActive`).
- **Sisa (follow-up khusus):** `error: fieldErrors` (objek) di **32 baris / 13 file actions** (verifikasi `grep -rc "fieldErrors" src/server/actions/*.ts`, 2026-07-28) — perlu pisah `error:string` + `fieldErrors` di tipe `ActionResult` + ~10 form (lihat analisa #129).
- **Evidence:** Audit 2026-07-10 §3.4 & LOW · **Issue #129/#130** · **Owner:** Backend Lead.

### TD-014 · 🟡 Interim jalan — Level "Kelompok Tani" belum dimodelkan sebagai tabel (P2)

- **Masalah:** level tengah antara Petani dan Lembaga Petani belum dimodelkan; data KT belum dimasukkan (per owner). Butuh model baru KT, re-parenting `Farmer` (Petani → KT, KT → Lembaga) via migrasi, plus dampak RBAC scope, districtId, dan **tabrakan identifier** (`FarmerGroup` kini dipakai untuk Lembaga). **Bukan refactor & bukan kosmetik — ini fitur/skema baru.**
- **Status interim (jalan):** field denormalisasi `LandParcel.subGroupLv2` (Kelompok Tani) **per-lahan** (#146) + input manual & bulk shapefile (#150 ✅) — jalur input interim lengkap. (Level `subGroupLv1`/Gapoktan **di-drop #189** → hierarki final 3 level.)
- **Target akhir (diperbarui 2026-07-22, #189):** hierarki final **3 level** — **Gapoktan/KUD dibatalkan** (kolom `sub_group_lv1` di-drop). Jalur B tetap: rename `FarmerGroup`→`FarmerInstitution` + entitas **KT** sebagai tabel (tanpa entitas Gapoktan); eksekusi **export → rebuild → re-import** saat data lengkap.
- **Blocker:** keputusan 3-vs-4-level **sudah terjawab (3 level, #189)**; sisa: konfirmasi padanan Inggris + eksekusi re-modelling KT jadi tabel saat data siap.
- **Owner:** Product + Backend Lead.

<details>
<summary>Riwayat, evidence & validation lengkap</summary>

- **Evidence:** Skema: `farmer.prisma:10` (`farmerGroupId`→FarmerGroup), `farmer-group.prisma`, `access-context.ts` (mode `BY_FARMER_GROUP`), enum `FarmerGroupCategory` (`EX_PLASMA`/`SWADAYA`). Gapoktan = Gabungan Kelompok Tani → perjelas apakah KT & Gapoktan satu entitas atau dua *(pertanyaan ini **terjawab #189**: Gapoktan dibatalkan — hierarki final 3 level)*.
- **Alasan per-lahan (#146):** satu petani bisa punya lahan di KT/Gapoktan berbeda → keanggotaan sub-kelompok per-lahan, bukan di `Farmer`.
- **Konsumen interim (selesai):** Report Kelompok Tani real-time (**#154** — Summary agregat + Detail roster, Excel/PDF), card "Total Kelompok Tani" Main Dashboard snapshot-backed (**#148**, distinct `subGroupLv2`), KT/Gapoktan turunan di detail Petani (**#152**, `lib/farmer-sub-groups.ts`). Label UI "Gapoktan" → **"Gapoktan/KUD"** (#154; `subGroupLv1` tetap).
- **Validation:** model jalan Petani→KT→Lembaga; scope RBAC & filter district konsisten; **ID/relasi (UserFarmerGroup, LandParcel+GeoJSON, TrainingActivity, produksi, snapshot) tidak putus** saat re-import (pertahankan CUID atau remap); UI/CRUD/bulk untuk level baru; gate lint/build/test hijau. Padanan Inggris terpilih: `Farmer` / `FarmerGroup`(KT) / ~~`FarmerGroupAssociation`(Gapoktan, bila 4 level)~~ *(gugur — 3 level final #189)* / `FarmerInstitution`(Lembaga).

</details>

### TD-002 · 🔲 Planned — Hardcoded `text-white` perlu visual audit (P2)

- **Masalah:** hardcoded `text-white` di login, footer, user menu access modal; sebagian mungkin valid karena background solid.
- **Validation:** visual QA dark/light mode tanpa contrast regression. · **Owner:** Frontend Lead.

### TD-004 · 🔲 Planned — Language toggle / i18n belum ada (P2)

- **Masalah:** tidak ada locale switch/persistence.
- **Validation:** toggle mengubah locale dan persist state antar navigasi. · **Owner:** i18n Lead.

### TD-008 · 🔲 Planned — Form parsing berpotensi `NaN` pada field kosong (P2)

- **Masalah:** form data parsing berpotensi `NaN` pada field kosong/whitespace.
- **Evidence:** `src/app/(admin)/admin/master-data/groups/group-form-modal.tsx`.
- **Validation:** gunakan helper untuk memproses string kosong/whitespace sebelum parsing numerik. · **Owner:** Frontend Lead.

### TD-017 · 🔲 Open — Field foto petani belum ada di schema (P3)

- **Masalah:** detail Petani 360° (#172) butuh foto petani; field/upload belum ada di `Farmer` (keputusan owner 2026-07-16: **pending**, masuk debt).
- **Interim:** #172 memakai **placeholder avatar** (inisial nama) — siap diganti saat field tersedia.
- **Validation:** saat diputuskan lanjut — kolom `photoKey` (S3, pola evidence pelatihan) + upload di form Petani + tampil di detail/list. · **Owner:** Backend + Frontend.

### TD-016 · 🔲 Open — Test flaky: 1 test gagal sporadis saat mesin sibuk (P3)

- **Masalah:** pada 2026-07-16 suite gagal **3× (1 test)** lalu hijau saat di-rerun (441→457 pass); loop 3× berturut saat idle bersih — gagal hanya saat run berbarengan proses berat (build/lint). Pola konsisten **perf test ber-ambang waktu** (`perf.test.ts` berisi assert durasi ms).
- **Evidence:** sesi 2026-07-16 (3 kejadian, selalu lolos di rerun); nama test belum tertangkap — kegagalan berikutnya, simpan output penuh.
- **Validation:** saat terulang, catat nama test + longgarkan ambang (atau tandai `retry: 1` khusus perf) agar gate pre-commit tidak false-negative. · **Owner:** QA/Dev.

### TD-026 · 🔲 Open — Matriks Role & Permission: sel izin belum aksesibel (P3)

- **Masalah:** sel izin di `role-matrix-client.tsx` adalah tombol ikon tanpa nama aksesibel maupun `aria-pressed`; chevron & tombol toggle baris hanya punya `title`. Pembaca layar tak bisa membedakan granted/denied atau mengetahui aksi tombol.
- **Validation:** tambahkan `aria-label` (mis. "ADMIN · Dashboard · VIEW: aktif") + `aria-pressed` pada sel; label pada chevron & tombol `ListChecks`. · **Evidence:** #187B. · **Owner:** Frontend.

### TD-027 · 🔲 Open — `setRolePermissions` N+1 pada kaskade besar (P3)

- **Masalah:** `setRolePermissions` melakukan `findFirst`+`update`/`create` **berurutan per baris** dalam satu transaksi. Kaskade induk→anak untuk subtree besar × banyak role = puluhan round-trip (terasa lewat tunnel; timeout dinaikkan ke 20s sebagai penambal).
- **Validation:** ganti ke SQL massal — `findMany` sekali untuk state saat ini, lalu `updateMany`(isActive) + `createMany`(baris baru) atas himpunan terhitung. · **Evidence:** #187B (`src/server/actions/role-permission.ts`). · **Owner:** Backend.

### TD-038 · 🔲 Open — Penjahitan mosaik latar peta cetak tak tertutup uji (P3)

- **Masalah:** `composeReportBasemap()` (#318) menjahit tile jadi satu JPEG memakai `Image` + canvas 2D. jsdom hanya menyediakan **stub** canvas, sehingga fungsi ini tidak bisa dijalankan di Vitest — yang teruji hanya matematikanya (`lonToTileX`/`latToTileY`/`pickBasemapZoom`/`expandFrameToBox`/`basemapPixelSize`) dan guard route. Regresi pada penempatan tile, urutan gambar, atau peredaman baru ketahuan lewat mata di browser. Tiga cacat pertama #318 (ekspor tak menunggu, pita putih, latar PDF salah ukuran) semuanya lolos gate lint/build/test dan ditemukan owner saat mencoba — bukti langsung celah ini.
- **Validation:** jalankan jalur ini di lingkungan ber-canvas nyata. Kandidat: Vitest **browser mode** (Playwright provider) khusus berkas ini, atau uji snapshot piksel dengan `@napi-rs/canvas` sebagai polyfill `HTMLCanvasElement` di setup. Yang perlu dikunci minimal: tile digambar pada offset yang benar untuk bbox tertentu, dan alpha peredaman menghasilkan luminans yang diharapkan. · **Evidence:** #318 (`src/lib/report-basemap.ts`), komentar di kepala `src/test/report-basemap.test.ts`. · **Owner:** Frontend.

### TD-030 · 🔲 Open — 3 overlay peta hilang tanpa padanan publik (P3)

- **Masalah:** #215 menghapus overlay **Pelepasan Kawasan Hutan**, **PIPPIB (Moratorium)**, dan **Penutupan Lahan** karena layanan SIGAP KLHK mati dan geoportal Kemenhut baru tidak memublikasikan padanannya (kandidat terdekat PPTPKH ≠ Pelepasan; PIPPIB 2026 & PL 2024 tersedia tapi belum di-review kecocokannya dengan kebutuhan produk). Kapabilitas produk berkurang diam-diam.
- **Validation:** review berkala geoportal Kemenhut (`Peta_Interaktif_2026`) & Satu Peta BIG; bila layanan publik yang cocok muncul, tambahkan kembali via `MAP_OVERLAYS` (skema sudah mendukung). · **Evidence:** #215 (`map-overlays.ts`). · **Owner:** Product + Frontend.

### TD-031 · 🔲 Open — Warna legend overlay hardcoded, sinkron manual dengan renderer upstream (P3)

- **Masalah:** `MAP_OVERLAYS[].legend` menyalin warna kelas dari renderer ArcGIS upstream saat #215; bila penyedia mengubah simbologi, legend panel diam-diam tidak cocok dengan tile yang dirender.
- **Validation:** cek visual berkala (bandingkan legend panel vs endpoint `/MapServer/legend?f=json`); alternatif jangka panjang: fetch legend upstream sekali per sesi dengan fallback ke nilai statis. · **Evidence:** #215/#217 (`map-overlays.ts`). · **Owner:** Frontend.

### TD-032 · 🔲 Open — Polish mikro Peta Lahan sisa #136 (P3)

- **Masalah:** 3 item mikro tersisa dari issue #136 (ditutup 2026-08-08; item lain obsolete/superseded — Recharts dihapus dari stack #129, warna 2 kategori terwujud lebih kaya di Peta BMP #144, data-quality `parcelId=null` terverifikasi 0 orphan di TD-022):
  1. Search panel daftar lahan belum debounce/virtualisasi (aman sampai >10k lahan);
  2. `aria-label` eksplisit untuk input search & tombol ikon panel daftar lahan;
  3. Lahan tetangga di gambar lahan PDF (#134-E) — menunggu keputusan kriteria "tetangga" (radius vs bersinggungan) + batas jumlah.
- **Validation:** kerjakan menumpang saat menyentuh `map-canvas.tsx`/panel daftar lahan berikutnya; item 3 butuh keputusan produk dulu. · **Evidence:** #136 (komentar disposisi penutupan). · **Owner:** Frontend.

### TD-034 · 🔲 Open — Kontrak `DATE` FIRMS (hari pertama jendela) hanya terverifikasi manual (P3)

- **Masalah:** seluruh rentang 10/30 hari titik api (#284) bertumpu pada asumsi parameter `DATE` Area API FIRMS = hari **pertama** jendela (`DATE … DATE+dayRange-1`). Semua test route mem-mock `fetch`; bila FIRMS mengubah semantiknya (mis. jadi hari terakhir), 10 hari akan menampilkan 11–15 + 20–24 Agu dengan label "15–24 Agu" — bolong 4 hari tanpa satu pun test merah. Diverifikasi manual 2026-08-24 (`…/5/2026-08-15` → acq_date 15–19 Agu); perintah cek tercatat di `docs/standards/ui-ux.md` §Titik Api.
- **Validation:** smoke check hidup yang tidak melanggar gate "tanpa test ter-skip" — mis. skrip `scripts/smoke/firms-date.ts` (npm script terpisah, dijalankan sebelum rilis / bulanan) yang menegaskan `min(acq_date) == DATE` dan `max(acq_date) == DATE+4`; atau job terjadwal yang memberi peringatan. · **Evidence:** #285 (temuan 2). · **Owner:** Backend.

### TD-035 · 🔲 Open — Satelit lahan: kolom skema tanpa jalur UI & cakupan report (P3)

- **Masalah:** dari #296 ada bagian skema yang **sengaja ditunda** UI-nya: `LandParcelDocument.fileUrl` (scan dokumen, S3) dan `LandParcelExternalId.rawGeometry` (geometri vendor) hanya terisi lewat skrip/import, tanpa unggah/tampil di Detail Lahan; enum `LandProgramType` baru berisi `DEMPLOT_PBU`; ~~Report Lahan belum punya kolom UL Parcel Code & Program~~ **✅ selesai #305 (2026-08-29)** — kedua kolom masuk selektor Kolom, Excel, dan PDF (default mati). `kabupaten/kecamatan/desa` per lahan dari Excel Rohul juga belum ditampung (bisa diturunkan dari poligon vs batas BIG).
- **Utang baru dari #305 — proxy "sudah didata":** Laporan Lahan memakai **"punya UL Parcel Code aktif"** sebagai penanda "lahan sudah melalui import Detail Lahan", dan penanda itu jadi **penyebut semua persentase legalitas**. Kesetaraannya hanya kebetulan: seluruh 6.953 baris valid yang sudah masuk membawa kolom `parcel_code`. Begitu ada berkas kabupaten tanpa kolom itu, penyebutnya diam-diam salah dan semua persen ikut salah **tanpa gejala**. Peredam sementara sudah dipasang (peringatan eksplisit di klien import bila kolomnya tidak ada + catatan penyebut di UI/PDF/Excel), tapi utangnya **lunas hanya bila ada penanda pendataan eksplisit** — mis. kolom `LandParcelIdentity.surveyedAt` atau tabel batch import — bukan proxy. Prasyarat juga untuk `Dashboard > Legalitas Lahan` (angka yang dipakai donor).
- **Validation:** unggah scan dokumen ke S3 (`src/lib/s3.ts`, presigned) + pratinjau di tab Legalitas; penanda pendataan eksplisit menggantikan proxy UL Parcel Code; program kedua saat ada kebutuhan. · **Evidence:** #296 retro, #305 (§Kerapuhan proxy), `prisma/schema/land-parcel-document.prisma:41`, `land-parcel-external-id.prisma:16`. · **Owner:** Product + Frontend.

### TD-037 · 🔲 Open — Penulis SHP `@mapbox/shp-write` membatasi ekspor lahan (ASCII-only, MultiPolygon dipecah) (P3)

- **Masalah:** ekspor spasial lahan (#313) menanggung dua batasan penulis `dbf` di `@mapbox/shp-write`: (1) atribut ditulis **1 byte per code-unit** sehingga non-ASCII korup apa pun isi `.cpg` — solusi sekarang transliterasi ASCII (é→e, sisanya `?`) di `toAsciiDbf`; (2) Polygon & MultiPolygon ditulis sebagai **dua shapefile terpisah** dalam satu ZIP — solusi sekarang MultiPolygon dipecah per poligon anggota (baris atribut terduplikasi per anggota). Keduanya keputusan sadar (Decision Log 2026-09-01), tapi kualitas berkasnya di bawah GeoJSON/KML.
- **Validation:** ganti/patch penulis SHP yang menulis DBF UTF-8 (ladinlib/gdal-wasm/penulis sendiri di atas `dbf` fork) + dukungan MultiPolygon shapefile asli (shape type 5 multi-ring sudah sah menampung multipart); test round-trip `shpjs` + verifikasi QGIS dengan nama ber-diakritik. · **Evidence:** `src/lib/parcel-export-data.ts` (`toAsciiDbf`, `explodeMultiPolygons`), `parcel-export.test.ts`, #313 retro. · **Owner:** Frontend.

## Debt Sequencing

| Waktu                | Fokus                  | Catatan                                                    |
| --------------------- | ---------------------- | ------------------------------------------------------------ |
| Immediate / P0       | ✅ **BUG-003, BUG-004** (selesai 2026-07-12, #125) | Celah guard/scope RBAC ditutup sebelum fitur baru |
| Sprint berjalan / P1 | ✅ **TD-007** (BUG-005 ✅, BUG-006 ✅) | lint hijau (#126 ✅), pola restore + scope by-id KT/pelatihan/lahan (#127 ✅ 2026-07-12) |
| Later / P2–P3        | ✅ **TD-009, TD-011** (#129), **TD-012** & TD-010 audit-fields (#130, 2026-07-12); sisa aktif: TD-002, TD-004, TD-008, TD-010 (fieldErrors), TD-015 | Cleanup dead code/deps, env drift, audit fields & naming selesai; sisa: `ActionResult` fieldErrors, NaN parsing, visual audit, `exportValue` DataTable |

## ✅ Arsip — Selesai

### Bug Register (7/7 selesai)

<details>
<summary><strong>Lihat 7 bug selesai</strong> — BUG-001…BUG-007 (guard/scope RBAC, lint, redirect, scripts)</summary>

| ID | Bug | Priority | Selesai |
| --- | --- | --- | --- |
| BUG-001 | Redirect `/admin/master-data` ke route missing | P0 | ✅ |
| BUG-002 | Debug scripts import action yang tidak ada | P0 | ✅ 2026-06-22 |
| BUG-003 | Server actions tanpa guard `hasPermission` (privilege escalation) | **P0** | ✅ 2026-07-12 (#125) |
| BUG-004 | Scope `getAccessContext` absen (PII lintas scope, insert luar scope) | **P0** | ✅ 2026-07-12 (#125/#127) |
| BUG-005 | Halaman Roles di-guard menu key yang salah | P1 | ✅ 2026-07-12 (#125) |
| BUG-006 | Gate QA lint merah (193 error) | P1 | ✅ 2026-07-12 (#126) |
| BUG-007 | Scope leak `getMapData` (Peta Lahan/MAP-01) | P1 | ✅ 2026-07-13 |

**BUG-001** — `/admin/master-data` redirect ke route missing `/admin/master-data/farmers`. Evidence: `src/app/(admin)/admin/master-data/page.tsx`. DoD: redirect ke `/admin/master-data/farmers` — route exists & functional. ✅

**BUG-002** — Dashboard debug scripts meng-import `src/server/actions/dashboard` yang tidak ada. Evidence: `scripts/debug/debug-dashboard-data.js`, `scripts/debug/test-dashboard-api.js`, `scripts/debug/perf-dashboard.ts`. DoD: debug scripts dipindah ke `scripts/local/` (gitignored) — tidak ada di repo/CI. ✅

**BUG-003** — Server actions tanpa guard `hasPermission`: `role-permission.ts` (toggle/get — **privilege escalation**), `menu.ts` (create/update/delete), `upload.ts` (S3 write). Evidence: Audit 2026-07-10 `audit-report/audit-2026-07-10.md` §2 H-1/H-2/H-3 · Issue #125. DoD: guard `settings-roles`/`settings-menu`/`master-data-training` ditambah; `role-permission` tolak perubahan role SUPERADMIN; `getAllMenuItems` dual-key (menu OR roles); test di `rbac-server-guards.test.ts`. ✅

**BUG-004** — Scope `getAccessContext` absen: `farmer.ts getFarmerById` (PII lintas scope) & `bulk-upload.ts bulkCreateFarmers` (insert ke KT luar scope); mutasi by-id farmer/group/training juga tanpa cek scope. Evidence: Audit 2026-07-10 §2 H-4/H-5 + §3 M-1 · Issue #125 (MED by-id: #127). DoD: scope diterapkan di `getFarmerById`/`updateFarmer`/`toggleFarmerActive`/`createFarmer`/`bulkCreateFarmers` (pola `land-parcel.ts:68` / `bulk-upload-production.ts`); sisa scope by-id KT/pelatihan/lahan + helper "for select" → ✅ #127. ✅

**BUG-005** — Halaman Role & Permission di-guard `requirePermission("settings-users")` padahal menu key = `settings-roles` → user ber-grant `settings-roles` melihat menu tapi ditolak halamannya. Evidence: `settings/roles/page.tsx:7` vs `menu.csv` · Issue #125. DoD: diselaraskan ke `settings-roles` (page + actions `role-permission`). ✅

**BUG-006** — `npm run lint` 229 masalah (193 error) — mayoritas `no-explicit-any` + `scripts/` (gitignored) ikut ter-lint. Evidence: Audit 2026-07-10 §1 · Issue #126. DoD: `npm run lint` **exit 0** (0 error); eslint ignore `scripts/**`; unused-vars/prefer-const/no-unused-expressions dibersihkan; `no-explicit-any` diganti tipe nyata (`Prisma.*WhereInput`, `geojson`, maplibre `LayerProps`/`MapLayerMouseEvent`, `unknown`+narrowing); react-hooks `set-state-in-effect`×6 & `static-components`×4 diperbaiki tanpa disable. Sisa **3 warning `exhaustive-deps`** sengaja ditahan (risiko regresi zoom/memo) — disepakati terpisah per AC. Build ✅, test 25/328 ✅.

**BUG-007** — Scope leak `getMapData` (Peta Lahan/MAP-01): `groupWhere` spread `farmerGroupAccessFilter(access)` lalu di-override literal `districtId`/`id` → user ber-scope bisa memuat District/KT **di luar assignment** via panggilan action langsung (UI-bypass); pitfall key-collision identik #127. Evidence: `src/server/actions/map.ts` `getMapData`; ditemukan saat audit MAP-02 #144 (pola sama di `getBmpMapData` sudah diperbaiki). DoD: filter scope dipindah dari spread ke **`AND`**; +3 replica test `map groupWhere scope` (BY_DISTRICT/BY_FARMER_GROUP/ALL) di `map.test.ts` (31→34). Gate lint 0 / build ✅ / test 380 ✅.

</details>

### Debt Register — Selesai (20 item)

<details>
<summary><strong>Lihat 21 debt selesai</strong> — TD-001, 003, 005, 006, 007, 009, 011, 012, 013, 018, 019, 020, 021, 022, 023, 024, 025, 028, 029, 033, 036</summary>

| ID | Debt Item | Priority | Selesai |
| --- | --- | --- | --- |
| TD-001 | S3/PDF utility belum terintegrasi ke modul Training | P1 | ✅ 2026-07-10 (audit) |
| TD-003 | `.DS_Store` di working tree | P2 | ✅ (git tracking) |
| TD-005 | Dashboard cache/debug scripts implementasi lama | P1 | ✅ 2026-06-22 |
| TD-006 | `docs/rule.md` menyebut folder yang tidak ada | P2 | ✅ 2026-07-10 (audit) |
| TD-007 | Inkonsistensi soft-delete/restore | P1 | ✅ 2026-07-12 (#127) |
| TD-009 | Dead code & deps 0-usage + duplikasi helper | P2 | ✅ 2026-07-12 (#129) |
| TD-011 | Env & tooling drift | P2 | ✅ 2026-07-12 (#129) |
| TD-012 | Identifier Bahasa Indonesia vs rule "variable English" | P3 | ✅ 2026-07-12 (#130) |
| TD-013 | Mislabel `FarmerGroup` = "Lembaga Petani" (relabel UI) | P2 | ✅ 2026-07-14 (#147) |
| TD-018 | 5 salinan action dropdown Distrik/Lembaga per menu report | P3 | ✅ 2026-07-20 (#180) |
| TD-019 | Exporter PDF lama belum pola build-vs-save | P3 | ✅ 2026-07-20 (#180) |
| TD-028 | Migrasi Peta Lahan/BMP ke primitif popup bersama | P3 | ✅ 2026-07-22 (#188) |
| TD-015 | `DataTable` kolom turunan: export mengandalkan tebakan key → `buildExportRows` resolusi per kolom + `exportable` + peringatan dev (10 test) | P3 | ✅ 2026-09-02 (#323, setelah menggigit ketiga kalinya) |
| TD-033 | Dedup mesin baris matriks produksi (`MatrixBody`) + trim `ProductionMonthRow` ke field yang dirender | P3 | ✅ 2026-08-10 (#239, dibuka & selesai hari yang sama) |
| TD-022 | BMP: produksi jadi orphan saat revisi lahan (asimetri produktivitas) | P2 | ✅ 2026-07-21 |
| TD-023 | Dua definisi "cakupan pelatihan" antar dashboard | P3 | ✅ 2026-07-21 |
| TD-024 | `farmerId` tanpa penjaga keunikan + celah scope bulk upload | P2 | ✅ 2026-07-21 |
| TD-025 | Mode Detail Bantuan bergantung urutan sumber CSS | P3 | ✅ 2026-07-21 |
| TD-029 | Combobox bulk upload petani: daftar Lembaga tanpa scope filter | P1 | ✅ 2026-07-28 |
| TD-036 | `MAP_STYLES` basemap tersalin di 6 canvas peta → satu sumber `src/lib/map-style.ts` (+`PARCEL_MAP_STYLES`, id `esri-dark`/`osm-light`, 7 test) | P3 | ✅ 2026-08-28 (#307, bersama layer label Dark) |
| TD-020 | Dashboard Pelatihan: live query tanpa ambang perf | P3 | ✅ 2026-07-21 |
| TD-021 | State filter dashboard tidak tersimpan di URL | P3 | 🟡 2026-07-21 (Pelatihan + Dashboard Ketersediaan Data) |

**TD-001** — S3/PDF utility belum terintegrasi ke modul Training. Evidence: Training + evidence upload S3 sudah terintegrasi via `upload.ts` (#81); CLI `get-link`/`pdf-manager` tetap sebagai utilitas. Owner: Backend/Storage Lead. Validation: evidence upload berfungsi di app; sisa CLI tak load dotenv → TD-011. ✅

**TD-003** — `.DS_Store` tidak tracked, tetapi masih ada di working tree. Evidence: `git ls-files` kosong; `find` menemukan file lokal. Owner: Repository Maintainer. Validation: `.DS_Store` tetap ignored dan tidak masuk git (closed for git tracking). ✅

**TD-005** — Dashboard cache/debug scripts tampak berasal dari implementasi lama (menyebut dashboard stats/markers/batches yang tidak ada di source action). Validation: debug scripts dipindah ke `scripts/local/` (gitignored), tidak ada di repo/CI. ✅

**TD-022** — BMP: produksi jadi orphan saat revisi lahan, membuat produktivitas (Ton/Ha) menggelembung. **Akar masalah:** `bulk-upload-parcel.ts` menerapkan revisi dengan menonaktifkan baris lahan lama lalu membuat baris **baru ber-id baru**, sementara `ProductionRecord.parcelId` tetap menunjuk id lama → tonase masuk pembilang, luasnya tidak masuk penyebut, dan lahan terbaca "tanpa data produksi". **Fix:** `updateMany` memindahkan seluruh `ProductionRecord` (termasuk yang nonaktif, agar riwayat utuh) dari id lama ke id baru di dalam transaksi yang sama. `updateLandParcel` tidak terdampak — update in-place, id lestari. **Evidence:** `src/test/dashboard-asymmetry.test.ts` (invarian "tidak ada produksi menunjuk lahan nonaktif" + test perilaku lama sebagai pembanding); audit read-only `mis-prod` 2026-07-21: 17.063 record produksi, **0 orphan** → tidak ada perbaikan data retroaktif yang diperlukan. **Sisa yang SENGAJA dipertahankan:** record `parcelId = null` tetap menyumbang pembilang — itu keputusan owner terdokumentasi (#136, disertai disclaimer), bukan celah; saat ini 0 record. ✅

**TD-023** — Dua definisi "cakupan pelatihan" antar dashboard (Main petani-sentris vs DASH-06 kegiatan-sentris). **Temuan:** divergensi itu **tidak bisa terjadi** — `addParticipants` (`training.ts`) sudah memvalidasi peserta ke `farmerGroupId: activity.farmerGroupId` dan menolak seluruh batch bila ada yang tidak cocok, sehingga himpunan peserta selalu ⊆ anggota Lembaga penyelenggara. Ditambah filter `farmer.isActive` di payload DASH-06 (fix 2026-07-21), kedua definisi **terbukti identik**, bukan kebetulan data bersih. **Evidence:** `src/test/dashboard-asymmetry.test.ts` menguji guard tersebut (tolak lintas-Lembaga, tolak petani nonaktif, tolak seluruh batch bila ada satu tak valid); audit read-only `mis-prod` 2026-07-21: 8.240 baris kehadiran, **0 lintas-Lembaga, 0 petani nonaktif**. **Catatan operasional:** skrip import pelatihan di `scripts/local/` menulis langsung ke DB dan **melewati guard action** — invarian ini bergantung pada skrip tersebut ikut menegakkannya; jalankan `scripts/local/audit-training-attribution.ts` setelah tiap import. ✅

**TD-024** — `farmerId` tanpa penjaga keunikan, dua jalur input beraturan berbeda, plus celah scope. **Keputusan owner 2026-07-21: unik PER LEMBAGA.** Ditegakkan di DB (`@@unique([farmerGroupId, farmerId])`, migrasi `20260721060000_farmer_id_unique_per_group`) **dan** di aplikasi: `createFarmer`/`updateFarmer` kini menolak duplikat dengan pesan per-kolom, membedakan duplikat aktif vs milik petani nonaktif ("aktifkan kembali datanya"). `getExistingFarmerIds` sebelumnya mengambil **seluruh** `farmerId` di database tanpa filter — aturannya lebih ketat dari yang ditegakkan sistem **dan** membocorkan ID di luar wilayah kerja (pelanggaran lapisan data-access); kini menerima `farmerGroupId`, memverifikasi lembaga itu dalam scope, dan hanya mengembalikan ID lembaga tsb. Halaman bulk upload karenanya memuat daftar ID **setelah** lembaga dipilih, bukan di awal. **Prasyarat diverifikasi read-only** (`scripts/local/audit-farmer-id-duplicates.ts`, mis-prod 2026-07-21): 3.448 baris, **0 duplikat** — migrasi aman. Constraint sengaja mencakup baris nonaktif: memakai ulang ID petani nonaktif memecah riwayatnya. Migrasi memuat query prasyarat + langkah pemulihan bila gagal (`migrate resolve --rolled-back`) dan perintah rollback-nya. `bulkCreateFarmers` menerjemahkan `P2002` ke pesan berbahasa manusia alih-alih membocorkan nama tabel/kolom internal. Materi Bantuan disesuaikan — awalnya **tertinggal** dan sempat menyatakan kebalikan dari aturan baru; tertangkap audit pra-rilis. ✅

**TD-025** — Mode Detail Bantuan bergantung urutan sumber CSS. Aturan sembunyikan & tampilkan tadinya berspesifisitas sama (`:where()` bernilai 0), sehingga Detail bekerja hanya karena aturan kedua kebetulan muncul belakangan. Ditambahkan penanda `data-depth="ringkas"` pada `<article>` sehingga selektornya jadi **(0,7,0)** vs **(0,4,0)** — menang lewat spesifisitas, bukan urutan. Diverifikasi dengan membaca CSS hasil build. ✅

**TD-020** — Dashboard Pelatihan live query tanpa pagar. Ditambahkan perf test di `src/test/perf.test.ts` atas fixture **60.000 baris kehadiran** (~7× volume hari ini): KPI + matriks + tren + skor + kualitas data harus selesai <1.200 ms, disertai test kebenaran agar cepat saja tidak cukup. Bila ambangnya merah, itu sinyal menimbang pola snapshot — **bukan** melonggarkan ambangnya. ✅

**TD-021** — 🟡 **Sebagian.** Hook bersama `src/hooks/use-url-filters.ts` dibuat (memakai `router.replace` + `scroll: false` agar mengubah filter tidak menumpuk riwayat browser maupun melompatkan gulir; nilai kosong dihapus dari query supaya URL bawaan tetap bersih) dan **diterapkan di Dashboard Pelatihan** — filter Distrik/Lembaga/Kategori/Tahun kini bisa di-bookmark & dikirim. **Sisa:** Main Dashboard & BMP Dashboard belum memakainya; keduanya punya filter lebih kompleks (mis. mode Rataan & Kelengkapan Data) sehingga sengaja tidak diborong dalam satu sesi. Sort matriks cakupan juga belum ikut. 🟡

**TD-006** — `docs/rule.md` menyebut folder dashboard components yang tidak ada. Owner: Tech Lead. Validation: tree arsitektur disinkronkan (audit 2026-07-10): `components/dashboard` dihapus, `hooks/`+`api/` ditambah; docs arsitektur sinkron dengan struktur repo. ✅

**TD-007** — Inkonsistensi soft-delete/restore: `getFarmerGroups/ById` tanpa filter `isActive` level KT; sebaliknya `getFarmers` menyembunyikan petani nonaktif sehingga tak bisa di-restore dari UI. Evidence: `farmer-group.ts:23,75` vs `farmer.ts:11` — audit 2026-07-10 §3.2 · Issue #127. Owner: Backend Lead + Product. Validation: pola terpilih **tampilkan nonaktif + badge + filter Status (default Aktif) + toggle Aktifkan**, **khusus SUPERADMIN** (user lain dibatasi ke record aktif di server & UI via `isSuperAdmin()`), diseragamkan ke semua list master data (Petani/KT/Pelatihan/Lahan/Produksi); `toggleLandParcelActive`/`toggleProductionRecordActive` ditambah; didokumentasikan di [`code-standards.md`](../standards/code-standards.md) §Soft-delete. ✅

**TD-009** — Dead code & deps: `lib/constants.ts`, 6 komponen ui/layout tak terpakai (`alert`, `breadcrumb`, `form`, `scroll-area`, `sonner`, `placeholder-page`), deps 0-usage (`@dnd-kit`×3, `recharts`, `adm-zip`, `react-hook-form`+`@hookform/resolvers`, `ts-node`, `@types/sharp`), export mati (`isS3Key`), duplikasi helper (`getFarmerGroupsForSelect`/`getFarmersForSelect` ×2, ternary accessFilter ±25×). Evidence: Audit 2026-07-10 §5 & §8 P2 · Issue #129. Owner: Engineering. Validation: 9 deps 0-usage dihapus, `csv-parse`/`sharp`→devDeps; 7 file mati dihapus (`input-group`/`shadcn` dipertahankan sesuai catatan); `isS3Key` dihapus, `DASHBOARD_PACKAGE_CODES` di-de-export, `FarmerSelect` dedup; helper "for select" dikonsolidasi ke `src/lib/select-options.ts` ber-guard (konsolidasi `farmerAccessFilter` sudah di #127). Gate lint/build/test hijau. ✅

**TD-011** — Env & tooling drift: `FIRMS_MAP_KEY_FREE` tidak ada di `.env.example`; `.dockerignore` tidak exclude `.env`; CLI `get-link`/`pdf-manager` tidak load dotenv; `NEXT_PUBLIC_S3_PUBLIC_URL` tak terpakai. Evidence: Audit 2026-07-10 §6 · Issue #129. Owner: DevOps. Validation: `.env.example` +`FIRMS_MAP_KEY_FREE` −`NEXT_PUBLIC_S3_PUBLIC_URL`; `.dockerignore` exclude `.env`; `dotenv/config` di 2 CLI; ternary `listTrainingPDFs` diperbaiki + stub `cleanupOrphaned`/`pdf:cleanup` dihapus; `Dockerfile` dipertahankan (deploy via SSH, bukan Docker — keputusan owner). ✅

**TD-012** — Identifier Bahasa Indonesia di code (`computePetaniDomain` dkk, field types `totalPetani`…) vs rule "variable English". Evidence: Audit 2026-07-10 §5 · Issue #130. Owner: Tech Lead. Validation: **keputusan #130 — resmikan istilah domain** (petani/lahan/pelatihan/produksi/KT/persil/paket) sebagai pengecualian resmi di `code-standards.md`, bukan rename massal (Surgical Changes, hindari regresi lintas modul); enum DB (`PAKET_1_*`) = data, di luar aturan. ✅

**TD-013** — **Mislabel: entitas `FarmerGroup` sebenarnya "Lembaga Petani", bukan "Kelompok Tani"** (hierarki benar: Petani → Kelompok Tani (Gapoktan) → Lembaga Petani). Scope Bagian A (relabel, aman, forward-compatible): ganti UI-copy "Kelompok Tani" → "Lembaga Petani"; identifier English `FarmerGroup`/`farmerGroup`/`farmer-group` tetap (konvensi + preseden TD-012 #130); ⚠️ menu _key_ RBAC tidak diubah — hanya label. Evidence: label seed `prisma/seeds/data/menu.csv` (+DB row); ±142 string di ±52 file `src/**` + 27 di `docs/**`; identifier `FarmerGroup` di 93 file (tetap); abbr "KT"→"LT"; relasi `Farmer.farmerGroupId`→`FarmerGroup`, scope RBAC `BY_FARMER_GROUP`, `UserFarmerGroup`/`TrainingActivity` menggantung di sini · Issue #147 (pembeda: field `subGroupLv2` tetap "Kelompok Tani", lihat #146/TD-014). Owner: Product + Frontend. Hasil: sweep ~56 file `src/**` + `menu.csv`; label menu DB di-update 1 baris terarah (`tbl_menu_item` key `master-data-groups`, bukan `db seed` penuh); docs disinkronkan. Gate lint 0 / build / test 380 ✅.

**TD-029** — Combobox bulk upload petani: daftar Lembaga tanpa scope filter. `getFarmerGroupsForMapping()` (`src/server/actions/bulk-upload.ts`) mengembalikan **seluruh** `FarmerGroup` aktif — hanya guard `hasPermission("bulk-upload-farmers","VIEW")`, tanpa `getAccessContext()` — sehingga combobox "Pilih Lembaga Petani" di Step 1 membocorkan daftar lembaga di luar scope user (kebocoran terbatas daftar nama/kode; `bulkCreateFarmers` & `getExistingFarmerIds` sudah ber-scope sejak #125/TD-024, jadi insert lintas scope tetap tertolak). Ditemukan audit docs 2026-07-28, follow-up TD-024. **Fix (2026-07-28):** filter `AND: farmerGroupAccessFilter(access)` (pola anti key-collision #127) — identik dengan `bulk-upload-parcel.ts`/`bulk-upload-production.ts`. Tiga mode filter sudah teruji sebagai helper di `rbac-server-guards.test.ts` (konvensi suite: action Prisma tidak di-mock). Materi Bantuan `u-1-unggah-petani.md` ditambah troubleshooting "lembaga tidak ada di daftar". ✅

**TD-018** — 5 salinan action dropdown Distrik/Lembaga per menu report: `report.ts` berisi 5 pasang action dropdown nyaris identik (`getDistrictsFor*` + `getFarmerGroupsFor*` untuk farmer/training/production/KT/lahan) — beda hanya di permission key menu; tiap report baru menambah salinan ke-6. Evidence: ditemukan #177/#179 (retro); `src/server/actions/report.ts`. Resolusi (#180): 10 action dropdown kini delegasi tipis ke 2 helper privat `districtsForMenus(menuKeys)` / `farmerGroupsForMenus(menuKeys, districtId)` — nama/signature action exported & permission key per-menu tidak berubah (client tak tersentuh); KT family memakai menuKeys ganda. Owner: Backend. ✅

**TD-019** — Exporter PDF lama belum pola build-vs-save: `report-land-parcel-pdf.ts` & `report-land-parcel-xlsx.ts` (#179) memisahkan **build dokumen** dari **save/download** sehingga bisa diverifikasi unit test — exporter lama (`pdf.ts`, `farm-passport.ts`, `bmp-map-print.ts`) masih satu fungsi ber-side-effect `doc.save()`, tak teruji empiris (akar bug print #174 & label vertikal #179: jsPDF align pra-rotasi). Resolusi (#180): `pdf.ts` → `buildPDF` + `exportToPDF`; `farm-passport.ts` → `buildFarmPassportDoc` + `generateFarmPassportPdf`; `bmp-map-print.ts` → `buildBmpMapDoc` + `generateBmpMapPdf` — API publik tak berubah; +5 test struktural (`pdf-exporters.test.ts`: orientasi/halaman/tanpa-throw termasuk geometri rusak). Owner: Frontend. ✅

**TD-028** — Migrasi Peta Lahan/BMP ke primitif popup bersama: #188 mengekstrak primitif popup peta ke `src/components/shared/map-popup.tsx` (standar) tapi `map-canvas.tsx` & `map-bmp-canvas.tsx` masih menyimpan salinan lokal (`PopupHighlight`/`PopupSection`/`AttrRows`). Hasil (#188, 2026-07-22): kedua canvas kini mengimpor `MapPopupHighlight`/`MapPopupSection`/`MapPopupRows` dari modul bersama; definisi lokal + impor menganggur (`Collapsible`/`ChevronDown`/`ReactNode`/`InfoRow`) dihapus (verifikasi visual Peta Lahan & Sebaran Lahan tak berubah). Sekalian: **paritas header Sebaran Lahan** (ID Petani + ID Lahan + Lembaga Petani via payload `farmerCode`/`farmerGroupName`), **tutup popup pasca-edit**, dan **fix lebar**: popup Sebaran Lahan `w-max` (min 300 / max 440) + ID mono `whitespace-nowrap` agar ID panjang tampil penuh satu baris. Sisa minor (bukan blocker): cast `as unknown as LandParcel` di `ParcelEditModalHost` dibiarkan. Gate lint 0 / build / test 675 ✅

</details>
