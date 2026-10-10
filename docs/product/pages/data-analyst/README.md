# Menu: Data Analyst

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `data-analyst` |
| URL | `/admin/data-analyst` |
| Icon | `BarChart3` |
| Sub menu | 5 — Ringkasan Petani (`data-analyst-farmer-summary`), Data — All Lembaga (`data-analyst-data-availability`), Data — Per Lembaga (`data-analyst-data-completeness`), Komparasi Data Acuan (`data-analyst-benchmark-comparison`), Tumpang Tindih Lahan (`data-analyst-parcel-overlap`, SUPERADMIN/ADMIN/MANAGEMENT/OPERATOR) — urut sesuai kolom `order` di `menu.csv`. Metrik Rilis, Peta Data & Skema, dan Rencana Pengembangan pindah ke grup [Platform Developer](../platform-developer/README.md) sejak 2026-10-07 |

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
└── Sub Menu: Tumpang Tindih Lahan (data-analyst-parcel-overlap) — SUPERADMIN/ADMIN/MANAGEMENT/OPERATOR
    └── Page: Tumpang Tindih Lahan (/admin/data-analyst/parcel-overlap)
```

> **Urutan & label Ketersediaan Data (#352, keputusan owner P4, 2026-09-21).** Dua route dipertahankan (key & RolePermission tetap — preseden Metrik Rilis), tetapi order ditukar dan label diperjelas: **Semua Lembaga** (dashboard, order 2) jadi pintu masuk, **Per Lembaga** (analisa, order 3) jadi drill-down lewat `?lembaga=`. Perubahan hanya di `menu.csv` → seed ke staging/prod lewat `scripts/seed/seed-menu-only.ts` (bukan full seed). Nama berkas dokumen dan route lama dibiarkan.

> **Catatan penempatan Metrik Rilis, Peta Data & Skema, Rencana Pengembangan.** Ketiganya kini anak grup [Platform Developer](../platform-developer/README.md) (2026-10-07). Dokumen halamannya tetap di folder ini karena route-nya (`/admin/data-analyst/*`, dan `/admin/dashboard/metrics` untuk Metrik Rilis) serta menu key tidak diubah. Sebelumnya Metrik Rilis bertengger di bawah Data Analyst (ditemukan saat DA-07 #256; produksi dijadikan acuan).

## Daftar sub menu

| # | Sub Menu | Menu key | Route | Dokumen |
|---|---|---|---|---|
| 1 | Ringkasan Petani | `data-analyst-farmer-summary` | `/admin/data-analyst/farmer-summary` | [farmer-summary.md](farmer-summary.md) |
| 2 | Data — All Lembaga | `data-analyst-data-availability` | `/admin/data-analyst/data-availability` | [data-availability.md](data-availability.md) |
| 3 | Data — Per Lembaga | `data-analyst-data-completeness` | `/admin/data-analyst/data-completeness` | [data-completeness.md](data-completeness.md) |
| 4 | Komparasi Data Acuan | `data-analyst-benchmark-comparison` | `/admin/data-analyst/benchmark-comparison` | [benchmark-comparison.md](benchmark-comparison.md) |
| 5 | Tumpang Tindih Lahan | `data-analyst-parcel-overlap` | `/admin/data-analyst/parcel-overlap` | [parcel-overlap.md](parcel-overlap.md) |

Dokumen grup Platform Developer yang tetap di folder ini: [metrics.md](metrics.md) · [data-map.md](data-map.md) · [sprint.md](sprint.md).

## Catatan route induk

Tidak ada `page.tsx` untuk route induk `/admin/data-analyst` — hanya `src/app/(admin)/admin/data-analyst/layout.tsx` yang menetapkan `metadata.title = "Data Analyst"`. Menu induk hanya berfungsi sebagai grup pada sidebar.
