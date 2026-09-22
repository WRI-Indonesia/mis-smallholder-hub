# Dashboard Monev BMP

[← Menu Dashboard](./README.md) · [← Katalog halaman](../README.md)

Sub menu `dashboard-bmp-monev`, satu halaman: `/admin/dashboard/bmp-monev`. Hasil **Monitoring & Evaluasi praktik BMP** per petani (#344, rincian #346) — sengaja **terpisah** dari [BMP Dashboard (Produksi)](./bmp-dashboard-produksi.md): skor praktik (per petani per tahun survei) dan tonase (per lahan per bulan) berbeda grain & siklus, dan dashboard produksi bergantung snapshot sedangkan ini **realtime** (pola Dashboard Pelatihan).

## Diagram objek

```text
Halaman: Dashboard Monev BMP (/admin/dashboard/bmp-monev)
├── Header
│   ├── Judul + HelpHint · deskripsi + tanggal data · tautan ke BMP Dashboard (Produksi)
│   └── Filter: Distrik (combobox) · Lembaga Petani (combobox, cascade) · Tahun survei (select, default tahun terbaru ber-data) — tersimpan di URL (?distrik&lembaga&tahun)
├── Seksi 1 · Gambaran umum
│   ├── Kartu KPI (4): Petani Dinilai (dari petani aktif) · Rerata Skor · Menerapkan BMP (Perintis+Praktisi+Teladan dari dinilai, #360) · Lembaga Tercakup
│   └── Sebaran Kategori Petani: 4 ubin (jumlah + %, tooltip arti kategori) + batang 100% (urut terendah → tertinggi)
├── Seksi 2 · Lembaga Petani
│   ├── Papan Lembaga Petani: baris = peringkat · nama (klik = filter Lembaga) · batang komposisi · rerata + badge · cakupan; urut Rerata / Cakupan / Abjad; legenda kategori
│   └── Profil Kelembagaan (bila ada rincian): heatmap Lembaga × 14 indikator Lembaga (chip 0–3) + kolom Rerata + baris rerata kolom; urut Rerata / Abjad; ★ = ikut skor petani
├── Seksi 3 · Kegiatan & indikator (hanya bila ada rincian)
│   ├── Profil 5 Kegiatan BMP: selektor A & B (Semua / Distrik / Lembaga — lepas dari filter halaman, B default = filter aktif) → radar skala 0–3 berpita 4 kategori (kiri) + tabel Kegiatan · Bobot · A · B · Selisih (kanan)
│   └── Indikator Terlemah: 5 indikator berbobot rerata terendah (n dinilai · n tak dinilai)
├── Seksi 4 · Tindak lanjut & tren
│   ├── Petani Prioritas Pendampingan (10 terendah, kegiatan terlemah) · Petani Teladan (10 tertinggi, kegiatan terkuat) — dimuat on-demand, tautan ke detail penilaian
│   ├── Sebaran Skor Petani (histogram 0,25, garis rerata) · Tren Kategori per Tahun Survei
│   └── Rekap per Lembaga Petani (tabel dilipat; bawaan hanya Lembaga ber-data; "Tampilkan N belum dinilai"; Unduh Excel — EXPORT)
└── Empty state: "Belum ada penilaian Monev BMP" → tautan Master Data › Monev BMP
```

| Atribut | Nilai |
|---|---|
| File | `dashboard/bmp-monev/page.tsx` + `bmp-monev-dashboard-client.tsx` + 12 komponen kartu (`bmp-monev-*.tsx`) |
| Tipe | Server Component + client components |
| Guard | `requirePermission("dashboard-bmp-monev")` |
| Server action / data | `getBmpMonevDashboardView()` (`@/server/actions/dashboard-bmp-monev`) — satu entri per Lembaga dalam scope dengan seluruh penilaian aktif (+ `activityScores` hasil `recomputeBmpScore` per petani, statistik indikator, profil Lembaga) → agregasi murni `src/lib/bmp-monev-dashboard-aggregation.ts` di klien; `getBmpMonevPriorityFarmers({districtId, groupId, year}, 10, "lowest" \| "highest")` on-demand (nama petani tidak ikut payload utama); `getUserPermissionsForMenu` |
| Loading | `dashboard/bmp-monev/loading.tsx` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Filter Distrik / Lembaga / Tahun | Combobox · Select | `useUrlFilters` (TD-021): `?distrik=&lembaga=&tahun=`; tahun hanya yang punya data; Lembaga menyempit mengikuti Distrik |
| Kartu KPI (4) | Kartu | Petani Dinilai (pembagi = **seluruh petani aktif** Lembaga terpilih, termasuk yang belum disurvei), Rerata Skor (0–3), Menerapkan BMP (Perintis + Praktisi + Teladan = skor ≥ 1,00; pembagi = dinilai), Lembaga Tercakup (dari Lembaga aktif) |
| Sebaran Kategori Petani | Kartu hero | `bmpMonevTotals` → 4 ubin + batang 100%; palet ordinal abu → hijau makin gelap (validasi skill dataviz); tiap ubin ber-tooltip arti kategori dari `BMP_ASSESSMENT_CATEGORIES[].description` (ikon Info, ubin bisa difokus) |
| Papan Lembaga Petani | Kartu | `bmpMonevGroupRows`; komposisi = proporsi dari petani **dinilai**; cakupan = dinilai ÷ aktif; klik nama → `setGroupId` (tombol "Semua Lembaga" melepas) |
| Profil Kelembagaan | Heatmap | `bmpMonevGroupProfiles(sort)` + `bmpMonevGroupIndicatorAverages`; hanya Lembaga yang punya penilaian Lembaga tahun itu |
| Profil 5 Kegiatan BMP | Radar + tabel | `BmpMonevActivityRadar` → `bmpMonevActivityProfile(subset)` dari **seluruh** `groups` (bukan hasil filter) untuk A dan B; SVG bersama `components/shared/bmp-activity-radar-svg.tsx` (skala 0–3, pita kategori redup, seri biru/oranye tervalidasi CVD); maks kegiatan = `bmpActivityMaxScore` (kriteria alternatif Gulma dihitung sekali → 3,00) |
| Indikator Terlemah | Daftar bar | `bmpMonevWeakestIndicators` atas `indicatorStats` (rerata per Lembaga-tahun-indikator, hanya INDIVIDU berbobot) |
| Petani Prioritas / Teladan | Daftar | `BmpMonevPriorityFarmers order="lowest"|"highest"`; kegiatan terlemah/terkuat dari `recomputeBmpScore` **termasuk skor Lembaga** (supaya kelima kegiatan sebanding); tautan `/admin/master-data/bmp-monev/{id}` |
| Sebaran Skor · Tren | Histogram · Stacked bar | `bmpMonevScoreHistogram` (12 bin × 0,25) · `bmpMonevTrend` (per tahun survei, tahun aktif ditebalkan) |
| Rekap per Lembaga | Tabel dilipat | `BmpMonevGroupTable`; Excel `monev-bmp-per-lembaga-{tahun}.xlsx` (izin EXPORT) selalu memuat semua Lembaga |

Satu penilaian per petani-tahun di seluruh kartu = baris **berskor tertinggi** (`yearAssessments`), termasuk profil kegiatan.
