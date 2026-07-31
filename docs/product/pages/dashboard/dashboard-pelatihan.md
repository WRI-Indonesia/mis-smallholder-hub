# Dashboard Pelatihan

[← Menu Dashboard](./README.md) · [← Katalog halaman](../README.md)

Sub menu `dashboard-training`, satu halaman: `/admin/dashboard/training`.

## Diagram objek

```text
Halaman: Dashboard Pelatihan (/admin/dashboard/training)
├── Header
│   ├── Judul "Dashboard Pelatihan"
│   └── Deskripsi + tanggal generate
├── Filter
│   ├── Kategori Lembaga (select)
│   ├── Distrik (combobox)
│   ├── Lembaga Petani (combobox)
│   └── Tahun (select, default "Semua Tahun")
├── Kartu KPI (4) — satu angka besar, pembanding di sub-teks (#198, pola BMP #191)
│   ├── Cakupan Petani Terlatih
│   ├── Total Sesi
│   ├── Partisipasi Perempuan
│   └── Rata-rata Kenaikan Skor
├── Matriks cakupan (collapsible)
│   ├── Kolom Lembaga Petani
│   ├── Kolom Petani
│   ├── Kolom paket (dinamis)
│   ├── Kolom Min. 1 Paket
│   ├── Heatmap sel (klik → dialog drill-down)
│   ├── Legenda skala
│   └── Empty state
├── Card Petani Terlatih vs Belum per Distrik (full row, #198)
│   ├── Legend Sudah/Belum
│   ├── Tabel paket × distrik (baris = paket + Min. 1 Paket; kolom = distrik + total petani; lebar kolom seragam)
│   ├── Sel: % terlatih + jumlah sudah + bar proporsi (belum di tooltip)
│   └── Empty state
├── Chart tren kehadiran
│   ├── Stacked bar per paket
│   ├── Tooltip hover
│   ├── Legenda warna paket
│   └── Empty state
├── Panel efektivitas pre/post-test
│   ├── Baris per paket (bar Pre / Post)
│   ├── Catatan per paket
│   └── Empty state
├── Panel kualitas data
│   ├── Sesi tanpa bukti
│   ├── Sesi tanpa lokasi
│   ├── Sesi tanpa peserta
│   ├── Peserta tanpa skor lengkap
│   └── Link ke Master Data Pelatihan
└── Dialog drill-down petani belum dilatih
    ├── Tabel (ID Petani / Nama / L-P)
    ├── Tombol "Salin"
    ├── Tombol "Excel"
    ├── Loading state
    └── Empty state
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/dashboard/training/page.tsx` |
| Tipe | Server Component → `TrainingDashboardClient` (Client Component) |
| Komponen anak | `training-dashboard-client.tsx`, `training-score-cards.tsx`, `training-coverage-matrix.tsx`, `training-trend-chart.tsx`, `training-effectiveness-panel.tsx`, `training-quality-panel.tsx`, `training-untrained-modal.tsx`, `loading.tsx` |
| Guard | `requirePermission("dashboard-training")` (halaman); `hasPermission("dashboard-training", "VIEW")` + `getAccessContext()` di action |
| Server action / data | `getTrainingDashboardView()` dari `src/server/actions/dashboard-training.ts` — query langsung ke DB (bukan snapshot), difilter `isActive` + access context; `getUntrainedFarmers(groupId, packageCode, year)` untuk dialog drill-down |
| Helper agregasi | `filterTrainingGroups`, `trainingTotals`, `trainingCoverageMatrix`, `trainingActivePackages`, `trainingTrendSeries`, `trainingScoreRows`, `trainingQualityStats`, `trainingAvailableYears`, `trainingTargetGap` / `TRAINING_COVERAGE_TARGET` dari `src/lib/training-dashboard-aggregation.ts` |
| Persistensi filter | `useUrlFilters()` (`src/hooks/use-url-filters.ts`, TD-021) — filter disimpan di query string, kunci `distrik`, `lembaga`, `kategori`, `tahun`; via History API `replaceState` (bukan `router.replace`, agar tidak memicu ulang payload RSC); nilai kosong dihapus dari query |
| Uji performa | `src/test/perf.test.ts` (TD-020) — agregat (KPI + matriks + tren + skor) diuji pada fixture 60.000 baris kehadiran, ambang < 1.200 ms; pagar sebelum menimbang beralih ke pola snapshot |
| Icon menu | `GraduationCap` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul halaman | Heading `h1` | "Dashboard Pelatihan" |
| Deskripsi | Teks | "Cakupan & efektivitas program pelatihan petani — data per {tanggal generate}" |
| Filter Kategori Lembaga | Select | "Semua Kategori", "Ex-Plasma", "Swadaya" |
| Filter Distrik | Combobox (Popover + Command) | "Cari distrik..."; opsi "Semua Distrik"; empty: "Distrik tidak ditemukan." |
| Filter Lembaga Petani | Combobox (Popover + Command) | "Cari lembaga petani..."; opsi "Semua Lembaga Petani"; empty: "Lembaga petani tidak ditemukan." |
| Filter Tahun | Select | Default "Semua Tahun" (kumulatif) + daftar tahun dari data |
| Perilaku filter | Catatan | Nilai tersimpan di URL (`?distrik=…&lembaga=…&kategori=…&tahun=…`) sehingga bisa di-bookmark/dibagikan; mengubah Distrik atau Kategori mereset Lembaga (`setMany`); nilai URL yang tak valid (lembaga nonaktif, kategori/tahun sembarang) diabaikan → dashboard tampil sebagai "Semua", bukan tampilan kosong |
| Kartu KPI (5 kartu) | Kartu KPI | Lihat rincian di bawah |
| Matriks cakupan | Tabel heatmap (collapsible) | Lihat rincian di bawah |
| Chart tren kehadiran | Stacked bar chart (SVG kustom) | Lihat rincian di bawah |
| Panel efektivitas pre/post-test | Panel bar horizontal | Lihat rincian di bawah |
| Panel kualitas data | Panel 4 kartu ringkas | Lihat rincian di bawah |
| Dialog petani belum dilatih | Dialog drill-down | Dibuka dari sel matriks; lihat rincian di bawah |

