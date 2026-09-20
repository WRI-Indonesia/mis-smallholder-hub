# Sub Menu: Monev BMP

[← Master Data](../README.md) · [← Katalog halaman](../../README.md)

Hasil **Monitoring & Evaluasi praktik BMP** per petani per tahun survei (#344) beserta rincian 32 indikator dan penilaian Lembaga (#346). Skor 0–3 → kategori **Teladan** (> 2,50 ketat) · **Praktisi** (1,50–2,50) · **Perintis** (1,00–1,49) · **Belum Implementasi** (< 1,00) — konstanta `BMP_ASSESSMENT_CATEGORIES` (`src/lib/bmp-assessment.ts`), tidak disimpan di DB.

## Diagram objek

```text
Sub Menu: Monev BMP (/admin/master-data/bmp-monev)
├── Page: Monev BMP (daftar)
│   ├── Kartu KPI (4)
│   ├── Toolbar (filter Distrik/Lembaga/Tahun/Kategori/Status + Penilaian Lembaga · Import Excel · Tambah Penilaian)
│   ├── Tabel daftar (aksi: Lihat · Ubah · Nonaktifkan)
│   ├── Dialog: BmpAssessmentFormModal (Tambah / Ubah skor akhir)
│   └── Dialog: BmpMonevImportDialog — tab Rekap skor (satu sheet) · tab Form survei per petani (banyak berkas)
├── Page: Detail Penilaian (/admin/master-data/bmp-monev/[id])
│   ├── Header + 6 kartu stat
│   ├── Raport 5 Kegiatan (radar + tabel)
│   ├── Skor per Indikator (5 tabel per kegiatan, 32 baris)
│   ├── Dialog: BmpIndicatorEditModal (grid skor individu ± timpa skor)
│   └── Baris Penilaian Lembaga tahun itu → tautan Kelola
└── Page: Penilaian Lembaga (/admin/master-data/bmp-monev/lembaga)
    ├── Tabel Lembaga × tahun (14 chip indikator + rerata, urut rerata/abjad)
    └── Dialog: form Tambah / Ubah (14 indikator + tanggal/penilai/catatan)
```

| Atribut | Nilai |
|---|---|
| Menu key | `master-data-bmp-monev` (halaman detail, Penilaian Lembaga, dan tab import **menumpang** key ini — tanpa menu tambahan) |
| URL | `/admin/master-data/bmp-monev` |
| Icon | `ClipboardCheck` |
| Order | `6` (sesudah Produksi) |
| Jumlah halaman | 3 |
| Role dengan VIEW (seed) | SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT, DONOR — cermin `master-data-training` (17 baris `role-permissions.csv`) |

## Daftar halaman

| Page | Route | Dokumen |
|---|---|---|
| Monev BMP (daftar) | `/admin/master-data/bmp-monev` | [daftar.md](./daftar.md) |
| Detail Penilaian | `/admin/master-data/bmp-monev/[id]` | [detail.md](./detail.md) |
| Penilaian Lembaga | `/admin/master-data/bmp-monev/lembaga` | [penilaian-lembaga.md](./penilaian-lembaga.md) |

## Model & aturan yang dipakai bersama

- `BmpAssessment` (`tbl_bmp_assessment`): satu baris **aktif** per petani-tahun (partial unique `uniq_bmp_assessment_farmer_year_active`); `score` = angka resmi; `parcelUid` (lahan dikunjungi) opsional; tanggal survei disimpan UTC tengah malam, ditampilkan `formatUtcDate`.
- `BmpIndicator` (`ref_bmp_indicator`, 32 baris ter-seed), `BmpAssessmentDetail` (skor INDIVIDU per penilaian), `BmpGroupAssessment` + `Detail` (14 skor LEMBAGA per Lembaga-tahun, partial unique `uniq_bmp_group_assessment_group_year_active`). Lihat [database/models.md](../../../database/models.md#rincian-indikator-346).
- Rumus: skor akhir = Σ bobot kegiatan × Σ (bobot indikator × skor); kriteria **1.3.2 Identifikasi Gulma alternatif** (petani ATAU pekerja — `BMP_EXCLUSIVE_CRITERIA`, `src/lib/bmp-survey-form.ts`) sehingga maksimum 3,00. `recomputeBmpScore` dipakai halaman detail, pratinjau import, dan dashboard.
- Tiga lapis keamanan: `hasPermission("master-data-bmp-monev", …)` di tiap action; scope `farmerRelationAccessFilter` / `farmerGroupAccessFilter` lewat `AND` (bukan spread); `isActive` di petani, Lembaga, penilaian, rincian.
- Tautan silang: tab **Monev BMP** + badge kategori terbaru di [Detail Petani](../petani/detail.md); [Dashboard › Monev BMP](../../dashboard/dashboard-monev-bmp.md).
