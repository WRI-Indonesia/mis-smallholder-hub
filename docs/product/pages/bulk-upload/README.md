# Menu: Bulk Upload

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `bulk-upload` |
| URL | `/admin/bulk-upload` |
| Icon | `Upload` |
| Order | `10` |
| Parent | — (menu level 1) |
| Sub menu | 4 — Upload Data Petani (`bulk-upload-farmers`), Upload Data Produksi (`bulk-upload-production`), Upload Data Lahan (`bulk-upload-parcels`), Pohon Sawit (`bulk-upload-trees`) |
| Halaman induk | `src/app/(admin)/admin/bulk-upload/page.tsx` — hanya `redirect("/admin/bulk-upload/farmers")`, tidak ada UI |
| Sumber metadata | `prisma/seeds/data/menu.csv` baris `bulk-upload`, `bulk-upload-farmers`, `bulk-upload-production`, `bulk-upload-parcels`, `bulk-upload-trees` |

## Diagram objek

```text
Menu: Bulk Upload (/admin/bulk-upload)
└── Redirect → /admin/bulk-upload/farmers (tanpa UI)
    ├── Upload Data Petani    (/admin/bulk-upload/farmers)    — bulk-upload-farmers
    ├── Upload Data Produksi  (/admin/bulk-upload/production) — bulk-upload-production
    ├── Upload Data Lahan     (/admin/bulk-upload/parcels)    — bulk-upload-parcels
    └── Pohon Sawit           (/admin/bulk-upload/trees)      — bulk-upload-trees
```

## Daftar sub menu

| # | Sub menu | Menu key | URL | Icon | Order | Dokumen |
|---|---|---|---|---|---|---|
| 1 | Upload Data Petani | `bulk-upload-farmers` | `/admin/bulk-upload/farmers` | `User` | `1` | [farmers.md](farmers.md) |
| 2 | Upload Data Produksi | `bulk-upload-production` | `/admin/bulk-upload/production` | `TrendingUp` | `2` | [production.md](production.md) |
| 3 | Upload Data Lahan | `bulk-upload-parcels` | `/admin/bulk-upload/parcels` | `Map` | `3` | [parcels.md](parcels.md) |
| 4 | Pohon Sawit | `bulk-upload-trees` | `/admin/bulk-upload/trees` | `TreePine` | `4` | [trees.md](trees.md) |

## Permission bawaan seed

Sumber: `prisma/seeds/data/role-permissions.csv`

| Menu key | SUPERADMIN | ADMIN |
|---|---|---|
| `bulk-upload` | CREATE, VIEW, EDIT, DELETE | VIEW |
| `bulk-upload-farmers` | CREATE, VIEW, EDIT, DELETE, EXPORT, PRINT | CREATE, VIEW, EDIT, EXPORT, PRINT |
| `bulk-upload-production` | CREATE, VIEW, EXPORT, PRINT | CREATE, VIEW, EDIT, EXPORT, PRINT |
| `bulk-upload-parcels` | CREATE, VIEW, EXPORT, PRINT | CREATE, VIEW, EDIT, EXPORT, PRINT |
| `bulk-upload-trees` | CREATE, VIEW, EXPORT, PRINT | CREATE, VIEW, EDIT, EXPORT, PRINT |

OPERATOR, MANAGEMENT, dan DONOR **tidak punya baris** `bulk-upload*` di seed — menu ini tertutup bagi mereka kecuali lewat `UserPermissionOverride`. SUPERADMIN tetap lolos semua cek (`hasPermission` bypass) terlepas dari isi tabel.

> Sejak #245 baris VIEW sub menu di seed disertai `EXPORT` + `PRINT` (backfill dua izin keluaran baru). Di modul bulk upload belum ada tombol yang digate export/print, jadi keduanya belum berdampak di sini; tombol **Unduh Template Excel** sengaja tidak digate (bagian dari alur CREATE, bukan export data).

## Pola umum keempat halaman

- Server Component memanggil `requirePermission(<menuKey>)` + `getUserPermissionsForMenu(<menuKey>)`, memuat data referensi, lalu menyerahkan ke Client Component.
- Parsing berkas dilakukan **di browser** (`exceljs` + `papaparse`), kecuali shapefile yang diurai di server (`parseShapefile`).
- Validasi baris dijalankan di client (memberi preview), lalu divalidasi ulang di server action dengan Zod schema + guard access-context sebelum insert.
- Tombol **Simpan** hanya dirender jika `permissions.includes("CREATE")`.
- Tabel preview (Petani, Produksi, Lahan) membatasi tampilan 100 baris pertama: *"Menampilkan 100 baris pertama dari total N baris data."*
- **Tidak ada fitur riwayat upload** (upload history) di keempat halaman; jejak hanya berupa audit field `createdBy` pada record hasil insert.

## Alur upload umum

```text
Pilih file (.xlsx/.csv atau .zip shapefile)
  → Deteksi header + auto-match kolom            (Pohon Sawit: tanpa pemetaan kolom)
  → Koreksi pemetaan kolom (target field wajib/opsional)
  → Validasi data di client (format, referensi, duplikat)
  → Tinjau ringkasan + filter + unduh hasil per status
      · Upload Data Petani: 3 status Valid/Tidak Lengkap/Error (#197)
      · Upload Data Produksi & Upload Data Lahan: 2 status Valid/Error
  → Simpan (guard CREATE + Zod + access-context)
      · Upload Data Petani: dua tombol — Simpan Semua Layak ATAU Simpan Hanya yang Valid
      · Produksi, Lahan, Pohon Sawit: satu tombol (mis. "Simpan N Lahan Valid")
  → Toast sukses + redirect ke halaman master data terkait
```
