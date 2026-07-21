# Menu: Tools

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

## Diagram objek

```text
Menu: Tools (/admin/tools → redirect /admin/tools/snapshot)
├── Sub Menu: Dashboard Snapshot (dashboard-snapshot)
│   ├── Page: Daftar Snapshot (/admin/tools/snapshot)
│   └── Page: Detail Snapshot (/admin/tools/snapshot/[id])
└── Sub Menu: Dashboard Snapshot BMP (dashboard-snapshot-bmp)
    ├── Page: Daftar Snapshot BMP (/admin/tools/snapshot-bmp)
    └── Page: Detail Snapshot BMP (/admin/tools/snapshot-bmp/[id])
```

## Atribut menu

| Atribut | Nilai |
|---|---|
| Menu key | `tools` |
| URL | `/admin/tools` |
| Icon | `Wrench` |
| Sub menu | 2 — Dashboard Snapshot (`dashboard-snapshot`), Dashboard Snapshot BMP (`dashboard-snapshot-bmp`) |
| Order | 6 |
| Catatan | `src/app/(admin)/admin/tools/page.tsx` hanya `redirect("/admin/tools/snapshot")` — tidak ada halaman induk. |

Sumber metadata menu: `prisma/seeds/data/menu.csv`. Konteks penyimpanan snapshot: [../../../database/dashboard-snapshots.md](../../../database/dashboard-snapshots.md). Semua halaman berada di bawah guard NextAuth (`middleware.ts`) dan tiga lapis keamanan (menu permission, access context, soft delete).

## Daftar sub menu

| # | Sub menu | Key | URL | Icon | Order | Dokumen |
|---|---|---|---|---|---|---|
| 1 | Dashboard Snapshot | `dashboard-snapshot` | `/admin/tools/snapshot` | `Camera` | 1 | [dashboard-snapshot/README.md](./dashboard-snapshot/README.md) |
| 2 | Dashboard Snapshot BMP | `dashboard-snapshot-bmp` | `/admin/tools/snapshot-bmp` | `Camera` | 2 | [dashboard-snapshot-bmp/README.md](./dashboard-snapshot-bmp/README.md) |
