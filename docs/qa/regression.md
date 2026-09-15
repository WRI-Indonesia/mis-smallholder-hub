# Regresi — kasus yang ikut setiap rilis

Kasus ber-tag `[regresi]` yang lahir dari temuan review/bug. Disalin ke sini saat rilis ditutup (ID asli dipertahankan); `new-run.mjs` selalu menyertakannya. Hapus hanya bila fiturnya dihapus.

### TC-REV-01 · Shapefile patok dengan DBF berkolom LINTANG/BUJUR [P1] [regresi] (3 mnt)
Asal: review 2026-09-15 (#329). Prasyarat: shapefile Point patok yang DBF-nya punya kolom `LINTANG`/`BUJUR` lama (`evidence/input/patok-dbf-lintang.zip`).
Langkah:
1. Bulk Upload › Lahan › Patok → unggah ZIP → validasi
Harapan:
- Koordinat baris = **geometri titik**, bukan nilai atribut DBF

### TC-REV-02 · Dua baris GPS di titik yang sama dalam satu berkas [P1] [regresi] (3 mnt)
Asal: review 2026-09-15 (#329). Prasyarat: Excel patok 2 baris koordinat identik tanpa No Patok.
Langkah:
1. Bulk Upload › Lahan › Patok → validasi → Simpan
Harapan:
- Ringkasan: 1 dibuat + 1 diperbarui (bukan 2 patok)

### TC-REV-03 · Kode Patok Lembaga lain tidak bisa dipindahkan [P0] [regresi] (3 mnt)
Asal: review 2026-09-15 (#331, celah kepemilikan). Prasyarat: Excel patok 1 baris: ID Lahan milik sendiri, Kode Patok milik lahan Lembaga lain > 100 m.
Langkah:
1. Bulk Upload › Lahan › Patok → validasi → Simpan
Harapan:
- Baris **ditolak** "… bukan patok lahan ini …"; koordinat patok tersebut tidak berubah (cek di Report › Patok)

### TC-REV-04 · Layer patok Peta Lahan tidak macet [P1] [regresi] (2 mnt)
Asal: review 2026-09-15 (#331). Prasyarat: Peta Lahan 1 Distrik dimuat.
Langkah:
1. Centang **Patok lahan**, langsung hapus centang, centang lagi
2. Ganti dropdown Lembaga **tanpa** Muat Data
Harapan:
- Titik tetap muncul (spinner tidak menggantung); titik tidak berganti sebelum Muat Data

### TC-REV-05 · Sel Status NKT `0`/FALSE tidak terbalik jadi terdampak [P0] [regresi] (3 mnt)
Asal: review 2026-09-15 (#328). Prasyarat: template NKT dengan bawaan berkas Terdampak; satu baris Status = `0`, satu = `tidak`.
Langkah:
1. Bulk Upload › Lahan › Detail Lahan → validasi
Harapan:
- Kedua baris terbaca **Tidak terdampak**, bukan Terdampak

### TC-REV-06 · Kolom Patok Laporan Lahan ikut ke Excel & PDF [P0] [regresi] (3 mnt)
Asal: review #339 (2026-09-15) — kolom didefinisikan di satu tempat, baris ekspor di dua tempat lain; kelas bug #323 (berkas terlihat sah, kolom kosong). Prasyarat: Lembaga dengan patok (HJP).
Langkah:
1. Report › Lahan › Kampar › HJP → **Kolom** → centang **Patok** (dan **NKT**) → Excel, lalu PDF
Harapan:
- Excel sheet Lahan: kolom **Patok** angka (mis. `4`) dan **Kondisi Patok** teks (mis. `4 belum dipasang`) terisi sama dengan tabel di layar; PDF: kedua kolom terisi, bukan "-". Lembaga tanpa patok → `0` dan "-"

### TC-REV-07 · Status NKT dengan nomor surat & angka format Inggris [P1] [regresi] (3 mnt)
Asal: review #339 (2026-09-15). Prasyarat: template NKT 2 baris — Status `Terdampak (No. SK 12/2025)`; Luas NKT `1,234.5`.
Langkah:
1. Bulk Upload › Lahan › Detail Lahan → validasi
Harapan:
- Baris 1 terbaca **Terdampak** (bukan tidak terdampak); Luas NKT terbaca **1.234,5** ha (bukan 1,2345)

### TC-REV-08 · Bingkai peta PDF Profil Lahan memuat patok GPS jauh [P2] [regresi] (2 mnt)
Asal: review #339 (2026-09-15). Prasyarat: lahan kecil (< 100 m) dengan satu patok GPS ±80 m di luar batas (tambah manual di tab Patok).
Langkah:
1. Detail Lahan → Unduh PDF Profil Lahan
Harapan:
- Persegi bernomor patok itu **terlihat** di peta (bingkai melebar), dan tercantum di tabel Patok Batas
