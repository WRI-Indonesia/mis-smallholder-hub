# Sub Menu: Lembaga Petani

[← Master Data](../README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Sub Menu: Lembaga Petani (/admin/master-data/groups)
├── Page: Lembaga Petani (daftar)
│   ├── Kartu KPI
│   ├── Toolbar (filter + Tambah Lembaga Petani)
│   ├── Tabel daftar
│   └── Dialog: GroupFormModal
└── Page: Detail Lembaga Petani (/admin/master-data/groups/[id])
    ├── Header + Kartu ringkasan
    ├── Tabs: Ringkasan · Petani · Lahan · Pelatihan · Produksi
    └── Dialog: GroupFormModal
```

| Atribut | Nilai |
|---|---|
| Menu key | `master-data-groups` |
| URL | `/admin/master-data/groups` |
| Icon | `Users` |
| Jumlah halaman | 2 |

## Daftar halaman

| Page | Route | Dokumen |
|---|---|---|
| Lembaga Petani (daftar) | `/admin/master-data/groups` | [daftar.md](./daftar.md) |
| Detail Lembaga Petani | `/admin/master-data/groups/[id]` | [detail.md](./detail.md) |

Objek umum tabel (pencarian, ekspor Excel, toggle kolom, paginasi, kolom aksi, filter Status SUPERADMIN) dijelaskan di [Objek bersama](../README.md#objek-bersama-dipakai-di-semua-halaman-daftar).
