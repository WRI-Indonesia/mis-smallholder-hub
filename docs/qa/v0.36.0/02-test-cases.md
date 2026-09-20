# 02 · Kasus uji per issue — v0.36.0

Satu **blok** per kasus; hasil di `runs/`. Dijalankan sebagai **OPERATOR ter-scope Rokan Hulu** kecuali disebut lain. Data uji memakai **kode Lembaga** (`ISH-1406-01` KPUD Tujuh Permata · `ISH-1406-06` APKASA Rayon SKPE · `ISH-1406-08` ASPEK RSB), bukan nama orang; petani disebut lewat ID (`SM.14.06.11.0001` dll.) di lembar run.

`Baseline dev` = `mis-dev` 2026-09-20 (188 penilaian aktif 2026 · 184 ber-rincian · 8 penilaian Lembaga · rerata 1,93 · Teladan 7 / Praktisi 149 / Perintis 32 / Belum 0) — pembanding bentuk, bukan pengganti hasil staging.

## #344 — Skor Monev BMP per petani per tahun

### TC-344-01 · Tambah penilaian manual + duplikat tahun ditolak [P0] (4 mnt)
Prasyarat: CREATE `master-data-bmp-monev`; petani `ISH-1406-06` yang **belum** punya skor 2027.
Langkah:
1. Master Data › Monev BMP › **Tambah Penilaian** › Lembaga › Petani › Tahun `2027` › Skor `2,5` › Simpan
2. Ulangi untuk petani & tahun yang sama dengan skor lain
Harapan:
- Baris baru tampil dengan badge **Praktisi** (2,50 = Praktisi, bukan Teladan); langkah 2 ditolak dengan pesan tahun sudah ada; `data-qc.ts` E7 = 0.

### TC-344-02 · Skor 2,51 = Teladan; skor koma & titik [P1] (2 mnt)
Langkah:
1. Tambah Penilaian dengan skor `2,51`; lalu Ubah skor menjadi `1.49`
Harapan:
- Badge **Teladan** lalu **Perintis**; angka tampil `2,51` / `1,49`.

### TC-344-03 · Tanggal survei tidak mundur sehari [P0] [regresi] (2 mnt)
Langkah:
1. Tambah/Ubah penilaian, pilih tanggal survei **hari ini** di kalender › Simpan
2. Refresh daftar; buka detail; buka Detail Petani › tab Monev BMP
Harapan:
- Tanggal yang sama di ketiga tempat (tidak mundur sehari di WIB); tanggal hari ini **tidak** ditolak sebagai masa depan.

### TC-344-04 · Nonaktifkan → Ubah disembunyikan → Aktifkan kembali [P1] (2 mnt)
Peran: SUPERADMIN.
Langkah:
1. Nonaktifkan 1 baris › filter Status = Nonaktif
2. Coba buka URL detail baris itu sebagai OPERATOR
Harapan:
- Baris nonaktif hanya punya aksi **Aktifkan kembali** (tanpa Ubah); OPERATOR mendapat 404/kosong untuk URL detail baris nonaktif; setelah Aktifkan kembali baris kembali normal.

### TC-344-05 · Import rekap: impor ulang = Perbarui tanpa menghapus tanggal/lahan [P0] (5 mnt)
Prasyarat: TC-PREP-01 sudah jalan; `rekap-skpe.xlsx` yang sama, satu baris skornya diubah dan **tanggalnya dikosongkan**.
Langkah:
1. Import Excel › Rekap skor › Lembaga `ISH-1406-06` › unggah › pratinjau semua "Perbarui" › Simpan
Harapan:
- Ringkasan `diperbarui = n`; baris yang tanggalnya kosong di berkas **tetap** menampilkan tanggal lama; skor yang diubah berubah.

### TC-344-06 · Import rekap: template unduhan bisa diimpor kembali [P1] (3 mnt)
Langkah:
1. Import Excel › **Unduh Template** › isi 1 baris (ID Petani valid `ISH-1406-06`, tahun berjalan, tanggal `26 Juni <tahun>`, skor `1,83`) › unggah
Harapan:
- Pratinjau 1 baris valid (tahun dari kolom header tahun); Simpan → 1 dibuat/diperbarui.

