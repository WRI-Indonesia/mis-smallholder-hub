# Menu: Bulk Upload

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `bulk-upload` |
| URL | `/admin/bulk-upload` |
| Icon | `Upload` |
| Order | `3` |
| Parent | — (menu level 1) |
| Sub menu | 3 — Upload Petani (`bulk-upload-farmers`), Upload Produksi (`bulk-upload-production`), Lahan (`bulk-upload-parcels`) |
| Halaman induk | `src/app/(admin)/admin/bulk-upload/page.tsx` — hanya `redirect("/admin/bulk-upload/farmers")`, tidak ada UI |
| Sumber metadata | `prisma/seeds/data/menu.csv` baris `bulk-upload`, `bulk-upload-farmers`, `bulk-upload-production`, `bulk-upload-parcels` |

## Diagram objek

```text
Menu: Bulk Upload (/admin/bulk-upload)
└── Redirect → /admin/bulk-upload/farmers (tanpa UI)
    ├── Upload Petani    (/admin/bulk-upload/farmers)    — bulk-upload-farmers
    ├── Upload Produksi  (/admin/bulk-upload/production) — bulk-upload-production
    └── Lahan            (/admin/bulk-upload/parcels)    — bulk-upload-parcels
```

## Daftar sub menu

| # | Sub menu | Menu key | URL | Icon | Order | Dokumen |
|---|---|---|---|---|---|---|
| 1 | Upload Petani | `bulk-upload-farmers` | `/admin/bulk-upload/farmers` | `User` | `1` | [upload-petani.md](./upload-petani.md) |
| 2 | Upload Produksi | `bulk-upload-production` | `/admin/bulk-upload/production` | `TrendingUp` | `2` | [upload-produksi.md](./upload-produksi.md) |
| 3 | Lahan | `bulk-upload-parcels` | `/admin/bulk-upload/parcels` | `Map` | `3` | [lahan.md](./lahan.md) |

## Permission bawaan seed

Sumber: `prisma/seeds/data/role-permissions.csv`

| Menu key | SUPERADMIN | ADMIN | OPERATOR |
|---|---|---|---|
| `bulk-upload` | CREATE, VIEW, EDIT, DELETE | VIEW | VIEW |
| `bulk-upload-farmers` | CREATE, VIEW, EDIT, DELETE | VIEW, CREATE | VIEW, CREATE |
| `bulk-upload-production` | CREATE, VIEW | CREATE, VIEW | CREATE, VIEW |
| `bulk-upload-parcels` | CREATE, VIEW | CREATE, VIEW | — |

## Pola umum ketiga halaman

- Server Component memanggil `requirePermission(<menuKey>)` + `getUserPermissionsForMenu(<menuKey>)`, memuat data referensi, lalu menyerahkan ke Client Component.
- Parsing berkas dilakukan **di browser** (`exceljs` + `papaparse`), kecuali shapefile yang diurai di server (`parseShapefile`).
- Validasi baris dijalankan di client (memberi preview), lalu divalidasi ulang di server action dengan Zod schema + guard access-context sebelum insert.
- Tombol **Simpan** hanya dirender jika `permissions.includes("CREATE")`.
- Tabel preview membatasi tampilan 100 baris pertama: *"Menampilkan 100 baris pertama dari total N baris data."*
- **Tidak ada fitur riwayat upload** (upload history) di ketiga halaman; jejak hanya berupa audit field `createdBy` pada record hasil insert.

## Alur upload umum

```text
Pilih file (.xlsx/.csv atau .zip shapefile)
  → Deteksi header + auto-match kolom
  → Koreksi pemetaan kolom (target field wajib/opsional)
  → Validasi data di client (format, referensi, duplikat)
  → Tinjau ringkasan Valid/Error + filter + unduh hasil
  → Simpan N Data Valid (guard CREATE + Zod + access-context, transaksi)
  → Toast sukses + redirect ke halaman master data terkait
```
