---
title: Ketersediaan Data — cara skor dihitung
icon: Gauge
menuKey: data-analyst-data-availability
permission: VIEW
href: /admin/data-analyst/data-availability
hrefLabel: Buka Ketersediaan Data — Semua Lembaga
---

## Index Ketersediaan Data

Satu angka 0–100 per Lembaga Petani, dipakai sama persis oleh tiga tempat: halaman **Semua Lembaga**, halaman **Per Lembaga**, dan kartu **Kelengkapan Data** di Detail Lembaga.

**Rumus** — Index = Profil × 10 % + Petani × 25 % + Lahan × 25 % + Pelatihan × 20 % + Produksi × 20 %. Bobot ini tampil di strip skor halaman Per Lembaga.

**Warna band** — hijau tua 100 (lengkap penuh), hijau 80–99 (baik), kuning 50–79 (perlu perhatian), merah <50 (kritis). Ambang yang sama dipakai di ketiga tempat.

## Skor per domain

**Profil Lembaga** — proporsi 6 check yang terisi: kode, koordinat, tahun bergabung program, singkatan, tipe grup, tahun berdiri.

**Petani** — rata-rata per petani dari 6 check: NIK terisi & 16 digit & tidak duplikat, ID Petani tidak duplikat dalam Lembaga, alamat, tanggal lahir, tempat lahir, tahun bergabung. Petani dengan 4 dari 6 check lolos menyumbang 67 %, bukan 0 %.

**Lahan** — rata-rata per persil, **berbobot**: geometry, luas > 0, jenis tanaman, dan Kelompok Tani masing-masing berbobot 3; tahun tanam, status lahan, dan blok masing-masing berbobot 1 ("atribut lapangan", sepertiga check inti). Total bobot 15. Persil yang lengkap kecuali tiga atribut lapangan tetap bernilai 80 %.

+ Tiga atribut lapangan diberi bobot ringan karena hampir tidak pernah bisa diisi lewat alur rutin (tahun tanam & status lahan hanya dari DBF shapefile atau form; keduanya kosong di lebih dari 90 % persil). Dengan bobot penuh, skor Lahan hampir semua Lembaga terkunci di angka yang sama dan tidak lagi membedakan apa pun.

**Pelatihan** — rata-rata per petani dari proporsi paket wajib yang pernah diikuti (kehadiran pada aktivitas Lembaga itu; nilai pre/post-test tidak memengaruhi skor, hanya dicatat sebagai anomali).

**Produksi** — persentase petani yang punya minimal satu record produksi. Kebaruan (tidak ada record ≥ 3 bulan terakhir) dan lahan non-PSR tanpa produksi dicatat sebagai **anomali**, tidak mengubah skor. Record berlabel "Estimasi" ditampilkan sebagai kartu informatif.

## Temuan anomali

**Per entitas** — satu baris per petani/persil yang bermasalah; jumlahnya masuk badge "n temuan" dan panel Anomali Terbanyak bagian *Per entitas*.

**Sistemik** — bila satu check kosong pada ≥ 95 % entitas Lembaga (dan Lembaga punya ≥ 10 entitas), anomali itu dilipat menjadi **satu** temuan agregat "kolom belum pernah diisi". Skor domain tidak berubah oleh pelipatan ini — hanya cara menghitung temuannya. Daftar lengkap tetap tersedia di Excel.

**Perbaiki lewat** — tiap jenis anomali membawa menu tujuan dan kolom yang diisi, dari satu registri yang sama dengan yang dipakai skor.

## Cakupan modul

Persentase entitas yang sudah mengisi modul tambahan — **informatif, di luar Index**.

**Profil Lembaga** — boundary ICS, acuan MD 1st SOW, penilaian Lembaga Monev BMP tahun berjalan, status sertifikasi RSPO/ISPO/SAP-MAP terisi (ketiganya).

**Petani** — STDB (≥ 1 berkas aktif), Monev BMP tahun berjalan.

**Lahan** — surat tanah, STDB terbit, kode eksternal vendor (UL Parcel Code), status NKT dinilai (status apa pun), sepadan U/T/S/B lengkap, patok batas, titik pohon, program/demplot.

**Pelatihan** — aktivitas yang punya bukti (dokumentasi).

**Tidak berlaku** — modul bergrain petani/persil yang belum diisi satu pun di Lembaga itu ditandai "belum ada di Lembaga ini" dan dikeluarkan dari penyebut, baik di halaman Per Lembaga maupun di baris *Semua Lembaga* pada matriks cakupan. Modul tingkat Lembaga (boundary, acuan, penilaian Lembaga, sertifikasi) selalu dinilai ada/tidak.

+ Status sertifikasi kosong diperlakukan **netral**: sistem tidak bisa membedakan "belum diisi" dari "tidak bersertifikat" (pilihan hanya Bersertifikat/Direncanakan), jadi ia hanya tampil sebagai cakupan, bukan anomali.
