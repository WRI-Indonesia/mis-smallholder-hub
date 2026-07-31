# BMP Dashboard (Produksi)

[← Menu Dashboard](./README.md) · [← Katalog halaman](../README.md)

Sub menu `dashboard-bmp`, satu halaman: `/admin/dashboard/bmp`.

## Diagram objek

```text
Halaman: BMP Dashboard (Produksi) (/admin/dashboard/bmp)
├── Header
│   ├── Judul "BMP Dashboard (Produksi)"
│   └── Catatan generate snapshot
├── Filter
│   ├── Kategori Lembaga (select)
│   ├── Distrik (combobox)
│   ├── Lembaga Petani (combobox)
│   ├── Tahun (select, default tahun berjalan; "Rataan" di paling bawah)
│   └── Kelengkapan data (select)
├── Kartu KPI (5)
│   ├── Total Produksi
│   ├── Produktivitas
│   ├── Luasan
│   ├── Lahan dengan Data Produksi
│   └── Petani Terdata
├── 2 grafik 50/50
│   ├── Chart tren "Tren Produksi & Cakupan Data Bulanan"
│   │   ├── Seri batang (Produksi Ton) + garis (Cakupan data %)
│   │   ├── Tooltip hover · Legenda · Empty state
│   └── Chart ranking "Produktivitas per Lembaga — Top 10"
│       ├── Bar horizontal Ton/Ha, warna per kategori + legend
│       └── Empty state
├── Card besar Ex-Plasma vs Swadaya (full row)
│   ├── Legend warna kategori
│   ├── Ringkasan 3 metrik per kategori (Produksi, Produktivitas, Luas Terdata)
│   ├── Analisa "Produksi per Distrik (Ton)" (bar berpasangan)
│   ├── Analisa "Produktivitas per Umur Tanaman (Ton/Ha)" (bar berpasangan)
│   └── Catatan filter & definisi umur
└── Empty state halaman
    ├── "Belum ada snapshot"
    └── Tombol "Ke Dashboard Snapshot BMP"
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/dashboard/bmp/page.tsx` |
| Tipe | Server Component → `BmpDashboardClient` (Client Component) |
| Komponen anak | `bmp-dashboard-client.tsx`, `bmp-score-cards.tsx`, `bmp-trend-chart.tsx`, `bmp-ranking-chart.tsx`, `bmp-category-panel.tsx`, `loading.tsx` |
| Guard | `requirePermission("dashboard-bmp")` |
| Server action / data | `getLatestBmpSnapshot()` dari `src/server/actions/dashboard-bmp.ts` — satu snapshot org-wide, diiris di client |
| Helper agregasi | `filterBmpGroups`, `sumBmpGroups`, `bmpChartSeries`, `bmpYearOptions`, `bmpDefaultYear`, `bmpAgeSeries`, `bmpGroupRanking` dari `src/lib/bmp-dashboard-aggregation.ts` |
| Icon menu | `Sprout` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul halaman | Heading `h1` | "BMP Dashboard (Produksi)" |
| Catatan generate | Teks | "Nilai di bawah di-generate pada {tanggal snapshot}" / "Belum ada snapshot" |
| Filter Kategori Lembaga | Select | "Semua Kategori", "Ex-Plasma" (`EX_PLASMA`), "Swadaya" (`SWADAYA`) |
| Filter Distrik | Combobox (Popover + Command) | "Cari distrik..."; opsi "Semua Distrik"; empty: "Distrik tidak ditemukan." |
| Filter Lembaga Petani | Combobox (Popover + Command) | "Cari lembaga petani..."; opsi "Semua Lembaga Petani"; empty: "Lembaga petani tidak ditemukan." |
| Filter Tahun | Select | Default **tahun berjalan** (fallback tahun terbaru ber-data; #191); daftar tahun (desc) lalu "Rataan" di paling bawah |
| Filter Kelengkapan data | Select | "Semua Data" (`all`) / "Data Full 1 Tahun" (`full` — hanya lahan dengan 12 bulan penuh) |
| Kartu KPI (5 kartu) | Kartu KPI | Lihat rincian di bawah |
| Chart tren | Chart kombinasi (bar + line, SVG kustom) | Lihat rincian di bawah |
| Chart ranking | Bar horizontal Top-10 | Lihat rincian di bawah |
| Card Ex-Plasma vs Swadaya | Card full-row | Lihat rincian di bawah |
| Empty state halaman | Empty state | Ikon `Camera` + "Belum ada snapshot" + "Dashboard BMP menampilkan data dari snapshot terakhir (Semua Data). Buat snapshot terlebih dahulu melalui menu Tools." |
| Tombol "Ke Dashboard Snapshot BMP" | Tombol/Link | Hanya pada empty state; menuju `/admin/tools/snapshot-bmp` (menu `dashboard-snapshot-bmp`) |

## Kartu KPI (`BmpScoreCards`)

| # | Judul kartu | Nilai | Sub |
|---|---|---|---|
| 1 | Total Produksi | "{n} Ton" | "{persen} dari total luas — {n} Ha terdata ({label tahun})" — persen hilang bila snapshot lama tanpa `totalLuasHa`. Urutan sub-teks seragam antar card: %, total, tahun; token persen & total beraksen emerald (light) / foreground (dark) |
| 2 | Produktivitas | "{n} Ton/Ha" | "per tahun — produksi ÷ luas lahan terdata" |
| 3 | Luasan | "{terdata} Ha" | "{persen} dari total {total} Ha luas aktif ({label tahun})" — snapshot lama: "luas lahan terdata ({label tahun})" |
| 4 | Lahan dengan Data Produksi | "{ber-data}" | "{persen} dari total {total} lahan aktif ({label tahun})" |
| 5 | Petani Terdata | "{terdata}" | "{persen} dari total {total} petani ({label tahun})" |

Label tahun mengikuti filter: "rata-rata per tahun" / "tahun {YYYY}", ditambah " · lahan full 1 tahun" bila mode `full`.

## Chart tren (`BmpTrendChart`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Tren Produksi & Cakupan Data Bulanan — {tahun}" atau "— Rataan" |
| Seri batang | Bar chart (12 bulan Jan–Des) | Produksi (Ton), warna hijau `#22c55e`, sumbu kiri skala adaptif |
| Seri garis | Line chart | Cakupan data (% lahan terdata), warna biru `#0ea5e9`, sumbu kanan 0–100% |
| Tooltip hover | Tooltip | Bulan (+tahun / "(rata-rata)"), "Produksi: {n} Ton", "Lahan terdata: {n} ({p}%)" |
| Legenda | Legend | "Produksi (Ton)", "Cakupan data (% lahan terdata)" |
| Empty state | Teks | "Belum ada data produksi." |

## Chart ranking (`BmpRankingChart`, #191)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Produktivitas per Lembaga — Top 10 ({label tahun})" + legend warna kategori |
| Bar | Bar horizontal per lembaga | Ton/Ha (`bmpGroupRanking` — hanya lembaga ber-luas terdata, desc, maks 10); warna `#0d9488` Ex-Plasma / `#f59e0b` Swadaya |
| Catatan | Teks | "Ton/Ha = Σ produksi ÷ Σ luas terdata lembaga ybs; warna mengikuti kategori (Ex-Plasma/Swadaya)." |
| Empty state | Teks | "Belum ada lembaga dengan luas terdata." |

## Card Ex-Plasma vs Swadaya (`BmpCategoryPanel`, #191 — menggantikan panel Ketersediaan Data Produksi)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Ex-Plasma vs Swadaya — {label tahun}" + legend warna kategori (`CategoryLegend`) |
| Ringkasan 3 metrik | Grid 3 kolom | Total Produksi (Ton), Produktivitas (Ton/Ha), Luas Terdata (Ha) — dua nilai berwarna per metrik |
| "Produksi per Distrik (Ton)" | Bar horizontal berpasangan | Dua bar (Ex-Plasma/Swadaya) per distrik dalam scope filter |
| "Produktivitas per Umur Tanaman (Ton/Ha)" | Bar horizontal berpasangan | Bucket `bmpAgeSeries` mengikuti fase kurva hasil sawit: "< 4 thn (TBM)", "4–8 thn (TM muda)", "9–15 thn (TM prima)", "16–25 thn (TM tua)", "> 25 thn (renta)", "Tanpa thn tanam" (hanya bila ber-data); umur = tahun produksi − tahun tanam |
| Empty state umur | Teks | "Snapshot ini belum memuat data umur tanaman — generate ulang snapshot BMP melalui menu Tools untuk mengisi analisa ini." |
| Catatan | Teks | "Mengikuti filter aktif kecuali filter Kategori. Umur tanaman dihitung pada tahun produksinya…" |

Panel Ketersediaan Data Produksi (Baik/Cukup/Kurang/Tidak Ada) **dihapus** dari dashboard (#191, keputusan owner) — kategori yang sama tetap tersedia di Peta BMP.
