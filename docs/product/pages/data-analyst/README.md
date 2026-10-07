# Menu: Data Analyst

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `data-analyst` |
| URL | `/admin/data-analyst` |
| Icon | `BarChart3` |
| Sub menu | 8 — Ringkasan Petani (`data-analyst-farmer-summary`), Data — All Lembaga (`data-analyst-data-availability`), Data — Per Lembaga (`data-analyst-data-completeness`), Komparasi Data Acuan (`data-analyst-benchmark-comparison`), Metrik Rilis (`dashboard-metrics`, SUPERADMIN/ADMIN/MANAGEMENT), Peta Data & Skema (`data-analyst-data-map`, SUPERADMIN/ADMIN/MANAGEMENT), Tumpang Tindih Lahan (`data-analyst-parcel-overlap`, SUPERADMIN/ADMIN/MANAGEMENT/OPERATOR), Rencana Pengembangan (`data-analyst-sprint`, SUPERADMIN/ADMIN/MANAGEMENT) — urut sesuai kolom `order` di `menu.csv` (1–8) |

## Diagram objek

```text
Menu: Data Analyst (/admin/data-analyst)
├── Sub Menu: Ringkasan Petani (data-analyst-farmer-summary)
│   └── Page: Ringkasan Petani (/admin/data-analyst/farmer-summary)
├── Sub Menu: Data — All Lembaga (data-analyst-data-availability)
│   └── Page: Ketersediaan Data — Semua Lembaga (/admin/data-analyst/data-availability)
├── Sub Menu: Data — Per Lembaga (data-analyst-data-completeness)
│   └── Page: Ketersediaan Data — Per Lembaga (/admin/data-analyst/data-completeness)
├── Sub Menu: Komparasi Data Acuan (data-analyst-benchmark-comparison)
│   └── Page: Komparasi Data Acuan (/admin/data-analyst/benchmark-comparison)
├── Sub Menu: Metrik Rilis (dashboard-metrics) — SUPERADMIN/ADMIN/MANAGEMENT
│   └── Page: Metrik Rilis (/admin/dashboard/metrics)
├── Sub Menu: Peta Data & Skema (data-analyst-data-map) — SUPERADMIN/ADMIN/MANAGEMENT
│   └── Page: Peta Data & Skema (/admin/data-analyst/data-map)
├── Sub Menu: Tumpang Tindih Lahan (data-analyst-parcel-overlap) — SUPERADMIN/ADMIN/MANAGEMENT/OPERATOR
│   └── Page: Tumpang Tindih Lahan (/admin/data-analyst/parcel-overlap)
└── Sub Menu: Rencana Pengembangan (data-analyst-sprint) — SUPERADMIN/ADMIN/MANAGEMENT
    └── Page: Rencana Pengembangan (/admin/data-analyst/sprint)
```

> **Urutan & label Ketersediaan Data (#352, keputusan owner P4, 2026-09-21).** Dua route dipertahankan (key & RolePermission tetap — preseden Metrik Rilis), tetapi order ditukar dan label diperjelas: **Semua Lembaga** (dashboard, order 2) jadi pintu masuk, **Per Lembaga** (analisa, order 3) jadi drill-down lewat `?lembaga=`. Perubahan hanya di `menu.csv` → seed ke staging/prod lewat `scripts/seed/seed-menu-only.ts` (bukan full seed). Nama berkas dokumen dan route lama dibiarkan.

> **Catatan penempatan Metrik Rilis.** Menu key-nya `dashboard-metrics` dan route-nya masih `/admin/dashboard/metrics` (peninggalan #227 yang menempatkannya di bawah Dashboard), tetapi di database ia bertengger di bawah **Data Analyst**. Perbedaan itu ditemukan saat mendaftarkan menu DA-07 (#256) dan diselesaikan dengan menjadikan **keadaan produksi sebagai acuan** — seed CSV serta katalog ini disesuaikan, database tidak diubah. Key dan route sengaja dibiarkan apa adanya: mengubahnya berarti memutus tautan yang sudah beredar dan baris RolePermission yang sudah ada.

## Daftar sub menu

| # | Sub Menu | Menu key | Route | Dokumen |
|---|---|---|---|---|
| 1 | Ringkasan Petani | `data-analyst-farmer-summary` | `/admin/data-analyst/farmer-summary` | [farmer-summary.md](farmer-summary.md) |
| 2 | Data — All Lembaga | `data-analyst-data-availability` | `/admin/data-analyst/data-availability` | [data-availability.md](data-availability.md) |
| 3 | Data — Per Lembaga | `data-analyst-data-completeness` | `/admin/data-analyst/data-completeness` | [data-completeness.md](data-completeness.md) |
| 4 | Komparasi Data Acuan | `data-analyst-benchmark-comparison` | `/admin/data-analyst/benchmark-comparison` | [benchmark-comparison.md](benchmark-comparison.md) |
| 5 | Metrik Rilis | `dashboard-metrics` | `/admin/dashboard/metrics` | [metrics.md](metrics.md) |
| 6 | Peta Data & Skema | `data-analyst-data-map` | `/admin/data-analyst/data-map` | [data-map.md](data-map.md) |
| 7 | Tumpang Tindih Lahan | `data-analyst-parcel-overlap` | `/admin/data-analyst/parcel-overlap` | [parcel-overlap.md](parcel-overlap.md) |
| 8 | Rencana Pengembangan | `data-analyst-sprint` | `/admin/data-analyst/sprint` | [sprint.md](sprint.md) |

## Catatan route induk

Tidak ada `page.tsx` untuk route induk `/admin/data-analyst` — hanya `src/app/(admin)/admin/data-analyst/layout.tsx` yang menetapkan `metadata.title = "Data Analyst"`. Menu induk hanya berfungsi sebagai grup pada sidebar.
