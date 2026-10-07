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
3. Tepat di bawah empat kartu, baca card **Training Benefit per year**.
+ Card ini menghitung per paket berapa petani yang **baru** pertama kali dilatih pada tiap tahun (**Actual**) dan totalnya sampai akhir tahun itu (**Kumulative**). Baris terakhir, **Petani pernah mengikuti pelatihan (minimal 1)**, menghitung petani yang ikut paket apa pun (termasuk Lainnya) — satu petani dihitung sekali, pada tahun pertama ia ikut pelatihan. Kolom tahunnya bergeser sendiri: tahun berjalan, tahun lalu, dan "≤" dua tahun lalu (gabungan tahun itu dan sebelumnya). Kolom Kumulative tahun berjalan dicetak tebal karena itulah angka utamanya; nilainya sama dengan jumlah "sudah dilatih" di card Capaian Paket per Distrik saat filter Tahun kosong. Tombol **ⓘ** di kanan atas merangkum cara menghitungnya. Card ini mengikuti filter Distrik dan Lembaga, tetapi **tidak** mengikuti filter Tahun.
+ Tombol tampilan terbagi dua kelompok. **Capaian: Tabel | Grafis** — Tabel adalah format laporan donor; Grafis menggambar bar bertumpuk: panjang bar = petani yang sudah dilatih s.d. tahun berjalan, warna segmen = kapan mereka pertama kali dilatih (paling gelap = s.d. dua tahun lalu, paling terang = baru tahun ini), dan panjang trek penuh = total petani aktif, sehingga sisa abu di ujung kanan adalah petani yang **belum** dilatih paket itu (arahkan kursor ke bar untuk jumlahnya).
+ **vs Kontrak** membandingkan target kontrak **per paket** (diisi di Master Data → Target Program) dengan realisasi, untuk kelima baris kartu, dalam lima grafik kecil dengan skala sumbu yang sama, sehingga paket yang tertinggal langsung terlihat lebih rendah; kotak *pernah mengikuti* ditonjolkan sebagai total program. Di tiap grafik: garis putus-putus = target kumulatif, garis tegas = realisasi kumulatif sampai tahun berjalan, beserta selisihnya ("tertinggal …", atau "≈ sesuai target" bila selisihnya di bawah 1%). Angka besar = petani yang sudah dilatih dari total kontrak. Bila filter Distrik/Lembaga aktif, realisasi hanya untuk wilayah itu sedangkan target tetap seluruh program — ada catatan kuning agar persennya tidak disalahbaca.
+ Tombol **Excel** mengunduh satu berkas berisi tiga sheet, apa pun tampilan yang sedang aktif: **Tabel** (format laporan donor), **Grafis** (angka per paket termasuk yang belum dilatih, plus gambar grafiknya), dan **vs Kontrak** (target, realisasi, dan persen per tahun, plus gambar kelima grafik). Tombol ini hanya ada untuk akun berizin Export.
4. Turun ke card **Capaian Paket per Distrik** (gambaran besar per distrik), lalu tabel **Capaian Paket per Lembaga**.
+ Tiap sel adalah persentase petani lembaga itu yang sudah mengikuti satu paket, dibaca terhadap target program 100%. Hijau paling tua khusus untuk sel yang sudah **100% (tuntas)**, hijau tua mendekati target, hijau muda masih jauh, dan **merah berarti belum ada satu pun** petani yang mengikuti paket tersebut. Arahkan kursor ke sel untuk rincian angkanya: jumlah sudah/belum ikut (plus "ikut tahun lain" saat filter Tahun aktif) dan sisa petani menuju target.
+ Bila filter **Tahun** aktif, bar per distrik terbagi tiga: hijau tua = dilatih pada tahun itu, hijau muda = dilatih hanya di tahun lain, abu = belum pernah dilatih. Angka dilatih di tahun terpilih selalu tampil — di dalam segmen hijau tua bila muat, atau tepat di sebelah kanannya bila segmennya sempit. Arahkan kursor ke bar untuk rincian lengkap (jumlah dan persentase tiap kelompok). Petani yang dilatih tahun sebelumnya tidak dihitung "belum" — cakupan program bersifat kumulatif.
5. Klik judul kolom sebuah paket untuk mengurutkan.
+ Urutan menaik menampilkan lembaga paling tertinggal lebih dulu — inilah cara tercepat menentukan lembaga mana yang perlu didatangi berikutnya.
6. Klik sel yang belum mencapai target.
+ Muncul daftar nama petani yang belum mengikuti paket itu, lengkap dengan ID Petani. Sel yang sudah memenuhi target sengaja tidak bisa diklik — tidak ada yang perlu didaftar.
+ Bila filter **Tahun** aktif, baris petani yang sebenarnya pernah dilatih paket itu di tahun lain diberi badge **"Dilatih {tahun}"** (ikut juga sebagai kolom di Salin/Excel) — jangan diundang ulang sebagai peserta baru. Centang **"Hanya yang belum pernah sama sekali mengikuti paket ini"** untuk menyaring daftar ke yang benar-benar belum pernah; Salin dan Excel mengikuti saringan itu.
7. Klik **Salin** atau **Excel** untuk membawa daftarnya keluar.
+ Salin menghasilkan baris siap tempel ke Excel atau pesan WhatsApp. NIK tidak disertakan — daftar ini untuk keperluan undangan, bukan verifikasi identitas. Kedua tombol (Salin dan Excel) hanya tampil bila akun Anda punya izin **Export** pada menu ini.
8. Periksa panel **Efektivitas Pre / Post-Test** dan **Kualitas Data** di bawahnya.
+ Panel efektivitas menandai peserta yang skor post-nya lebih rendah dari pre — hampir selalu salah input, bukan hasil belajar menurun. Panel kualitas data menunjukkan sesi tanpa bukti, tanpa lokasi, atau tanpa peserta. Di sampingnya ada grafik **Tren Kehadiran Pelatihan** dan panel **Kelulusan Post-Test per Paket**. Card **Capaian Paket per Distrik** (di atas matriks) disembunyikan saat filter Lembaga aktif — roll-up distrik atas satu lembaga tidak bermakna.

> [!tip] Tabel cakupan bisa dilipat lewat tanda panah di kanan judulnya bila layar terasa penuh. Saat terlipat, ringkasannya tetap terbaca.

## Kalau bermasalah

**Sebuah sel merah padahal pelatihannya sudah dilaksanakan** — sesinya mungkin belum dicatat, atau pesertanya belum ditambahkan ke sesi tersebut.

+ Periksa di **Master Data → Pelatihan**. Sesi yang ada tetapi berjumlah nol peserta juga akan muncul di panel Kualitas Data.

**Sel tidak bisa diklik** — target untuk sel itu sudah tercapai, atau lembaganya belum punya petani aktif.

**Kolom "Lainnya" muncul** — ada sesi yang paketnya di luar empat paket program. Kolom itu tidak punya target dan tidak dinilai kurang.
