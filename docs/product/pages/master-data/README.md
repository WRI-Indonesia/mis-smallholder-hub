# Menu: Master Data

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

## Diagram objek

```text
Menu: Master Data (/admin/master-data)
├── Sub Menu: Lembaga Petani (/admin/master-data/groups)
│   ├── Page: Lembaga Petani (daftar)
│   └── Page: Detail Lembaga Petani
├── Sub Menu: Petani (/admin/master-data/farmers)
│   ├── Page: Petani (daftar)
│   └── Page: Detail Petani
├── Sub Menu: Pelatihan (/admin/master-data/training)
│   ├── Page: Pelatihan (daftar)
│   └── Page: Detail Pelatihan
├── Sub Menu: Lahan (/admin/master-data/parcels)
│   ├── Page: Lahan (daftar)
│   └── Page: Detail Lahan
└── Sub Menu: Produksi (/admin/master-data/production)
    ├── Page: Produksi (daftar)
    ├── Page: Tambah Data Produksi
    ├── Page: Detail Produksi
    └── Page: Edit Data Produksi
```

| Atribut | Nilai |
|---|---|
| Menu key | `master-data` |
| URL | `/admin/master-data` |
| Icon | `Database` |
| Sub menu | 5 — Lembaga Petani (`master-data-groups`), Petani (`master-data-farmers`), Pelatihan (`master-data-training`), Lahan (`master-data-parcels`), Produksi (`master-data-production`) |
| File | `src/app/(admin)/admin/master-data/page.tsx` — `redirect("/admin/master-data/farmers")` (tidak ada halaman index sendiri) |

## Daftar sub menu

| # | Sub Menu | Key | URL | Icon | Dokumen |
|---|---|---|---|---|---|
| 1 | Lembaga Petani | `master-data-groups` | `/admin/master-data/groups` | `Users` | [lembaga-petani/](./lembaga-petani/README.md) |
| 2 | Petani | `master-data-farmers` | `/admin/master-data/farmers` | `User` | [petani/](./petani/README.md) |
| 3 | Pelatihan | `master-data-training` | `/admin/master-data/training` | `GraduationCap` | [pelatihan/](./pelatihan/README.md) |
| 4 | Lahan | `master-data-parcels` | `/admin/master-data/parcels` | `Map` | [lahan/](./lahan/README.md) |
| 5 | Produksi | `master-data-production` | `/admin/master-data/production` | `TrendingUp` | [produksi/](./produksi/README.md) |

## Objek bersama (dipakai di semua halaman daftar)

Semua halaman daftar memakai `DataTable` (`src/components/shared/data-table.tsx`) + `TableActions` (`src/components/shared/table-actions.tsx`).

| Objek | Tipe | Keterangan |
|---|---|---|
| Kotak pencarian | Filter | Input `type="search"`, placeholder per halaman |
| Tombol `Excel` | Tombol | Ekspor baris terfilter ke `.xlsx` (nama file per halaman) |
| Tombol `Kolom` → `Tampilkan Kolom` | Dropdown | Toggle visibilitas kolom (kolom `defaultVisible: false` tersembunyi awalnya) |
| Paginasi | Navigasi | Kontrol halaman di bawah tabel |
| Kolom aksi | Tombol ikon | `Lihat` (VIEW), `Edit` (EDIT), `Nonaktifkan`/`Aktifkan kembali` (DELETE) — tiap tombol hilang bila permission tak ada |
| Filter `Status` | Select | `Semua Status` / `Aktif` / `Nonaktif`, default `Aktif`; **hanya SUPERADMIN**. Kolom `Status` juga hanya tampil untuk SUPERADMIN |
| `loading.tsx` | Skeleton | Ada di groups, farmers, training, parcels, production |
