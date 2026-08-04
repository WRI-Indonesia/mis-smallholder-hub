# Dashboard Ketersediaan Data

[← Menu Data Analyst](./README.md) · [← Katalog halaman](../README.md)

Sub menu `data-analyst-data-availability`, satu halaman: `/admin/data-analyst/data-availability` (DA-03, #193).

> Semula dirilis sebagai sub menu keempat di grup **Dashboard** (`dashboard-data-availability`), lalu dipindah ke **Data Analyst** pada hari yang sama (keputusan owner #193) — berdampingan dengan Analisa Ketersediaan Data yang jadi tempat deep-dive-nya.

Roll-up lintas Lembaga Petani dari scoring [Analisa Ketersediaan Data (DA-02)](./analisa-ketersediaan-data.md): skor kelengkapan 5 domain (Profil Lembaga, Petani, Lahan, Pelatihan, Produksi) per Lembaga + ringkasan anomali. Deep-dive per Lembaga (daftar petani per anomali) tetap di halaman DA-02.

## Diagram objek

```text
Halaman: Dashboard Ketersediaan Data (/admin/data-analyst/data-availability)
├── Header
│   ├── Judul "Dashboard Ketersediaan Data"
│   └── Deskripsi + tanggal generate
├── Filter
│   ├── Kategori Lembaga (select)
│   └── Distrik (combobox)
├── Kartu KPI (6)
│   ├── Skor Keseluruhan
│   ├── Profil Lembaga
│   ├── Petani
│   ├── Lahan
│   ├── Pelatihan
│   └── Produksi
├── Matriks kelengkapan (collapsible)
│   ├── Kolom Lembaga Petani / Petani
│   ├── Kolom domain (Profil, Petani, Lahan, Pelatihan, Produksi)
│   ├── Kolom Skor Total
│   ├── Legenda band skor
│   └── Empty state
├── Chart skor per Lembaga
│   ├── Bar horizontal per Lembaga (terendah dulu)
│   ├── Legenda band + link ke DA-02
│   └── Empty state
└── Panel Anomali Terbanyak
    ├── Top-10 tipe anomali (bar + jumlah + Lembaga terdampak)
    ├── Link ke DA-02
    └── Empty state
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/data-analyst/data-availability/page.tsx` |
| Tipe | Server Component → `DataAvailabilityClient` (Client Component) |
| Komponen anak | `data-availability-client.tsx`, `availability-score-cards.tsx`, `availability-matrix.tsx`, `availability-group-chart.tsx`, `availability-anomaly-panel.tsx`, `score-band-styles.ts`, `loading.tsx` |
| Guard | `requirePermission("data-analyst-data-availability")` (halaman); `hasPermission("data-analyst-data-availability", "VIEW")` + `getAccessContext()` di action |
| Server action / data | `getDataAvailabilityView()` dari `src/server/actions/data-availability.ts` — **live query** (bukan snapshot), satu query nested per bentuk DA-02 lintas Lembaga (tanpa kolom `geometry`; kehadiran geometry via query id terpisah `geometry: { not: Prisma.DbNull }`), partisipasi "tamu" (activity Lembaga lain) disaring di JS |
| Scoring | Direuse utuh dari DA-02: `computeCompleteness` (`src/lib/data-completeness.ts`) via `buildAvailabilityEntry` — skor per Lembaga di dashboard **identik** dengan halaman DA-02 |
| Helper agregasi | `buildAvailabilityEntry`, `filterAvailabilityGroups`, `availabilityTotals`, `availabilityScoreRows`, `topAnomalies`, `scoreBand` dari `src/lib/data-availability-aggregation.ts` |
| Persistensi filter | `useUrlFilters()` (TD-021) — kunci `distrik`, `kategori`; nilai URL tak valid diabaikan (tampil "Semua") |
| Icon menu | `Gauge` (order 3 di menu Data Analyst) |
| Role dengan VIEW (seed) | SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT — **tanpa DONOR** (keputusan owner #193: alat kerja internal yang mengekspos gap kualitas data) |

## Aturan skor

- **Skor per Lembaga** = `healthScore` DA-02: berbobot `DOMAIN_WEIGHTS` (profil 10%, petani 25%, lahan 25%, pelatihan 20%, produksi 20%).
- **Skor domain Petani & Lahan graded per field** (keputusan owner #193, 2026-07-28): rata-rata proporsi field terisi per petani (5 check) / per persil (5 atribut) — bukan all-or-nothing per entitas. Rincian di [analisa-ketersediaan-data.md](./analisa-ketersediaan-data.md) §Aturan skor.
- **Skor portfolio (kartu KPI)** — keputusan owner #193:
  - Domain petani/lahan/pelatihan/produksi = rata-rata **tertimbang jumlah petani** per Lembaga (`Σ(skor × petani) / Σ petani`; fallback rata-rata sederhana bila Σ petani = 0).
  - Profil = rata-rata sederhana per Lembaga (satu profil per Lembaga, tak terkait ukuran).
  - Skor Keseluruhan = `DOMAIN_WEIGHTS` atas kelima skor portfolio itu.
- **Band skor** (`scoreBand`, satu sumber warna untuk card/bar/matriks): 100 lengkap penuh (emerald tua pekat — dibedakan dari "baik", selaras #194 di matriks Pelatihan), 80–99 baik (emerald), 50–79 perlu perhatian (amber), <50 kritis (rose pekat). Sel dibuat kontras antar-band, bukan pastel seragam.
- Payload tanpa daftar petani per anomali (PII + ukuran) — hanya `{key, label, count}`; profil yang belum lengkap disintesis sebagai anomali `profil-tidak-lengkap` supaya Σ count panel = `totalAnomalies` DA-02.

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Panduan` | Tautan | `HelpHint` — ikon `?` di header menuju tutorial Bantuan untuk `data-analyst-data-availability` (`findTutorialForMenu`), dibuka di tab baru |
| Judul halaman | Heading `h1` | "Dashboard Ketersediaan Data" |
| Deskripsi | Teks | "Kelengkapan data 5 domain lintas Lembaga Petani — data per {tanggal generate}" |
| Filter Kategori Lembaga | Select | "Semua Kategori", "Ex-Plasma", "Swadaya" |
| Filter Distrik | Combobox (Popover + Command) | "Cari distrik..."; opsi "Semua Distrik"; empty: "Distrik tidak ditemukan." |
| Perilaku filter | Catatan | Nilai tersimpan di URL (`?distrik=…&kategori=…`); nilai tak valid diabaikan |
| Kartu KPI (6 kartu) | Kartu KPI | Lihat rincian di bawah |
| Matriks kelengkapan | Tabel heatmap (collapsible) | Lihat rincian di bawah |
| Chart skor per Lembaga | Bar horizontal | Lihat rincian di bawah |
| Panel Anomali Terbanyak | Panel bar | Lihat rincian di bawah |

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
| Kolom "Lembaga Petani" | Kolom tabel (sortable) | Nama + baris kecil "{kode} · {distrik}" |
| Kolom "Petani" | Kolom tabel (sortable) | Jumlah petani aktif |
| Kolom domain (5) | Kolom tabel (sortable) | Profil, Petani, Lahan, Pelatihan, Produksi — sel = skor% berwarna band |
| Kolom "Skor Total" | Kolom tabel (sortable, default sort menaik) | `healthScore` berwarna band + ring pembeda; tooltip memuat jumlah anomali |
| Legenda band | Legend | "Band skor:" 100 lengkap penuh · 80–99 baik · 50–79 perlu perhatian · <50 kritis |
| Empty state | Teks | "Tidak ada Lembaga Petani pada filter ini." |

## Chart skor per Lembaga (`AvailabilityGroupChart`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Skor Kelengkapan per Lembaga Petani" |
| Baris per Lembaga | Bar horizontal (skala 0–100) | Terendah dulu; label "{nama} · {distrik} · {n} petani" + skor; warna bar = band; tooltip memuat jumlah anomali; scroll bila panjang |
| Legenda + link | Legend | Band skor + "Analisa detail per Lembaga →" → `/admin/data-analyst/data-completeness` |
| Empty state | Teks | "Tidak ada Lembaga Petani pada filter ini." |

## Panel Anomali Terbanyak (`AvailabilityAnomalyPanel`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Anomali Terbanyak" (ikon `AlertTriangle` amber) |
| Baris anomali (maks 10) | Bar amber (skala relatif terbanyak) | Label + jumlah temuan + "di {n} Lembaga" |
| Link tindak lanjut | Link | "Buka Analisa Ketersediaan Data untuk daftar petaninya →" |
| Empty state | Teks | "Tidak ada anomali pada filter ini. 🎉" |

## Catatan performa

Live query dipilih (preseden Dashboard Pelatihan): baris yang dibaca berkolom sedikit dan poligon geometry tidak ikut terangkut. Bila kelak melambat pada volume besar, jalur fallback-nya snapshot per konvensi [dashboard-snapshots.md](../../../database/dashboard-snapshots.md) (`tbl_snapshot_...` + generator di menu Tools) — sengaja belum dibangun.
