# Menu: Data Analyst

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `data-analyst` |
| URL | `/admin/data-analyst` |
| Icon | `BarChart3` |
| Sub menu | 6 — Ringkasan Petani (`data-analyst-farmer-summary`), Analisa Ketersediaan Data (`data-analyst-data-completeness`), Dashboard Ketersediaan Data (`data-analyst-data-availability`), Komparasi Data Acuan (`data-analyst-benchmark-comparison`), Peta Data & Skema (`data-analyst-data-map`), Metrik Rilis (`dashboard-metrics`) — keduanya **efektif terbuka untuk keempat peran** yang punya VIEW pada menu induk, lihat #262 |

## Diagram objek

```text
Menu: Data Analyst (/admin/data-analyst)
├── Sub Menu: Ringkasan Petani (data-analyst-farmer-summary)
│   └── Page: Ringkasan Petani (/admin/data-analyst/farmer-summary)
├── Sub Menu: Analisa Ketersediaan Data (data-analyst-data-completeness)
│   └── Page: Analisa Ketersediaan Data (/admin/data-analyst/data-completeness)
├── Sub Menu: Dashboard Ketersediaan Data (data-analyst-data-availability)
│   └── Page: Dashboard Ketersediaan Data (/admin/data-analyst/data-availability)
├── Sub Menu: Komparasi Data Acuan (data-analyst-benchmark-comparison)
│   └── Page: Komparasi Data Acuan (/admin/data-analyst/benchmark-comparison)
├── Sub Menu: Peta Data & Skema (data-analyst-data-map) — seed SUPERADMIN/ADMIN, efektif 4 peran (#262)
│   └── Page: Peta Data & Skema (/admin/data-analyst/data-map)
└── Sub Menu: Metrik Rilis (dashboard-metrics) — seed SUPERADMIN, efektif 4 peran (#262)
    └── Page: Metrik Rilis (/admin/dashboard/metrics)
```

> **Catatan penempatan Metrik Rilis.** Menu key-nya `dashboard-metrics` dan route-nya masih `/admin/dashboard/metrics` (peninggalan #227 yang menempatkannya di bawah Dashboard), tetapi di database ia bertengger di bawah **Data Analyst**. Perbedaan itu ditemukan saat mendaftarkan menu DA-07 (#256) dan diselesaikan dengan menjadikan **keadaan produksi sebagai acuan** — seed CSV serta katalog ini disesuaikan, database tidak diubah. Key dan route sengaja dibiarkan apa adanya: mengubahnya berarti memutus tautan yang sudah beredar dan baris RolePermission yang sudah ada.

## Daftar sub menu

| # | Sub Menu | Menu key | Route | Dokumen |
|---|---|---|---|---|
| 1 | Ringkasan Petani | `data-analyst-farmer-summary` | `/admin/data-analyst/farmer-summary` | [ringkasan-petani.md](./ringkasan-petani.md) |
| 2 | Analisa Ketersediaan Data | `data-analyst-data-completeness` | `/admin/data-analyst/data-completeness` | [analisa-ketersediaan-data.md](./analisa-ketersediaan-data.md) |
| 3 | Dashboard Ketersediaan Data | `data-analyst-data-availability` | `/admin/data-analyst/data-availability` | [dashboard-ketersediaan-data.md](./dashboard-ketersediaan-data.md) |
| 4 | Komparasi Data Acuan | `data-analyst-benchmark-comparison` | `/admin/data-analyst/benchmark-comparison` | [komparasi-data-acuan.md](./komparasi-data-acuan.md) |
| 5 | Peta Data & Skema | `data-analyst-data-map` | `/admin/data-analyst/data-map` | [peta-data-skema.md](./peta-data-skema.md) |
| — | Metrik Rilis | `dashboard-metrics` | `/admin/dashboard/metrics` | [metrik-rilis.md](./metrik-rilis.md) |

## Catatan route induk

Tidak ada `page.tsx` untuk route induk `/admin/data-analyst` — hanya `src/app/(admin)/admin/data-analyst/layout.tsx` yang menetapkan `metadata.title = "Data Analyst"`. Menu induk hanya berfungsi sebagai grup pada sidebar.
