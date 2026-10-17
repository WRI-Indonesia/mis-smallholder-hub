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
2. Pilih tampilan di baris tab berkelompok. Semuanya menggambar diagram yang sama; bedanya mesin gambarnya. **Teks**: **Mermaid** (bawaan; sama dengan GitHub dan Miro), **Mermaid ELK** (teks yang sama, garis siku rapi), **Sketsa** (gaya coretan tangan), **Graphviz** (garis lengkung melingkari kotak). **Interaktif**: **React Flow** dan **React Flow ELK** (kanvas yang bisa digeser dan di-zoom), **Kolom** (satu kolom tetap per jenis kotak), **Jaringan** (kotak yang saling terhubung saling mendekat). **Hierarki**: **Pohon** (satu baris per kotak, bisa dilipat), **Peta pikiran** (mind map yang bisa dilipat), **Sunburst** (cincin konsentris), **Daftar** (daftar bertingkat yang bisa dicari). Satu kalimat di bawah tab menjelaskan tampilan yang sedang aktif.
+ Tampilan teks adalah gambar statis — cocok dibaca urut atau ditangkap layar; Graphviz memuat mesinnya (±3 MB) sekali saat pertama dibuka. Pada kanvas interaktif: geser dengan menyeret latar, perbesar dengan tombol **+/−** di pojok kanvas atau cubit di trackpad (roda mouse tetap menggulir halaman), klik ikon bingkai untuk memuat seluruh diagram; pada diagram besar peta mini di pojok membantu berpindah. Pada Pohon dan Peta pikiran, klik kotak kecil **−/+** atau lingkaran di ujung cabang untuk melipat/membuka. Pada Daftar, ketik di kotak **Cari di diagram ini…** untuk menyaring. Tampilan hierarki hanya menggambar pohon utamanya; hubungan silang (misalnya tautan antarhalaman) ditampilkan sebagai garis putus-putus oranye di Pohon dan baris **→** di Daftar.
3. Baca warna kotak lewat legenda di kanan tab: hijau tua **Menu**, hijau muda **Sub menu**, biru **Halaman**, kuning **Bagian** (header, kartu, filter, tabel, panel), putih **Isi** (kolom · field · aksi · tombol · KPI · ekspor), merah muda **Dialog**, oranye **Percabangan**, ungu **Data/berkas**, biru langit **Layanan luar**. Garis putus-putus pada kotak berarti fitur masih prototipe atau baru direncanakan.
+ Garis juga punya arti: garis penuh = berisi/membuka; garis putus-putus = berpindah halaman (labelnya nama tombol, misalnya *Lihat*); garis tebal = alur data berat seperti unggah, generate snapshot, atau unduhan.
4. Gulir ke bawah: tiap kartu adalah satu bagian berkas, umumnya satu diagram. Kartu pertama **Pohon navigasi** menunjukkan menu → sub menu → halaman beserta tabel **Halaman · Route · Katalog**; kartu berikutnya satu per halaman (Halaman → Bagian → Isi); kartu **Alur lintas menu** menunjukkan hubungan ke menu lain; kartu terakhir **Urutan demo yang disarankan** (teks bernomor, tanpa diagram) adalah kerangka untuk mendemokan menu itu.
+ Di layar lebar, **daftar isi** di kiri menempel saat digulir — klik judul untuk melompat ke kartunya. Pilihan berkas dan tampilan tersimpan di alamat halaman, jadi tampilan bisa dibagikan dengan menyalin URL-nya.
5. Untuk orientasi pengguna baru, mulai dari **Ikhtisar Sistem** lalu ikuti urutan tombol: Master Data → Bulk Upload (memasukkan data), Dashboard → Map → Report → Data Analyst (membaca data), lalu Tools, Settings, Platform Developer, Bantuan.

## Kalau bermasalah

- **Diagram menampilkan "Diagram tidak dapat dirender"** pada tab Mermaid: teks sumber diagram ditampilkan di bawah pesan. Laporkan ke tim pengembang beserta nama berkas dan judul kartunya — berkas sitemap perlu diperbaiki di repositori.
- **Kotak kanvas interaktif saling menumpuk atau terlalu kecil**: klik ikon bingkai (*fit view*) di kontrol kiri bawah kanvas, atau perbesar dan geser bagian yang ingin dibaca. Coba juga tampilan **React Flow ELK** atau **Kolom** yang garisnya tidak saling menumpuk, atau **Daftar** bila hanya ingin membaca isinya. Tab Mermaid selalu menampilkan tata letak yang sama dengan dokumen asli.
- **Peta pikiran hanya menampilkan dua tingkat**: itu memang bawaannya agar peta awal terbaca — klik lingkaran di ujung cabang untuk membuka tingkat berikutnya.
- **Fitur yang Anda cari tidak ada di peta**: cari dulu nama menunya di kotak **Cari menu…** di sidebar. Bila menunya ada tetapi petanya belum, berarti berkas sitemap belum diperbarui di rilis ini.
