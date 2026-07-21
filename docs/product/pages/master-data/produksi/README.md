# Sub Menu: Produksi

[← Master Data](../README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Sub Menu: Produksi (/admin/master-data/production)
├── Page: Produksi (daftar)
│   ├── Toolbar (filter + Tambah Data)
│   └── Tabel daftar
├── Page: Tambah Data Produksi (/admin/master-data/production/new)
│   ├── Seksi: Informasi Petani & Lahan
│   └── Seksi: Data Produksi
├── Page: Detail Produksi (/admin/master-data/production/[id])
│   ├── Kartu Informasi Petani & Lahan
│   ├── Kartu Data Produksi
│   └── Audit trail
└── Page: Edit Data Produksi (/admin/master-data/production/[id]/edit)
    └── Form (Petani dikunci)
```

| Atribut | Nilai |
|---|---|
| Menu key | `master-data-production` |
| URL | `/admin/master-data/production` |
| Icon | `TrendingUp` |
| Jumlah halaman | 4 |

## Daftar halaman

| Page | Route | Dokumen |
|---|---|---|
| Produksi (daftar) | `/admin/master-data/production` | [daftar.md](./daftar.md) |
| Tambah Data Produksi | `/admin/master-data/production/new` | [tambah.md](./tambah.md) |
| Detail Produksi | `/admin/master-data/production/[id]` | [detail.md](./detail.md) |
| Edit Data Produksi | `/admin/master-data/production/[id]/edit` | [ubah.md](./ubah.md) |

Objek umum tabel dijelaskan di [Objek bersama](../README.md#objek-bersama-dipakai-di-semua-halaman-daftar).