### TC-344-07 · Excel daftar memuat kolom ID Petani & Kategori [P0] (2 mnt)
Prasyarat: EXPORT.
Langkah:
1. Master Data › Monev BMP › filter Lembaga › **Excel** › buka berkas
Harapan:
- Kolom `Petani`, **`ID Petani`**, `Lembaga Petani`, `Tahun`, `Tgl Survei`, `Skor`, `Kategori`, `Lahan Dikunjungi`, `Penilai`, `Catatan` terisi (tidak ada kolom kosong sistematis); jumlah baris = layar.

### TC-344-08 · Dashboard Monev: filter URL & angka KPI konsisten dengan daftar [P0] (4 mnt)
Langkah:
1. Dashboard › Monev BMP › pilih Lembaga `ISH-1406-06` › catat **Petani Dinilai** & **Rerata Skor**; salin URL, buka di tab baru
2. Master Data › Monev BMP › filter Lembaga sama, tahun sama › bandingkan KPI
Harapan:
- URL memuat `?lembaga=…&tahun=…` dan tab baru menampilkan filter yang sama; Petani Dinilai = KPI "Petani Dinilai" daftar; rerata sama (2 desimal).

## #346 — Rincian indikator, penilaian Lembaga, import form survei

### TC-346-01 · Import form survei: identitas dari nama berkas, dropdown untuk Ganda/Tak ditemukan [P0] (8 mnt)
Prasyarat: TC-PREP-02 berkas; satu berkas dinamai sengaja beda ejaan (`Rusdhi.xlsx` untuk petani "Rusdi"), satu berkas nama yang tidak ada.
Langkah:
1. Tab Form survei › Lembaga `ISH-1406-01` › pilih berkas › periksa kolom Cocok
2. Pilih petani di dropdown untuk baris Tak ditemukan › Simpan
Harapan:
- Beda ejaan kecil = **Ragu** dengan petani terisi; Tak ditemukan wajib dipilih dulu (tombol Simpan tidak mengirim baris tanpa petani); header ≠ nama berkas ditandai (nama berkas yang dipakai).

### TC-346-02 · Skor akhir = hitung ulang, bukan total form [P0] (3 mnt)
Prasyarat: satu form yang total raportnya sengaja **beda** dari sheet indikator (mis. Total 2,00 padahal indikator penuh 3).
Langkah:
1. Import form → catat kolom **Skor** di pratinjau dan catatan "Total di form X — disimpan hasil hitung ulang" › Simpan › buka detail penilaian
Harapan:
- Skor tersimpan = hitung ulang; kartu **Hitung ulang** "= skor tersimpan" (tanpa banner selisih).

### TC-346-03 · Gulma: petani ATAU pekerja, maks 3,00 [P0] [regresi] (3 mnt)
Prasyarat: form dengan 1.3.2.1 (petani) = 3 **dan** 1.3.2.2 (pekerja) = 3, semua indikator Gulma = 3.
Langkah:
1. Import → detail penilaian › Raport 5 Kegiatan › Pengendalian Gulma
Harapan:
- Skor kegiatan Gulma **3,00** (bukan 3,60); tabel indikator menandai "(salah satu — petani atau pekerja)"; radar sumbu Gulma di batas luar.

### TC-346-04 · Batch tanpa sheet Lembaga memakai penilaian Lembaga tersimpan [P0] (4 mnt)
Prasyarat: Lembaga `ISH-1406-01` sudah punya penilaian Lembaga 2026; form yang sheet **Form Survey Lembaga**-nya dihapus.
Langkah:
1. Import form itu › Simpan › buka detail
Harapan:
- Peringatan "Sheet Form Survey Lembaga tidak ditemukan" di pratinjau; skor tersimpan **tidak** turun (6 indikator Lembaga dihitung dari penilaian tersimpan); detail tanpa banner "≠ skor".

### TC-346-05 · Skor 4 diterima + ditandai; skor absurd dikosongkan [P1] (3 mnt)
Prasyarat: form dengan satu sel skor `4` dan satu sel `33`.
Langkah:
1. Import → pratinjau › Simpan › detail
Harapan:
- Pratinjau: "1 skor di luar 0–3" dan "Skor … = 33 tidak masuk akal — dianggap kosong"; batch **tetap tersimpan**; detail: chip 4 berwarna amber "di luar rubrik", sel 33 kosong.