## Kartu KPI (`TrainingScoreCards`)

| # | Judul kartu | Nilai | Sub |
|---|---|---|---|
| 1 | Cakupan Petani Terlatih | "{terlatih}" | "{persen} dari total {total petani} petani aktif pernah ikut ≥1 pelatihan ({label tahun})" |
| 2 | Total Sesi | "{n}" | "sesi pelatihan ({label tahun})" |
| 3 | Partisipasi Perempuan | persen | "{n} dari total {n} kehadiran ({label tahun})" |
| 4 | Rata-rata Kenaikan Skor | "+/−{n} poin" atau "—" | "pre {n} → post {n} · {n} peserta ber-skor" / "belum ada peserta dengan pre & post terisi" |

Satu angka besar per card, pembanding di sub-teks dengan token beraksen `StatEmph` (`src/components/shared/stat-emph.tsx`, pola KPI BMP #191). Card "Kehadiran vs Petani Unik" **dihapus** (#198, keputusan owner — petani unik sudah diwakili card Cakupan). Kolom matriks cakupan diberi lebar seragam agar grid sel simetris.

## Card Petani Terlatih vs Belum per Distrik (`TrainingDistrictPanel`, #198)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Petani Terlatih vs Belum per Distrik" + legend Sudah (emerald) / Belum (muted) |
| Tabel | Paket × distrik (transposisi, revisi owner) | Baris = paket + Min. 1 Paket; kolom = distrik (header memuat total petani); roll-up via `trainingDistrictCoverage` (Σ antar Lembaga aman — petani milik tepat satu Lembaga); lebar kolom distrik seragam |
| Sel | Bar proporsi | "{persen}%" + jumlah sudah + bar terisi proporsi terlatih (angka belum di tooltip — revisi owner); distrik tanpa petani → "—" |
| Empty state | Teks | "Tidak ada distrik pada filter ini." |

Label tahun: "semua tahun" atau "{YYYY}".

## Matriks cakupan (`TrainingCoverageMatrix`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Collapsible trigger | "Cakupan Pelatihan per Lembaga & Paket" (ikon `Grid3x3`, default terbuka) |
| Sub-judul (terbuka) | Teks | "% petani aktif Lembaga yang sudah mengikuti paket tersebut. Klik judul kolom untuk mengurutkan — menaik menampilkan yang paling tertinggal lebih dulu." |
| Sub-judul (terlipat) | Ringkasan | "{n} Lembaga · {p}% petani terlatih · {n} Lembaga belum tersentuh" |
| Kolom "Lembaga Petani" | Kolom tabel (sortable) | Nama + baris kecil "{kode} · {distrik}" |
| Kolom "Petani" | Kolom tabel (sortable) | Jumlah petani aktif Lembaga |
| Kolom paket | Kolom tabel (sortable, dinamis) | Header ringkas: "Paket 1", "Paket 2 - MK", "Paket 2 - HSE", "Paket 3 & 4", "Lainnya" — hanya paket yang aktif pada irisan; sel = persen + jumlah petani; tooltip header = label paket lengkap |
| Kolom "Min. 1 Paket" | Kolom tabel (sortable) | Petani yang mengikuti paket apa pun (target 100%); sel diberi ring pembeda |
| Heatmap sel | Skala warna | 0% (rose), <25%, 25–49%, 50–74%, 75–99%, 100% (gradasi emerald, 100%/tuntas paling tua — #194); Lembaga tanpa petani aktif = sel abu "—" |
| Tooltip sel | `title` | "{label} — {n} dari {n} petani · kurang {n} menuju target {t}%. Klik untuk melihat daftarnya." / "target {t}% tercapai (...)" / "Lembaga belum punya petani aktif" |
| Sel dapat diklik | Tombol | Aktif hanya bila Lembaga punya petani aktif dan masih ada kekurangan menuju target → membuka dialog drill-down |
| Legenda skala | Legend | "Skala:" 0% · <25% · 25–49% · 50–74% · 75–99% · 100% (catatan "Target program … kurang N petani" di kanan legenda dihapus — ambigu, #194) |
| Empty state | Teks | "Tidak ada Lembaga Petani pada filter ini." |

Target cakupan per paket: `TRAINING_COVERAGE_TARGET` — Paket 1, Paket 2 - MK, Paket 2 - HSE, Paket 3 & 4 = 100%; `OTHER` (Lainnya) tanpa target (`null`).

## Dialog drill-down (`TrainingUntrainedModal`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul dialog | Dialog title | Nama Lembaga + sub "Petani belum mengikuti {paket} — {tahun / semua tahun}" |
| Data | Server action | `getUntrainedFarmers(groupId, packageCode \| "ANY", year)` |
| Loading | Spinner | "Memuat daftar petani..." |
| Tabel | Tabel scrollable | Kolom "ID Petani" (mono), "Nama", "L/P" (`F` → P, selain itu L) |
| Ringkasan | Teks | "{n} petani" |
| Tombol "Salin" | Tombol | Salin baris `ID\tNama\tL/P` ke clipboard; toast "{n} baris disalin" / "Gagal menyalin — izin clipboard ditolak browser" |
| Tombol "Excel" | Tombol | `exportToExcel` → `petani-{slug}-{nama-lembaga}.xlsx`, sheet "Belum Dilatih", kolom ID Petani / Nama Petani / L/P; toast "Excel diunduh" / "Gagal membuat file Excel" |
| Empty state | Teks | "Semua petani aktif di Lembaga ini sudah mengikuti pelatihan tersebut." |

## Chart tren (`TrainingTrendChart`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Tren Kehadiran Pelatihan — {label tahun}" |
| Deskripsi | Teks | "Tinggi batang = jumlah kehadiran (peserta per sesi), dipecah per paket." |
| Seri | Stacked bar | Kehadiran per bucket (per tahun bila "Semua Tahun", per bulan bila satu tahun dipilih), disegmen per paket |
| Warna paket | Legend | Paket 1 `#16a34a`, Paket 2 - MK `#0ea5e9`, Paket 2 - HSE `#f97316`, Paket 3 & 4 `#8b5cf6`, Lainnya `#94a3b8` |
| Tooltip hover | Tooltip | Label bucket, "{n} sesi · {n} kehadiran", rincian per paket |
| Empty state | Teks | "Belum ada data pelatihan pada filter ini." |

## Panel efektivitas (`TrainingEffectivenessPanel`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Efektivitas Pre / Post-Test" |
| Deskripsi | Teks | "Hanya peserta dengan skor pre dan post terisi yang dihitung." |
| Baris per paket | Bar horizontal | Label paket lengkap ("Paket 1 — BMP/PC/RSPO/NKT", "Paket 2 — MK", "Paket 2 — HSE (K3)", "Paket 3 & 4 — GEDSI/BusDev", "Lainnya") + selisih "+/−{n}" (hijau bila naik, merah bila turun) |
| Bar "Pre" / "Post" | Bar | Rata-rata skor; skala relatif skor tertinggi yang muncul |
| Catatan per paket | Teks | "{n} dari {n} kehadiran ber-skor · {n} turun · {n} tetap" |
| Empty state | Teks | "Belum ada peserta dengan skor pre & post terisi." |

## Panel kualitas data (`TrainingQualityPanel`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Kualitas Data" |
| Deskripsi | Teks | "Kelengkapan pengisian pada irisan yang sedang tampil." |
| "Sesi tanpa bukti" | Kartu ringkas | Nilai + "{persen} dari {total sesi}"; disorot amber bila > 0 |
| "Sesi tanpa lokasi" | Kartu ringkas | idem |
| "Sesi tanpa peserta" | Kartu ringkas | idem |
| "Peserta tanpa skor lengkap" | Kartu ringkas | Nilai + "{persen} dari {total kehadiran}" |
| Link tindak lanjut | Link | "Buka Master Data Pelatihan untuk melengkapi →" → `/admin/master-data/training` |
