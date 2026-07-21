# Sub Menu: Petani

[← Master Data](../README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Sub Menu: Petani (/admin/master-data/farmers)
├── Page: Petani (daftar)
│   ├── Kartu KPI
│   ├── Toolbar (filter + Tambah Petani)
│   ├── Tabel daftar
│   └── Dialog: FarmerFormModal
└── Page: Detail Petani (/admin/master-data/farmers/[id])
    ├── Header + Kartu ringkasan
    ├── Tabs: Ringkasan · Lahan · Pelatihan · Produksi
    └── Dialog: FarmerFormModal
```

| Atribut | Nilai |
|---|---|
| Menu key | `master-data-farmers` |
| URL | `/admin/master-data/farmers` |
| Icon | `User` |
| Jumlah halaman | 2 |

## Daftar halaman

| Page | Route | Dokumen |
|---|---|---|
| Petani (daftar) | `/admin/master-data/farmers` | [daftar.md](./daftar.md) |
| Detail Petani | `/admin/master-data/farmers/[id]` | [detail.md](./detail.md) |

Objek umum tabel dijelaskan di [Objek bersama](../README.md#objek-bersama-dipakai-di-semua-halaman-daftar).
