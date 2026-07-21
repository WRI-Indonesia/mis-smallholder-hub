# Sub Menu: Pelatihan

[← Master Data](../README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Sub Menu: Pelatihan (/admin/master-data/training)
├── Page: Pelatihan (daftar)
│   ├── Kartu KPI
│   ├── Toolbar (filter + Tambah Pelatihan)
│   ├── Tabel daftar
│   └── Dialog: TrainingFormModal
└── Page: Detail Pelatihan (/admin/master-data/training/[id])
    ├── Kartu info kegiatan
    ├── Tabel peserta
    └── Dialog: AddParticipantsModal
```

| Atribut | Nilai |
|---|---|
| Menu key | `master-data-training` |
| URL | `/admin/master-data/training` |
| Icon | `GraduationCap` |
| Jumlah halaman | 2 |

## Daftar halaman

| Page | Route | Dokumen |
|---|---|---|
| Pelatihan (daftar) | `/admin/master-data/training` | [daftar.md](./daftar.md) |
| Detail Pelatihan | `/admin/master-data/training/[id]` | [detail.md](./detail.md) |

Label paket (`TRAINING_CATEGORY_LABELS`): `Paket 1 - BMP + P&C RSPO + NKT`, `Paket 2 - MK (Manajemen Kelompok)`, `Paket 2 - K3 (Keselamatan & Kesehatan Kerja)`, `Paket 3&4`, `Lainnya`.

Objek umum tabel dijelaskan di [Objek bersama](../README.md#objek-bersama-dipakai-di-semua-halaman-daftar).
