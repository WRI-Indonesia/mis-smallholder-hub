---
title: Mencatat hasil Monev BMP
icon: ClipboardCheck
menuKey: master-data-bmp-monev
permission: CREATE
duration: 8
href: /admin/master-data/bmp-monev
hrefLabel: Buka halaman Monev BMP
goal: Skor Monev BMP tiap petani tercatat per tahun survei — lewat import Excel rekap atau input satu per satu — dan kategorinya langsung terbaca di dashboard.
---

## Sebelum mulai

Monev BMP menilai **praktik petani**, bukan lahan: satu petani mendapat **satu skor per tahun survei** (skala 0–3), berapa pun jumlah lahannya. Lahan yang dikunjungi saat survei boleh dicatat sebagai pelengkap, tidak wajib.

+ Kategori dihitung otomatis dari skor dan tidak perlu diketik: **Teladan** (lebih dari 2,50), **Praktisi** (1,50–2,50), **Perintis** (1,00–1,49), **Belum Implementasi** (kurang dari 1,00). Skor tepat 2,50 masuk Praktisi, mengikuti cara tim lapangan menerapkan rubriknya.

Siapkan: rekap Excel per Lembaga (format tim lapangan) **atau** daftar skor untuk diketik, plus nama penilai bila ingin dicatat.

## Langkah — import rekap Excel

1. Buka menu **Master Data → Monev BMP**, lalu klik **Import Excel**.
2. Pilih **Lembaga Petani** yang datanya akan diimpor.
+ ID Petani hanya unik di dalam satu Lembaga — dua Lembaga boleh memakai nomor yang sama — sehingga sistem tidak menebak Lembaga dari awalan ID. Satu berkas/sheet selalu untuk satu Lembaga; rekap yang memuat beberapa sheet diimpor satu sheet per putaran.
3. Isi **Penilai / Fasilitator** bila ingin nama itu tercatat di semua baris (opsional).
4. Pilih berkas `.xlsx`. Bila berkas punya beberapa sheet, pilih sheet Lembaga yang sesuai pada pilihan **Sheet**.
+ Format yang dikenali persis format rekap tim lapangan: kolom `Id Petani`, `Lokasi Kebun` (opsional), lalu blok per tahun berisi `Tgl Survey` dan `Skor` — tahun dibaca dari sel judul yang di-merge. Kolom `Kriteria`, `Blok`, `Luas Lahan`, dan `Nama Petani` diabaikan (kategori dihitung sendiri; blok dan luas sudah ada di data lahan). Tombol **Unduh Template** memberi contoh satu tahun.
5. Klik **Validasi ke [Lembaga]** dan periksa pratinjaunya. Tiap baris berstatus **Baru** (belum ada skor tahun itu), **Perbarui** (sudah ada — skor lama akan ditimpa), atau **ID Petani tidak dikenal** (dilewati).
+ Peringatan kuning tidak menggagalkan baris: lahan yang tak dikenal → skor tetap disimpan tanpa lahan; tanggal yang tak terbaca, di masa depan, atau bukan tahun survei → skor tetap disimpan dengan tanggal dikosongkan. Periksa peringatannya sebelum menyimpan supaya salah ketik di rekap tidak ikut masuk sebagai data.
6. Klik **Simpan N penilaian**. Ringkasan hasil menampilkan jumlah baru, diperbarui, dan yang ditolak server.
+ Unggah ulang berkas yang sama aman: petani-tahun yang sudah ada diperbarui, bukan digandakan. Baris tanpa `Id Petani` (misalnya blok baseline lama yang hanya bernama) otomatis dilewati dan dilaporkan di daftar "Baris dilewati".

## Langkah — input atau koreksi satu petani

1. Klik **Tambah Penilaian**, pilih **Lembaga Petani** lalu **Petani** (cari nama atau ID).
2. Isi **Tahun Survei**, **Tanggal Survei** (opsional), dan **Skor** — boleh memakai koma, misalnya `1,83`. Badge kategori muncul seketika di bawah kolom skor.
3. Pilih **Lahan Dikunjungi** bila dicatat, isi **Penilai** dan **Catatan** bila perlu, lalu klik **Buat**.
+ Satu petani hanya boleh punya **satu penilaian aktif per tahun**. Bila tahun itu sudah terisi, sistem menolak dan meminta Anda mengubah yang ada lewat tombol ubah di baris tersebut — atau lewat tab **Monev BMP** di halaman detail petani.

## Memastikan berhasil

Baris muncul di daftar dengan badge kategori; kartu ringkasan di atas tabel (jumlah penilaian, petani dinilai, rerata skor) ikut berubah. **Dashboard → Monev BMP** langsung memuat data baru — dashboard ini dihitung saat dibuka, tanpa snapshot.

+ Di halaman detail petani, kategori tahun terbaru tampil sebagai badge di samping nama, dan tab **Monev BMP** memuat riwayat per tahun.

> [!hati-hati] Tombol hapus hanya **menonaktifkan** penilaian. Penilaian nonaktif tidak bisa diaktifkan kembali selama tahun yang sama sudah punya penilaian aktif lain.

## Kalau bermasalah

**Semua baris "ID Petani tidak dikenal".** Lembaga yang dipilih tidak sesuai dengan sheet, atau ID di rekap memakai format lain dari yang terdaftar di MIS. Cocokkan ID dengan daftar di Master Data → Petani.

**"Header tahun / kolom Skor tidak ditemukan".** Sheet tidak memakai format rekap: pastikan ada sel tahun (mis. `2026`) dan label `Skor` di baris judul. Sheet `Kategori` (tabel rubrik) memang bukan data — pilih sheet Lembaga.

**Tanggal survei kosong padahal di rekap terisi.** Lihat peringatan di pratinjau: tanggal tidak terbaca, jatuh di masa depan, atau bukan tahun survei. Perbaiki di berkas lalu impor ulang, atau ubah barisnya lewat tombol ubah.

**Lahan tidak muncul di pilihan Lahan Dikunjungi.** Hanya lahan aktif milik petani itu yang ditawarkan. Lahan yang belum terdaftar diinput dulu di Master Data → Lahan.
