---
title: Menindaklanjuti petani yang belum dilatih
icon: GraduationCap
menuKey: dashboard-training
permission: VIEW
duration: 6
href: /admin/dashboard/training
hrefLabel: Buka Dashboard Pelatihan
goal: Anda punya daftar nama petani yang belum mengikuti sebuah paket, siap dipakai sebagai daftar undangan.
---

## Sebelum mulai

Dashboard Pelatihan menjawab pertanyaan "program sudah sejauh mana, dan lembaga mana yang tertinggal". Berbeda dari Report Pelatihan yang berorientasi cetak per kegiatan.

Angka di sini **dihitung langsung** saat halaman dibuka — tidak memakai snapshot.

+ Jadi hasil input pelatihan hari ini langsung terlihat di sini, tanpa perlu proses tambahan apa pun. Ini satu-satunya dashboard yang berperilaku demikian.

## Langkah

1. Buka menu **Dashboard → Dashboard Pelatihan**.
2. Baca lima kartu di atas, terutama **Cakupan Petani Terlatih**.
+ Pembaginya seluruh petani aktif pada lembaga yang tersaring — termasuk lembaga yang belum tersentuh pelatihan sama sekali. Ini disengaja, agar sisa pekerjaan terlihat jujur, bukan tersembunyi.
3. Turun ke tabel **Cakupan Pelatihan per Lembaga & Paket**.
+ Tiap sel adalah persentase petani lembaga itu yang sudah mengikuti satu paket, dibaca terhadap target program 100%. Hijau tua mendekati target, hijau muda masih jauh, dan **merah berarti belum ada satu pun** petani yang mengikuti paket tersebut.
4. Klik judul kolom sebuah paket untuk mengurutkan.
+ Urutan menaik menampilkan lembaga paling tertinggal lebih dulu — inilah cara tercepat menentukan lembaga mana yang perlu didatangi berikutnya.
5. Klik sel yang belum mencapai target.
+ Muncul daftar nama petani yang belum mengikuti paket itu, lengkap dengan ID Petani. Sel yang sudah memenuhi target sengaja tidak bisa diklik — tidak ada yang perlu didaftar.
6. Klik **Salin** atau **Excel** untuk membawa daftarnya keluar.
+ Salin menghasilkan baris siap tempel ke Excel atau pesan WhatsApp. NIK tidak disertakan — daftar ini untuk keperluan undangan, bukan verifikasi identitas.
7. Periksa panel **Efektivitas Pre/Post-Test** dan **Kualitas Data** di bawahnya.
+ Panel efektivitas menandai peserta yang skor post-nya lebih rendah dari pre — hampir selalu salah input, bukan hasil belajar menurun. Panel kualitas data menunjukkan kegiatan tanpa bukti, tanpa lokasi, atau tanpa peserta.

> [!tip] Tabel cakupan bisa dilipat lewat tanda panah di kanan judulnya bila layar terasa penuh. Saat terlipat, ringkasannya tetap terbaca.

## Kalau bermasalah

**Sebuah sel merah padahal pelatihannya sudah dilaksanakan** — kegiatannya mungkin belum dicatat, atau pesertanya belum ditambahkan ke kegiatan tersebut.

+ Periksa di **Master Data → Pelatihan**. Kegiatan yang ada tetapi berjumlah nol peserta juga akan muncul di panel Kualitas Data.

**Sel tidak bisa diklik** — target untuk sel itu sudah tercapai, atau lembaganya belum punya petani aktif.

**Kolom "Lainnya" muncul** — ada kegiatan yang paketnya di luar empat paket program. Kolom itu tidak punya target dan tidak dinilai kurang.
