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
├── Kartu KPI (6)
│   ├── Skor Keseluruhan
│   ├── Profil Lembaga
│   ├── Petani
│   ├── Lahan
│   ├── Pelatihan
│   └── Produksi
├── Segmented control (Tabs) — ?tampilan=
│   ├── "Kelengkapan inti" (default) → Matriks kelengkapan (collapsible)
│   │   ├── Kolom Lembaga Petani (nama = deep link DA-02) / Petani
│   │   ├── Kolom domain (Profil, Petani, Lahan, Pelatihan, Produksi)
│   │   ├── Kolom Skor Total
│   │   ├── Legenda band skor
│   │   └── Empty state
│   └── "Cakupan modul" → Matriks cakupan modul (collapsible)
│       ├── Baris "Semua Lembaga (irisan)" — Σ atas Lembaga yang modulnya berlaku
│       ├── Satu kolom per modul MODULE_CATALOG (judul pendek + domain), sortable
│       ├── Sel: % berwarna band · ✓/✗ untuk modul tingkat Lembaga · "—" bergaris = belum dimulai
│       └── Legenda band + "belum dimulai di Lembaga itu"
├── Chart skor per Lembaga
│   ├── Bar horizontal per Lembaga (terendah dulu; nama = deep link DA-02)
│   ├── Legenda band + link ke DA-02
│   └── Empty state
└── Panel Anomali Terbanyak (dua bagian)
    ├── "Per entitas — bisa dikejar per petani/persil" (top-8; label = deep link ke Lembaga terdampak terbanyak; tooltip daftar Lembaga + rute perbaikan)
    ├── "Kolom belum pernah diisi — sistemik (≥ 95 % kosong)" (top-6; Σ entitas, Lembaga terdampak)
    ├── Link ke DA-02
    └── Empty state per bagian
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/data-analyst/data-availability/page.tsx` |
| Tipe | Server Component → `DataAvailabilityClient` (Client Component) |
| Komponen anak | `data-availability-client.tsx`, `availability-score-cards.tsx`, `availability-matrix.tsx`, `availability-module-matrix.tsx` (#352), `availability-group-chart.tsx`, `availability-anomaly-panel.tsx`, `loading.tsx`; gaya band di `src/lib/score-band-styles.ts` (dipindah dari folder ini #352 agar dipakai DA-02 & Detail Lembaga) |
| Guard | `requirePermission("data-analyst-data-availability")` (halaman); `hasPermission("data-analyst-data-availability", "VIEW")` + `getAccessContext()` di action; tombol Excel digate `EXPORT` |
| Server action / data | `getDataAvailabilityView()` dari `src/server/actions/data-availability.ts` — **live query** (bukan snapshot), satu query nested per bentuk DA-02 lintas Lembaga (tanpa kolom `geometry`; kehadiran geometry via query id terpisah `geometry: { not: Prisma.DbNull }`), partisipasi "tamu" (activity Lembaga lain) disaring di JS; kehadiran modul (#352) lewat `loadModuleFlagSets` (`src/lib/data-completeness-query.ts`): 13 kueri id-set (GROUP BY) per satelit, scope lewat relasi `parcel.farmer.farmerGroup`, sejajar dengan kueri geometry — TIDAK di-nest ke `findMany` utama |
| Scoring | Direuse utuh dari DA-02: `computeCompleteness` (`src/lib/data-completeness.ts` + registri `data-completeness-registry.ts`) via `buildAvailabilityEntry` — skor per Lembaga di dashboard **identik** dengan halaman DA-02 |
| Helper agregasi | `buildAvailabilityEntry`, `filterAvailabilityGroups` (+`groupId`), `availabilityTotals`, `availabilityScoreRows`, `topAnomalies` (per entitas), `topSystemicAnomalies`, `moduleCoverageTotals`, `scoreBand` dari `src/lib/data-availability-aggregation.ts` |
| Persistensi filter | `useUrlFilters()` (TD-021) — kunci `distrik`, `kategori`, `lembaga`, `tampilan` (`modul`); nilai URL tak valid diabaikan (tampil "Semua"/inti) |
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
| Deskripsi | Teks | "Kelengkapan data 5 domain lintas Lembaga Petani — data per {tanggal generate}. Klik baris Lembaga untuk rinciannya." |
| Filter Kategori Lembaga | Select | "Semua Kategori", "Ex-Plasma", "Swadaya" |
| Filter Distrik | `FilterCombobox` | "Cari distrik..."; opsi "Semua Distrik"; empty: "Distrik tidak ditemukan." |
| Filter Lembaga | `FilterCombobox` (#352) | "Cari lembaga petani..."; opsi "Semua Lembaga"; daftar mengikuti Distrik/Kategori; memfokuskan semua panel ke satu Lembaga |
| "Excel" | Tombol (gate `EXPORT`) | `ketersediaan-data-semua-lembaga-<yyyyMMdd>.xlsx`: sheet **Kelengkapan Inti** (Lembaga, Kode, Distrik, Kategori, Petani, Persil, 5 skor domain, Skor Total, Temuan Anomali) + sheet **Cakupan Modul** (Lembaga × modul, % atau "belum dimulai") — atas irisan yang tampil |
| Perilaku filter | Catatan | Nilai tersimpan di URL (`?distrik=…&kategori=…&lembaga=…&tampilan=modul`); nilai tak valid diabaikan |
| Segmented control | `Tabs` | "Kelengkapan inti" / "Cakupan modul" (#352 B3) |
| Kartu KPI (6 kartu) | Kartu KPI | Lihat rincian di bawah |
| Matriks kelengkapan | Tabel heatmap (collapsible) | Lihat rincian di bawah |
| Matriks cakupan modul | Tabel heatmap (collapsible) | Lihat rincian di bawah |
| Chart skor per Lembaga | Bar horizontal | Lihat rincian di bawah |
| Panel Anomali Terbanyak | Panel bar dua bagian | Lihat rincian di bawah |

## Kartu KPI (`AvailabilityScoreCards`)

| # | Judul kartu | Nilai | Sub |
|---|---|---|---|
| 1 | Skor Keseluruhan | "{skor} / 100" (warna band) | "rata-rata tertimbang {n} Lembaga · {n} anomali" |
| 2 | Profil Lembaga | "{n} Lembaga" | "kelengkapan profil {skor}%" (warna band) |
| 3 | Petani | "{n}" | "data lengkap {skor}%" |
| 4 | Lahan | "{n} persil" | "data lengkap {skor}%" |
| 5 | Pelatihan | "{n} sesi" | "cakupan paket {skor}%" |
| 6 | Produksi | "{n} / {n}" (petani ber-produksi / total) | "petani ber-produksi {skor}%" |

## Matriks kelengkapan (`AvailabilityMatrix`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Collapsible trigger | "Matriks Kelengkapan per Lembaga & Domain" (ikon `Grid3x3`, default terbuka) |
| Sub-judul (terlipat) | Ringkasan | "{n} Lembaga · {n} berskor kritis (<50)" |
| Kolom "Lembaga Petani" | Kolom tabel (sortable) | Nama = **deep link** `/admin/data-analyst/data-completeness?lembaga={id}` (#352 B3) + baris kecil "{kode} · {distrik}" |
| Kolom "Petani" | Kolom tabel (sortable) | Jumlah petani aktif |
| Kolom domain (5) | Kolom tabel (sortable) | Profil, Petani, Lahan, Pelatihan, Produksi — sel = skor% berwarna band; tooltip terstruktur `StatTooltip` (#213): band + jumlah anomali domain |
| Kolom "Skor Total" | Kolom tabel (sortable, default sort menaik) | `healthScore` berwarna band + ring pembeda; tooltip terstruktur (#213) memuat band + jumlah anomali |
| Legenda band | Legend | "Band skor:" 100 lengkap penuh · 80–99 baik · 50–79 perlu perhatian · <50 kritis |
| Empty state | Teks | "Tidak ada Lembaga Petani pada filter ini." |

## Matriks cakupan modul (`AvailabilityModuleMatrix`, #352)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Collapsible trigger | "Matriks Cakupan Modul per Lembaga" (ikon `Rows3`, default terbuka); sub-judul: "Informatif — tidak masuk Index. …" |
| Baris "Semua Lembaga (irisan)" | Baris portfolio | `moduleCoverageTotals` — Σ atas Lembaga yang modulnya berlaku; tooltip "{n} Lembaga berlaku" |
| Kolom per modul (15) | Kolom tabel (sortable; tak berlaku diurutkan paling bawah) | Judul pendek `ModuleDef.short` + nama domain kecil di atasnya; `title` = label penuh |
| Sel | Sel band | % (`BAND_CELL`), atau ✓/✗ untuk modul tingkat Lembaga; "—" bergaris = belum dimulai di Lembaga itu (pct null); tooltip terisi/total |
| Kolom "Lembaga Petani" | Sticky kiri | Nama = deep link DA-02 + "{kode} · {distrik}" |
| Legenda | Legend | Band cakupan + "belum dimulai di Lembaga itu" |

## Chart skor per Lembaga (`AvailabilityGroupChart`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Skor Kelengkapan per Lembaga Petani" |
| Baris per Lembaga | Bar horizontal (skala 0–100) | Terendah dulu; label "{nama} · {distrik} · {n} petani" + skor — nama = deep link `?lembaga=` (#352); warna bar = band; tooltip terstruktur (#213) memuat jumlah anomali; scroll bila panjang |
| Legenda + link | Legend | Band skor + "Ketersediaan Data — Per Lembaga →" → `/admin/data-analyst/data-completeness` |
| Empty state | Teks | "Tidak ada Lembaga Petani pada filter ini." |

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
