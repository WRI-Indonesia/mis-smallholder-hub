# Menu: Data Analyst

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `data-analyst` |
| URL | `/admin/data-analyst` |
| Icon | `BarChart3` |
| Sub menu | 6 — Ringkasan Petani (`data-analyst-farmer-summary`), Ketersediaan Data — Semua Lembaga (`data-analyst-data-availability`), Ketersediaan Data — Per Lembaga (`data-analyst-data-completeness`), Komparasi Data Acuan (`data-analyst-benchmark-comparison`), Peta Data & Skema (`data-analyst-data-map`, SUPERADMIN/ADMIN/MANAGEMENT), Metrik Rilis (`dashboard-metrics`, SUPERADMIN/ADMIN/MANAGEMENT) |

## Diagram objek

```text
Menu: Data Analyst (/admin/data-analyst)
├── Sub Menu: Ringkasan Petani (data-analyst-farmer-summary)
│   └── Page: Ringkasan Petani (/admin/data-analyst/farmer-summary)
├── Sub Menu: Ketersediaan Data — Semua Lembaga (data-analyst-data-availability)
│   └── Page: Ketersediaan Data — Semua Lembaga (/admin/data-analyst/data-availability)
├── Sub Menu: Ketersediaan Data — Per Lembaga (data-analyst-data-completeness)
│   └── Page: Ketersediaan Data — Per Lembaga (/admin/data-analyst/data-completeness)
├── Sub Menu: Komparasi Data Acuan (data-analyst-benchmark-comparison)
│   └── Page: Komparasi Data Acuan (/admin/data-analyst/benchmark-comparison)
├── Sub Menu: Peta Data & Skema (data-analyst-data-map) — SUPERADMIN/ADMIN/MANAGEMENT
│   └── Page: Peta Data & Skema (/admin/data-analyst/data-map)
└── Sub Menu: Metrik Rilis (dashboard-metrics) — SUPERADMIN/ADMIN/MANAGEMENT
    └── Page: Metrik Rilis (/admin/dashboard/metrics)
```

> **Urutan & label Ketersediaan Data (#352, keputusan owner P4, 2026-09-21).** Dua route dipertahankan (key & RolePermission tetap — preseden Metrik Rilis), tetapi order ditukar dan label diperjelas: **Semua Lembaga** (dashboard, order 2) jadi pintu masuk, **Per Lembaga** (analisa, order 3) jadi drill-down lewat `?lembaga=`. Perubahan hanya di `menu.csv` → seed ke staging/prod lewat `scripts/seed/seed-menu-only.ts` (bukan full seed). Nama berkas dokumen dan route lama dibiarkan.

> **Catatan penempatan Metrik Rilis.** Menu key-nya `dashboard-metrics` dan route-nya masih `/admin/dashboard/metrics` (peninggalan #227 yang menempatkannya di bawah Dashboard), tetapi di database ia bertengger di bawah **Data Analyst**. Perbedaan itu ditemukan saat mendaftarkan menu DA-07 (#256) dan diselesaikan dengan menjadikan **keadaan produksi sebagai acuan** — seed CSV serta katalog ini disesuaikan, database tidak diubah. Key dan route sengaja dibiarkan apa adanya: mengubahnya berarti memutus tautan yang sudah beredar dan baris RolePermission yang sudah ada.

## Daftar sub menu

| # | Sub Menu | Menu key | Route | Dokumen |
|---|---|---|---|---|
| 1 | Ringkasan Petani | `data-analyst-farmer-summary` | `/admin/data-analyst/farmer-summary` | [ringkasan-petani.md](./ringkasan-petani.md) |
| 2 | Ketersediaan Data — Semua Lembaga | `data-analyst-data-availability` | `/admin/data-analyst/data-availability` | [dashboard-ketersediaan-data.md](./dashboard-ketersediaan-data.md) |
| 3 | Ketersediaan Data — Per Lembaga | `data-analyst-data-completeness` | `/admin/data-analyst/data-completeness` | [analisa-ketersediaan-data.md](./analisa-ketersediaan-data.md) |
| 4 | Komparasi Data Acuan | `data-analyst-benchmark-comparison` | `/admin/data-analyst/benchmark-comparison` | [komparasi-data-acuan.md](./komparasi-data-acuan.md) |
| 5 | Peta Data & Skema | `data-analyst-data-map` | `/admin/data-analyst/data-map` | [peta-data-skema.md](./peta-data-skema.md) |
| — | Metrik Rilis | `dashboard-metrics` | `/admin/dashboard/metrics` | [metrik-rilis.md](./metrik-rilis.md) |

## Catatan route induk

Tidak ada `page.tsx` untuk route induk `/admin/data-analyst` — hanya `src/app/(admin)/admin/data-analyst/layout.tsx` yang menetapkan `metadata.title = "Data Analyst"`. Menu induk hanya berfungsi sebagai grup pada sidebar.
