# Menu: Data Analyst

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `data-analyst` |
| URL | `/admin/data-analyst` |
| Icon | `BarChart3` |
| Sub menu | 4 level 2 — Ringkasan Petani (`data-analyst-farmer-summary`), **Ketersediaan Data** (`data-analyst-availability`, induk dengan 3 anak level 3: Semua Lembaga `data-analyst-data-availability`, Per Lembaga `data-analyst-data-completeness`, Produksi `data-analyst-availability-production` — #416), Komparasi Data Acuan (`data-analyst-benchmark-comparison`), Tumpang Tindih Lahan (`data-analyst-parcel-overlap`, SUPERADMIN/ADMIN/MANAGEMENT/OPERATOR) — urut sesuai kolom `order` di `menu.csv`. Metrik Rilis, Peta Data & Skema, dan Rencana Pengembangan pindah ke grup [Platform Developer](../platform-developer/README.md) sejak 2026-10-07 |

## Diagram objek

```text
Menu: Data Analyst (/admin/data-analyst)
├── Sub Menu: Ringkasan Petani (data-analyst-farmer-summary)
│   └── Page: Ringkasan Petani (/admin/data-analyst/farmer-summary)
├── Sub Menu: Ketersediaan Data (data-analyst-availability) — induk level 2, /admin/data-analyst/availability redirect ke anak pertama yang boleh diakses (TD-051; bawaan Semua Lembaga
│   ├── Sub Menu: Semua Lembaga (data-analyst-data-availability)
│   │   └── Page: Ketersediaan Data — Semua Lembaga (/admin/data-analyst/data-availability)
│   ├── Sub Menu: Per Lembaga (data-analyst-data-completeness)
│   │   └── Page: Ketersediaan Data — Per Lembaga (/admin/data-analyst/data-completeness)
│   └── Sub Menu: Produksi (data-analyst-availability-production) — #416
│       └── Page: Ketersediaan Data — Produksi (/admin/data-analyst/availability/production)
├── Sub Menu: Komparasi Data Acuan (data-analyst-benchmark-comparison)
│   └── Page: Komparasi Data Acuan (/admin/data-analyst/benchmark-comparison)
└── Sub Menu: Tumpang Tindih Lahan (data-analyst-parcel-overlap) — SUPERADMIN/ADMIN/MANAGEMENT/OPERATOR
    └── Page: Tumpang Tindih Lahan (/admin/data-analyst/parcel-overlap)
```

> **Keluarga Ketersediaan Data (#416 K1, keputusan owner 2026-10-11).** Dua menu skor dipindah ke bawah induk level 2 **Ketersediaan Data** (`data-analyst-availability`, order 2 — posisi lama Semua Lembaga) dan judulnya dipendekkan menjadi **Semua Lembaga** / **Per Lembaga**; key, route, dan RolePermission keduanya **tetap**. Anak ketiga **Produksi** (kalender cakupan) baru; entitas lain menyusul (epic #415). Seed ke staging/prod lewat `scripts/seed/seed-menu-only.ts` — `seedMenu` memperbarui induk/judul baris yang sudah ada, jadi satu `--apply` cukup; induk ikut di-seed sebelum anak (urutan CSV).

> **Urutan & label Ketersediaan Data (#352, keputusan owner P4, 2026-09-21).** Dua route dipertahankan (key & RolePermission tetap — preseden Metrik Rilis), tetapi order ditukar dan label diperjelas: **Semua Lembaga** (dashboard, order 2) jadi pintu masuk, **Per Lembaga** (analisa, order 3) jadi drill-down lewat `?lembaga=`. Perubahan hanya di `menu.csv` → seed ke staging/prod lewat `scripts/seed/seed-menu-only.ts` (bukan full seed). Nama berkas dokumen dan route lama dibiarkan.

> **Catatan penempatan Metrik Rilis, Peta Data & Skema, Rencana Pengembangan.** Ketiganya kini anak grup [Platform Developer](../platform-developer/README.md) (2026-10-07). Dokumen halamannya tetap di folder ini karena route-nya (`/admin/data-analyst/*`, dan `/admin/dashboard/metrics` untuk Metrik Rilis) serta menu key tidak diubah. Sebelumnya Metrik Rilis bertengger di bawah Data Analyst (ditemukan saat DA-07 #256; produksi dijadikan acuan).

## Daftar sub menu

| # | Sub Menu | Menu key | Route | Dokumen |
|---|---|---|---|---|
| 1 | Ringkasan Petani | `data-analyst-farmer-summary` | `/admin/data-analyst/farmer-summary` | [farmer-summary.md](farmer-summary.md) |
| 2 | Ketersediaan Data (induk level 2) | `data-analyst-availability` | `/admin/data-analyst/availability` (redirect ke 2.1) | — |
| 2.1 | Semua Lembaga | `data-analyst-data-availability` | `/admin/data-analyst/data-availability` | [data-availability.md](data-availability.md) |
| 2.2 | Per Lembaga | `data-analyst-data-completeness` | `/admin/data-analyst/data-completeness` | [data-completeness.md](data-completeness.md) |
| 2.3 | Produksi | `data-analyst-availability-production` | `/admin/data-analyst/availability/production` | [availability-production.md](availability-production.md) |
| 4 | Komparasi Data Acuan | `data-analyst-benchmark-comparison` | `/admin/data-analyst/benchmark-comparison` | [benchmark-comparison.md](benchmark-comparison.md) |
| 5 | Tumpang Tindih Lahan | `data-analyst-parcel-overlap` | `/admin/data-analyst/parcel-overlap` | [parcel-overlap.md](parcel-overlap.md) |

Dokumen grup Platform Developer yang tetap di folder ini: [metrics.md](metrics.md) · [data-map.md](data-map.md) · [sprint.md](sprint.md).

## Catatan route induk

`src/app/(admin)/admin/data-analyst/page.tsx` me-redirect ke anak pertama yang boleh diakses (`redirectToFirstAccessibleChild`, TD-051); `layout.tsx` menetapkan `metadata.title = "Data Analyst"`. Di sidebar menu induk berfungsi sebagai grup.
