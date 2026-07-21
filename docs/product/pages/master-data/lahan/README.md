# Sub Menu: Lahan

[← Master Data](../README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Sub Menu: Lahan (/admin/master-data/parcels)
├── Page: Lahan (daftar)
│   ├── Toolbar (filter + Tambah Lahan)
│   ├── Tabel daftar
│   └── Dialog: ParcelFormModal
└── Page: Detail Lahan (/admin/master-data/parcels/[id])
    ├── Kartu Informasi Lahan
    ├── Kartu Informasi Pemilik
    ├── Kartu Peta Spasial Lahan
    └── Dialog: ParcelFormModal
```

| Atribut | Nilai |
|---|---|
| Menu key | `master-data-parcels` |
| URL | `/admin/master-data/parcels` |
| Icon | `Map` |
| Jumlah halaman | 2 |

## Daftar halaman

| Page | Route | Dokumen |
|---|---|---|
| Lahan (daftar) | `/admin/master-data/parcels` | [daftar.md](./daftar.md) |
| Detail Lahan | `/admin/master-data/parcels/[id]` | [detail.md](./detail.md) |

Objek umum tabel dijelaskan di [Objek bersama](../README.md#objek-bersama-dipakai-di-semua-halaman-daftar).
