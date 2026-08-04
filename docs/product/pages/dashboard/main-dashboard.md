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
├── Kartu KPI (14 — 5 pertama bisa diklik → dialog rincian)
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
├── Dialog rincian kartu (#206)
│   ├── Header: ikon + judul kartu + deskripsi
│   ├── Chip ringkasan (angka sama dengan kartu)
│   ├── Kotak pencarian (bila daftar > 8)
│   ├── Daftar lembaga (link ke detail Master Data, tab baru)
│   └── Footer: timestamp generate snapshot
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
| `Panduan` | Tautan | `HelpHint` — ikon `?` di header menuju tutorial Bantuan untuk `dashboard-main` (`findTutorialForMenu`), dibuka di tab baru |
| Judul halaman | Heading `h1` | "Main Dashboard" |
| Catatan generate | Teks | "Nilai di bawah di-generate pada {tanggal snapshot}" — atau "Belum ada snapshot" bila snapshot kosong |
| Filter Distrik | Combobox (Popover + Command) | Placeholder cari "Cari distrik...", opsi "Semua Distrik" + daftar distrik dari snapshot; empty: "Distrik tidak ditemukan." |
| Filter Lembaga Petani | Combobox (Popover + Command) | "Cari lembaga petani...", opsi "Semua Lembaga Petani" + daftar Lembaga hasil irisan; empty: "Kelompok tani tidak ditemukan." |
| Filter Tahun Bergabung | Select | "Semua Tahun" + daftar tahun dari `byYear` snapshot (desc) |
| Kartu KPI (14 kartu) | Kartu KPI | Lihat rincian di bawah; 5 kartu pertama bisa diklik (juga Enter/Space, `role="button"`) → dialog rincian angka (#206) |
| Peta sebaran | Peta (MapLibre / react-map-gl) | Marker titik Lembaga Petani dengan clustering; lihat rincian di bawah |
| Panel info Lembaga | Kartu detail | Muncul saat satu Lembaga dipilih; judul = nama Lembaga, sub = kode (mono), badge sertifikasi |
| Empty state panel info | Empty state | Ikon `MapPin` + "Pilih Lembaga Petani" + "Klik marker di peta untuk melihat detail informasi Lembaga Petani dan statistik petani." |
| Empty state halaman | Empty state | Ikon `Camera` + "Belum ada snapshot" + "Dashboard menampilkan data dari snapshot terakhir (Semua Distrik / Semua Tahun). Buat snapshot terlebih dahulu melalui menu Tools." |
| Tombol "Ke Dashboard Snapshot" | Tombol/Link | Hanya pada empty state; menuju `/admin/tools/snapshot` (menu `dashboard-snapshot`) |

## Kartu KPI (`DashboardSummaryCards`)

| # | Judul kartu | Nilai | Sub | Dialog rincian (#206) |
|---|---|---|---|---|
| 1 | Total Lembaga Petani | jumlah Lembaga | — | Daftar lembaga (nama, kode, distrik) |
| 2 | Total Kelompok Tani | jumlah KT per-lahan | — | Jumlah KT per lembaga + baris Total |
| 3 | Sertifikasi RSPO | "{n} lembaga" | "Tersertifikasi · {n} plan" | Seksi Tersertifikasi / Plan + badge tahun |
| 4 | Sertifikasi ISPO | "{n} lembaga" | "Tersertifikasi · {n} plan" | Seksi Tersertifikasi / Plan + badge tahun |
| 5 | Assurance SAP/MAP | "{n} lembaga" | "Tersertifikasi · {n} plan" | Seksi Ter-assurance / Plan + badge tahun |
| 6 | Total Petani | jumlah petani | — | — |
| 7 | Petani Laki-laki | jumlah | — | — |
| 8 | Petani Perempuan | jumlah | — | — |
| 9 | Total Persil Lahan | jumlah persil | — | — |
| 10 | Total Luas Lahan | "{n} ha" | — | — |
| 11 | Paket 1 - BMP/NKT/RSPO | "{n} petani" | — | — |
| 12 | Paket 2 - MK | "{n} petani" | — | — |
| 13 | Paket 2 - HSE | "{n} petani" | — | — |
| 14 | Paket 3 & 4 - GEDSI/BUSDEV | "{n} petani" | — | — |

Kartu sertifikasi bersifat year-independent (tidak ikut filter Tahun).

### Dialog rincian kartu (#206)

Dialog dihitung dari daftar KT yang sama dengan angka kartu (prop `kts` = irisan filter aktif — `[selectedKt]` bila satu Lembaga dipilih, selainnya `activeKts`), sehingga jumlah baris selalu identik dengan angka di kartu.

| Objek | Tipe | Keterangan |
|---|---|---|
| Header dialog | Ikon + judul + deskripsi | Judul = judul kartu; deskripsi menjelaskan definisi angka |
| Chip ringkasan | Badge | Angka yang sama dengan kartu sebagai jangkar visual (lembaga / total KT / tersertifikasi + plan) |
| Kotak pencarian | Input | Hanya tampil bila daftar > 8; cari nama lembaga, kode, atau distrik; empty state `Tidak ada yang cocok dengan "{query}"` |
| Baris lembaga | Link | Nama + kode (mono) + distrik → `/admin/master-data/groups/{id}` di tab baru |
| Seksi sertifikasi | 2 seksi | "Tersertifikasi"/"Ter-assurance" (dot emerald) dan "Plan" (dot amber), masing-masing ber-jumlah; badge status via `formatCertStatus` |
| Footer | Teks | "Nilai di-generate pada {timestamp snapshot}" |
| Empty state | Teks + ikon | "Tidak ada data pada filter ini." bila daftar kosong |

Di halaman [Detail Snapshot](../tools/dashboard-snapshot/detail.md) komponen kartu yang sama dirender **tanpa** prop `kts` → kartu statis, tidak bisa diklik.

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