### TC-346-06 · Berkas rusak tidak menggugurkan berkas lain [P1] (2 mnt)
Prasyarat: `rusak.xls` + 2 form valid.
Langkah:
1. Pilih ketiganya sekaligus
Harapan:
- 2 form terbaca; kotak "1 berkas gagal dibaca" menyebut `rusak.xls` + alasannya; Simpan menyimpan 2.

### TC-346-07 · Ubah skor indikator ± timpa skor tersimpan [P0] (4 mnt)
Prasyarat: EDIT; penilaian ber-rincian.
Langkah:
1. Detail › **Ubah skor indikator** › ubah 1 skor › Simpan tanpa centang
2. Ulangi dengan centang "timpa skor tersimpan"
Harapan:
- Langkah 1: banner "Skor tersimpan ≠ hitung ulang" muncul, skor tersimpan tetap; langkah 2: skor tersimpan = hitung ulang, banner hilang; skor 4 hasil import yang tidak diubah **tidak** menggagalkan simpan.

### TC-346-08 · Penilaian Lembaga: Tambah ditolak bila tahun sudah ada; Ubah menimpa yang dibuka [P0] (4 mnt)
Langkah:
1. Penilaian Lembaga › **Tambah** › Lembaga `ISH-1406-01` › tahun yang sudah ada › Simpan
2. **Ubah** baris itu › ganti 1 skor › Simpan
Harapan:
- Langkah 1 ditolak "sudah punya penilaian aktif tahun … — buka lewat tombol Ubah" (14 skor lama utuh); langkah 2 tersimpan, rerata kolom berubah; semua petani Lembaga itu tahun itu: kartu Hitung ulang berubah (skor tersimpan tidak).

### TC-346-09 · Detail Petani › tab Monev BMP: rincian inline & Tambah dengan petani terkunci [P1] (3 mnt)
Langkah:
1. Master Data › Petani › detail petani ber-rincian › tab **Monev BMP** › klik tahun
2. **Tambah Penilaian** (petani terkunci) tahun baru › Simpan; buka Tambah lagi
Harapan:
- Rincian ringkas (raport + indikator) termuat; badge kategori terbaru di header; modal Tambah kedua kosong (tidak membawa isian sebelumnya).

### TC-346-10 · Dashboard: radar A vs B & prioritas/teladan [P1] (4 mnt)
Langkah:
1. Dashboard › Monev BMP › seksi 3 › A = Semua, B = Lembaga `ISH-1406-04`; ganti filter Lembaga halaman → B mengikuti sebagai pilihan awal, lalu ganti B manual
2. Seksi 4: klik nama di Petani Prioritas dan Petani Teladan
Harapan:
- Radar dua seri (biru/oranye) dengan pita kategori; tabel A/B/Selisih; kegiatan terlemah/terkuat terisi bila ber-rincian (Training tidak selalu "terlemah"); tautan membuka detail penilaian.

### TC-346-11 · Papan Lembaga klik = filter; heatmap rerata & sort [P2] (3 mnt)
Langkah:
1. Klik nama Lembaga di Papan › seluruh dashboard terfilter › tombol "Semua Lembaga"
2. Profil Kelembagaan › urut Rerata / Abjad
Harapan:
- URL `?lembaga=` berubah; heatmap kolom Rerata & baris rerata kolom konsisten (rerata baris = rata-rata chip terisi).

### TC-346-12 · Excel rekap per Lembaga dari dashboard [P0] (2 mnt)
Prasyarat: EXPORT.
Langkah:
1. Seksi 4 › Rekap per Lembaga › **Unduh Excel** › buka
Harapan:
- Kolom Lembaga · Distrik · Petani Aktif · Dinilai · Cakupan (%) · Rerata Skor · Kategori Rerata · 4 kolom kategori terisi untuk **semua** Lembaga (termasuk yang belum dinilai, 0); DONOR tanpa tombol.

## #345 tahap 1 — Patok NKT ≠ patok lahan

