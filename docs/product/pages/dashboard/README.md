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
└── Sub Menu: Dashboard Pelatihan (dashboard-training)
    └── Page: /admin/dashboard/training
```

## Atribut menu

| Atribut | Nilai |
|---|---|
| Menu key | `dashboard` |
| URL | `/admin/dashboard` |
| Icon | `LayoutDashboard` |
| Order | `0` |
| Sub menu | 3 — Main Dashboard (`dashboard-main`), BMP Dashboard (Produksi) (`dashboard-bmp`), Dashboard Pelatihan (`dashboard-training`) |
| Role dengan VIEW (seed) | SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT (untuk `dashboard` dan ketiga sub menu) |

Menu `dashboard` sendiri hanya wadah; URL-nya me-redirect ke sub menu pertama.

## Daftar sub menu

| # | Sub menu | Key | Route | Halaman | Dokumen |
|---|---|---|---|---|---|
| 1 | Main Dashboard | `dashboard-main` | `/admin/dashboard/main` | 1 | [main-dashboard.md](./main-dashboard.md) |
| 2 | BMP Dashboard (Produksi) | `dashboard-bmp` | `/admin/dashboard/bmp` | 1 | [bmp-dashboard-produksi.md](./bmp-dashboard-produksi.md) |
| 3 | Dashboard Pelatihan | `dashboard-training` | `/admin/dashboard/training` | 1 | [dashboard-pelatihan.md](./dashboard-pelatihan.md) |

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

- Ketiga sub menu hanya membaca data (aksi `VIEW`); tidak ada tombol mutasi (create/edit/delete) di halaman dashboard.
- Main Dashboard dan BMP Dashboard membaca **snapshot** yang dibuat lewat menu Tools (`/admin/tools/snapshot`, `/admin/tools/snapshot-bmp`); Dashboard Pelatihan membaca DB secara langsung.
- Semua filter pada ketiga halaman diiris **client-side** dari satu payload server.
