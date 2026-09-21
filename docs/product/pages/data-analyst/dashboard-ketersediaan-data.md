# Ketersediaan Data — Semua Lembaga

[← Menu Data Analyst](./README.md) · [← Katalog halaman](../README.md)

Sub menu `data-analyst-data-availability`, satu halaman: `/admin/data-analyst/data-availability` (DA-03, #193).

> Label menu **"Ketersediaan Data — Semua Lembaga"** dan **order 2** (pintu masuk) sejak #352 (keputusan owner P4, 2026-09-21) — sebelumnya "Dashboard Ketersediaan Data", order 3. Key, route, RolePermission tidak berubah. Semula dirilis sebagai sub menu keempat di grup **Dashboard** (`dashboard-data-availability`), lalu dipindah ke **Data Analyst** pada hari yang sama (keputusan owner #193).

Roll-up lintas Lembaga Petani dari scoring [Ketersediaan Data — Per Lembaga (DA-02)](./analisa-ketersediaan-data.md): skor kelengkapan 5 domain (Profil Lembaga, Petani, Lahan, Pelatihan, Produksi) per Lembaga + ringkasan anomali + **cakupan modul** (#352). Alur: ringkasan di sini → klik nama Lembaga (`?lembaga=`) → daftar kerja di DA-02 → Master Data.

## Diagram objek

```text
Halaman: Ketersediaan Data — Semua Lembaga (/admin/data-analyst/data-availability)
├── Header
│   ├── Judul "Ketersediaan Data — Semua Lembaga"
│   └── Deskripsi + tanggal generate
├── Filter (state di URL)
│   ├── Kategori Lembaga (select) — ?kategori=
│   ├── Distrik (FilterCombobox) — ?distrik=
│   ├── Lembaga (FilterCombobox, cascade Distrik/Kategori) — ?lembaga=
│   └── Tombol Excel (gate EXPORT)
├── Hero (putaran 3, #352) — dua kolom seimbang (7/12 + 5/12, tinggi sama)
│   ├── Kiri atas: Cincin Skor Keseluruhan (ScoreGauge 120; tooltip skor + temuan) · label band · "rata-rata tertimbang n Lembaga · n temuan" · 3 angka ringkas (Lembaga · Petani · Persil) sebaris
│   ├── Kiri bawah: Distribusi Lembaga per band — stacked bar kritis/perlu perhatian/baik/lengkap selebar kolom; segmen & pil legenda bisa diklik → ?band= (band kosong dinonaktifkan); "hapus filter band"
│   └── Kanan: Aksi lintas Lembaga — 3 kolom sistemik terbesar (topSystemicAnomalies atas irisan yang sama dengan panel Anomali): label · "n · n Lembaga" · satu menu tujuan (rute lengkap di tooltip); catatan kaki satu baris
├── Kartu domain (5) — SKOR memimpin (besar, warna band) + bar mini + bobot % + jumlah entitas + "n kritis"; klik → ?urut=<domain> (matriks tersortir menaik, kartu disorot, gulir ke matriks)
├── Matriks per Lembaga (kartu) — segmented control Radar | Heatmap | Cakupan modul (?tampilan=; radar = bawaan tanpa parameter) di header
│   ├── Radar (bawaan): grid kartu (2–5 kolom), tiap Lembaga satu pentagon lima sumbu (SVG murni) + Skor Total + kode · distrik · n petani; klik grafik → modal radar besar (kiri grafik, kanan tabel domain bobot·skor·kontribusi + tautan daftar kerja/Detail Lembaga, ◀ ▶ mengikuti urutan aktif); pilih-urut + tombol arah + cari
│   ├── Heatmap (?tampilan=heatmap): baris rapat satu garis — nama (deep link DA-02) + kode · distrik · Skor Total (HeatCell tebal) · Petani (n) · 5 sel domain solid berwarna skala kontinu (heatStyle) + angka kecil; legenda ramp 0→99 + swatch 100
│   ├── Semua baris/kartu tampil (bawaan) + "Ringkas — 10 pertama saja"; pencarian menampilkan semua yang cocok
│   └── Cakupan modul (?tampilan=modul): Matriks cakupan modul (baris portfolio + kolom per modul, ✓/✗ tingkat Lembaga, "—" belum dimulai) — sel HeatCell, legenda sama
├── Paling tertinggal per domain (penuh-lebar) — 5 kolom kecil (Profil…Produksi), sampai 5 Lembaga terendah < 100 % + distrik · petani + bar mini; Lembaga tanpa petani dikeluarkan
└── Panel Anomali Terbanyak (penuh-lebar, dua seksi berdampingan: Per entitas · Kolom belum pernah diisi — 8 baris masing-masing)
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/data-analyst/data-availability/page.tsx` |
| Tipe | Server Component → `DataAvailabilityClient` (Client Component) |
| Komponen anak | `data-availability-client.tsx`, `availability-hero.tsx`, `availability-domain-cards.tsx`, `availability-matrix.tsx` (heatmap), `availability-radar-grid.tsx` (radar) + `availability-radar-dialog.tsx` (modal), `availability-module-matrix.tsx`, `availability-domain-laggards.tsx`, `availability-anomaly-panel.tsx`, `matrix-rows.ts` (`MatrixSortKey`, `filterMatrixRows`, `sortMatrixRows`, `sortKeyLabel`, `LOWEST_N`, hook `useMatrixRows` — satu sumber urut/cari/ringkas untuk heatmap & radar) + `matrix-toolbar.tsx` (`MatrixSearch`, `MatrixLimitToggle`, `emptyRowsMessage`), `domain-meta.ts` (ikon domain, `CATEGORY_LABELS`, `entryDomainScores`; formatter dari `src/lib/format.ts` (`formatPct`), `bandLabel`/`BAND_LABEL` dari `score-band-styles`, `shortDomainLabel` & `BAND_THRESHOLDS` dari lib agregasi), `loading.tsx` (putaran 3 #352: `availability-score-cards.tsx` & `availability-group-chart.tsx` dihapus); visual bersama `src/components/shared/score-visuals.tsx` (`ScoreGauge`, `BandBar`, `HeatCell`, `HeatLegend`) dan `src/components/shared/radar-chart.tsx` (`RadarChart` — juga dipakai header Index+radar DA-02; label sumbu bisa diklik = tautan ber-`role=link`, svg `overflow-visible`); skala warna kontinu `src/lib/score-heat.ts` (`heatRgb`/`heatStyle`/`HEAT_GRADIENT_CSS`, jangkar di ambang band, 100 = `HEAT_FULL`); geometri pentagon `src/lib/radar-geometry.ts`; gaya band diskret `src/lib/score-band-styles.ts` (`BAND_CELL`/`BAND_CELL_SOFT` dihapus — tak ada pemakai) |
| Guard | `requirePermission("data-analyst-data-availability")` (halaman); `hasPermission("data-analyst-data-availability", "VIEW")` + `getAccessContext()` di action; tombol Excel digate `EXPORT` |
| Server action / data | `getDataAvailabilityView()` dari `src/server/actions/data-availability.ts` — **live query** (bukan snapshot), satu query nested per bentuk DA-02 lintas Lembaga (tanpa kolom `geometry`; kehadiran geometry via query id terpisah `geometry: { not: Prisma.DbNull }`), partisipasi "tamu" (activity Lembaga lain) disaring di JS; kehadiran modul (#352) lewat `loadModuleFlagSets` (`src/lib/data-completeness-query.ts`): 13 kueri id-set (GROUP BY) per satelit, scope lewat relasi `parcel.farmer.farmerGroup`, sejajar dengan kueri geometry — TIDAK di-nest ke `findMany` utama |
| Scoring | Direuse utuh dari DA-02: `computeCompleteness` (`src/lib/data-completeness.ts` + registri `data-completeness-registry.ts`) via `buildAvailabilityEntry` — skor per Lembaga di dashboard **identik** dengan halaman DA-02 |
| Helper agregasi | `buildAvailabilityEntry`, `filterAvailabilityGroups` (+`groupId`, +`band`), `availabilityTotals`, `bandDistribution`, `domainLaggards`, `domainCriticalCount`, `domainScoreOf`, `topAnomalies` (per entitas), `topSystemicAnomalies`, `moduleCoverageTotals`, `scoreBand` dari `src/lib/data-availability-aggregation.ts` |
| Persistensi filter | `useUrlFilters()` (TD-021) — kunci `distrik`, `kategori`, `lembaga`, `band` (hanya sah bila band itu berisi Lembaga pada irisan; di-reset saat Distrik/Kategori/Lembaga berubah), `urut` (domain/`name`/`totalFarmers`) + `arah` (`turun`; bawaan menaik), `tampilan` (`heatmap` | `modul`; tanpa parameter = radar); nilai URL tak valid diabaikan. Hero (cincin, distribusi, angka) & kartu domain dihitung dari irisan Distrik/Kategori/Lembaga; matriks, aksi lintas Lembaga, laggards, panel anomali ditambah filter `band`. Irisan kosong → hero menampilkan keadaan kosong (bukan cincin 0) |
| Icon menu | `Gauge` (order 2 di menu Data Analyst sejak #352) |
| Role dengan VIEW (seed) | SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT — **tanpa DONOR** (keputusan owner #193: alat kerja internal yang mengekspos gap kualitas data) |

## Aturan skor

- **Skor per Lembaga** = `healthScore` DA-02: berbobot `DOMAIN_WEIGHTS` (profil 10%, petani 25%, lahan 25%, pelatihan 20%, produksi 20%).
- **Skor domain Petani & Lahan graded per field** (keputusan owner #193, 2026-07-28): rata-rata proporsi field terisi per petani (6 check sejak #352) / per persil (7 atribut **berbobot** sejak #352: 4 inti × 3 + 3 atribut lapangan × 1) — bukan all-or-nothing per entitas. Rincian di [analisa-ketersediaan-data.md](./analisa-ketersediaan-data.md) §Aturan skor.
- **Skor portfolio (kartu KPI)** — keputusan owner #193:
  - Domain petani/lahan/pelatihan/produksi = rata-rata **tertimbang jumlah petani** per Lembaga (`Σ(skor × petani) / Σ petani`; fallback rata-rata sederhana bila Σ petani = 0).
  - Profil = rata-rata sederhana per Lembaga (satu profil per Lembaga, tak terkait ukuran).
  - Skor Keseluruhan = `DOMAIN_WEIGHTS` atas kelima skor portfolio itu.
- **Band skor** (`scoreBand`, satu sumber warna untuk card/bar/matriks — dan sejak #352 juga DA-02 & kartu KPI Detail Lembaga): 100 lengkap penuh (emerald tua pekat — dibedakan dari "baik", selaras #194 di matriks Pelatihan), 80–99 baik (emerald), 50–79 perlu perhatian (amber), <50 kritis (rose pekat). Sel dibuat kontras antar-band, bukan pastel seragam.
- Payload tanpa daftar petani per anomali (PII + ukuran) — `{key, label, count, entityCount, total, systemic}`; profil yang belum lengkap disintesis sebagai anomali `profil-tidak-lengkap` supaya Σ count panel = `totalAnomalies` DA-02. Anomali **sistemik** (#352 A3, `count = 1`) dipisah ke `topSystemicAnomalies` (Σ `entityCount`); invarian Σ count per entitas + Σ Lembaga terdampak sistemik = Σ `totalAnomalies` dijaga test.
- **Cakupan modul** (#352 A1, informatif): `moduleCoverage[] = {key, covered, total, pct|null}` per Lembaga; portfolio `moduleCoverageTotals` = Σ covered / Σ total **hanya atas Lembaga yang modulnya berlaku** (`pct != null`); label/domain/rute perbaikan dicari client dari `MODULE_CATALOG`.

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Panduan` | Tautan | `HelpHint` — ikon `?` di header menuju tutorial Bantuan untuk `data-analyst-data-availability` (`findTutorialForMenu`), dibuka di tab baru |
| Judul halaman | Heading `h1` | "Ketersediaan Data — Semua Lembaga" |
| Deskripsi | Teks | "Kelengkapan data 5 domain lintas Lembaga Petani — data per {tanggal generate}. Klik nama Lembaga untuk rinciannya." |
| Filter Kategori Lembaga | Select | "Semua Kategori", "Ex-Plasma", "Swadaya" |
| Filter Distrik | `FilterCombobox` | "Cari distrik..."; opsi "Semua Distrik"; empty: "Distrik tidak ditemukan." |
| Filter Lembaga | `FilterCombobox` (#352) | "Cari lembaga petani..."; opsi "Semua Lembaga"; daftar mengikuti Distrik/Kategori; memfokuskan semua panel ke satu Lembaga |
| "Excel" | Tombol (gate `EXPORT`) | `ketersediaan-data-semua-lembaga-<yyyyMMdd>.xlsx`: sheet **Kelengkapan Inti** (Lembaga, Kode, Distrik, Kategori, Petani, Persil, 5 skor domain, Skor Total, Temuan Anomali) + sheet **Cakupan Modul** (Lembaga × modul, % atau "belum dimulai") — atas irisan yang tampil |
| Perilaku filter | Catatan | Nilai tersimpan di URL (`?distrik=…&kategori=…&lembaga=…&band=…&urut=…&arah=turun&tampilan=heatmap`); nilai tak valid diabaikan; `tampilan=inti` (nilai lama v0.36) dipetakan ke `heatmap` agar bookmark lama tetap membuka tabel |
| Hero | Kartu | Lihat rincian di bawah |
| Kartu domain (5) | Tombol kartu | Lihat rincian di bawah |
| Radar per Lembaga (bawaan) | Grid kartu pentagon + modal | Lihat rincian di bawah |
| Matriks per Lembaga | Heatmap padat + segmented control + cari | Lihat rincian di bawah |
| Matriks cakupan modul | Tabel heatmap (collapsible) | Lihat rincian di bawah |
| Paling tertinggal per domain | 5 kotak kecil | Lihat rincian di bawah |
| Panel Anomali Terbanyak | Panel bar dua bagian | Lihat rincian di bawah |

## Hero (`AvailabilityHero`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Cincin Skor Keseluruhan | `ScoreGauge` 120 px | Angka bulat, warna band; tooltip: skor + temuan anomali; di sampingnya label band ("50–79 — perlu perhatian") dan "rata-rata tertimbang n Lembaga · n temuan"; 3 angka ringkas di kanan baris yang sama |
| Distribusi Lembaga per band | Stacked bar (`BAND_BAR`) urut kritis → lengkap | Lebar segmen ∝ jumlah Lembaga; angka di dalam segmen; klik segmen/legenda → `?band=` (segmen lain meredup, tombol "hapus filter band"); legenda band kosong dinonaktifkan; tooltip jumlah + persen |
| Angka ringkas | 3 kotak (baris cincin) | Lembaga · Petani · Persil (irisan) |
| Aksi lintas Lembaga | Kotak setinggi kolom kiri, daftar bernomor (maks 3) | `topSystemicAnomalies` atas irisan yang SAMA dengan panel Anomali (termasuk filter band): label (truncate) · "n · n Lembaga" · tautan menu pertama `fix` registri + kolom (rute lengkap & alternatif di `title`); catatan kaki satu baris "Kolom ≥ 95 % kosong — urusan unggah massal…" (+ "Mengikuti filter band") + "Panel Anomali →" |

## Kartu domain (`AvailabilityDomainCards`)

| # | Kartu | Nilai besar | Sub |
|---|---|---|---|
| 1 | Profil Lembaga · 10 % | skor % (warna band) + bar | "{n} Lembaga" · "{n} kritis" |
| 2 | Petani · 25 % | skor % | "{n} petani" · "{n} kritis" |
| 3 | Lahan · 25 % | skor % | "{n} persil" · "{n} kritis" |
| 4 | Pelatihan · 20 % | skor % | "{n} sesi" · "{n} kritis" |
| 5 | Produksi · 20 % | skor % | "{n} / {n} petani ber-produksi" · "{n} kritis" |

Klik kartu → `?urut=<domain>` + `arah` di-reset menaik; tampilan **Cakupan modul** dipindah ke bawaan (Radar; matriks modul punya urutan sendiri), tampilan Heatmap dipertahankan; kartu ber-ring pada tampilan Radar & Heatmap; gulir ke matriks; klik lagi = kembali ke Skor Total. "n kritis" = Lembaga berskor <50 pada domain itu tanpa Lembaga tanpa petani (konsisten `domainLaggards`). Tooltip: bobot, basis portfolio (tertimbang petani / rata-rata sederhana), Lembaga kritis.

## Matriks per Lembaga — heatmap (`AvailabilityMatrix`, `?tampilan=heatmap`, #352 putaran 4)

Pilihan owner dari tiga opsi (bar anggaran skor · bar data per sel · heatmap padat) setelah pil pastel per sel terasa monoton; kemudian digeser jadi tampilan kedua karena owner menjadikan Radar bawaan.

| Objek | Tipe | Keterangan |
|---|---|---|
| Header | Judul + ringkasan | "Matriks per Lembaga" · "{n} Lembaga · {n} berskor kritis (<50) — warna sel mengikuti skor (merah → hijau); klik judul kolom…"; kanan: segmented control **Radar | Heatmap | Cakupan modul** (`Tabs`, `?tampilan=`) + kotak **Cari Lembaga / kode / distrik** |
| Tata letak tabel | `table-fixed` + `<colgroup>` + `border-spacing-[2px]` | Lebar kolom eksplisit (Skor Total 80 px · Petani (n) 72 px · domain 96 px · nama = sisa, min-width 880 px) supaya lebar tidak dihitung ulang dari isi saat urutan/irisan berubah (masukan owner: kolom bergeser saat kartu domain diklik); celah 2 px antar sel ala heatmap; baris satu garis tinggi 28 px |
| Kolom "Lembaga Petani" | Kolom tabel (sortable) | Nama = **deep link** `/admin/data-analyst/data-completeness?lembaga={id}` berwarna primary + ikon `ExternalLink`, di-truncate dengan `title`; "{kode} · {distrik}" kecil di baris yang sama; baris ber-hover |
| Kolom "Skor Total" | Kolom tabel (sortable, bawaan menaik) | Tepat setelah nama; `HeatCell emphasis` (tebal, ring) berwarna `heatStyle(healthScore)`; tooltip band + temuan |
| Kolom "Petani (n)" | Kolom tabel (sortable) | Jumlah petani aktif |
| Kolom domain (5) | Kolom tabel (sortable) | Profil, Petani, Lahan, Pelatihan, Produksi — `HeatCell` solid: latar `heatRgb(skor)` (gradasi merah-700 → amber → lime → emerald-500; 100 = emerald-800), teks putih/hitam dipilih dari luminansi WCAG (ambang 0,18 — kontras ≥ 4,5:1 di seluruh ramp, review putaran 4–5), angka 1 desimal tanpa "%"; tooltip band |
| Batas baris | Toggle | **Bawaan semua baris** (nilai heatmap ada pada gambaran utuhnya) + "Ringkas — 10 baris pertama saja (urut … menaik/menurun)" / "Tampilkan semua ({n}) — {m} tersembunyi"; saat mencari, semua yang cocok tampil |
| Legenda | `HeatLegend` | Ramp gradasi 0 → 99 dengan garis ambang 50 & 80 dan label segmen kritis · perhatian · baik, swatch terpisah "100 — lengkap penuh" |
| Empty state | Teks | "Tidak ada Lembaga Petani pada filter ini." / "Tidak ada Lembaga yang cocok dengan \"{q}\"." |

## Radar per Lembaga (`AvailabilityRadarGrid`, tampilan bawaan, #352 putaran 4)

Pilihan owner dari empat usulan "out of the box" (peta kesiapan data · treemap massa petani · sebaran titik per domain · sidik jari radar), lalu label diganti "Radar" dan dijadikan tampilan bawaan.

| Objek | Tipe | Keterangan |
|---|---|---|
| Header | Judul + ringkasan | "Radar per Lembaga" (ikon `Pentagon`) · "{n} Lembaga · {n} berskor kritis — pentagon penuh = lengkap, gepeng ke satu sisi = domain itu kosong. Klik grafik untuk memperbesar…"; kanan: segmented control tampilan + `Select` **Urut: Skor Total / Nama / Jumlah petani / 5 domain** (→ `?urut=`, arah di-reset menaik; `items` supaya label tampil) + tombol ikon balik arah (`?arah=`) + kotak cari |
| Kartu Lembaga | `RadarCard` | Nama (deep link DA-02, truncate) + `HeatCell emphasis` Skor Total (tooltip: 5 skor domain ber-chip band) · **tombol grafik** (`cursor-zoom-in`, ikon `Maximize2` saat hover, `aria-label` "Perbesar radar {nama}") → modal · "{kode} · {distrik}" · "{n} petani" |
| Modal radar | `RadarDetailDialog` (`Dialog`, `sm:max-w-4xl`) | Judul: nama + `HeatCell` Skor Total + label band; deskripsi: kode · distrik · kategori · n petani · n persil · n temuan. **Kiri** radar `large` (label 7 px relatif viewBox agar proporsional saat 2×). **Kanan** tabel Domain · Bobot · Skor (`HeatCell`) · **Kontribusi** = bobot × skor ("{poin} / {bobot}") + baris Skor Total "{n} / 100" + catatan + tombol **Buka daftar kerja** (DA-02 `?lembaga=`) & **Detail Lembaga** (`/admin/master-data/groups/{id}`). Footer: "{i} / {n} pada urutan aktif · tombol ← → untuk berpindah" + **Sebelumnya / Berikutnya** (indeks pada `sorted`, bukan `limited`, jadi menjangkau semua; panah kiri/kanan di keyboard) |
| Radar | `RadarChart` bersama, SVG `viewBox 236×172`, `radar-geometry.ts` | Lima sumbu (Profil di atas, searah jarum jam Petani · Lahan · Pelatihan · Produksi); cincin pentagon pada 50 · 80 (putus-putus) · 100; poligon skor isian `heatRgb(healthScore)` opacity 0,3 + garis; titik sudut r = 3 berwarna `heatRgb(skor domain)` (+`<title>`); label sumbu "Domain **skor**" di luar jari-jari (anchor middle/start/end menurut sisi) |
| Grid | CSS grid | 1 / 2 (sm) / 3 (md) / 4 (xl) / 5 (2xl) kolom; bawaan semua kartu + "Ringkas — 10 kartu pertama saja" |
| Legenda | `HeatLegend` | Ramp yang sama + catatan "isian = Skor Total · titik sudut = skor domain · cincin = ambang 50 / 80 / 100" |

## Matriks cakupan modul (`AvailabilityModuleMatrix`, #352)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Collapsible trigger | "Matriks Cakupan Modul per Lembaga" (ikon `Rows3`, default terbuka); sub-judul: "Informatif — tidak masuk Index. …"; segmented control tampilan di kanan header |
| Baris "Semua Lembaga (irisan)" | Baris portfolio | `moduleCoverageTotals` — Σ atas Lembaga yang modulnya berlaku; tooltip "{n} Lembaga berlaku" |
| Kolom per modul (15) | Kolom tabel (sortable; tak berlaku diurutkan paling bawah) | Judul pendek `ModuleDef.short` + nama domain kecil di atasnya; `title` = label penuh |
| Sel | `HeatCell` | % tanpa tanda "%" (skala kontinu `heatStyle`, sama dengan heatmap inti; baris portfolio `emphasis`), atau ✓/✗ untuk modul tingkat Lembaga; "—" bergaris = belum dimulai di Lembaga itu (pct null); tooltip terisi/total |
| Kolom "Lembaga Petani" | Sticky kiri | Nama = deep link DA-02 + "{kode} · {distrik}" satu baris (tinggi 28 px) |
| Legenda | `HeatLegend` "Skala cakupan" | Ramp yang sama + "belum dimulai di Lembaga itu" |

## Paling tertinggal per domain (`AvailabilityDomainLaggards`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Paling tertinggal per domain" (ikon `ListOrdered`); sub: "5 Lembaga berskor terendah tiap domain … Lembaga tanpa petani tidak diikutkan" |
| Kolom domain (5) | Kotak kecil | `domainLaggards(groups, key, 5)` disaring skor < 100: baris "{i}. {nama}" (deep link DA-02) · skor % warna band · "{distrik} · {n} petani" · `BandBar`; seri skor → petani terbanyak dulu |
| Empty state | Teks hijau | "Semua Lembaga sudah 100 %." |

## Panel Anomali Terbanyak (`AvailabilityAnomalyPanel`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Anomali Terbanyak" (ikon `AlertTriangle` amber); sub: "Dijumlah lintas Lembaga pada irisan yang sedang tampil. Klik label → Lembaga terdampak terbanyak." |
| Tata letak | Grid 2 kolom (md+) | Kedua bagian berdampingan, kartu penuh-lebar di bawah "Paling tertinggal per domain" |
| Bagian "Per entitas — bisa dikejar per petani/persil" | Bar amber (maks 8) | `topAnomalies` (anomali non-sistemik, Σ `count`); label = deep link `?lembaga=<Lembaga terdampak terbanyak>`; tooltip: rute perbaikan (registri) + daftar ≤ 6 Lembaga terbanyak; "di {n} Lembaga" |
| Bagian "Kolom belum pernah diisi — sistemik (≥ 95 % kosong)" | Bar slate (maks 8) | `topSystemicAnomalies` (Σ `entityCount`, Lembaga terdampak = Lembaga yang kolom itu praktis kosong) — ikon `Columns3` |
| Link tindak lanjut | Link | "Buka Ketersediaan Data — Per Lembaga untuk daftar petaninya →" |
| Empty state | Teks | Per bagian: "Tidak ada anomali per entitas pada filter ini. 🎉" / "Tidak ada kolom yang kosong sistemik pada filter ini." |

## Catatan performa

Live query dipilih (preseden Dashboard Pelatihan): baris yang dibaca berkolom sedikit dan poligon geometry tidak ikut terangkut. Kehadiran satelit (#352) mengikuti pola yang sama — id-set per tabel lewat `GROUP BY`, bukan nested include. Test `perf.test.ts` menjaga jalur murni skala 2028 (40 Lembaga × 300 petani + cakupan modul + agregasi panel) < 1,5 s (aktual ±35–110 ms). Bila kelak melambat pada volume besar, jalur fallback-nya snapshot per konvensi [dashboard-snapshots.md](../../../database/dashboard-snapshots.md) (`tbl_snapshot_...` + generator di menu Tools) — sengaja belum dibangun.