### TC-345-01 · Peta Lahan: satu baris legenda "Patok lahan" [P0] (3 mnt)
Langkah:
1. Map › Peta Lahan › Muat Data 1 Distrik › legenda
Harapan:
- Tidak ada baris "Patok lahan NKT"; hitungan "Patok lahan" = seluruh patok aktif Lembaga terpilih (bandingkan Report › Patok KPI total); layer patok bisa dicentang/unduh.

### TC-345-02 · Terrain 3D & kompas Peta Lahan [P1] (2 mnt)
Langkah:
1. Tombol Terrain 3D › miring/putar › reset utara › Terrain mati
Harapan:
- Relief tampak (hillshade), kamera miring otomatis saat 3D dinyalakan; reset mengembalikan utara; tanpa error konsol.

### TC-345-03 · Report › Patok tanpa filter/KPI/kolom NKT; label Bahan [P0] (3 mnt)
Langkah:
1. Report › Patok › Distrik › Muat Data › Excel
Harapan:
- Tidak ada filter/KPI "Patok NKT"; kolom **Bahan** (bukan Jenis) di tabel & Excel; SHP tanpa kolom NKT.

### TC-345-04 · Unggah patok: kolom Bahan, alias `jenis` diterima [P1] (3 mnt)
Prasyarat: Excel patok 2 baris — satu berkolom `Bahan`, satu berkolom lama `jenis`.
Langkah:
1. Bulk Upload › Lahan › Patok › validasi
Harapan:
- Keduanya terbaca ke Bahan; template unduhan memakai header **Bahan**.

### TC-345-05 · Detail Lembaga/Petani/Lahan: patok tanpa turunan NKT [P1] (3 mnt)
Langkah:
1. Detail Lembaga › tab Patok & peta sebaran; Detail Lahan › tab Patok; Profil Lahan PDF
Harapan:
- Tidak ada label/kolom "NKT" pada patok; PDF menampilkan patok tanpa keterangan NKT.

## #347 — perbaikan review

### TC-347-01 · Nama berkas kembar untuk dua petani [P0] (4 mnt)
Prasyarat: dua form bernama sama (`Suparman.xlsx`) dari dua folder, isi skor berbeda; Lembaga punya dua petani senama.
Langkah:
1. Pilih berkas folder A, lalu (tanpa reset) berkas folder B › pilih petani berbeda di dropdown untuk masing-masing › Simpan › buka kedua detail
Harapan:
- Skor tiap penilaian mengikuti form-nya sendiri (tidak tertukar).

### TC-347-02 · Tahun dari nama berkas saat Periode kosong [P1] (2 mnt)
Prasyarat: form dengan Periode kosong, nama `SKPE.14.06.09.2001.0022 - 2026 - X.xlsx`.
Langkah:
1. Import → kolom Tahun
Harapan:
- Tahun **2026** (bukan 2001); Simpan tidak ditolak "Tahun survei minimal 2020".

### TC-347-03 · Periode masa depan dikosongkan, batch tetap tersimpan [P1] (2 mnt)
Prasyarat: form dengan Periode `7 Juli 2027`.
Langkah:
1. Import
Harapan:
- Peringatan "Periode … di masa depan — tanggal dikosongkan"; baris tetap siap; Simpan sukses dengan tanggal kosong.

### TC-347-04 · Ubah Lembaga di dialog import membersihkan pratinjau [P1] (2 mnt)
Langkah:
1. Tab Form survei › Lembaga A › pilih berkas › ganti Lembaga ke B
Harapan:
- Daftar pratinjau & dropdown petani kosong/ter-reset (petani B, bukan A).

### TC-347-05 · Modal Tambah tidak membawa isian sebelumnya [P2] (1 mnt)
Langkah:
1. Tambah Penilaian › isi › Simpan › Tambah Penilaian lagi
Harapan:
- Semua field kosong.

### TC-347-06 · Import batch besar dalam batas waktu [P1] (10 mnt)
Prasyarat: ≥ 100 form satu Lembaga (Rohul `ISH-1406-03`, 29+ form ×3 salinan tahun berbeda bila perlu) — lokal boleh memakai 60.
Langkah:
1. Import semua sekaligus › Simpan
Harapan:
- Simpan selesai < 60 dtk di lokal (tanpa "Gagal menyimpan ke database"); ringkasan = jumlah form.
