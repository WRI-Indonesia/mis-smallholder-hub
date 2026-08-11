# Menu: Data Analyst

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `data-analyst` |
| URL | `/admin/data-analyst` |
| Icon | `BarChart3` |
| Sub menu | 4 — Ringkasan Petani (`data-analyst-farmer-summary`), Analisa Ketersediaan Data (`data-analyst-data-completeness`), Dashboard Ketersediaan Data (`data-analyst-data-availability`), Komparasi Data Acuan (`data-analyst-benchmark-comparison`) |

## Diagram objek

```text
Menu: Data Analyst (/admin/data-analyst)
├── Sub Menu: Ringkasan Petani (data-analyst-farmer-summary)
│   └── Page: Ringkasan Petani (/admin/data-analyst/farmer-summary)
├── Sub Menu: Analisa Ketersediaan Data (data-analyst-data-completeness)
│   └── Page: Analisa Ketersediaan Data (/admin/data-analyst/data-completeness)
├── Sub Menu: Dashboard Ketersediaan Data (data-analyst-data-availability)
│   └── Page: Dashboard Ketersediaan Data (/admin/data-analyst/data-availability)
└── Sub Menu: Komparasi Data Acuan (data-analyst-benchmark-comparison)
    └── Page: Komparasi Data Acuan (/admin/data-analyst/benchmark-comparison)
```

## Daftar sub menu

| # | Sub Menu | Menu key | Route | Dokumen |
|---|---|---|---|---|
| 1 | Ringkasan Petani | `data-analyst-farmer-summary` | `/admin/data-analyst/farmer-summary` | [ringkasan-petani.md](./ringkasan-petani.md) |
| 2 | Analisa Ketersediaan Data | `data-analyst-data-completeness` | `/admin/data-analyst/data-completeness` | [analisa-ketersediaan-data.md](./analisa-ketersediaan-data.md) |
| 3 | Dashboard Ketersediaan Data | `data-analyst-data-availability` | `/admin/data-analyst/data-availability` | [dashboard-ketersediaan-data.md](./dashboard-ketersediaan-data.md) |
| 4 | Komparasi Data Acuan | `data-analyst-benchmark-comparison` | `/admin/data-analyst/benchmark-comparison` | [komparasi-data-acuan.md](./komparasi-data-acuan.md) |

## Catatan route induk

Tidak ada `page.tsx` untuk route induk `/admin/data-analyst` — hanya `src/app/(admin)/admin/data-analyst/layout.tsx` yang menetapkan `metadata.title = "Data Analyst"`. Menu induk hanya berfungsi sebagai grup pada sidebar.
