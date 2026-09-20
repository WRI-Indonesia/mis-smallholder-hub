# Page: Detail Penilaian Monev BMP

[← Monev BMP](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Detail Penilaian (/admin/master-data/bmp-monev/[id])
├── Header
│   ├── Tombol kembali · Judul "Monev BMP {tahun} — {nama petani}" · ID petani (mono)
│   ├── Badge Lembaga + badge kategori
│   └── Tombol: Ubah skor indikator (EDIT)
├── Kartu stat (6): Skor tersimpan · Hitung ulang · Tgl survei · Lahan dikunjungi · Penilai · Indikator terisi (x/15 slot)
├── Peringatan (bila skor tersimpan ≠ hitung ulang > 0,01)
├── Raport 5 Kegiatan BMP (BmpActivityRaport)
│   ├── Radar skala 0–3 berpita kategori (BmpActivityRadarSvg, seri "Petani")
│   └── Tabel: Kegiatan · Bobot · Skor/3 · Kontribusi · Kosong + baris Skor akhir
├── Skor per Indikator (5 tabel, satu per kegiatan, kolom sejajar)
│   └── Baris: Kode · Level (Lembaga/Individu) · Indikator (+ "informatif" / "salah satu — petani atau pekerja") · Bobot · Skor (chip) · Arti skor (rubrik) · Catatan
├── Baris Penilaian Lembaga tahun ini (n/14 terisi, tanggal) → Kelola penilaian Lembaga
└── Dialog: BmpIndicatorEditModal
```

| Atribut | Nilai |
|---|---|
| File | `bmp-monev/[id]/page.tsx` + `bmp-assessment-detail-client.tsx` + `bmp-activity-raport.tsx` + `bmp-indicator-edit-modal.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-bmp-monev")`; `notFound()` bila penilaian di luar scope/nonaktif |
| Server action / data | `getBmpAssessmentDetailView(id)` (`@/server/actions/bmp-assessment-detail`) — rincian individu + penilaian Lembaga tahun sama + `recomputed` (hanya bila ada rincian individu) + daftar kode di luar 0–3; `getUserPermissionsForMenu` |
| Breadcrumb | `BreadcrumbOverride` "{nama} · {tahun}"; segmen `bmp-monev` → "Monev BMP" (`admin-breadcrumb.tsx`) |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Kartu `Skor tersimpan` / `Hitung ulang` | Stat | Tersimpan = angka resmi; hitung ulang = `recomputeBmpScore` (kriteria alternatif Gulma dihitung sekali) — sub "= skor tersimpan" atau "berbeda" |
| Kartu `Indikator terisi` | Stat | Slot individu berbobot (`bmpWeightedSlotKey`): 15 slot (pasangan petani/pekerja = satu) |
| Peringatan selisih | Banner | Muncul bila \|tersimpan − hitung ulang\| > 0,01; menyarankan tombol ubah + centang "timpa skor tersimpan" |
| Raport 5 Kegiatan | Kartu | Radar (komponen bersama dengan dashboard) + tabel; kontribusi = skor kegiatan × bobot kegiatan; kosong = indikator berbobot tanpa skor (dihitung 0) |
| Tabel indikator per kegiatan | Tabel | `table-fixed` + `colgroup` sama untuk kelima kegiatan; skor Lembaga dibaca dari penilaian Lembaga tahun itu; chip `BmpScoreChip` 0–3 (amber bila di luar rubrik); arti skor `bmpScoreLabel` |
| Tombol `Ubah skor indikator` | Tombol | EDIT — buka `BmpIndicatorEditModal` |
| Tautan Penilaian Lembaga | Tautan | `/admin/master-data/bmp-monev/lembaga` |

## Dialog: `BmpIndicatorEditModal`

Grid 18 indikator INDIVIDU per kegiatan: input skor 0–3 (kosong = tidak dinilai) + catatan; centang **"timpa skor tersimpan dengan hasil hitung ulang"** (opsional). Aksi `saveBmpAssessmentDetails` (upsert per indikator; indikator yang tidak dikirim tidak disentuh — skor 4 hasil import yang **tidak diubah** tidak dikirim supaya lolos batas form manual 0–3); pesan validasi menyebut kode indikator. Skor Lembaga tidak bisa diubah di sini (arahkan ke Penilaian Lembaga).
