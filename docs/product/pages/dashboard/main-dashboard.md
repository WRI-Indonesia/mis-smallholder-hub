# Main Dashboard

[← Menu Dashboard](./README.md) · [← Katalog halaman](../README.md)

Sub menu `dashboard-main`, satu halaman: `/admin/dashboard/main`.

## Diagram objek

```text
Halaman: Main Dashboard (/admin/dashboard/main)
├── Header
│   ├── Judul "Main Dashboard"
│   └── Catatan generate snapshot
├── Filter
│   ├── Distrik (combobox)
│   ├── Lembaga Petani (combobox)
│   └── Tahun Bergabung (select)
├── Kartu KPI (14)
│   ├── Total Lembaga Petani
│   ├── Total Kelompok Tani
│   ├── Sertifikasi RSPO
│   ├── Sertifikasi ISPO
│   ├── Assurance SAP/MAP
│   ├── Total Petani
│   ├── Petani Laki-laki
│   ├── Petani Perempuan
│   ├── Total Persil Lahan
│   ├── Total Luas Lahan
│   ├── Paket 1 - BMP/NKT/RSPO
│   ├── Paket 2 - MK
│   ├── Paket 2 - HSE
│   └── Paket 3 & 4 - GEDSI/BUSDEV
├── Peta sebaran (MapLibre)
│   ├── Layer cluster
│   ├── Layer titik
│   ├── Label titik
│   ├── Tombol "Cari Lembaga Petani"
│   ├── Tombol "Lihat Semua"
│   ├── Basemap switcher (light/dark/hybrid)
│   └── Empty state peta
├── Panel info Lembaga
│   ├── Badge sertifikasi (RSPO / ISPO / SAP-MAP)
│   ├── Total Petani
│   ├── Laki-laki / Perempuan
│   ├── Total Persil
│   ├── Luas Lahan
│   ├── Cakupan pelatihan
│   └── Empty state "Pilih Lembaga Petani"
└── Empty state halaman
    ├── "Belum ada snapshot"
    └── Tombol "Ke Dashboard Snapshot"
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/dashboard/main/page.tsx` |
| Tipe | Server Component → `DashboardClient` (Client Component) |
| Komponen anak | `src/app/(admin)/admin/dashboard/dashboard-client.tsx`, `summary-cards.tsx`, `dashboard-map.tsx` (dynamic import, `ssr: false`) |
| Guard | `requirePermission("dashboard-main")` |
| Server action / data | `getLatestDashboardSnapshot()` dari `src/server/actions/dashboard.ts` — snapshot master "Semua Distrik / Semua Tahun"; seluruh filter diiris di client |
| Helper agregasi | `ktStatsForYear`, `sumKelompokTaniStats` dari `src/lib/dashboard-aggregation.ts` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul halaman | Heading `h1` | "Main Dashboard" |
| Catatan generate | Teks | "Nilai di bawah di-generate pada {tanggal snapshot}" — atau "Belum ada snapshot" bila snapshot kosong |
| Filter Distrik | Combobox (Popover + Command) | Placeholder cari "Cari distrik...", opsi "Semua Distrik" + daftar distrik dari snapshot; empty: "Distrik tidak ditemukan." |
| Filter Lembaga Petani | Combobox (Popover + Command) | "Cari lembaga petani...", opsi "Semua Lembaga Petani" + daftar Lembaga hasil irisan; empty: "Kelompok tani tidak ditemukan." |
| Filter Tahun Bergabung | Select | "Semua Tahun" + daftar tahun dari `byYear` snapshot (desc) |
| Kartu KPI (14 kartu) | Kartu KPI | Lihat rincian di bawah |
| Peta sebaran | Peta (MapLibre / react-map-gl) | Marker titik Lembaga Petani dengan clustering; lihat rincian di bawah |
| Panel info Lembaga | Kartu detail | Muncul saat satu Lembaga dipilih; judul = nama Lembaga, sub = kode (mono), badge sertifikasi |
| Empty state panel info | Empty state | Ikon `MapPin` + "Pilih Lembaga Petani" + "Klik marker di peta untuk melihat detail informasi Lembaga Petani dan statistik petani." |
| Empty state halaman | Empty state | Ikon `Camera` + "Belum ada snapshot" + "Dashboard menampilkan data dari snapshot terakhir (Semua Distrik / Semua Tahun). Buat snapshot terlebih dahulu melalui menu Tools." |
| Tombol "Ke Dashboard Snapshot" | Tombol/Link | Hanya pada empty state; menuju `/admin/tools/snapshot` (menu `dashboard-snapshot`) |

## Kartu KPI (`DashboardSummaryCards`)

| # | Judul kartu | Nilai | Sub |
|---|---|---|---|
| 1 | Total Lembaga Petani | jumlah Lembaga | — |
| 2 | Total Kelompok Tani | jumlah KT per-lahan | — |
| 3 | Sertifikasi RSPO | "{n} lembaga" | "Tersertifikasi · {n} plan" |
| 4 | Sertifikasi ISPO | "{n} lembaga" | "Tersertifikasi · {n} plan" |
| 5 | Assurance SAP/MAP | "{n} lembaga" | "Tersertifikasi · {n} plan" |
| 6 | Total Petani | jumlah petani | — |
| 7 | Petani Laki-laki | jumlah | — |
| 8 | Petani Perempuan | jumlah | — |
| 9 | Total Persil Lahan | jumlah persil | — |
| 10 | Total Luas Lahan | "{n} ha" | — |
| 11 | Paket 1 - BMP/NKT/RSPO | "{n} petani" | — |
| 12 | Paket 2 - MK | "{n} petani" | — |
| 13 | Paket 2 - HSE | "{n} petani" | — |
| 14 | Paket 3 & 4 - GEDSI/BUSDEV | "{n} petani" | — |

Kartu sertifikasi bersifat year-independent (tidak ikut filter Tahun).

## Objek peta (`DashboardMap`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Layer cluster | Circle + symbol | Warna biru, radius bertingkat; label jumlah titik; klik cluster → fit bounds ke seluruh anggota |
| Layer titik | Circle | Hijau; oranye bila Lembaga terpilih; klik → memilih Lembaga |
| Label titik | Symbol | Nama Lembaga di bawah titik; warna label mengikuti basemap |
| Tombol "Cari Lembaga Petani" | Tombol + Popover Command | Cari & fly-to Lembaga; empty: "Kelompok tani tidak ditemukan." |
| Tombol "Lihat Semua" | Tombol | Fit bounds ke semua Lembaga bertitik |
| Basemap switcher | Grup tombol | `light` / `dark` / `hybrid` (CARTO light, CARTO dark, Google hybrid); default mengikuti tema aplikasi |
| Empty state peta | Empty state | "Tidak ada data lokasi yang tersedia untuk ditampilkan di peta" |

## Objek panel info Lembaga

| Objek | Tipe | Keterangan |
|---|---|---|
| Badge sertifikasi | Badge | RSPO / ISPO / SAP/MAP — hanya tampil bila status terisi; `CERTIFIED` = filled, `PLANNED` = outline |
| Total Petani | Baris statistik | Ikon `Users` |
| Laki-laki / Perempuan | Baris statistik | Format "{L} / {P}" |
| Total Persil | Baris statistik | Ikon `Map` |
| Luas Lahan | Baris statistik | Format "{n} ha" |
| Cakupan pelatihan | Daftar rasio | "Paket 1 - BMP", "Paket 2 - MK", "Paket 2 - HSE", "Paket 3 & 4" — masing-masing "{peserta}/{total petani}" |
