# Katalog Menu, Halaman & Objek

[← Indeks dokumentasi](../../README.md) · Terkait: [product/architecture.md](../architecture.md) · [standards/rbac.md](../../standards/rbac.md) · [product/crud-flows.md](../crud-flows.md)

Katalog **Menu → Sub Menu → Page → Page Detail** untuk aplikasi admin Smallholder HUB MIS. Struktur folder mengikuti **nama/title** yang tampil di menu (kebab-case), satu file MD per halaman (atomic). Setiap file diawali **diagram objek** (ASCII tree) lalu tabel atribut & tabel objek.

Sumber menu: `prisma/seeds/data/menu.csv`; sumber halaman: `src/app/(admin)/admin/**`.

## Peta folder

```text
docs/product/pages/
├── dashboard/                    Menu: Dashboard
│   ├── main-dashboard.md
│   ├── bmp-dashboard-produksi.md
│   └── dashboard-pelatihan.md
├── master-data/                  Menu: Master Data
│   ├── lembaga-petani/           daftar · detail
│   ├── petani/                   daftar · detail
│   ├── pelatihan/                daftar · detail
│   ├── lahan/                    daftar · detail
│   └── produksi/                 daftar · tambah · detail · ubah
├── settings/                     Menu: Settings
│   ├── user-management.md
│   ├── menu-management.md
│   ├── role-permission.md
│   └── regions.md
├── bulk-upload/                  Menu: Bulk Upload
│   ├── upload-petani.md
│   ├── upload-produksi.md
│   └── lahan.md
├── data-analyst/                 Menu: Data Analyst
│   ├── ringkasan-petani.md
│   └── analisa-ketersediaan-data.md
├── report/                       Menu: Report
│   ├── petani.md · pelatihan.md · produksi.md
│   ├── kelompok-tani-summary.md · kelompok-tani-detail.md
│   └── lahan.md
├── tools/                        Menu: Tools
│   ├── dashboard-snapshot/       daftar · detail
│   └── dashboard-snapshot-bmp/   daftar · detail
├── map/                          Menu: Map
│   ├── peta-lahan.md
│   └── peta-bmp.md
├── bantuan/                      Menu: Bantuan
│   ├── indeks-bantuan.md · halaman-bab.md · halaman-topik.md
└── halaman-non-menu/             Login · Profil · halaman publik · layout bersama
```

Setiap folder punya `README.md`: ikhtisar menu/sub menu, diagram pohon halaman, dan objek yang dipakai bersama.

## Daftar menu

| # | Menu | Key | URL | Sub menu | Dokumen |
|---|------|-----|-----|----------|---------|
| 0 | Dashboard | `dashboard` | `/admin/dashboard` | 3 | [dashboard/](./dashboard/README.md) |
| 1 | Master Data | `master-data` | `/admin/master-data` | 5 | [master-data/](./master-data/README.md) |
| 2 | Settings | `settings` | `/admin/settings` | 4 | [settings/](./settings/README.md) |
| 3 | Bulk Upload | `bulk-upload` | `/admin/bulk-upload` | 3 | [bulk-upload/](./bulk-upload/README.md) |
| 4 | Data Analyst | `data-analyst` | `/admin/data-analyst` | 2 | [data-analyst/](./data-analyst/README.md) |
| 5 | Report | `report` | `/admin/report` | 6 | [report/](./report/README.md) |
| 6 | Tools | `tools` | `/admin/tools` | 2 | [tools/](./tools/README.md) |
| 7 | Map | `map` | `/admin/map` | 2 | [map/](./map/README.md) |
| 9 | Bantuan | `help` | `/admin/help` | — (tree bab/topik) | [bantuan/](./bantuan/README.md) |
| — | Halaman non-menu | — | `/login`, `/admin/profile`, `/` | — | [halaman-non-menu/](./halaman-non-menu/README.md) |

## Cara membaca

- **Menu key** — kunci pada tabel `Menu`, dipakai `hasPermission(menuKey, action)` dan `requirePermission(menuKey)`.
- **Page** — route App Router beserta file sumbernya. **Page Detail** = route `[id]` (dokumen `detail.md`).
- **Object** — elemen konkret di halaman: header, kartu KPI, filter, kolom tabel, tombol aksi (beserta permission), dialog/sheet + schema Zod, chart, layer peta, empty state.
- Semua halaman `/admin/**` berada di bawah guard NextAuth (`middleware.ts`) dan tiga lapis keamanan (menu permission, access context, soft delete).

## Catatan route induk

Beberapa menu induk hanya berfungsi sebagai grup navigasi di sidebar:

| Route induk | Perilaku |
|---|---|
| `/admin` | Redirect ke dashboard |
| `/admin/dashboard` | Redirect |
| `/admin/master-data` | Redirect ke `/admin/master-data/farmers` |
| `/admin/bulk-upload` | Redirect ke `/admin/bulk-upload/farmers` |
| `/admin/report` | Redirect ke `/admin/report/farmer` (tanpa guard permission) |
| `/admin/tools` | Redirect ke halaman snapshot |
| `/admin/settings` | Tidak ada `page.tsx` — grup navigasi saja |
| `/admin/data-analyst` | Tidak ada `page.tsx` — hanya `layout.tsx` (metadata) |

## Kerangka umum halaman admin

| Objek | Keterangan |
|-------|------------|
| Sidebar | Menu 3 level dari tabel `Menu`, difilter permission user; pencarian menu `Ctrl/⌘+K` |
| Header/topbar | Breadcrumb, menu profil, logout |
| Page header | `h1` judul + deskripsi singkat (`text-muted-foreground`) |
| Konten | Server Component memuat data → diserahkan ke `*-client.tsx` (Client Component) untuk interaksi |

Detail layout bersama: [halaman-non-menu/README.md](./halaman-non-menu/README.md).
