# Menu: Report

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `report` |
| URL | `/admin/report` |
| Icon | `FileText` |
| Sub menu | 6 — Petani (`report-farmer`), Pelatihan (`report-training`), Produksi (`report-production`), Kelompok Tani (Summary) (`report-kelompok-tani`), Kelompok Tani (Detail) (`report-kelompok-tani-detail`), Lahan (`report-land-parcel`) |

## Diagram objek

```text
Menu: Report (/admin/report)
├── Sub Menu: Petani (report-farmer)
│   └── Page: Laporan Petani (/admin/report/farmer)
├── Sub Menu: Pelatihan (report-training)
│   └── Page: Laporan Pelatihan (/admin/report/training)
├── Sub Menu: Produksi (report-production)
│   └── Page: Laporan Produksi (/admin/report/production)
├── Sub Menu: Kelompok Tani (Summary) (report-kelompok-tani)
│   └── Page: Laporan Kelompok Tani (Ringkasan) (/admin/report/kelompok-tani)
├── Sub Menu: Kelompok Tani (Detail) (report-kelompok-tani-detail)
│   └── Page: Laporan Kelompok Tani (Detail) (/admin/report/kelompok-tani-detail)
└── Sub Menu: Lahan (report-land-parcel)
    └── Page: Laporan Lahan (/admin/report/land-parcel)
```

## Daftar sub menu

| # | Sub Menu | Menu key | Route | Dokumen |
|---|---|---|---|---|
| 1 | Petani | `report-farmer` | `/admin/report/farmer` | [petani.md](./petani.md) |
| 2 | Pelatihan | `report-training` | `/admin/report/training` | [pelatihan.md](./pelatihan.md) |
| 3 | Produksi | `report-production` | `/admin/report/production` | [produksi.md](./produksi.md) |
| 4 | Kelompok Tani (Summary) | `report-kelompok-tani` | `/admin/report/kelompok-tani` | [kelompok-tani-summary.md](./kelompok-tani-summary.md) |
| 5 | Kelompok Tani (Detail) | `report-kelompok-tani-detail` | `/admin/report/kelompok-tani-detail` | [kelompok-tani-detail.md](./kelompok-tani-detail.md) |
| 6 | Lahan | `report-land-parcel` | `/admin/report/land-parcel` | [lahan.md](./lahan.md) |

## Page: `/admin/report` (route induk)

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/report/page.tsx` |
| Tipe | Server Component tanpa UI — `redirect("/admin/report/farmer")` |
| Guard | — (tidak ada `requirePermission`; guard berada di halaman tujuan) |
| Server action / data | — |

Semua sub halaman memakai pola sama: Server Component memuat daftar distrik lewat Server Action di `src/server/actions/report.ts`, lalu menyerahkan ke `*-report-client.tsx`. Semua Server Action report memakai `hasPermission("<menu key>", "VIEW")` + `getAccessContext()`.
