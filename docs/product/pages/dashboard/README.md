# Menu: Dashboard

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

## Diagram objek

```text
Menu: Dashboard (/admin/dashboard)
├── Redirect
│   ├── Page: /admin → /admin/dashboard
│   └── Page: /admin/dashboard → /admin/dashboard/main
├── Sub Menu: Main Dashboard (dashboard-main)
│   └── Page: /admin/dashboard/main
├── Sub Menu: BMP Dashboard (Produksi) (dashboard-bmp)
│   └── Page: /admin/dashboard/bmp
├── Sub Menu: Monev BMP (dashboard-bmp-monev) — #344
│   └── Page: /admin/dashboard/bmp-monev
├── Sub Menu: Dashboard Pelatihan (dashboard-training)
│   └── Page: /admin/dashboard/training
├── Sub Menu: Risk Management (dashboard-risk) — grup level-3 pertama
│   └── Sub Menu: Fire Alert (dashboard-risk-fire)
│       └── Page: /admin/dashboard/risk/fire
└── Sub Menu: Dashboard Rantai Pasok (dashboard-supply-chain) — prototipe #379
    └── Page: /admin/dashboard/supply-chain
```

> **Metrik Rilis tidak lagi di sini.** Menu `dashboard-metrics` route-nya memang `/admin/dashboard/metrics`, tetapi di sidebar ia ada di grup **Platform Developer** (sejak 2026-10-07; sebelumnya di bawah Data Analyst) — dokumennya di [../data-analyst/metrics.md](../data-analyst/metrics.md), katalog grup di [../platform-developer/README.md](../platform-developer/README.md).

## Atribut menu

| Atribut | Nilai |
|---|---|
| Menu key | `dashboard` |
| URL | `/admin/dashboard` |
| Icon | `LayoutDashboard` |
| Order | `0` |
| Sub menu | 6 — Main Dashboard (`dashboard-main`), Dashboard Pelatihan (`dashboard-training`, order 2), BMP Dashboard (Produksi) (`dashboard-bmp`, order 3), Monev BMP (`dashboard-bmp-monev`, order 4 — #344), Risk Management (`dashboard-risk`, order 5, grup level-3 berisi `dashboard-risk-fire`), Dashboard Rantai Pasok (`dashboard-supply-chain`, order 6 — prototipe #379) |
| Role dengan VIEW (seed) | SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT (untuk `dashboard` dan sub menunya); DONOR hanya sub menu, tanpa baris induk `dashboard` — induk tetap tampil sebagai wadah. Grup `dashboard-risk` hanya punya baris seed untuk DONOR (VIEW, PRINT); role lain hanya punya baris `dashboard-risk-fire` (VIEW, PRINT) (`prisma/seeds/data/role-permissions.csv`) |

Menu `dashboard` sendiri hanya wadah; URL-nya me-redirect ke sub menu pertama.

## Daftar sub menu

| # | Sub menu | Key | Route | Halaman | Dokumen |
|---|---|---|---|---|---|
| 1 | Main Dashboard | `dashboard-main` | `/admin/dashboard/main` | 1 | [main.md](main.md) |
| 2 | Dashboard Pelatihan | `dashboard-training` | `/admin/dashboard/training` | 1 | [training.md](training.md) |
| 3 | BMP Dashboard (Produksi) | `dashboard-bmp` | `/admin/dashboard/bmp` | 1 | [bmp.md](bmp.md) |
| 4 | Monev BMP | `dashboard-bmp-monev` | `/admin/dashboard/bmp-monev` | 1 | [bmp-monev.md](bmp-monev.md) |
| 5 | Risk Management → Fire Alert | `dashboard-risk` → `dashboard-risk-fire` | `/admin/dashboard/risk/fire` | 1 | [risk/fire.md](risk/fire.md) |
| 6 | Dashboard Rantai Pasok (prototipe) | `dashboard-supply-chain` | `/admin/dashboard/supply-chain` | 1 | [supply-chain.md](supply-chain.md) |

## Redirect

### Page: `/admin`

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/page.tsx` |
| Tipe | Server Component |
| Guard | — (hanya middleware NextAuth) |
| Server action / data | — |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| Redirect | Navigasi | `redirect("/admin/dashboard")` |

### Page: `/admin/dashboard`

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/dashboard/page.tsx` |
| Tipe | Server Component |
| Guard | — (hanya middleware NextAuth) |
| Server action / data | — |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| Redirect | Navigasi | `redirect("/admin/dashboard/main")` |

Loading skeleton segmen: `src/app/(admin)/admin/dashboard/loading.tsx` (judul, blok filter, 8 kartu, peta + panel).

## Catatan

- Kelima sub menu hanya membaca data (aksi `VIEW`); tidak ada tombol mutasi (create/edit/delete) di halaman dashboard.
- Sumber data per sub menu:
  - **Main Dashboard** dan **BMP Dashboard (Produksi)** membaca **snapshot** yang dibuat lewat menu Tools (`/admin/tools/snapshot`, `/admin/tools/snapshot-bmp`).
  - **Dashboard Pelatihan** (`getTrainingDashboardView`) dan **Monev BMP** (`getBmpMonevDashboardView`) membaca DB secara langsung (realtime, tanpa snapshot). Daftar petani prioritas Monev BMP dimuat terpisah *on-demand* lewat `getBmpMonevPriorityFarmers`.
  - **Fire Alert**: boundary Lembaga dari DB (`getFireBoundaries`, `getAdminBoundaries`, `getRiauOutline` di `src/server/actions/fire-boundary.ts`); titik api dari NASA FIRMS lewat proxy same-origin `/api/map-hotspot` (diambil di browser).
- Filter Main Dashboard, BMP Dashboard, Dashboard Pelatihan, dan Monev BMP diiris **client-side** dari satu payload server (kecuali daftar petani prioritas Monev BMP dan modal petani belum terlatih Dashboard Pelatihan — `getUntrainedFarmers` — yang di-query saat dibuka).
- **Dashboard Ketersediaan Data** semula dirilis sebagai sub menu keempat di sini (#193) lalu dipindah ke menu **Data Analyst** pada hari yang sama — lihat [../data-analyst/data-availability.md](../data-analyst/data-availability.md).
