# Page: Monev BMP (daftar)

[← Monev BMP](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Monev BMP (/admin/master-data/bmp-monev)
├── Header
│   ├── Judul: Monev BMP + HelpHint
│   └── Deskripsi
├── Kartu KPI (4)
│   ├── Penilaian (baris aktif)
│   ├── Petani Dinilai (unik)
│   ├── Lembaga Petani (unik)
│   └── Rerata Skor (sub: n menerapkan BMP = skor ≥ 1,00, definisi #360)
├── Toolbar
│   ├── Filter: Distrik · Lembaga Petani (DistrictGroupFilter, cascade)
│   ├── Filter: Tahun survei (select, dari data)
│   ├── Filter: Kategori (Teladan/Praktisi/Perintis/Belum Implementasi)
│   ├── Filter: Status (SUPERADMIN: Aktif/Nonaktif/Semua)
│   ├── Pencarian (nama/ID petani, Lembaga, lahan, penilai)
│   ├── Tombol: Penilaian Lembaga (→ /lembaga)
│   ├── Tombol: Import Excel (CREATE)
│   ├── Tombol: Tambah Penilaian (CREATE)
│   ├── Tombol: Excel (EXPORT, `data-monev-bmp`)
│   └── Tombol: Kolom
├── Tabel
│   ├── Kolom: Petani (nama + ID), Lembaga Petani, Tahun, Tgl Survei, Skor, Kategori (badge),
│   │          Lahan Dikunjungi, Penilai, Catatan, Status (SUPERADMIN)
│   └── Aksi baris: Lihat → detail · Ubah (baris aktif saja) · Nonaktifkan / Aktifkan kembali
└── Dialog
    ├── BmpAssessmentFormModal (Tambah / Ubah)
    └── BmpMonevImportDialog (tab Rekap skor · tab Form survei per petani)
```

| Atribut | Nilai |
|---|---|
| File | `bmp-monev/page.tsx` + `bmp-monev-list-client.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-bmp-monev")` |
| Server action / data | `getBmpAssessments()` (`@/server/actions/bmp-assessment`), `getFarmerGroupOptions("master-data-bmp-monev")`, `getDistrictsForSelect`, `getUserPermissionsForMenu`, `isSuperAdmin` |
| Loading | `bmp-monev/loading.tsx` (`TableSkeleton`) |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Kartu KPI (4) | Kartu | `Penilaian`, `Petani Dinilai`, `Lembaga Petani`, `Rerata Skor` — dihitung klien dari baris **aktif** hasil filter |
| Filter Distrik / Lembaga | Combobox | `DistrictGroupFilter`; Lembaga menyempit mengikuti Distrik |
| Filter Tahun / Kategori | Select | `Semua Tahun` (tahun dari data) · `Semua Kategori` (urut Teladan → Belum Implementasi) |
| Filter Status | Select | SUPERADMIN saja; bawaan `Aktif` |
| Tombol `Penilaian Lembaga` | Tautan | `/admin/master-data/bmp-monev/lembaga` |
| Tombol `Import Excel` | Tombol | CREATE — buka `BmpMonevImportDialog` |
| Tombol `Tambah Penilaian` | Tombol | CREATE — buka `BmpAssessmentFormModal` (di-remount tiap buka lewat `key` nonce supaya isian sebelumnya tak terbawa) |
| Tabel daftar | `DataTable` | Skor `formatScore` (2 desimal, koma), Kategori `BmpCategoryBadge`, Tgl Survei `formatUtcDate` |
| Aksi baris | `TableActions` | Lihat → `/bmp-monev/{id}`; **Ubah hanya pada baris aktif** (`updateBmpAssessment` menolak baris nonaktif); Nonaktifkan/Aktifkan → `toggleBmpAssessmentActive` |
| Ekspor | Tombol | `data-monev-bmp` (izin EXPORT), kolom = definisi tabel |

## Dialog: `BmpAssessmentFormModal` (`bmp-assessment-form-modal.tsx`)

Judul `Tambah Penilaian` / `Ubah Penilaian`; aksi `createBmpAssessment` / `updateBmpAssessment`; validasi `bmpAssessmentSchema` / `updateBmpAssessmentSchema` (`src/validations/bmp-assessment.schema.ts`). Dipakai juga dari tab Monev BMP Detail Petani dengan `fixedFarmer`.

| Field | Input |
|---|---|
| `Lembaga Petani` | combobox (menyempit ke scope; menentukan daftar Petani) |
| `Petani` | combobox (`getFarmersForBmpSelect`) |
| `Tahun Survei` | angka (≥ 2020, ≤ tahun depan) |
| `Tanggal Survei` | date picker, opsional; disimpan UTC tengah malam (`toUtcDay`), toleransi masa depan 24 jam (WIB/WITA/WIT) |
| `Skor (0–3)` | teks desimal koma/titik (`parseScore`), pratinjau badge kategori |
| `Lahan Dikunjungi` | select lahan aktif petani (`getFarmerParcelOptions`), opsional |
| `Penilai / Fasilitator`, `Catatan` | teks |

Aturan: satu baris aktif per petani-tahun — duplikat aktif ditolak (`DUPLICATE_YEAR_MESSAGE`; race ditangkap P2002 `isPrismaUniqueViolation`).

## Dialog: `BmpMonevImportDialog` (`bmp-monev-import-dialog.tsx`)

Wajib memilih **Lembaga Petani** dulu (ID petani hanya unik per Lembaga); `Penilai` opsional berlaku untuk seluruh batch.

| Tab | Isi |
|---|---|
| **Rekap skor (satu sheet)** | `Unduh Template` (`Template_Import_Monev_BMP.xlsx`, header satu tahun) · pilih `.xlsx` · pratinjau (`parseBmpImportRows` header dua baris multi-tahun, `resolveBmpImportRows` cocokkan ID Petani + lahan) → `importBmpAssessments` upsert per petani-tahun (tanggal/lahan hanya ditimpa bila terisi; transaksi timeout 120 s) |
| **Form survei per petani (banyak berkas)** | `BmpSurveyImportPanel` (`bmp-survey-import-panel.tsx`, di-remount saat Lembaga berganti): baca banyak `.xlsx` di klien (3 paralel + progress), `parseBmpSurveyForm` per berkas, nama petani dari **nama berkas** → `matchFarmerName` (Yakin/Ragu/Ganda/Tak ditemukan) + dropdown; peringatan header ≠ berkas, skor di luar 0–3, Periode masa depan (dikosongkan), total form vs hitung ulang; kolom `Skor` = **hitung ulang** yang akan disimpan → `importBmpSurveyForms` (satu transaksi; penilaian Lembaga tahun itu dari berkas pertama) |

Ringkasan hasil: dibuat/diperbarui/baris rincian/ditolak (dengan alasan) + peringatan.
