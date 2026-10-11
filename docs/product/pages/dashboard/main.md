# Main Dashboard

[← Menu Dashboard](README.md) · [← Katalog halaman](../README.md)

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
├── Kartu tematik (5 — #420; dulu 14 kartu; baris ↗ bisa diklik → dialog rincian)
│   ├── Kelembagaan: Lembaga Petani ↗ · Kelompok Tani ↗
│   ├── Sertifikasi & assurance: RSPO ↗ · ISPO ↗ · Assurance SAP/MAP ↗ (lembaga · plan)
│   ├── Petani: total + bar komposisi Laki-laki / Perempuan (jumlah · %)
│   ├── Lahan: Persil lahan · Total luas
│   └── Pelatihan (lebar 2 kolom): 4 paket — bar % dari total petani + jumlah
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
│   ├── Basemap switcher (STREET/LIGHT/DARK/SAT/HYBRID — `MAP_STYLE_KEYS`, default `streetmap`)
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
| Kartu tematik (5) | Kartu KPI | Lihat rincian di bawah (#420); baris Lembaga/KT/sertifikasi berupa `<button>` (Enter/Space, panah ↗ saat hover) → dialog rincian angka (#206) |
| Peta sebaran | Peta (MapLibre / react-map-gl) | Marker titik Lembaga Petani dengan clustering; lihat rincian di bawah |
| Panel info Lembaga | Kartu detail | Muncul saat satu Lembaga dipilih; judul = nama Lembaga, sub = kode (mono), badge sertifikasi |
| Empty state panel info | Empty state | Ikon `MapPin` + "Pilih Lembaga Petani" + "Klik marker di peta untuk melihat detail informasi Lembaga Petani dan statistik petani." |
| Empty state halaman | Empty state | Ikon `Camera` + "Belum ada snapshot" + "Dashboard menampilkan data dari snapshot terakhir (Semua Distrik / Semua Tahun). Buat snapshot terlebih dahulu melalui menu Tools." |
| Tombol "Ke Dashboard Snapshot" | Tombol/Link | Hanya pada empty state; menuju `/admin/tools/snapshot` (menu `dashboard-snapshot`) |

## Kartu KPI (`DashboardSummaryCards`)

| Kartu | Baris / isi | Nilai | Dialog rincian (#206) |
|---|---|---|---|
| Kelembagaan | Lembaga Petani | jumlah Lembaga | Daftar lembaga (nama, kode, distrik) |
| Kelembagaan | Kelompok Tani | jumlah KT per-lahan | Jumlah KT per lembaga + baris Total |
| Sertifikasi & assurance | RSPO · ISPO · Assurance SAP/MAP | "{n} lembaga · {n} plan" | Seksi Tersertifikasi (Ter-assurance) / Plan + badge tahun |
| Petani | total + bar L/P | jumlah petani; L & P jumlah + % (dari L+P) | — |
| Lahan | Persil lahan · Total luas | jumlah persil · "{n} ha" | — |
| Pelatihan | Paket 1 BMP/NKT/RSPO · Paket 2 MK · Paket 2 HSE · Paket 3 & 4 GEDSI/BUSDEV | "{n} petani · {p}%" (p = n ÷ total petani) | — |

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

Di halaman [Detail Snapshot](../tools/snapshot/detail.md) komponen kartu yang sama dirender **tanpa** prop `kts` → kartu statis, tidak bisa diklik.

## Objek peta (`DashboardMap`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Layer cluster | Circle + symbol | Warna biru, radius bertingkat; label jumlah titik; klik cluster → fit bounds ke seluruh anggota |
| Layer titik | Circle | Hijau; oranye bila Lembaga terpilih; klik → memilih Lembaga |
| Label titik | Symbol | Nama Lembaga di bawah titik; warna label mengikuti basemap |
| Tombol "Cari Lembaga Petani" | Tombol + Popover Command | Cari & fly-to Lembaga; empty: "Kelompok tani tidak ditemukan." |
| Tombol "Lihat Semua" | Tombol | Fit bounds ke semua Lembaga bertitik |
| Basemap switcher | Grup tombol | **Lima pilihan sejak #307**: `streetmap` / `light` / `dark` / `satellite` / `hybrid` — satu set & satu urutan untuk seluruh halaman peta (`MAP_STYLES`, `src/lib/map-style.ts`). StreetMap = OpenStreetMap standar; Light/Dark = **vector OpenFreeMap** (positron / dark, tanpa API key); Satellite & Hybrid = tile Google (`lyrs=s` / `lyrs=y`); label tombol `STREET` / `LIGHT` / `DARK` / `SAT` / `HYBRID` (`MAP_STYLE_LABELS`). **Default halaman ini `streetmap` untuk kedua tema** (sengaja tidak ikut tema seperti halaman peta lain: peta ikhtisar butuh nama kota/jalan) |
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
