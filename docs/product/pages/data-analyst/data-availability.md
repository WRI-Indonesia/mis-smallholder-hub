# Ketersediaan Data — Semua Lembaga

[← Menu Data Analyst](README.md) · [← Katalog halaman](../README.md)

Sub menu `data-analyst-data-availability`, satu halaman: `/admin/data-analyst/data-availability` (DA-03, #193).

> **Kerangka #417 (owner 2026-10-11, tata letak A "Ringkas, satu tempat")**: tinggi halaman bawaan 3.817 → **1.680 px** (32 Lembaga, 1.440 px), Daftar Kerja dalam satu scroll; skor, rumus, Excel 2 sheet, dan deep link Per Lembaga tidak berubah.

> Sejak #416 (owner 2026-10-11) menu ini **anak level 3** dari induk **Ketersediaan Data** (`data-analyst-availability`) dengan judul **Semua Lembaga** (order 1); key, route, izin tetap. Saudaranya: [Per Lembaga](data-completeness.md) dan [Produksi](availability-production.md).

> Sejak **#416** (2026-10-11): anak level 3 berlabel **"Semua Lembaga"** di bawah induk **Ketersediaan Data** (`data-analyst-availability`), dengan sub-nav `AvailabilityNav` (#417). Sebelumnya: label menu **"Data — All Lembaga"** sejak #364 (keputusan owner 2026-09-29: label prod jadi acuan, `menu.csv` disamakan; judul halaman tetap "Ketersediaan Data — Semua Lembaga"). **Order 2** (pintu masuk) dan label "Ketersediaan Data — Semua Lembaga" sejak #352 (keputusan owner P4, 2026-09-21) — sebelumnya "Dashboard Ketersediaan Data", order 3. Key, route, RolePermission tidak berubah. Semula dirilis sebagai sub menu keempat di grup **Dashboard** (`dashboard-data-availability`), lalu dipindah ke **Data Analyst** pada hari yang sama (keputusan owner #193).

Roll-up lintas Lembaga Petani dari scoring [Ketersediaan Data — Per Lembaga (DA-02)](data-completeness.md): skor kelengkapan 5 domain (Profil Lembaga, Petani, Lahan, Pelatihan, Produksi) per Lembaga + ringkasan anomali + **cakupan modul** (#352). Alur: ringkasan di sini → klik nama Lembaga (`?lembaga=`) → daftar kerja di DA-02 → Master Data.

## Diagram objek

```text
Halaman: Ketersediaan Data › Semua Lembaga (/admin/data-analyst/data-availability) — kerangka #417
├── Header
│   ├── H1 "Ketersediaan Data" + Panduan · sub-nav keluarga menu (AvailabilityNav, server): Semua Lembaga · Per Lembaga · Produksi (hanya yang ber-VIEW; item aktif = sub-judul)
│   ├── Deskripsi satu baris + tanggal data
│   └── Filter (state di URL): Kategori ?kategori= · Distrik ?distrik= · Lembaga ?lembaga= (cascade) · Excel (gate EXPORT) — pindah ke baris sendiri di bawah xl
├── Filter aktif (ActiveFilterBar) — chip per kunci (kategori · distrik · lembaga · band "Tingkat skor" · urut) dengan ✕ + "Reset semua"; tidak tampil tanpa pilihan
├── Hero satu baris (AvailabilityHero) — ScoreGauge 88 · label tingkat skor · "n Lembaga · n petani · n lahan" · bar sebaran Lembaga per tingkat skor selebar sisa baris (segmen = tombol ?band=, jumlah + nama pendek di dalam, aria-label)
├── Kartu domain (5) — ikon + nama pendek · chip bobot · skor besar · bar · "n entitas · n kritis" · chip "Urutkan ⇅"/"Terurut ↑" (satu-satunya tombol kartu) → ?urut=<domain>
├── Matriks (satu kartu, bukan <Card> agar sticky jalan)
│   ├── MatrixToolbar lengket (sticky top-0): status "n Lembaga · n kritis · 10 tampil" + ⓘ cara baca · tab Radar (sidik jari) | Heatmap (tabel warna) | Cakupan modul (di luar Index) ?tampilan= · Urut · arah · Cari
│   ├── Radar (bawaan): grid container query 1/2/3/4/5 kolom (@md/@2xl/@4xl/@6xl) · label sumbu 11 px · tombol "Perbesar" saat hover/fokus → modal
│   ├── Heatmap: tabel min-w 720, kolom domain 72 px — muat tanpa scroll mendatar pada ≥ 1.024 px konten; kode · distrik di samping nama hanya @4xl (selainnya title)
│   ├── Cakupan modul: urut di URL ?urut=modul:<key>, cari & Ringkas ikut; tetap scroll mendatar dengan kolom nama sticky
│   └── Bawaan Ringkas 10 (K2) + "Tampilkan n lagi" / "Ringkas — 10 … pertama saja"; pencarian menampilkan semua hasil
└── Daftar Kerja (AvailabilityWorklist, bertab ?kerja=) — Sistemik (unggah massal, 8 + menu pengisian) · Per entitas (8) · Tertinggal per domain (5 × 5); badge jumlah; "n Lembaga ▾" = popover daftar Lembaga terdampak
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/data-analyst/data-availability/page.tsx` |
| Tipe | Server Component → `DataAvailabilityClient` (Client Component) |
| Komponen anak | `data-availability-client.tsx`, `availability-hero.tsx`, `availability-domain-cards.tsx`, `availability-matrix.tsx` (heatmap), `availability-radar-grid.tsx` (radar) + `matrix-toolbar.tsx` (toolbar bersama, #417) + `active-filter-bar.tsx` + `availability-worklist.tsx` (Daftar Kerja, #417) + `../availability/availability-nav.tsx` (sub-nav) + `availability-radar-dialog.tsx` (modal), `availability-module-matrix.tsx`, `availability-domain-laggards.tsx`, `availability-anomaly-panel.tsx`, `matrix-rows.ts` (`MatrixSortKey`, `filterMatrixRows`, `sortMatrixRows`, `sortKeyLabel`, `LOWEST_N`, hook `useMatrixRows` — satu sumber urut/cari/ringkas untuk heatmap & radar) + `matrix-toolbar.tsx` (`MatrixSearch`, `MatrixLimitToggle`, `emptyRowsMessage`), `domain-meta.ts` (ikon domain, `CATEGORY_LABELS`, `entryDomainScores`; formatter dari `src/lib/format.ts` (`formatPct`), `bandLabel`/`BAND_LABEL` dari `score-band-styles`, `shortDomainLabel` & `BAND_THRESHOLDS` dari lib agregasi), `loading.tsx` (putaran 3 #352: `availability-score-cards.tsx` & `availability-group-chart.tsx` dihapus); visual bersama `src/components/shared/score-visuals.tsx` (`ScoreGauge`, `BandBar`, `HeatCell`, `HeatLegend`) dan `src/components/shared/radar-chart.tsx` (`RadarChart` — juga dipakai header Index+radar DA-02; label sumbu bisa diklik = tautan ber-`role=link`, svg `overflow-visible`); skala warna kontinu `src/lib/score-heat.ts` (`heatRgb`/`heatStyle`/`HEAT_GRADIENT_CSS`, jangkar di ambang band, 100 = `HEAT_FULL`); geometri pentagon `src/lib/radar-geometry.ts`; gaya band diskret `src/lib/score-band-styles.ts` (`BAND_CELL`/`BAND_CELL_SOFT` dihapus — tak ada pemakai) |
| Guard | `requirePermission("data-analyst-data-availability")` (halaman); `hasPermission("data-analyst-data-availability", "VIEW")` + `getAccessContext()` di action; tombol Excel digate `EXPORT` |
| Server action / data | `getDataAvailabilityView()` dari `src/server/actions/data-availability.ts` — **live query** (bukan snapshot), satu query nested per bentuk DA-02 lintas Lembaga (tanpa kolom `geometry`; kehadiran geometry via query id terpisah `geometry: { not: Prisma.DbNull }`), partisipasi "tamu" (activity Lembaga lain) disaring di JS; kehadiran modul (#352) lewat `loadModuleFlagSets` (`src/lib/data-completeness-query.ts`): 19 kueri paralel dalam satu `Promise.all` — 15 kueri id-set (`groupBy`/`findMany`) per satelit + 4 `$queryRaw` PostGIS (Lembaga ber-boundary `geom`, persil di luar boundary ICS, luas `ST_Area`, koordinat Lembaga vs kabupaten BIG) — scope lewat relasi `parcel.farmer.farmerGroup`, sejajar dengan kueri geometry — TIDAK di-nest ke `findMany` utama |
| Scoring | Direuse utuh dari DA-02: `computeCompleteness` (`src/lib/data-completeness.ts` + registri `data-completeness-registry.ts`) via `buildAvailabilityEntry` — skor per Lembaga di dashboard **identik** dengan halaman DA-02 |
| Helper agregasi | `buildAvailabilityEntry`, `filterAvailabilityGroups` (+`groupId`, +`band`), `availabilityTotals`, `bandDistribution`, `domainLaggards`, `domainCriticalCount`, `domainScoreOf`, `topAnomalies` (per entitas), `topSystemicAnomalies`, `moduleCoverageTotals`, `scoreBand` dari `src/lib/data-availability-aggregation.ts` |
| Persistensi filter | `useUrlFilters()` (TD-021) — kunci `distrik`, `kategori`, `lembaga`, `band` (hanya sah bila band itu berisi Lembaga pada irisan; di-reset saat Distrik/Kategori/Lembaga berubah), `urut` (domain/`name`/`totalFarmers`) + `arah` (`turun`; bawaan menaik), `tampilan` (`heatmap` | `modul`; tanpa parameter = radar); nilai URL tak valid diabaikan. Hero (cincin, distribusi, angka) & kartu domain dihitung dari irisan Distrik/Kategori/Lembaga; matriks, aksi lintas Lembaga, laggards, panel anomali ditambah filter `band`. Irisan kosong → hero menampilkan keadaan kosong (bukan cincin 0): "Tidak ada Lembaga Petani pada filter ini." + "Kembalikan Kategori / Distrik / Lembaga ke "Semua" — atau cakupan akses Anda memang belum memuat Lembaga." |
| Icon menu | `Gauge` (order 2 di menu Data Analyst sejak #352) |
| Role dengan VIEW (seed) | SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT — **tanpa DONOR** (keputusan owner #193: alat kerja internal yang mengekspos gap kualitas data) |

## Aturan skor

- **Skor per Lembaga** = `healthScore` DA-02: berbobot `DOMAIN_WEIGHTS` (profil 10%, petani 25%, lahan 25%, pelatihan 20%, produksi 20%).
- **Skor domain Petani & Lahan graded per field** (keputusan owner #193, 2026-07-28): rata-rata proporsi field terisi per petani (6 check sejak #352) / per persil (7 atribut **berbobot** sejak #352: 4 inti × 3 + 3 atribut lapangan × 1) — bukan all-or-nothing per entitas. Rincian di [data-completeness.md](data-completeness.md) §Aturan skor.
- **Skor portfolio (kartu KPI)** — keputusan owner #193:
  - Domain petani/lahan/pelatihan/produksi = rata-rata **tertimbang jumlah petani** per Lembaga (`Σ(skor × petani) / Σ petani`; fallback rata-rata sederhana bila Σ petani = 0).
  - Profil = rata-rata sederhana per Lembaga (satu profil per Lembaga, tak terkait ukuran).
  - Skor Keseluruhan = `DOMAIN_WEIGHTS` atas kelima skor portfolio itu.
- **Band skor** (`scoreBand`, satu sumber warna untuk card/bar/matriks — dan sejak #352 juga DA-02 & kartu KPI Detail Lembaga): 100 lengkap penuh (emerald tua pekat — dibedakan dari "baik", selaras #194 di matriks Pelatihan), 80 – <100 baik (emerald), 50 – <80 perlu perhatian (amber), <50 kritis (rose pekat). Sel dibuat kontras antar-band, bukan pastel seragam.
- Payload tanpa daftar petani per anomali (PII + ukuran) — `{key, label, count, entityCount, total, systemic}`; profil yang belum lengkap disintesis sebagai anomali `profil-tidak-lengkap` supaya Σ count panel = `totalAnomalies` DA-02. Anomali **sistemik** (#352 A3, `count = 1`) dipisah ke `topSystemicAnomalies` (Σ `entityCount`); invarian Σ count per entitas + Σ Lembaga terdampak sistemik = Σ `totalAnomalies` dijaga test.
- **Cakupan modul** (#352 A1, informatif): `moduleCoverage[] = {key, covered, total, pct|null}` per Lembaga; portfolio `moduleCoverageTotals` = Σ covered / Σ total **hanya atas Lembaga yang modulnya berlaku** (`pct != null`); label/domain/rute perbaikan dicari client dari `MODULE_CATALOG`.

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Panduan` | Tautan | `HelpHint` — ikon `?` di header menuju tutorial Bantuan untuk `data-analyst-data-availability` (`findTutorialForMenu`), dibuka di tab baru |
| Judul halaman | Heading `h1` + sub-nav | "Ketersediaan Data" + tab aktif **Semua Lembaga** (`AvailabilityNav`, #417 A; H1 tanpa em-dash) |
| Deskripsi | Teks | "Kelengkapan data 5 domain lintas Lembaga Petani · data per {tanggal generate}. Klik nama Lembaga untuk rinciannya." |
| Filter Kategori Lembaga | Select | "Semua Kategori", "Ex-Plasma", "Swadaya" |
| Filter Distrik | `FilterCombobox` | "Cari distrik..."; opsi "Semua Distrik"; empty: "Distrik tidak ditemukan." |
| Filter Lembaga | `FilterCombobox` (#352) | "Cari lembaga petani..."; opsi "Semua Lembaga"; daftar mengikuti Distrik/Kategori; memfokuskan semua panel ke satu Lembaga |
| "Excel" | Tombol (gate `EXPORT`) | `ketersediaan-data-semua-lembaga-<yyyyMMdd>.xlsx`: sheet **Kelengkapan Inti** (Lembaga, Kode, Distrik, Kategori, Petani, Persil, 5 skor domain, Skor Total, Temuan Anomali) + sheet **Cakupan Modul** (Lembaga × modul, % atau "belum dimulai") — atas irisan yang tampil |
| Perilaku filter | Catatan | Nilai tersimpan di URL (`?distrik=…&kategori=…&lembaga=…&band=…&urut=…&arah=turun&tampilan=heatmap&kerja=entitas`; urut modul `?urut=modul:<key>`); nilai tak valid diabaikan; `tampilan=inti` (nilai lama v0.36) dipetakan ke `heatmap` agar bookmark lama tetap membuka tabel |
| Filter aktif | Baris chip + Reset semua (#417) | Lihat rincian di bawah |
| Hero | Kartu satu baris | Lihat rincian di bawah |
| Kartu domain (5) | Kartu + chip Urutkan | Lihat rincian di bawah |
| Radar per Lembaga (bawaan) | Grid kartu pentagon + modal | Lihat rincian di bawah |
| Toolbar matriks | `MatrixToolbar` lengket (#417 B) | Status · ⓘ · tab tampilan · Urut · arah · Cari — satu untuk ketiga tampilan |
| Matriks per Lembaga | Heatmap padat | Lihat rincian di bawah |
| Matriks cakupan modul | Tabel heatmap | Lihat rincian di bawah |
| Daftar Kerja | Kartu bertab (#417 C) | Lihat rincian di bawah — menggantikan Paling tertinggal per domain & Panel Anomali Terbanyak |

## Hero (`AvailabilityHero`, satu baris sejak #417)

| Objek | Tipe | Keterangan |
|---|---|---|
| Cincin Skor Keseluruhan | `ScoreGauge` 88 px | Tooltip skor + temuan anomali; di sampingnya "Skor Keseluruhan", label tingkat skor ("50 – <80 — perlu perhatian") dan kalimat "n Lembaga · n petani · n lahan" (menggantikan 3 kotak angka) |
| Sebaran Lembaga per tingkat skor | Stacked bar tinggi 32 px selebar sisa baris | Segmen = `<button aria-pressed>` dengan jumlah (+ nama pendek kritis/perhatian/baik/lengkap bila ≥ 18 %) dan `aria-label` "n Lembaga {tingkat} — klik untuk menyaring/melepas filter" (T4); segmen lain meredup saat aktif; pelepasan juga lewat chip filter aktif |
| Dipindah | — | "Aksi lintas Lembaga" (3 kolom sistemik) → Daftar Kerja › Sistemik (T2, satu informasi satu tempat); "hapus filter band" → baris filter aktif |

## Filter aktif (`ActiveFilterBar`, #417 A)

Chip per pilihan yang berlaku — Kategori · Distrik · Lembaga · Tingkat skor (`band`) · Urut (bukan bawaan Skor Total menaik; di tampilan modul: nama modul) — masing-masing dengan tombol ✕ bernama ("Lepas filter Tingkat skor: kritis"), plus **Reset semua** (hapus `kategori distrik lembaga band urut arah`; `tampilan` & `kerja` bukan filter). Tidak dirender tanpa chip.

## Kartu domain (`AvailabilityDomainCards`)

| # | Kartu | Nilai besar | Sub |
|---|---|---|---|
| 1 | Profil · chip "bobot 10%" | skor % (warna tingkat) + bar | "{n} Lembaga" · "{n} kritis" |
| 2 | Petani · bobot 25% | skor % | "{n} petani" · "{n} kritis" |
| 3 | Lahan · bobot 25% | skor % | "{n} lahan" · "{n} kritis" |
| 4 | Pelatihan · bobot 20% | skor % | "{n} sesi" · "{n} kritis" |
| 5 | Produksi · bobot 20% | skor % | "{n} / {n} petani" · "{n} kritis" |

Kartu **bukan** tombol (#417 T4: satu tombol satu aksi). Chip "Urutkan ⇅" (selalu terlihat) → `?urut=<domain>` + `arah` menaik, gulir ke matriks; saat aktif berubah "Terurut ↑" dan kartu ber-ring; klik lagi = kembali ke Skor Total. Tampilan **Cakupan modul** dipindah ke Radar (urutan modul terpisah), Heatmap dipertahankan.

## Matriks per Lembaga — heatmap (`AvailabilityMatrix`, `?tampilan=heatmap`, #352 putaran 4)

Pilihan owner dari tiga opsi (bar anggaran skor · bar data per sel · heatmap padat) setelah pil pastel per sel terasa monoton; kemudian digeser jadi tampilan kedua karena owner menjadikan Radar bawaan.

| Objek | Tipe | Keterangan |
|---|---|---|
| Header | — (#417 B: digantikan `MatrixToolbar` bersama — status satu baris + ⓘ) | Lama: "Matriks per Lembaga" · "{n} Lembaga · {n} berskor kritis (<50) — warna sel mengikuti skor (merah → hijau); klik judul kolom…"; kanan: segmented control **Radar | Heatmap | Cakupan modul** (`Tabs`, `?tampilan=`) + kotak **Cari Lembaga / kode / distrik** |
| Tata letak tabel | `table-fixed` + `<colgroup>` + `border-spacing-[2px]` | #417 B (T5): Total 72 px · Petani 64 px · domain 72 px · nama = sisa, **min-width 720 px** — kelima kolom domain terlihat tanpa scroll mendatar pada 1.284 px konten (terukur 2026-10-11); kode · distrik di samping nama hanya bila kartu ≥ `@4xl`, selainnya di `title` |
| Kolom "Lembaga Petani" | Kolom tabel (sortable) | Nama = **deep link** `/admin/data-analyst/data-completeness?lembaga={id}` berwarna primary + ikon `ExternalLink`, di-truncate dengan `title`; "{kode} · {distrik}" kecil di baris yang sama; baris ber-hover |
| Kolom "Skor Total" | Kolom tabel (sortable, bawaan menaik) | Tepat setelah nama; `HeatCell emphasis` (tebal, ring) berwarna `heatStyle(healthScore)`; tooltip band + temuan |
| Kolom "Petani (n)" | Kolom tabel (sortable) | Jumlah petani terdaftar |
| Kolom domain (5) | Kolom tabel (sortable) | Profil, Petani, Lahan, Pelatihan, Produksi — `HeatCell` solid: latar `heatRgb(skor)` (gradasi merah-700 → amber → lime → emerald-500; 100 = emerald-800), teks putih/hitam dipilih dari luminansi WCAG (ambang 0,18 — kontras ≥ 4,5:1 di seluruh ramp, review putaran 4–5), angka 1 desimal tanpa "%"; tooltip band |
| Batas baris | Toggle (state halaman) | **Bawaan Ringkas 10** (#417 K2) + "Tampilkan {n} lagi" / "Ringkas — 10 baris pertama saja"; pencarian menampilkan semua hasil; berlaku sama di radar & modul |
| Legenda | `HeatLegend` | Ramp gradasi 0 → 99 dengan garis ambang 50 & 80 dan label segmen kritis · perhatian · baik, swatch terpisah "100 — lengkap penuh" |
| Empty state | Teks | "Tidak ada Lembaga Petani pada pilihan filter ini." / "Tidak ada Lembaga yang cocok dengan \"{q}\"." |

## Radar per Lembaga (`AvailabilityRadarGrid`, tampilan bawaan, #352 putaran 4)

Pilihan owner dari empat usulan "out of the box" (peta kesiapan data · treemap massa petani · sebaran titik per domain · sidik jari radar), lalu label diganti "Radar" dan dijadikan tampilan bawaan.

| Objek | Tipe | Keterangan |
|---|---|---|
| Header | — | #417 B: digantikan `MatrixToolbar` bersama (cara baca di ⓘ). |
| Kartu Lembaga | `RadarCard` | Nama (deep link DA-02, truncate) + `HeatCell emphasis` Skor Total (tooltip: 5 skor domain ber-chip band) · **tombol grafik** (`cursor-zoom-in`, ikon `Maximize2` saat hover, `aria-label` "Perbesar radar {nama}") → modal · "{kode} · {distrik}" · "{n} petani" |
| Modal radar | `RadarDetailDialog` (`Dialog`, `sm:max-w-4xl`) | Judul: nama + `HeatCell` Skor Total + label band; deskripsi: kode · distrik · kategori · n petani · n persil · n temuan. **Kiri** radar `large` (label 7 px relatif viewBox agar proporsional saat 2×). **Kanan** tabel Domain · Bobot · Skor (`HeatCell`) · **Kontribusi** = bobot × skor ("{poin} / {bobot}") + baris Skor Total "{n} / 100" + catatan + tombol **Buka daftar kerja** (DA-02 `?lembaga=`) & **Detail Lembaga** (`/admin/master-data/groups/{id}`). Footer: "{i} / {n} pada urutan aktif · tombol ← → untuk berpindah" + **Sebelumnya / Berikutnya** (indeks pada `sorted`, bukan `limited`, jadi menjangkau semua; panah kiri/kanan di keyboard) |
| Radar | `RadarChart` bersama, SVG `viewBox 272×180` (#417 T6: label sumbu 11 px), `radar-geometry.ts` | Lima sumbu (Profil di atas, searah jarum jam Petani · Lahan · Pelatihan · Produksi); cincin pentagon pada 50 · 80 (putus-putus) · 100; poligon skor isian `heatRgb(healthScore)` opacity 0,3 + garis; titik sudut r = 3 berwarna `heatRgb(skor domain)` (+`<title>`); label sumbu "Domain **skor**" di luar jari-jari (anchor middle/start/end menurut sisi) |
| Grid | CSS grid + container query | 1 / 2 (`@md`) / 3 (`@2xl`) / 4 (`@4xl`) / 5 (`@6xl`) kolom mengikuti lebar **konten**, bukan viewport (#417 T1; 4 kolom pada 931 px); bawaan Ringkas 10; tombol "Perbesar" (ikon + teks) muncul saat hover/fokus kartu |
| Legenda | `HeatLegend` | Ramp yang sama + catatan "isian = Skor Total · titik sudut = skor domain · cincin = ambang 50 / 80 / 100" |

## Matriks cakupan modul (`AvailabilityModuleMatrix`, #352)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | — | #417 B: header `Collapsible` dihapus; toolbar bersama (tab · Urut `?urut=modul:<key>` · arah · Cari) + Ringkas 10 seperti tampilan lain |
| Baris "Semua Lembaga (pilihan filter)" | Baris portfolio | `moduleCoverageTotals` — Σ atas Lembaga yang modulnya berlaku; tooltip "{n} Lembaga berlaku" |
| Kolom per modul (15) | Kolom tabel (sortable; tak berlaku diurutkan paling bawah) | Judul pendek `ModuleDef.short` + nama domain kecil di atasnya; `title` = label penuh |
| Sel | `HeatCell` | % tanpa tanda "%" (skala kontinu `heatStyle`, sama dengan heatmap inti; baris portfolio `emphasis`), atau ✓/✗ untuk modul tingkat Lembaga; "—" bergaris = belum dimulai di Lembaga itu (pct null); tooltip terisi/total |
| Kolom "Lembaga Petani" | Sticky kiri | Nama = deep link DA-02 + "{kode} · {distrik}" satu baris (tinggi 28 px) |
| Legenda | `HeatLegend` "Skala cakupan" | Ramp yang sama + "belum dimulai di Lembaga itu" |

## Daftar Kerja (`AvailabilityWorklist`, #417 C)

Satu kartu bertab menggantikan kolom *Aksi lintas Lembaga* di hero + kartu *Paling tertinggal per domain* + panel *Anomali Terbanyak* (T2). Mengikuti pilihan filter yang tampil, termasuk tingkat skor. Tab di URL `?kerja=` (bawaan `sistemik`, tanpa parameter); badge jumlah di tiap tab.

| Tab | Isi | Keterangan |
|---|---|---|
| Sistemik (unggah massal) | `topSystemicAnomalies(groups, 8)` — Σ entitas kosong | Kolom ≥ 95 % kosong di suatu Lembaga; tiap baris: label (deep link Lembaga terdampak terbanyak) · angka · **"n Lembaga ▾"** (popover daftar Lembaga terdampak, bisa keyboard/sentuh) · bar · "Isi lewat {menu › kolom}" |
| Per entitas | `topAnomalies(groups, 8)` — Σ temuan | Baris sama tanpa menu pengisian |
| Tertinggal per domain | `DomainLaggardsGrid` (5 kolom × ≤ 5 Lembaga < 100 %) | Badge = Lembaga unik di kelima kolom; Lembaga tanpa petani tidak diikutkan |

Label registri yang memakai "persil" dibaca **"lahan"** di layar (`uiAnomalyLabel`, #417 D); kunci URL dan kolom Excel tetap.

## Catatan performa

Live query dipilih (preseden Dashboard Pelatihan): baris yang dibaca berkolom sedikit dan poligon geometry tidak ikut terangkut. Kehadiran satelit (#352) mengikuti pola yang sama — id-set per tabel lewat `GROUP BY`, bukan nested include. Test `perf.test.ts` menjaga jalur murni skala 2028 (40 Lembaga × 300 petani + cakupan modul + agregasi panel) < 1,5 s (aktual ±35–110 ms). Bila kelak melambat pada volume besar, jalur fallback-nya snapshot per konvensi [dashboard-snapshots.md](../../../database/dashboard-snapshots.md) (`tbl_snapshot_...` + generator di menu Tools) — sengaja belum dibangun.
