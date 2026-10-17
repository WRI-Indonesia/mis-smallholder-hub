---
title: Membaca Peta Fitur aplikasi
icon: Map
menuKey: platform-developer-sitemap
permission: VIEW
duration: 4
href: /admin/platform-developer/sitemap
hrefLabel: Buka Peta Fitur
goal: Melihat seluruh menu, halaman, bagian, dan isinya sebagai diagram alur — untuk orientasi pengguna baru, menyusun materi pelatihan, atau memeriksa di mana sebuah fitur berada.
---

## Sebelum mulai

Halaman ini memetakan **aplikasinya sendiri**, bukan data petani. Setiap menu sidebar punya satu peta: Menu → Sub menu → Halaman → Bagian → Isi (kolom, field, tombol, ekspor). Sumbernya berkas dokumentasi produk di repositori (`docs/product/sitemap/`), yang juga dipakai untuk board Miro dan naskah video tutorial — jadi apa yang tampil di sini sama dengan yang dipakai tim.
+ Peta diperbarui bersama rilis aplikasi: berkasnya dibundel saat build, bukan dibaca langsung dari repositori. Bila ada fitur baru yang belum tampak di peta, kemungkinan rilisnya memang belum memperbarui berkas sitemap. Hak akses per peran **tidak** digambar di peta ini; lihat **Settings → Role & Permission** atau topik *Hak Akses & Cakupan Data*.

## Langkah

1. Buka menu **Platform Developer → Peta Fitur**. Baris tombol di atas memilih berkas: **Ikhtisar Sistem** (halaman publik, alur masuk, layout bersama, sepuluh menu, relasi entitas) lalu satu tombol per menu. Di bawahnya ada ringkasan satu paragraf untuk berkas yang dipilih.
2. Pilih tampilan dengan tab **Mermaid** atau **React Flow**. Keduanya menggambar diagram yang sama; bedanya hanya mesin gambarnya.
+ **Mermaid** = gambar statis seperti yang tampil di GitHub dan di Miro — cocok untuk dibaca urut atau ditangkap layar. **React Flow** = kanvas interaktif: geser dengan menyeret latar, perbesar dengan tombol **+/−** di pojok kanvas atau cubit di trackpad (roda mouse tetap menggulir halaman), klik ikon bingkai untuk memuat seluruh diagram, dan pada diagram besar peta mini di pojok membantu berpindah. Kotak bisa digeser untuk sementara agar terbaca; posisi kembali semula saat halaman dimuat ulang.
3. Baca warna kotak lewat legenda di kanan tab: hijau tua **Menu**, hijau muda **Sub menu**, biru **Halaman**, kuning **Bagian** (header, kartu, filter, tabel, panel), putih **Isi** (kolom · field · aksi · tombol · KPI · ekspor), merah muda **Dialog**, oranye **Percabangan**, ungu **Data/berkas**, biru langit **Layanan luar**. Garis putus-putus pada kotak berarti fitur masih prototipe atau baru direncanakan.
+ Garis juga punya arti: garis penuh = berisi/membuka; garis putus-putus = berpindah halaman (labelnya nama tombol, misalnya *Lihat*); garis tebal = alur data berat seperti unggah, generate snapshot, atau unduhan.
4. Gulir ke bawah: tiap kartu adalah satu diagram. Kartu pertama **Pohon navigasi** menunjukkan menu → sub menu → halaman beserta tabel **Halaman · Route · Katalog**; kartu berikutnya satu per halaman (Halaman → Bagian → Isi); kartu **Alur lintas menu** menunjukkan hubungan ke menu lain; teks **Urutan demo yang disarankan** adalah kerangka untuk mendemokan menu itu.
+ Di layar lebar, **daftar isi** di kiri menempel saat digulir — klik judul untuk melompat ke kartunya. Pilihan berkas dan tab tersimpan di alamat halaman, jadi tampilan bisa dibagikan dengan menyalin URL-nya.
5. Untuk orientasi pengguna baru, mulai dari **Ikhtisar Sistem** lalu ikuti urutan tombol: Master Data → Bulk Upload (memasukkan data), Dashboard → Map → Report → Data Analyst (membaca data), lalu Tools, Settings, Platform Developer, Bantuan.

## Kalau bermasalah

- **Diagram menampilkan "Diagram tidak dapat dirender"** pada tab Mermaid: teks sumber diagram ditampilkan di bawah pesan. Laporkan ke tim pengembang beserta nama berkas dan judul kartunya — berkas sitemap perlu diperbaiki di repositori.
- **Kotak React Flow saling menumpuk atau terlalu kecil**: klik ikon bingkai (*fit view*) di kontrol kiri bawah kanvas, atau perbesar dan geser bagian yang ingin dibaca. Tab Mermaid selalu menampilkan tata letak yang sama dengan dokumen asli.
- **Fitur yang Anda cari tidak ada di peta**: cari dulu nama menunya di kotak **Cari menu…** di sidebar. Bila menunya ada tetapi petanya belum, berarti berkas sitemap belum diperbarui di rilis ini.
