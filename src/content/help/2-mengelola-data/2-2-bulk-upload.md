---
title: Bulk Upload (Unggah Massal)
icon: Upload
intro: Untuk data dalam jumlah banyak, gunakan Bulk Upload alih-alih input satu per satu.
---

**Template** — Setiap jenis unggahan punya tombol **Unduh Template**: Excel (Petani, Produksi, Detail Lahan, NKT, Patok) atau ZIP shapefile contoh beserta **BACA-SAYA.txt** (Poligon Lahan, Pohon). Judul kolom/atribut template langsung dikenali sistem. Baris contoh memakai ID fiktif `CTH.…` dan selalu ditolak bila lupa dihapus.

**Petani & Produksi (Excel)** — Pakai template, atau unggah file Excel Anda sendiri apa adanya. Setelah diunggah, cocokkan (mapping) kolom file Anda dengan kolom sistem — sebagian sudah tercocokkan otomatis, dan di sampingnya tampil contoh nilai dari baris pertama — periksa pratinjau, lalu simpan.

**Lahan (Shapefile ZIP)** — Tab **Poligon (Shapefile ZIP)** di Upload Data Lahan: unggah satu file ZIP berisi Shapefile (.shp, .dbf, .shx, .prj). Sistem membaca poligon lahan beserta atributnya; Anda dapat memetakan atribut Kelompok Tani, Blok, dan sepadan saat proses mapping. Kolom pemetaan dikelompokkan (Identitas, Atribut lahan, Kelompok & Blok, Sepadan); grup yang atributnya tidak ada di berkas tertutup otomatis.

**Detail Lahan (Excel)** — Tab kedua di halaman yang sama, **Detail Lahan (Excel)**: surat kepemilikan (SHM/SKT/SKGR/…), nomor STDB, UL Parcel Code, sepadan, dan NKT untuk lahan yang **sudah terdaftar**, dikunci ID Lahan + ID Petani. Detail menempel pada identitas lahan sehingga tetap ikut saat poligonnya direvisi. Unggah ulang memperbarui, bukan menggandakan.

**Patok (Excel/Shapefile titik)** — Tab ketiga, **Patok (Excel/Shapefile titik)**: koordinat patok batas hasil survei GPS (Excel/CSV) atau shapefile titik, dikunci ID Lahan (+ ID Petani bila ID lahannya dipakai lebih dari satu petani). Nomor patok yang sudah ada diperbarui koordinatnya, nomor baru ditambahkan; titik ≤ 5 m dari patok lahan tetangga ditautkan ke patok itu, bukan digandakan. Titik lebih dari 100 m dari batas lahan ditolak.

**Pohon Sawit (Shapefile ZIP titik)** — Unggah ZIP Shapefile bertipe point berisi titik pohon per lahan; titik dicocokkan ke lahan lewat atribut `parcel_id`. Jumlah pohon dan kerapatan tanam tampil di detail lahan dan detail petani. Upload ulang untuk lahan yang sama mengganti seluruh set titik lahan itu (set lama tersimpan sebagai riwayat nonaktif).

**Baris yang gagal** — Baris yang tidak lolos validasi tidak ikut tersimpan dan dapat diunduh kembali sebagai file untuk diperbaiki, lalu diunggah ulang.

**Siapa yang bisa** — Secara bawaan menu Bulk Upload hanya ada untuk SUPERADMIN dan ADMIN.

**Data ganda** — Sistem menolak data yang benar-benar sama (mis. lahan dengan ID dan poligon identik, atau produksi pada lahan, bulan, dan **Panen Ke-** yang sama) agar tidak terjadi perhitungan ganda. ID Lahan sama dengan poligon berbeda disimpan sebagai revisi baru.
