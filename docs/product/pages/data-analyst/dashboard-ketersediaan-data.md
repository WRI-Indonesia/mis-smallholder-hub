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
├── Hero (putaran 3, #352)
│   ├── Cincin Skor Keseluruhan (ScoreGauge; tooltip skor + temuan) + label band + "n Lembaga · n temuan"
│   ├── Distribusi Lembaga per band — stacked bar kritis/perlu perhatian/baik/lengkap; segmen & legenda bisa diklik → ?band= (filter matriks & panel bawah); "hapus filter band"
│   ├── 3 angka ringkas: Lembaga · Petani · Persil
│   └── Aksi lintas Lembaga — 3 kolom sistemik terbesar (topSystemicAnomalies): entitas · Lembaga · tautan menu pengisian
├── Kartu domain (5) — SKOR memimpin (besar, warna band) + bar mini + bobot % + jumlah entitas + "n kritis"; klik → ?urut=<domain> (matriks tersortir menaik, kartu disorot, gulir ke matriks)
├── Matriks per Lembaga (kartu)
│   ├── Header: judul + ringkasan · segmented control Kelengkapan inti | Cakupan modul (?tampilan=) · kotak "Cari Lembaga / kode / distrik"
│   ├── Tampilan inti: kolom Lembaga (nama = deep link DA-02 + ikon) · Skor Total (pekat, tepat di samping nama) · Petani (n) · 5 domain (sel lembut BAND_CELL_SOFT)
│   ├── Bawaan 10 baris terendah + "Tampilkan semua (n) — m tersembunyi"; pencarian menampilkan semua yang cocok
│   ├── Legenda band (sekali)
│   └── Tampilan modul: Matriks cakupan modul (baris portfolio + kolom per modul, ✓/✗ tingkat Lembaga, "—" belum dimulai)
└── Baris bawah
    ├── Paling tertinggal per domain — 5 kolom kecil (Profil…Produksi), 5 Lembaga terendah + bar mini; Lembaga tanpa petani dikeluarkan
    └── Panel Anomali Terbanyak (Per entitas · Kolom belum pernah diisi)
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/data-analyst/data-availability/page.tsx` |
| Tipe | Server Component → `DataAvailabilityClient` (Client Component) |
| Komponen anak | `data-availability-client.tsx`, `availability-hero.tsx`, `availability-domain-cards.tsx`, `availability-matrix.tsx`, `availability-module-matrix.tsx`, `availability-domain-laggards.tsx`, `availability-anomaly-panel.tsx`, `loading.tsx` (putaran 3 #352: `availability-score-cards.tsx` & `availability-group-chart.tsx` dihapus); visual bersama `src/components/shared/score-visuals.tsx` (`ScoreGauge`, `BandBar`); gaya band di `src/lib/score-band-styles.ts` (+`BAND_CELL_SOFT`) |
| Guard | `requirePermission("data-analyst-data-availability")` (halaman); `hasPermission("data-analyst-data-availability", "VIEW")` + `getAccessContext()` di action; tombol Excel digate `EXPORT` |
| Server action / data | `getDataAvailabilityView()` dari `src/server/actions/data-availability.ts` — **live query** (bukan snapshot), satu query nested per bentuk DA-02 lintas Lembaga (tanpa kolom `geometry`; kehadiran geometry via query id terpisah `geometry: { not: Prisma.DbNull }`), partisipasi "tamu" (activity Lembaga lain) disaring di JS; kehadiran modul (#352) lewat `loadModuleFlagSets` (`src/lib/data-completeness-query.ts`): 13 kueri id-set (GROUP BY) per satelit, scope lewat relasi `parcel.farmer.farmerGroup`, sejajar dengan kueri geometry — TIDAK di-nest ke `findMany` utama |
| Scoring | Direuse utuh dari DA-02: `computeCompleteness` (`src/lib/data-completeness.ts` + registri `data-completeness-registry.ts`) via `buildAvailabilityEntry` — skor per Lembaga di dashboard **identik** dengan halaman DA-02 |
| Helper agregasi | `buildAvailabilityEntry`, `filterAvailabilityGroups` (+`groupId`, +`band`), `availabilityTotals`, `availabilityScoreRows`, `bandDistribution`, `domainLaggards`, `domainCriticalCount`, `domainScoreOf`, `topAnomalies` (per entitas), `topSystemicAnomalies`, `moduleCoverageTotals`, `scoreBand` dari `src/lib/data-availability-aggregation.ts` |
| Persistensi filter | `useUrlFilters()` (TD-021) — kunci `distrik`, `kategori`, `lembaga`, `band`, `urut` (domain/`name`/`totalFarmers`), `tampilan` (`modul`); nilai URL tak valid diabaikan. Hero & kartu domain dihitung dari irisan Distrik/Kategori/Lembaga; matriks & baris bawah ditambah filter `band` |
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
| Perilaku filter | Catatan | Nilai tersimpan di URL (`?distrik=…&kategori=…&lembaga=…&band=…&urut=…&tampilan=modul`); nilai tak valid diabaikan |
| Hero | Kartu | Lihat rincian di bawah |
| Kartu domain (5) | Tombol kartu | Lihat rincian di bawah |
| Matriks per Lembaga | Tabel heatmap + segmented control + cari | Lihat rincian di bawah |
| Matriks cakupan modul | Tabel heatmap (collapsible) | Lihat rincian di bawah |
| Paling tertinggal per domain | 5 kotak kecil | Lihat rincian di bawah |
| Panel Anomali Terbanyak | Panel bar dua bagian | Lihat rincian di bawah |

## Hero (`AvailabilityHero`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Cincin Skor Keseluruhan | `ScoreGauge` 140 px | Angka bulat, warna band; tooltip: skor + temuan anomali; di sampingnya label band ("50–79 — perlu perhatian") dan "n Lembaga · n temuan" |
| Distribusi Lembaga per band | Stacked bar (`BAND_BAR`) urut kritis → lengkap | Lebar segmen ∝ jumlah Lembaga; angka di dalam segmen; klik segmen/legenda → `?band=` (segmen lain meredup, tombol "hapus filter band"); tooltip jumlah + persen |
| Angka ringkas | 3 kotak | Lembaga · Petani · Persil (irisan) |
| Aksi lintas Lembaga | Daftar bernomor (maks 3) | `topSystemicAnomalies`: label · "n entitas · n Lembaga" · tautan `fix` registri; catatan "kolom yang belum pernah diisi — urusan unggah massal" |

## Kartu domain (`AvailabilityDomainCards`)

| # | Kartu | Nilai besar | Sub |
|---|---|---|---|
| 1 | Profil Lembaga · 10 % | skor % (warna band) + bar | "{n} Lembaga" · "{n} kritis" |
| 2 | Petani · 25 % | skor % | "{n} petani" · "{n} kritis" |
| 3 | Lahan · 25 % | skor % | "{n} persil" · "{n} kritis" |
| 4 | Pelatihan · 20 % | skor % | "{n} sesi" · "{n} kritis" |
| 5 | Produksi · 20 % | skor % | "{n} / {n} petani ber-produksi" · "{n} kritis" |

Klik kartu → `?urut=<domain>` (matriks diurut menaik pada domain itu, kartu ber-ring, gulir ke matriks; klik lagi = kembali ke Skor Total). Tooltip: bobot, basis portfolio (tertimbang petani / rata-rata sederhana), Lembaga kritis.

## Matriks per Lembaga (`AvailabilityMatrix`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Header | Judul + ringkasan | "Matriks per Lembaga" · "{n} Lembaga · {n} berskor kritis (<50) — klik judul kolom…"; kanan: segmented control **Kelengkapan inti | Cakupan modul** (`Tabs`, `?tampilan=`) + kotak **Cari Lembaga / kode / distrik** |
| Kolom "Lembaga Petani" | Kolom tabel (sortable) | Nama = **deep link** `/admin/data-analyst/data-completeness?lembaga={id}` berwarna primary + ikon `ExternalLink`; baris kecil "{kode} · {distrik}"; baris ber-hover |
| Kolom "Skor Total" | Kolom tabel (sortable, bawaan menaik) | Tepat setelah nama; `healthScore` pekat (`BAND_CELL`) + ring; tooltip band + temuan |
| Kolom "Petani (n)" | Kolom tabel (sortable) | Jumlah petani aktif |
| Kolom domain (5) | Kolom tabel (sortable) | Profil, Petani, Lahan, Pelatihan, Produksi — sel **lembut** (`BAND_CELL_SOFT`: latar tipis + teks band) agar outlier terbaca; tooltip band |
| Batas baris | Toggle | Bawaan 10 teratas menurut urutan aktif (= 10 terendah pada sort menaik) + "Tampilkan semua ({n}) — {m} tersembunyi" / "Tampilkan 10 teratas saja"; saat mencari, semua yang cocok tampil |
| Legenda band | Legend | Satu kali, di bawah tabel |
| Empty state | Teks | "Tidak ada Lembaga Petani pada filter ini." / "Tidak ada Lembaga yang cocok dengan \"{q}\"." |

## Matriks cakupan modul (`AvailabilityModuleMatrix`, #352)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Collapsible trigger | "Matriks Cakupan Modul per Lembaga" (ikon `Rows3`, default terbuka); sub-judul: "Informatif — tidak masuk Index. …"; segmented control tampilan di kanan header |
| Baris "Semua Lembaga (irisan)" | Baris portfolio | `moduleCoverageTotals` — Σ atas Lembaga yang modulnya berlaku; tooltip "{n} Lembaga berlaku" |
| Kolom per modul (15) | Kolom tabel (sortable; tak berlaku diurutkan paling bawah) | Judul pendek `ModuleDef.short` + nama domain kecil di atasnya; `title` = label penuh |
| Sel | Sel band | % (`BAND_CELL`), atau ✓/✗ untuk modul tingkat Lembaga; "—" bergaris = belum dimulai di Lembaga itu (pct null); tooltip terisi/total |
| Kolom "Lembaga Petani" | Sticky kiri | Nama = deep link DA-02 + "{kode} · {distrik}" |
| Legenda | Legend | Band cakupan + "belum dimulai di Lembaga itu" |

## Paling tertinggal per domain (`AvailabilityDomainLaggards`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Paling tertinggal per domain" (ikon `ListOrdered`); sub: "5 Lembaga berskor terendah tiap domain … Lembaga tanpa petani tidak diikutkan" |
| Kolom domain (5) | Kotak kecil | `domainLaggards(groups, key, 5)`: baris "{i}. {nama}" (deep link DA-02, `title` distrik + petani) · skor % warna band · `BandBar`; seri skor → petani terbanyak dulu |
| Empty state | Teks | "Tidak ada Lembaga." |

## Panel Anomali Terbanyak (`AvailabilityAnomalyPanel`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Anomali Terbanyak" (ikon `AlertTriangle` amber); sub: "Dijumlah lintas Lembaga pada irisan yang sedang tampil. Klik label → Lembaga terdampak terbanyak." |
| Bagian "Per entitas — bisa dikejar per petani/persil" | Bar amber (maks 8) | `topAnomalies` (anomali non-sistemik, Σ `count`); label = deep link `?lembaga=<Lembaga terdampak terbanyak>`; tooltip: rute perbaikan (registri) + daftar ≤ 6 Lembaga terbanyak; "di {n} Lembaga" |
| Bagian "Kolom belum pernah diisi — sistemik (≥ 95 % kosong)" | Bar slate (maks 6) | `topSystemicAnomalies` (Σ `entityCount`, Lembaga terdampak = Lembaga yang kolom itu praktis kosong) — ikon `Columns3` |
| Link tindak lanjut | Link | "Buka Ketersediaan Data — Per Lembaga untuk daftar petaninya →" |
| Empty state | Teks | Per bagian: "Tidak ada anomali per entitas pada filter ini. 🎉" / "Tidak ada kolom yang kosong sistemik pada filter ini." |

## Catatan performa

Live query dipilih (preseden Dashboard Pelatihan): baris yang dibaca berkolom sedikit dan poligon geometry tidak ikut terangkut. Kehadiran satelit (#352) mengikuti pola yang sama — id-set per tabel lewat `GROUP BY`, bukan nested include. Test `perf.test.ts` menjaga jalur murni skala 2028 (40 Lembaga × 300 petani + cakupan modul + agregasi panel) < 1,5 s (aktual ±35–110 ms). Bila kelak melambat pada volume besar, jalur fallback-nya snapshot per konvensi [dashboard-snapshots.md](../../../database/dashboard-snapshots.md) (`tbl_snapshot_...` + generator di menu Tools) — sengaja belum dibangun.
