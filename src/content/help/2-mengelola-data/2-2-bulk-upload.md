---
title: Bulk Upload (Unggah Massal)
icon: Upload
intro: Untuk data dalam jumlah banyak, gunakan Bulk Upload alih-alih input satu per satu.
---

**Petani & Produksi (Excel)** — Unggah file Excel apa adanya, tidak perlu template khusus. Setelah diunggah, cocokkan (mapping) kolom file Anda dengan kolom sistem, periksa pratinjau, lalu simpan.

**Lahan (Shapefile ZIP)** — Unggah satu file ZIP berisi Shapefile (.shp, .dbf, .shx, .prj). Sistem membaca poligon lahan beserta atributnya; Anda dapat memetakan atribut Kelompok Tani dan Blok saat proses mapping.

**Detail Lahan (Excel)** — Tab kedua di halaman yang sama: surat kepemilikan (SHM/SKT/SKGR/…), nomor STDB, dan UL Parcel Code untuk lahan yang **sudah terdaftar**, dikunci ID Lahan + ID Petani. Detail menempel pada identitas lahan sehingga tetap ikut saat poligonnya direvisi. Unggah ulang memperbarui, bukan menggandakan.

**Patok (Excel/Shapefile titik)** — Tab ketiga: koordinat patok batas hasil survei GPS (Excel/CSV) atau shapefile titik, dikunci ID Lahan (+ ID Petani bila ID lahannya dipakai lebih dari satu petani). Nomor patok yang sudah ada diperbarui koordinatnya, nomor baru ditambahkan; titik ≤ 5 m dari patok lahan tetangga ditautkan ke patok itu, bukan digandakan. Titik lebih dari 100 m dari batas lahan ditolak.

**Pohon Sawit (Shapefile ZIP titik)** — Unggah ZIP Shapefile bertipe point berisi titik pohon per lahan; titik dicocokkan ke lahan lewat atribut `parcel_id`. Jumlah pohon dan kerapatan tanam tampil di detail lahan dan detail petani. Upload ulang untuk lahan yang sama mengganti seluruh set titik lahan itu (set lama tersimpan sebagai riwayat nonaktif).

**Baris yang gagal** — Baris yang tidak lolos validasi tidak ikut tersimpan dan dapat diunduh kembali sebagai file untuk diperbaiki, lalu diunggah ulang.

**Data ganda** — Sistem menolak data yang sudah ada (mis. lahan aktif dengan ID sama, atau produksi pada lahan dan bulan yang sama) agar tidak terjadi perhitungan ganda.
