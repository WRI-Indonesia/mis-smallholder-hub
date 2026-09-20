# Page: Penilaian Lembaga (Monev BMP)

[← Monev BMP](./README.md) · [← Katalog halaman](../../README.md)

Penilaian 14 indikator level **LEMBAGA** per Lembaga Petani per tahun survei (#346). Enam di antaranya berbobot dan **masuk skor akhir setiap petani** Lembaga itu (standar teknis kerja, infrastruktur panen, transportasi, taksasi produksi, catatan produksi, …), karena itu disimpan sekali per Lembaga-tahun, bukan diulang per petani. Tidak ada skor kelembagaan agregat (keputusan owner).

## Diagram objek

```text
Halaman: Penilaian Lembaga (/admin/master-data/bmp-monev/lembaga)
├── Header: tombol kembali · judul · Tambah Penilaian Lembaga (EDIT)
├── Toolbar: urut Rerata / Abjad
├── Tabel
│   ├── Kolom: Lembaga · Tahun · Tgl survei · Penilai · Rerata (14 indikator) · 14 chip skor (0–3, — bila kosong) · Aksi Ubah
│   └── Empty state
└── Dialog: form Tambah / Ubah
    ├── Lembaga Petani (combobox) · Tahun · Tanggal (kalender) · Penilai · Catatan
    └── 14 baris indikator: skor 0–3 + catatan (label rubrik ditampilkan)
```

| Atribut | Nilai |
|---|---|
| File | `bmp-monev/lembaga/page.tsx` + `bmp-group-assessment-client.tsx` |
| Guard | `requirePermission("master-data-bmp-monev")` |
| Server action / data | `getBmpGroupAssessments()`, `getBmpIndicators()` (`@/server/actions/bmp-assessment-detail`), `getFarmerGroupOptions("master-data-bmp-monev")`, `getUserPermissionsForMenu`; simpan `upsertBmpGroupAssessment` |
| Loading | `lembaga/loading.tsx` (`TableSkeleton`) |

## Aturan simpan

- **Tambah** ditolak bila Lembaga-tahun itu sudah punya penilaian aktif ("buka lewat tombol Ubah") — mencegah 14 skor tertimpa isian kosong; **Ubah** membawa `id` baris yang dibuka dan ditolak bila baris itu sudah nonaktif; race dua operator ditangkap partial unique (P2002 → "muat ulang halaman").
- Skor form manual 0–3; skor 4 hasil import yang tidak diubah tidak dikirim (baris tak dikirim tidak disentuh).
- Import form survei mengisi halaman ini otomatis dari berkas pertama tiap tahun; berkas lain yang berbeda hanya menghasilkan peringatan.
