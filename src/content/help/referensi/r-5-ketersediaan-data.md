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

## Jenis check

Setiap baris checklist berchip jenis:

**Inti** — kolom wajib, masuk skor domain dengan bobot penuh. **Lapangan** — tahun tanam, status lahan, blok: masuk skor dengan bobot sepertiga. **Validitas** — nilai harus sahih/unik (NIK 16 digit & tidak duplikat, ID Petani unik): masuk skor.

**Kualitas** — konsistensi & kewajaran, **tidak** mengubah skor: tanggal lahir vs NIK (digit 7–12 = hari-bulan-tahun, hari +40 untuk perempuan), jenis kelamin vs NIK, umur di luar 17–90 tahun, kemungkinan petani ganda (nama & tanggal lahir sama), Monev BMP tanpa rincian indikator, persil di luar boundary ICS, luas kolom vs luas poligon berbeda > 20 %, luas di luar 0,05–25 ha, tahun tanam < 1970 atau di masa depan, nilai post-test turun, nilai di luar 0–100, record produksi 0 kg, bulan produksi bolong, sertifikasi tahun-tanpa-status, tahun bergabung sebelum tahun berdiri, koordinat Lembaga di luar poligon kabupaten. Check yang tidak bisa dinilai (mis. Lembaga tanpa boundary) tidak ditampilkan atau bertanda "tidak ada yang bisa dicek".

**Modul** — cakupan modul tambahan, lihat bawah.

## Temuan anomali

**Per entitas** — satu baris per petani/persil yang bermasalah; jumlahnya masuk badge "n temuan" dan panel Anomali Terbanyak bagian *Per entitas*.

**Sistemik** — bila satu check "kolom kosong" kosong pada ≥ 95 % entitas Lembaga (dan Lembaga punya ≥ 10 entitas), anomali itu dilipat menjadi **satu** temuan agregat "kolom belum pernah diisi". Check validitas, kualitas, dan paket pelatihan tidak pernah dilipat. Skor domain tidak berubah oleh pelipatan ini — hanya cara menghitung temuannya. Daftar lengkap tetap tersedia di Excel.

**Perbaiki lewat** — tiap jenis anomali membawa menu tujuan dan kolom yang diisi, dari satu registri yang sama dengan yang dipakai skor.

## Prioritas perbaikan

Kenaikan Index bila satu check berskor dilengkapi 100 % = bobot domain × (bermasalah ÷ total) × bobot check dalam domain × 100. Contoh: 71 dari 319 persil tanpa Kelompok Tani → 25 % × (71 ÷ 319) × (3 ÷ 15) × 100 ≈ +1,1 poin. Check kualitas dan modul tidak muncul di sini karena tidak mengubah Index.

## Per Kelompok Tani

Kelompok Tani diambil dari kolom KT tiap lahan. Skor Lahan KT = rata-rata kelengkapan persil di KT itu; Skor Petani KT = rata-rata check petani pemilik lahan di KT itu (satu petani bisa muncul di beberapa KT); Persil Berproduksi = persil non-PSR yang punya record produksi. Urutan: skor lahan terendah dulu.

## Cakupan modul

Persentase entitas yang sudah mengisi modul tambahan — **informatif, di luar Index**.

**Profil Lembaga** — boundary ICS, acuan MD 1st SOW, penilaian Lembaga Monev BMP tahun berjalan, status sertifikasi RSPO/ISPO/SAP-MAP terisi (ketiganya).

**Petani** — STDB (≥ 1 berkas aktif), Monev BMP tahun berjalan.

**Lahan** — surat tanah, STDB terbit, kode eksternal vendor (UL Parcel Code), status NKT dinilai (status apa pun), sepadan U/T/S/B lengkap, patok batas, titik pohon, program/demplot.

**Pelatihan** — aktivitas yang punya bukti (dokumentasi).

**Tidak berlaku** — modul bergrain petani/persil yang belum diisi satu pun di Lembaga itu ditandai "belum ada di Lembaga ini" dan dikeluarkan dari penyebut, baik di halaman Per Lembaga maupun di baris *Semua Lembaga* pada matriks cakupan. Modul tingkat Lembaga (boundary, acuan, penilaian Lembaga, sertifikasi) selalu dinilai ada/tidak.

+ Status sertifikasi kosong diperlakukan **netral**: sistem tidak bisa membedakan "belum diisi" dari "tidak bersertifikat" (pilihan hanya Bersertifikat/Direncanakan), jadi ia hanya tampil sebagai cakupan, bukan anomali.
