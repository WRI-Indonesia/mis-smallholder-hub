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

Dashboard Pelatihan menjawab pertanyaan "program sudah sejauh mana, dan lembaga mana yang tertinggal". Berbeda dari Report Pelatihan yang berorientasi cetak per sesi.

Angka di sini **dihitung langsung** saat halaman dibuka — tidak memakai snapshot.

+ Jadi hasil input pelatihan hari ini langsung terlihat di sini, tanpa perlu proses tambahan apa pun. Ini satu-satunya dashboard yang berperilaku demikian.

## Langkah

1. Buka menu **Dashboard → Dashboard Pelatihan**.
2. Baca empat kartu di atas, terutama **Petani Terlatih**.
+ Pembaginya seluruh petani aktif pada lembaga yang tersaring — termasuk lembaga yang belum tersentuh pelatihan sama sekali. Ini disengaja, agar sisa pekerjaan terlihat jujur, bukan tersembunyi.
3. Turun ke card **Capaian Paket per Distrik** (gambaran besar per distrik), lalu tabel **Capaian Paket per Lembaga**.
+ Tiap sel adalah persentase petani lembaga itu yang sudah mengikuti satu paket, dibaca terhadap target program 100%. Hijau paling tua khusus untuk sel yang sudah **100% (tuntas)**, hijau tua mendekati target, hijau muda masih jauh, dan **merah berarti belum ada satu pun** petani yang mengikuti paket tersebut.
+ Bila filter **Tahun** aktif, bar per distrik terbagi tiga: hijau tua = dilatih pada tahun itu, hijau muda = dilatih hanya di tahun lain, abu = belum pernah dilatih. Angka dilatih di tahun terpilih selalu tampil — di dalam segmen hijau tua bila muat, atau tepat di sebelah kanannya bila segmennya sempit. Arahkan kursor ke bar untuk rincian lengkap (jumlah dan persentase tiap kelompok). Petani yang dilatih tahun sebelumnya tidak dihitung "belum" — cakupan program bersifat kumulatif.
4. Klik judul kolom sebuah paket untuk mengurutkan.
+ Urutan menaik menampilkan lembaga paling tertinggal lebih dulu — inilah cara tercepat menentukan lembaga mana yang perlu didatangi berikutnya.
5. Klik sel yang belum mencapai target.
+ Muncul daftar nama petani yang belum mengikuti paket itu, lengkap dengan ID Petani. Sel yang sudah memenuhi target sengaja tidak bisa diklik — tidak ada yang perlu didaftar.
+ Bila filter **Tahun** aktif, baris petani yang sebenarnya pernah dilatih paket itu di tahun lain diberi badge **"Dilatih {tahun}"** (ikut juga sebagai kolom di Salin/Excel) — jangan diundang ulang sebagai peserta baru. Centang **"Hanya yang belum pernah sama sekali mengikuti paket ini"** untuk menyaring daftar ke yang benar-benar belum pernah; Salin dan Excel mengikuti saringan itu.
6. Klik **Salin** atau **Excel** untuk membawa daftarnya keluar.
+ Salin menghasilkan baris siap tempel ke Excel atau pesan WhatsApp. NIK tidak disertakan — daftar ini untuk keperluan undangan, bukan verifikasi identitas.
7. Periksa panel **Efektivitas Pre/Post-Test** dan **Kualitas Data** di bawahnya.
+ Panel efektivitas menandai peserta yang skor post-nya lebih rendah dari pre — hampir selalu salah input, bukan hasil belajar menurun. Panel kualitas data menunjukkan sesi tanpa bukti, tanpa lokasi, atau tanpa peserta. Di bawah matriks juga ada card **Capaian Paket per Distrik** — rangkuman petani sudah/belum dilatih per paket di tingkat distrik.

> [!tip] Tabel cakupan bisa dilipat lewat tanda panah di kanan judulnya bila layar terasa penuh. Saat terlipat, ringkasannya tetap terbaca.

## Kalau bermasalah

**Sebuah sel merah padahal pelatihannya sudah dilaksanakan** — sesinya mungkin belum dicatat, atau pesertanya belum ditambahkan ke sesi tersebut.

+ Periksa di **Master Data → Pelatihan**. Sesi yang ada tetapi berjumlah nol peserta juga akan muncul di panel Kualitas Data.

**Sel tidak bisa diklik** — target untuk sel itu sudah tercapai, atau lembaganya belum punya petani aktif.

**Kolom "Lainnya" muncul** — ada sesi yang paketnya di luar empat paket program. Kolom itu tidak punya target dan tidak dinilai kurang.
