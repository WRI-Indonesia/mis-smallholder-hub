# Menu: Report

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `report` |
| URL | `/admin/report` |
| Icon | `FileText` |
| Sub menu | 7 (urutan `order` di `menu.csv`) — Petani (`report-farmer`), Lahan (`report-land-parcel`), Pelatihan (`report-training`), Produksi (`report-production`), Kelompok Tani (Summary) (`report-kelompok-tani`), Kelompok Tani (Detail) (`report-kelompok-tani-detail`), Patok (`report-marker`, #331) |

## Diagram objek

```text
Menu: Report (/admin/report)
├── Sub Menu: Petani (report-farmer)
│   └── Page: Laporan Petani (/admin/report/farmer)
├── Sub Menu: Lahan (report-land-parcel)
│   └── Page: Laporan Lahan (/admin/report/land-parcel)
├── Sub Menu: Pelatihan (report-training)
│   └── Page: Laporan Pelatihan (/admin/report/training)
├── Sub Menu: Produksi (report-production)
│   └── Page: Laporan Produksi (/admin/report/production)
├── Sub Menu: Kelompok Tani (Summary) (report-kelompok-tani)
│   └── Page: Laporan Kelompok Tani (Ringkasan) (/admin/report/kelompok-tani)
├── Sub Menu: Kelompok Tani (Detail) (report-kelompok-tani-detail)
│   └── Page: Laporan Kelompok Tani (Detail) (/admin/report/kelompok-tani-detail)
└── Sub Menu: Patok (report-marker, #331)
    └── Page: Laporan Patok (/admin/report/marker)
```

## Daftar sub menu

| # | Sub Menu | Menu key | Route | Dokumen |
|---|---|---|---|---|
| 1 | Petani | `report-farmer` | `/admin/report/farmer` | [farmer.md](farmer.md) |
| 2 | Lahan | `report-land-parcel` | `/admin/report/land-parcel` | [land-parcel.md](land-parcel.md) |
| 3 | Pelatihan | `report-training` | `/admin/report/training` | [training.md](training.md) |
| 4 | Produksi | `report-production` | `/admin/report/production` | [production.md](production.md) |
| 5 | Kelompok Tani (Summary) | `report-kelompok-tani` | `/admin/report/kelompok-tani` | [kelompok-tani.md](kelompok-tani.md) |
| 6 | Kelompok Tani (Detail) | `report-kelompok-tani-detail` | `/admin/report/kelompok-tani-detail` | [kelompok-tani-detail.md](./kelompok-tani-detail.md) |
| 7 | Patok | `report-marker` | `/admin/report/marker` | [marker.md](marker.md) |

## Page: `/admin/report` (route induk)

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/report/page.tsx` |
| Tipe | Server Component tanpa UI — `redirect("/admin/report/farmer")` |
| Guard | — (tidak ada `requirePermission`; guard berada di halaman tujuan) |
| Server action / data | — |

Semua sub halaman memakai pola sama: Server Component memanggil `requirePermission("<menu key>")` + `getUserPermissionsForMenu("<menu key>")`, memuat daftar distrik lewat Server Action di `src/server/actions/report.ts` (`getDistrictsFor*Report` → helper `districtsForMenus`/`farmerGroupsForMenus`: lolos bila salah satu menu key terkait ber-VIEW, lalu disaring `getAccessContext()`), lalu menyerahkan ke `*-report-client.tsx`. Server Action data laporan memakai `hasPermission("<menu key>", "VIEW")` + `getAccessContext()`, dengan pengecualian:

| Action | Guard |
|---|---|
| `getNktReportData` (`report.ts`, Laporan NKT dari Laporan Lahan) | `hasPermission("report-land-parcel", "PRINT")` + `getAccessContext()` |
| `getMarkerReportRows` (`src/server/actions/land-marker.ts`, Laporan Patok) | `hasPermission("report-marker", "VIEW")`; `"EXPORT"` bila `mode: "export"` — + `getAccessContext()` |
