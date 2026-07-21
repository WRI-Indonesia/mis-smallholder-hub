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
│   ├── Tahun (select, default "Rataan")
│   └── Kelengkapan data (select)
├── Kartu KPI (4)
│   ├── Total Produksi
│   ├── Produktivitas
│   ├── Lahan dengan Data Produksi
│   └── Petani Melapor
├── Chart tren
│   ├── Judul "Tren Produksi & Cakupan Pelaporan Bulanan"
│   ├── Seri batang (Produksi Ton)
│   ├── Seri garis (Cakupan pelaporan %)
│   ├── Tooltip hover
│   ├── Legenda
│   └── Empty state
├── Panel ketersediaan data
│   ├── Baik (> 2 tahun)
│   ├── Cukup (min. 1 tahun)
│   ├── Kurang (< 1 tahun)
│   ├── Tidak ada data
│   ├── Catatan kategori
│   └── Link "Lihat sebaran di Peta BMP"
└── Empty state halaman
    ├── "Belum ada snapshot"
    └── Tombol "Ke Dashboard Snapshot BMP"
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/dashboard/bmp/page.tsx` |
| Tipe | Server Component → `BmpDashboardClient` (Client Component) |
| Komponen anak | `bmp-dashboard-client.tsx`, `bmp-score-cards.tsx`, `bmp-trend-chart.tsx`, `bmp-availability-panel.tsx`, `loading.tsx` |
| Guard | `requirePermission("dashboard-bmp")` |
| Server action / data | `getLatestBmpSnapshot()` dari `src/server/actions/dashboard-bmp.ts` — satu snapshot org-wide, diiris di client |
| Helper agregasi | `filterBmpGroups`, `sumBmpGroups`, `bmpChartSeries` dari `src/lib/bmp-dashboard-aggregation.ts` |
| Icon menu | `Sprout` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul halaman | Heading `h1` | "BMP Dashboard (Produksi)" |
| Catatan generate | Teks | "Nilai di bawah di-generate pada {tanggal snapshot}" / "Belum ada snapshot" |
| Filter Kategori Lembaga | Select | "Semua Kategori", "Ex-Plasma" (`EX_PLASMA`), "Swadaya" (`SWADAYA`) |
| Filter Distrik | Combobox (Popover + Command) | "Cari distrik..."; opsi "Semua Distrik"; empty: "Distrik tidak ditemukan." |
| Filter Lembaga Petani | Combobox (Popover + Command) | "Cari lembaga petani..."; opsi "Semua Lembaga Petani"; empty: "Lembaga petani tidak ditemukan." |
| Filter Tahun | Select | Default "Rataan" (rata-rata per tahun) + daftar tahun dari snapshot (desc) |
| Filter Kelengkapan data | Select | "Semua Data" (`all`) / "Data Full 1 Tahun" (`full` — hanya lahan dengan 12 bulan penuh) |
| Kartu KPI (4 kartu) | Kartu KPI | Lihat rincian di bawah |
| Chart tren | Chart kombinasi (bar + line, SVG kustom) | Lihat rincian di bawah |
| Panel ketersediaan data | Panel kategori + progress bar | Lihat rincian di bawah |
| Empty state halaman | Empty state | Ikon `Camera` + "Belum ada snapshot" + "Dashboard BMP menampilkan data dari snapshot terakhir (Semua Data). Buat snapshot terlebih dahulu melalui menu Tools." |
| Tombol "Ke Dashboard Snapshot BMP" | Tombol/Link | Hanya pada empty state; menuju `/admin/tools/snapshot-bmp` (menu `dashboard-snapshot-bmp`) |

## Kartu KPI (`BmpScoreCards`)

| # | Judul kartu | Nilai | Sub |
|---|---|---|---|
| 1 | Total Produksi | "{n} Ton" | "{label tahun} — dari {n} lahan ber-data" |
| 2 | Produktivitas | "{n} Ton/Ha" | "per tahun — produksi ÷ luas lahan melapor" |
| 3 | Lahan dengan Data Produksi | "{ber-data} / {total lahan}" | "{persen} dari total lahan aktif ({label tahun})" |
| 4 | Petani Melapor | "{melapor} / {total petani}" | "{persen} petani punya data produksi ({label tahun})" |

Label tahun mengikuti filter: "rata-rata per tahun" / "tahun {YYYY}", ditambah " · lahan full 1 tahun" bila mode `full`.

## Chart tren (`BmpTrendChart`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Tren Produksi & Cakupan Pelaporan Bulanan — {tahun}" atau "— Rataan" |
| Seri batang | Bar chart (12 bulan Jan–Des) | Produksi (Ton), warna hijau `#22c55e`, sumbu kiri skala adaptif |
| Seri garis | Line chart | Cakupan pelaporan (% lahan melapor), warna biru `#0ea5e9`, sumbu kanan 0–100% |
| Tooltip hover | Tooltip | Bulan (+tahun / "(rata-rata)"), "Produksi: {n} Ton", "Lahan melapor: {n} ({p}%)" |
| Legenda | Legend | "Produksi (Ton)", "Cakupan pelaporan (% lahan melapor)" |
| Empty state | Teks | "Belum ada data produksi." |

## Panel ketersediaan (`BmpAvailabilityPanel`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Ketersediaan Data Produksi" |
| Kategori "Baik (> 2 tahun)" | Baris + progress bar | Warna `#22c55e`, nilai = jumlah lahan + persen dari total lahan |
| Kategori "Cukup (min. 1 tahun)" | Baris + progress bar | Warna `#eab308` |
| Kategori "Kurang (< 1 tahun)" | Baris + progress bar | Warna `#f97316` |
| Kategori "Tidak ada data" | Baris + progress bar | Warna `#9ca3af` |
| Catatan | Teks | "Kategori per lahan dari run bulan berturut-turut data produksi; produksi tanpa lahan tidak memengaruhi kategori." |
| Link "Lihat sebaran di Peta BMP" | Link | Menuju `/admin/map/bmp` (menu `map-bmp`) |
