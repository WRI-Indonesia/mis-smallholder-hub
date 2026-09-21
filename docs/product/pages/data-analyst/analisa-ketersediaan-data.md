# Ketersediaan Data — Per Lembaga

[← Menu Data Analyst](./README.md) · [← Katalog halaman](../README.md)

> Label menu **"Ketersediaan Data — Per Lembaga"** (order 3) sejak #352 (keputusan owner P4, 2026-09-21) — sebelumnya "Analisa Ketersediaan Data" (order 2). Key, route, dan RolePermission tidak berubah. Halaman ini adalah drill-down dari [Ketersediaan Data — Semua Lembaga](./dashboard-ketersediaan-data.md) (DA-03, order 2): skornya identik karena memakai `computeCompleteness` yang sama.

## Diagram objek

```text
Halaman: Ketersediaan Data — Per Lembaga (/admin/data-analyst/data-completeness)
├── Header
│   └── Judul + deskripsi (+ tautan ke halaman Semua Lembaga)
├── Filter (state di URL: ?distrik=&lembaga=)
│   ├── Distrik (FilterCombobox, "Semua Distrik", w-full sm:w-[200px])
│   ├── Lembaga Petani * (FilterCombobox, cascade dari Distrik di client, wajib)
│   └── Tombol Muat ulang (analisa berjalan OTOMATIS saat Lembaga dipilih / ?lembaga= ada)
├── Empty state awal · Peringatan "di luar akses" bila ?lembaga= tidak ada di daftar scope
├── Header hasil
│   ├── Angka Index besar (text-5xl, warna band) + Radar pentagon lima domain berangka (`RadarChart` bersama, 280 px) — label sumbu = tautan (klik → buka + gulir ke seksi); tooltip = Σ skor domain × bobot (#352 putaran 4)
│   └── Identitas Lembaga (nama + kode, Distrik · petani · n temuan · band, baris petunjuk "angka besar = Index; pentagon = skor lima domain — klik nama sumbu…") + tombol Excel (gate EXPORT) — kartu domain DIHAPUS (redundan dengan radar)
├── Peringatan 0 petani
├── Prioritas perbaikan (putaran 2): 6 tindakan berskor dengan Δ Index (poin), bar relatif, n/total, Perbaiki lewat; klik label = gulir ke seksi
├── Buka semua / Tutup semua
├── Seksi collapsible (state terkontrol; default hanya seksi berskor TERENDAH yang terbuka)
│   ├── Profil Lembaga Petani — baris per check: inti (6) · kualitas (sertifikasi, tahun berdiri, koordinat) · modul (boundary, acuan, Monev Lembaga, sertifikasi terisi)
│   ├── Petani — kartu + Checklist
│   ├── Lahan — 6 kartu (+NKT AFFECTED, di luar boundary) + Checklist + tabel Per Kelompok Tani
│   ├── Pelatihan — kartu + Ringkasan per Paket · Matriks Cakupan · Petani Belum Lengkap + Checklist (non-paket)
│   └── Produksi — 6 kartu + Checklist
├── Checklist (dipakai semua domain; putaran 2)
│   ├── Legenda jenis: Inti · Lapangan · Validitas (berskor) · Kualitas · Modul (informatif)
│   ├── Satu baris per check, TERMASUK yang lolos: chip jenis · label · badge "sistemik" · "bobot 3/15" · bar % OK (band) · "n / total <grain>" | "lengkap" | "belum ada di Lembaga ini" | "tidak ada yang bisa dicek"
│   └── Baris bermasalah bisa dibuka → (penjelasan sistemik) + Perbaiki lewat + tabel daftar kerja
│       ├── Tabel: ID Petani · Nama Petani (→ Detail Petani) · Detail / ID Lahan (→ Detail Lahan)
│       └── Batas render 50 baris + Tampilkan semua / Ringkas
└── Ekspor
    └── Excel multi-sheet (tanpa CSV/PDF)
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Sub menu | Ketersediaan Data — Per Lembaga (`data-analyst-data-completeness`, order 3) |
| Route | `/admin/data-analyst/data-completeness` — query `?lembaga=<FarmerGroup.id>` (deep link dari DA-03 & kartu KPI Detail Lembaga), `?distrik=<District.id>` opsional |
| File | `src/app/(admin)/admin/data-analyst/data-completeness/page.tsx` (Server Component) + `data-completeness-client.tsx` (Client Component) + `loading.tsx` |
| Tipe | Halaman analisis 1 Lembaga Petani (filter → analisa otomatis → angka Index + radar → prioritas perbaikan → seksi collapsible per domain ber-checklist) |
| Guard | `requirePermission("data-analyst-data-completeness")` |
| Server action / data | `getDistrictsForCompleteness()`, `getFarmerGroupsForCompleteness(districtId)` (mengembalikan `districtId` untuk cascade client), `analyzeFarmerGroupCompleteness(farmerGroupId)` — `src/server/actions/data-completeness.ts` (`MENU_KEY = "data-analyst-data-completeness"`, guard `hasPermission(MENU_KEY, "VIEW")` + `getAccessContext()`); kehadiran modul lewat `loadModuleFlagSets` di `src/lib/data-completeness-query.ts` (id-set per satelit, scope lewat relasi `parcel.farmer`, sejajar dengan kueri utama) |
| Logika | `src/lib/data-completeness.ts` (skor, anomali, checklist, prioritas, per-KT — murni) + **registri** `src/lib/data-completeness-registry.ts` (label, jenis, grain, rute perbaikan, `foldable`, bobot tier, katalog modul, konstanta ambang) |
| Kueri PostGIS (putaran 2) | `loadModuleFlagSets` juga menjalankan 3 `$queryRaw`: persil ber-geometry yang tidak beririsan boundary ICS Lembaganya, luas poligon `ST_Area(geom::geography)` per persil, koordinat Lembaga vs poligon kabupaten BIG — scope lewat parameter array `groupIds`/`districtIds` (cermin `groupWhere`) |
| Persistensi filter | `useUrlFilters()` (TD-021) — kunci `lembaga`, `distrik`; id di luar daftar scope → peringatan, action tidak dipanggil |
| Warna skor | Satu sumber `scoreBand` (`data-availability-aggregation.ts`) + `src/lib/score-band-styles.ts` — sama dengan DA-03 dan kartu KPI Detail Lembaga (`scoreTone` lama dihapus) |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Panduan` | Tautan | `HelpHint` — ikon `?` di header menuju tutorial Bantuan untuk `data-analyst-data-completeness` (`findTutorialForMenu`), dibuka di tab baru |
| "Ketersediaan Data — Per Lembaga" | Heading | `h1`; deskripsi: "Rincian kelengkapan & daftar kerja anomali satu Lembaga Petani (Profil, Petani, Lahan, Pelatihan, Produksi). Ringkasan lintas Lembaga ada di Ketersediaan Data — Semua Lembaga." |
| "Distrik" | Filter (combobox + search) | `FilterCombobox`; opsi "Semua Distrik"; mengganti Distrik yang tidak memuat Lembaga terpilih mengosongkan `?lembaga=` |
| "Lembaga Petani" | Filter (combobox + search, **wajib**) | Placeholder "Pilih Lembaga Petani"; daftar = Lembaga dalam scope, disaring Distrik di client; memilih = analisa otomatis (keputusan owner P5) |
| "Muat ulang" | Tombol | Disabled sampai Lembaga terpilih; label "Menganalisa..." saat pending — menghitung ulang setelah data diperbaiki |
| Empty state awal | Kartu | "Pilih Lembaga Petani — analisa berjalan otomatis" / "Menganalisa Lembaga Petani…" |
| Peringatan di luar akses | Kartu amber | "Lembaga Petani pada tautan ini tidak ditemukan atau di luar akses Anda. Pilih Lembaga lain dari daftar." |
| Header hasil | Kartu ringkasan | Nama Lembaga + kode (mono), baris "`<Distrik>` · `<n>` petani · `<n>` temuan anomali" |
| Index + radar | Angka `text-5xl` warna band + `RadarChart` (`src/components/shared/radar-chart.tsx`, 280 px, `onAxisClick={jumpTo}`) | Keputusan owner berturut-turut: cincin gauge + radar + kartu → "redundan" → "dilebur" (cincin melingkari pentagon) → "aneh, cukup angka + radar" → analisa 6 varian → **#6: angka Index + radar berangka, tanpa kartu domain**. Pentagon = `RadarLayers` yang sama dengan grid/modal Semua Lembaga (isian warna skala Index, titik sudut warna skor domain, cincin ambang 50/80/100, label "Domain skor"); **label sumbu = tautan** (`cursor-pointer`, hover primary + underline, `<title>` "Buka seksi …") → `jumpTo` (buka seksi + `scrollIntoView`), menggantikan kartu sebagai navigasi; tooltip `StatTooltip` "Index = Σ (skor domain × bobot)" per domain + footer petunjuk klik |
| "Excel" | Tombol ekspor | Ikon `Download`; multi-sheet, nama file `analisa-ketersediaan-<kode atau nama>-<yyyyMMdd>` — digate izin `EXPORT` (#245) |
| "Prioritas perbaikan" | Kartu | 6 tindakan berskor: nomor, label (klik → seksi), "+n poin", bar relatif, domain · n/total · Perbaiki lewat (tautan); bila kosong → kartu hijau "Semua check berskor sudah lengkap" |
| "Buka semua / Tutup semua" | Tombol ghost | Mengatur state buka semua seksi |
| Peringatan 0 petani | Kartu peringatan | "Lembaga Petani ini belum memiliki data petani aktif — domain Petani, Lahan, Pelatihan, dan Produksi kosong." |
| Checklist | Daftar baris | Per domain: "n lengkap · n bermasalah · n belum berlaku" + legenda jenis; baris = chip jenis · label · badge sistemik · "bobot a/b" · bar % OK · status; klik baris bermasalah → daftar kerja |
| "Per Kelompok Tani" | Collapsible tabel (seksi Lahan) | KT · Petani · Persil · Luas · Skor Lahan (bar) · Skor Petani (bar) · Persil Berproduksi; urut skor lahan terendah; "(tanpa Kelompok Tani)" dicetak miring |

## Aturan skor (per 2026-09-21, #352 — melanjutkan #193)

- **Bobot antar domain** (`DOMAIN_WEIGHTS`, `src/lib/data-completeness.ts`): profil 10%, petani 25%, lahan 25%, pelatihan 20%, produksi 20% → Index Ketersediaan Data. Bobot **tampil di UI** (strip skor) dan di Excel.
- **Registri deklaratif** (`src/lib/data-completeness-registry.ts`): `PROFILE_CHECKS`, `FARMER_FIELD_CHECKS`, `PARCEL_CHECKS` (berbobot), `ANOMALY_CATALOG` (label · domain · grain · `fix`), `MODULE_CATALOG`, konstanta `CORE_WEIGHT`/`FIELD_TIER_WEIGHT`, `SYSTEMIC_THRESHOLD`/`SYSTEMIC_MIN_ENTITIES`, `PRODUCTION_STALE_MONTHS`. Tabel/kolom baru cukup menambah satu entri.
- **Profil** — 6 check: kode, koordinat, tahun bergabung, singkatan, **tipe grup**, **tahun berdiri** (2 terakhir baru #352).
- **Petani** — GRADED per field (#193): rata-rata per petani dari **6** check — NIK (terisi, 16 digit, tidak duplikat), ID Petani tidak duplikat, alamat, tanggal lahir, **tempat lahir** (baru #352), tahun bergabung.
- **Lahan** — GRADED **berbobot** per persil (keputusan owner #352 P2): geometry, luas (>0), jenis tanaman, **Kelompok Tani** (`subGroupLv2`) = bobot 3 (inti); tahun tanam, status lahan, **blok** = bobot 1 (tier "atribut lapangan" = 1/3 inti). Total bobot 15. Alasan: tahun tanam & status lahan kosong di 94 %/98 % persil prod tanpa alur pengisian rutin — dengan bobot penuh, skor Lahan 28/30 Lembaga terkunci di 60; blok (89,5 % kosong) diperlakukan sama.
- **Pelatihan** — tetap (rata-rata % cakupan paket wajib per petani).
- **Produksi** — skor tetap % petani ber-produksi (P1: check baru tidak mengubah Index). Baru #352: anomali **kebaruan** `produksi-basi` (petani ber-produksi yang periode terakhirnya ≥ `PRODUCTION_STALE_MONTHS` = 3 bulan sebelum periode acuan = bulan berjalan; `monthsBetween ≥ 3`), anomali **grain lahan** `lahan-tanpa-produksi` (lahan aktif non-PSR tanpa record tertaut, `parcelDbId` → Detail Lahan), `isPsr` dikecualikan dari `berlahan-tanpa-produksi`, kartu informatif "Lahan Berproduksi (non-PSR)" dan "Record Estimasi" (notes berlabel *Estimasi*, bukan anomali).
- **Anomali sistemik** (A3): bila satu check "kolom kosong" (`AnomalyDef.foldable`) kosong pada ≥ 95 % entitas (`SYSTEMIC_THRESHOLD`) dan Lembaga punya ≥ 10 entitas (`SYSTEMIC_MIN_ENTITIES`), `DomainAnomaly.systemic = true`, `count = 1` (temuan agregat), `entityCount`/`total` tetap; `items` tetap dibawa untuk Excel. Check validitas/kualitas/paket tidak pernah dilipat. Skor domain **tidak** berubah — hanya cara menghitung temuan (`totalAnomalies` = Σ `count`).
- **Jenis check** (`CheckKind`, putaran 2): `inti` · `lapangan` · `validitas` masuk skor; `kualitas` & `modul` informatif. Tiap domain mengembalikan `checks: CheckRow[]` — SEMUA check termasuk yang lolos (`flagged`, `total`, `weight` pecahan domain, `weightLabel`, `systemic`, `applicable`, `fix`); baris modul ditempelkan dari `moduleCoverage` per domain.
- **Check kualitas** (putaran 2, informatif, tak pernah dilipat): Profil — `sertifikasi-tidak-konsisten` (tahun tanpa status / sebaliknya), `tahun-bergabung-sebelum-berdiri`, `koordinat-di-luar-distrik` (PostGIS vs boundary kabupaten). Petani — `nik-tanggal-lahir` (digit 7–12 DDMMYY, hari +40 perempuan; `birthDateParts` menggeser +7 jam WIB; detail memberi petunjuk "hari/bulan tertukar?"), `nik-jenis-kelamin`, `umur-tidak-wajar` (17–90), `petani-kemungkinan-ganda` (nama + tanggal lahir), `monev-tanpa-rincian`. Lahan — `persil-di-luar-boundary` (hanya Lembaga ber-boundary & persil ber-geometry), `luas-beda-geometri` (> 20 % vs `ST_Area`), `luas-tidak-wajar` (0,05–25 ha), `tahun-tanam-tidak-wajar` (< 1970 / masa depan). Pelatihan — `nilai-turun`, `nilai-di-luar-rentang`; `peserta-tanpa-pretest/posttest` kini berjenis kualitas dengan penyebut petani berpartisipasi. Produksi — `produksi-nol`, `produksi-bulan-bolong`; `berlahan-tanpa-produksi`, `produksi-tanpa-persil`, `produksi-basi`, `lahan-tanpa-produksi` berjenis kualitas.
- **Prioritas perbaikan** (`computePriorities`): Δ Index = bobot domain × (bermasalah ÷ total) × bobot check × 100, hanya check berskor; maks 8, urut turun. Invarian test: Index + Σ Δ semua prioritas ≈ 100.
- **Per Kelompok Tani** (`computeByKelompokTani`): KT = `subGroupLv2` lahan; skor lahan = rata-rata `parcelCompleteness`, skor petani = rata-rata check petani pemilik lahan di KT, persil berproduksi non-PSR; urut skor lahan terendah.
- **Cakupan modul** (A1, keputusan owner P1: informatif, tidak masuk Index): `computeModuleCoverage` hanya bila input memuat `modules` (kartu KPI Detail Lembaga tidak memuatnya). Tiga keadaan: terisi (pct), kosong (pct 0), **tidak berlaku** (`applicable: false`, pct null) bila modul bergrain petani/persil/aktivitas belum diisi satu pun di Lembaga itu; modul tingkat Lembaga selalu berlaku. Sertifikasi null = netral (P3: bukan anomali; enum `NONE` ditunda).
- Skor di [Ketersediaan Data — Semua Lembaga](./dashboard-ketersediaan-data.md) otomatis mengikuti formula yang sama (satu sumber: `computeCompleteness`).

## Seksi collapsible

(masing-masing menampilkan judul + chip **"bobot n % Index"** (pindah dari kartu domain yang dihapus, #352 putaran 4), badge "`<n>` temuan" / "Lengkap", badge skor ber-tooltip **rumus domain** (`DOMAIN_FORMULA`, nama field dari registri — pindah dari tooltip kartu); state terkontrol — default hanya seksi berskor terendah yang terbuka, tombol Buka semua / Tutup semua)

| Seksi | Isi |
|---|---|
| Profil Lembaga Petani | Daftar cek: "Kode Lembaga Petani", "Koordinat Lokasi", "Tahun Bergabung", "Singkatan (Abrv)", "Tipe Grup", "Tahun Berdiri" — tiap baris badge "Lengkap"/"Belum"; check gagal → tautan "isi di Detail Lembaga › Edit" |
| Petani | Kartu: "Total Petani", "Petani Lengkap", "Petani dengan Anomali", "% Kelengkapan Field". Anomali: "Petani tanpa NIK", "NIK tidak valid (bukan 16 digit)", "NIK duplikat dalam Lembaga Petani", "ID Petani duplikat dalam Lembaga Petani", "Petani tanpa alamat", "Petani tanpa tanggal lahir", "Petani tanpa tempat lahir", "Petani tanpa tahun bergabung" |
| Lahan | Kartu: "Total Persil Aktif", "Petani Tanpa Lahan", "Persil dengan Anomali", "Total Luas (ha)". Anomali: "Petani tanpa lahan aktif", "Persil tanpa geometry", "Persil tanpa luas", "Persil tanpa jenis tanaman", "Persil tanpa Kelompok Tani", "Persil tanpa tahun tanam", "Persil tanpa status lahan", "Persil tanpa blok" (item persil membawa `parcelDbId` → Detail Lahan) |
| Pelatihan | Kartu: "Total Petani", "Petani Lengkap", "Belum Lengkap", "% Cakupan Paket". Tampilan khusus cakupan paket (lihat bawah). Anomali: "Belum ikut `<paket>`" per paket (tergambar di kartu paket), "Peserta tanpa nilai pre-test", "Peserta tanpa nilai post-test", dan "Lembaga Petani belum memiliki aktivitas pelatihan" — tiga terakhir kini tampil sebagai blok anomali di bawah sub-seksi |
| Produksi | Kartu: "Total Petani", "Petani dengan Produksi", "Petani Tanpa Produksi", "Berlahan Tanpa Produksi", "Lahan Berproduksi (non-PSR)", "Record Estimasi". Anomali: "Petani tanpa data produksi", "Petani punya lahan (non-PSR) tapi tanpa produksi", "Produksi tidak terhubung ke persil", "Produksi tidak diperbarui ≥ 3 bulan terakhir" (detail `terakhir YYYY-MM`), "Lahan aktif (non-PSR) tanpa produksi" |

## Blok anomali & tabel daftar kerja

| Objek | Keterangan |
|---|---|
| Blok sistemik | Kotak amber: label + badge "sistemik · `<entityCount>` / `<total>` `<grain>`", teks penjelasan, baris *Perbaiki lewat*, tombol "Tampilkan daftar (n)" / "Sembunyikan daftar" |
| SubCollapsible per entitas | Judul label anomali + badge count; isi: baris *Perbaiki lewat* + tabel |
| "Perbaiki lewat" | `fix.menu › fix.field` dari registri; tautan `Link` bila `fix.href` ada (mis. `/admin/master-data/farmers`, `/admin/bulk-upload/parcels`); tanpa tautan untuk boundary (skrip seed) |
| Kolom tabel | ID Petani (mono) · Nama Petani (→ `/admin/master-data/farmers/<farmerDbId>`) · Detail **atau** ID Lahan (→ `/admin/master-data/parcels/<parcelDbId>` bila item bergrain persil); nilai menyerupai NIK disensor di layar (`maskIfNik`); Excel tetap penuh |
| Paginasi | Render dibatasi 50 baris awal, tombol "Tampilkan semua (`<n>`)" / "Ringkas", teks "Menampilkan `<n>` dari `<n>` baris" |

## Sub-seksi domain Pelatihan

| Sub-seksi | Objek |
|---|---|
| "Ringkasan per Paket" | Kartu per paket: label paket, "`<covered>`/`<total>` sudah ikut · `<n>` belum", badge % cakupan; expand → tabel "Petani belum ikut paket ini" |
| "Matriks Cakupan" | Tabel matriks: kolom "Petani" (sticky, nama → Detail Petani) + satu kolom per paket, sel centang/silang; badge "`<n>` petani"; batas render 50 baris + "Tampilkan semua" |
| "Petani Belum Lengkap" | Tabel kolom: ID Petani, Nama Petani (→ Detail Petani), Cakupan (`done/total (pct%)`), Paket yang Masih Kurang; batas render 50 baris; bila kosong: "Semua petani sudah mengikuti seluruh paket wajib." |

Banner tambahan: "Belum ada aktivitas pelatihan di Lembaga ini untuk paket: `<daftar paket>`." dan "Belum ada paket pelatihan wajib terdaftar." bila tidak ada paket wajib.

## Opsi ekspor

Excel multi-sheet (`exportMultiSheetToExcel`), tidak ada CSV/PDF:

| Sheet | Kolom |
|---|---|
| Ringkasan | Metrik, Nilai (Lembaga Petani, Distrik, Index Ketersediaan Data, Total Petani, Total Temuan Anomali, Skor Profil Lembaga Petani (bobot 10%), Skor per domain (bobot …%), Periode acuan kebaruan produksi) |
| **Prioritas** | Domain, Tindakan, Bermasalah, Total, Δ Index (poin), Perbaiki lewat |
| **Checklist** | Domain, Check, Jenis (+ "· sistemik"), Bermasalah, Total, % OK (atau "belum ada di Lembaga ini"), Perbaiki lewat — semua check semua domain |
| **Per Kelompok Tani** | Kelompok Tani, Petani, Persil, Luas (ha), Skor Lahan, Skor Petani, Persil Berproduksi, % Berproduksi |
| Petani / Lahan / Pelatihan / Produksi (satu sheet per domain) | Anomali (label; sistemik ditandai "(sistemik: n/total)"; daftar kerja modul sebagai "Belum <modul>"), Jenis, ID Petani, Nama Petani, Detail, **Perbaiki lewat** |
| Matriks Pelatihan | ID Petani, Nama Petani, satu kolom per paket (isi "Ya"/"Belum") |
| Petani Belum Lengkap | ID Petani, Nama Petani, Cakupan, Paket yang Masih Kurang |
