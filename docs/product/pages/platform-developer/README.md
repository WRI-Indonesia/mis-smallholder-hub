# Menu: Platform Developer

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `platform-developer` |
| URL | `/admin/platform-developer` (redirect ke Metrik Rilis) |
| Icon | `Code2` |
| Sub menu | 3 — Metrik Rilis (`dashboard-metrics`), Peta Data & Skema (`data-analyst-data-map`), Rencana Pengembangan (`data-analyst-sprint`) — urut sesuai kolom `order` di `menu.csv` (1–3) |
| Akses bawaan | Induk: VIEW SUPERADMIN. Ketiga anak: VIEW SUPERADMIN · ADMIN · MANAGEMENT (`role-permissions.csv`) |

Grup tooling internal tim pengembang: tentang aplikasinya sendiri (progres rilis, rencana kerja, struktur data), bukan tentang data petani. Dibentuk 2026-10-07 (`9b9afde`, owner) dengan memindahkan ketiga menu dari **Data Analyst**.

## Diagram objek

```text
Menu: Platform Developer (/admin/platform-developer → /admin/dashboard/metrics)
├── Sub Menu: Metrik Rilis (dashboard-metrics)
│   └── Page: Metrik Rilis (/admin/dashboard/metrics)
├── Sub Menu: Peta Data & Skema (data-analyst-data-map)
│   └── Page: Peta Data & Skema (/admin/data-analyst/data-map)
└── Sub Menu: Rencana Pengembangan (data-analyst-sprint)
    └── Page: Rencana Pengembangan (/admin/data-analyst/sprint)
```

> **Key, route, dan dokumen lama dipertahankan.** Pemindahan hanya mengubah `parent_key` dan `order` di `menu.csv`. Menu key, route (`/admin/dashboard/metrics`, `/admin/data-analyst/*`), dan baris RolePermission tidak diubah agar tautan yang sudah beredar tidak putus. Karena itu ketiga dokumen halamannya tetap di [data-analyst/](../data-analyst/README.md): Peta Data dan Rencana Pengembangan mengikuti segmen route-nya, Metrik Rilis peninggalan penempatan sebelum 2026-10-07.

## Daftar sub menu

| # | Sub Menu | Menu key | Route | Dokumen |
|---|---|---|---|---|
| 1 | Metrik Rilis | `dashboard-metrics` | `/admin/dashboard/metrics` | [metrics.md](../data-analyst/metrics.md) |
| 2 | Peta Data & Skema | `data-analyst-data-map` | `/admin/data-analyst/data-map` | [data-map.md](../data-analyst/data-map.md) |
| 3 | Rencana Pengembangan | `data-analyst-sprint` | `/admin/data-analyst/sprint` | [sprint.md](../data-analyst/sprint.md) |

## Catatan route induk

`src/app/(admin)/admin/platform-developer/page.tsx` hanya me-redirect ke `/admin/dashboard/metrics` (halaman pertama grup). Bantuan: konsep `3-4-platform-developer.md`.
