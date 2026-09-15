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
