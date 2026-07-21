# Menu: Data Analyst

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `data-analyst` |
| URL | `/admin/data-analyst` |
| Icon | `BarChart3` |
| Sub menu | 2 — Ringkasan Petani (`data-analyst-farmer-summary`), Analisa Ketersediaan Data (`data-analyst-data-completeness`) |

## Diagram objek

```text
Menu: Data Analyst (/admin/data-analyst)
├── Sub Menu: Ringkasan Petani (data-analyst-farmer-summary)
│   └── Page: Ringkasan Petani (/admin/data-analyst/farmer-summary)
└── Sub Menu: Analisa Ketersediaan Data (data-analyst-data-completeness)
    └── Page: Analisa Ketersediaan Data (/admin/data-analyst/data-completeness)
```

## Daftar sub menu

| # | Sub Menu | Menu key | Route | Dokumen |
|---|---|---|---|---|
| 1 | Ringkasan Petani | `data-analyst-farmer-summary` | `/admin/data-analyst/farmer-summary` | [ringkasan-petani.md](./ringkasan-petani.md) |
| 2 | Analisa Ketersediaan Data | `data-analyst-data-completeness` | `/admin/data-analyst/data-completeness` | [analisa-ketersediaan-data.md](./analisa-ketersediaan-data.md) |

## Catatan route induk

Tidak ada `page.tsx` untuk route induk `/admin/data-analyst` — hanya `src/app/(admin)/admin/data-analyst/layout.tsx` yang menetapkan `metadata.title = "Data Analyst"`. Menu induk hanya berfungsi sebagai grup pada sidebar.
