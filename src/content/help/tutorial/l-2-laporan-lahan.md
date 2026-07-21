---
title: Mencetak Laporan Lahan ber-peta
icon: Printer
menuKey: report-land-parcel
permission: VIEW
duration: 10
href: /admin/report/land-parcel
hrefLabel: Buka Laporan Lahan
goal: PDF berisi peta poligon ber-grid dan tabel lahan satu lembaga, siap dipakai verifikasi lapangan.
---

## Sebelum mulai

Ini laporan paling rumit sekaligus paling berguna di lapangan: peta poligon dengan grid indeks, label per persil, skala, dan penunjuk utara — ditambah tabel rincian lahannya.

Hanya lahan ber-poligon yang muncul di petanya.

+ Lahan tanpa poligon tetap masuk tabel dan tetap dijumlahkan luasnya, hanya tidak tergambar. Jadi jumlah baris tabel bisa lebih banyak daripada poligon yang terlihat, dan itu bukan kesalahan.

## Langkah

1. Buka menu **Report → Lahan**.
2. Pilih **Distrik** lalu **Lembaga Petani**. Lembaga wajib dipilih.
3. Periksa empat kartu ringkasan: Total Petani, Kelompok Tani, Total Lahan, Total Luas.
+ Gunakan kartu ini sebagai pemeriksaan cepat. Bila Total Lahan jauh lebih kecil dari yang Anda tahu, kemungkinan sebagian lahan lembaga itu belum diunggah.
4. Atur **Grid Index** — jumlah Baris × Kolom peta cetak.
+ Grid membagi wilayah lembaga menjadi sel-sel yang dicetak satu per satu, sehingga poligon tetap terbaca di kertas A4. Wilayah luas butuh grid lebih rapat; lembaga kecil cukup 1×1.
5. Pilih **Label Poligon** yang ingin ditampilkan: No, Nama, ID Petani, ID Lahan, atau Kelompok Tani.
+ Jangan mencentang semuanya. Label bertumpuk membuat peta justru sulit dibaca — untuk verifikasi lapangan biasanya No dan ID Lahan sudah cukup, karena rinciannya bisa dilihat di tabel.
6. Perhatikan **preview peta** di layar dan sesuaikan grid bila perlu.
+ Preview memperlihatkan hasil cetak yang sebenarnya, termasuk halaman ikhtisar dan tiap sel grid. Menyesuaikan di sini jauh lebih cepat daripada mencetak lalu mengulang.
7. Unduh **PDF** atau **Excel**.
+ PDF berformat landscape: halaman pertama ikhtisar, disusul peta per sel, lalu tabel. Excel-nya multi-sheet dan turut menyertakan gambar peta.

## Kalau bermasalah

**Peta kosong tapi tabel terisi** — lahan lembaga itu belum punya poligon. Lihat tutorial **Mengunggah lahan dari shapefile**.

**Label bertumpuk dan tak terbaca** — kurangi jenis label yang dicentang, atau perapat grid agar tiap sel memuat lebih sedikit poligon.

**PDF terasa lama dibuat** — wajar untuk lembaga dengan ratusan persil, karena tiap sel grid digambar satu per satu. Tunggu sampai selesai, jangan mengklik berulang.
