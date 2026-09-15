---
title: Report (Laporan)
icon: FileText
intro: Semua laporan bisa diunduh sebagai Excel (izin Export) dan PDF (izin Print). Sebagian laporan mewajibkan pilih Distrik dan Lembaga Petani lebih dulu.
---

**Petani / Pelatihan / Produksi** — Rekap per lembaga: daftar petani, cakupan pelatihan per paket (termasuk nilai pre/post test), dan matriks produksi bulanan per petani atau lahan.

**PDF Laporan Pelatihan punya dua bentuk** — tanpa filter jenis pelatihan, PDF berisi matriks cakupan per petani; bila jenis (dan tanggal) pelatihan dipilih di tab Detail per Pelatihan, PDF berubah menjadi daftar peserta kegiatan itu lengkap dengan nilai pre/post-test.

**Kelompok Tani (Summary & Detail)** — Summary berisi rekap jumlah petani, lahan, dan luas per KT (kolom tersembunyi **Lahan NKT** dan **Patok** bisa dinyalakan lewat selektor kolom). Detail berisi daftar anggota per lembaga tersusun KT lalu Petani, dengan kolom Lahan NKT dan Patok per petani.

**Lahan** — Daftar lahan per lembaga (satu baris satu lahan). Pilih Lembaga Petani (wajib), atur kolom yang tampil, lalu cetak. Selain filter legalitas (surat, STDB), ada filter **NKT** (terdampak / tidak terdampak / sudah dinilai / belum dinilai) dan **Patok** (sudah/belum ada, semua terpasang, ada yang bermasalah) beserta kartu ringkasannya; kolom **NKT**, **Luas NKT**, dan **Patok** (jumlah + kondisi) ikut ke Excel dan PDF bila dinyalakan.

**Laporan NKT (PDF)** — Tombol merah **Laporan NKT** di Report → Lahan (dan di detail Lembaga Petani → tab Lahan) mencetak laporan khusus NKT satu Lembaga: tiga angka ringkasan (total lahan, lahan NKT, luas NKT), peta seluruh lahan dengan lahan NKT merah bernomor, tabel lahan NKT, dan ringkasan per kategori NKT 1–6. Laporan ini **tidak mengikuti filter** — isinya selalu seluruh lahan aktif Lembaga. Butuh izin Print.

**Patok** — Daftar patok batas satu Distrik atau Lembaga: satu baris per patok fisik (patok yang dipakai beberapa lahan tampil sekali dengan semua lahan pemakainya), kode patok `HJP-PTK-000123`, kondisi (Ada/Hilang/Rusak/Belum dipasang), dan tanda patok lahan NKT. Pilih Distrik (wajib) → **Muat Data**; saring dengan Kondisi atau NKT; unduh Excel, Shapefile/GeoJSON/KML (titik), atau PDF (peta + tabel). Dipakai untuk menyusun daftar kerja pemasangan ulang dan lampiran laporan NKT.

**Peta pada Laporan Lahan** — PDF Laporan Lahan menyertakan peta poligon. Di panel Peta Cetak Anda dapat memecah peta menjadi beberapa halaman (isi jumlah baris dan kolom), memilih Latar Peta, dan memilih isi label poligon (No, Nama, ID Petani, ID Lahan, Kelompok Tani). Pratinjau di layar sama dengan hasil cetak.

**Latar Peta** — Pilihannya empat: Polos (bawaan, tanpa latar), StreetMap (jalan dan nama tempat), Satellite (citra tanpa label), dan Hybrid (citra beserta label). Saat latar aktif, poligon lahan digambar sebagai garis tanpa isian supaya tutupan lahan di dalamnya tetap terlihat, dan slider Kepekatan Latar mengatur seberapa tegas latar itu dicetak (bawaan 65%; makin kecil makin pucat, 0% berarti putih polos). Latar ikut ke PDF dan Excel, jadi hasil cetak sama dengan pratinjau.

+ Latar peta otomatis dimatikan bila grid melebihi 30 sel. Tiap sel menambah satu gambar latar ke PDF, sehingga grid rapat membuat berkasnya membengkak dan lama dibuat. Kecilkan jumlah baris/kolom bila Anda tetap ingin memakai latar.

+ Latar butuh koneksi internet karena petanya diambil dari penyedia peta. Bila sebagian latar tampak kosong/putih, tunggu pratinjau selesai memuat lalu ekspor ulang. Sumber peta wajib tercantum di pojok kanan bawah peta — jangan menghapusnya dari hasil cetak.

**Excel Laporan Lahan** — Berisi sheet tabel lengkap beserta gambar peta, ditambah satu sheet per bagian peta bila pemecahan grid diaktifkan.
