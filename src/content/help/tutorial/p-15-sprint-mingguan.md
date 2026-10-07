---
title: Memantau Rencana Pengembangan
icon: CalendarRange
menuKey: data-analyst-sprint
permission: VIEW
duration: 5
href: /admin/data-analyst/sprint
hrefLabel: Buka Rencana Pengembangan
goal: Mengetahui apa yang dikerjakan untuk rilis aplikasi berikutnya, seberapa jauh kemajuannya, dan keputusan apa yang sedang ditunggu dari owner.
---

## Sebelum mulai

Halaman ini memantau **pengembangan aplikasinya sendiri**, bukan data petani. Pekerjaan direncanakan **per rilis** (misalnya v1.3.0), masing-masing dengan tanggal mulai dan target. Rilis tidak terikat ritme mingguan: ada minggu yang padat, ada minggu tanpa pengembangan karena cleaning data atau kunjungan ke distrik. Setiap rilis berisi daftar pekerjaan, masing-masing merujuk ke issue di GitHub.
+ Sumbernya dokumen `docs/project/sprint.md` di repositori, dibaca otomatis saat aplikasi dibangun. Artinya status di halaman ini baru berubah **setelah rilis berikutnya**, bukan saat issue ditutup di GitHub. Kotak **Dokumen rencana diperbarui** di bawah judul halaman menunjukkan kapan dokumen itu terakhir disunting. Untuk status paling baru, klik nomor issue-nya.

## Langkah

1. Buka menu **Platform Developer → Rencana Pengembangan**. Di bawah judul ada strip ringkasan tiga kotak: kapan **dokumen rencana diperbarui** (berlatar kuning bila lebih dari 14 hari lalu), kemajuan **rilis yang sedang dikejar** beserta sisa harinya, dan jumlah **keputusan menunggu owner**. Klik jumlah keputusan untuk langsung membuka daftarnya di tab Analisa; tautan **+ n keputusan di backlog** membuka keputusan yang menunggu di backlog (tab Semua Issue).
2. Tab **Rilis** terbuka pada rilis yang sedang berjalan. Tombol di atas papan hanya memuat rilis yang **belum tuntas**: berjalan (bertitik), **terlambat** (target sudah lewat tetapi masih ada sisa), dan mendatang. Rilis yang sudah dirilis ada di kotak **Riwayat**; ketik versinya untuk mencari. Baris ringkasan di atas papan memuat versi, judul, tanggal, hari ke-berapa dan sisa hari, serta bilah kemajuan dalam **poin**.
+ Setiap butir diberi ukuran **S = 1 poin** (≤ setengah hari kerja), **M = 3** (1–2 hari), atau **L = 5** (3 hari atau lebih). Kemajuan dihitung dalam poin karena jumlah butir menyesatkan: butir kecil dan besar akan terhitung sama. Jumlah butir tetap ditampilkan di sebelahnya.
3. Di bawahnya, papan **kanban** empat kolom menunjukkan tahapan tiap butir, dibaca dari kiri ke kanan: **Belum dimulai** → **Dikerjakan** → **Menunggu keputusan** → **Selesai**. Kepala kolom menuliskan jumlah butir dan poinnya.
+ Kolom **Menunggu keputusan** (berlatar kuning bila berisi) menampilkan pilihan yang perlu diambil owner di setiap kartu, dan berapa poin pekerjaan yang tertahan. Sebaiknya diputuskan **di awal rilis**. Di layar sempit kolom-kolom ini tersusun ke bawah.
4. Kartu dibuat ringkas: judul butir, ukuran (mis. **M · 3**), titik warna kategori (Keamanan, Rilis, Performa, Data, Fitur, Kerapian), dan keputusan owner bila masih ditunggu. Keputusan yang sudah diambil (✅) ada di dalam Detail. Klik **Detail** untuk membaca target butir. Kartu di kolom **Selesai** hanya satu baris bertanda centang; klik panah di kanannya untuk melihat detailnya. Nomor **#…** di judul membuka issue-nya di GitHub di tab baru.
+ Butir yang dipindah ke rilis lain tidak masuk papan; buka lajur **Digeser ke rilis lain** di bawahnya. Poinnya dihitung di rilis tujuan.
+ Papan ini hanya menampilkan: status butir diubah di dokumen rencana, bukan dengan menggeser kartu.
5. Buka tab **Analisa** untuk melihat kinerja beberapa rilis sekaligus.
+ Empat kartu di atas meringkas **Rencana** (total poin), **Tertahan keputusan owner**, **Velocity rata-rata** (poin selesai **per minggu kalender**, dari rilis yang sudah **dirilis**, dihitung dari tanggal mulai sampai tanggal rilisnya; di bawahnya tertulis dari berapa rilis dan minggu angka itu dihitung — bila tertulis "sampel masih kecil", perlakukan sebagai perkiraan kasar), dan **Carry-over**. Grafik **Beban & kemajuan per rilis** menampilkan satu kolom per rilis: tingginya poin komitmen awal (termasuk butir yang kemudian digeser) dan isinya menurut status. Begitu ada rilis yang dirilis, setiap kolom mendapat **garis putus kapasitas** = velocity × panjang rilis dalam minggu; batang yang jauh di atas garisnya berarti rilis itu kelebihan beban. **Fokus per kategori** menunjukkan poin per kategori di tiap rilis, sehingga terlihat apakah urutan "risiko prod dulu" benar-benar dijalankan. **Keputusan menunggu owner** mengumpulkan semua butir yang menunggu owner, dikelompokkan per urgensi — butir dari rilis yang sudah lewat target masuk kelompok **Terlambat**, tidak hilang dari daftar. **Carry-over** mendaftar butir yang pindah rilis; butir yang digeser lebih dari sekali ditebalkan, tanda estimasi terlalu optimis atau ada penghambat.
6. Buka tab **Semua Issue** untuk melihat seluruh issue dalam rencana, termasuk **backlog**, dalam satu tabel: **No. Issue**, **Rilis** (mis. *v1.3.0*, atau *Backlog (urutan 2)* untuk kelompok backlog ke-2), **Kategori**, **Status**, dan **Deskripsi** singkat.
+ Saring dengan kotak **Rilis** (bisa dicari; rilis yang belum tuntas di atas, lalu Backlog, lalu riwayat) dan baris **Status**; angka di setiap pilihan adalah jumlah barisnya. Kotak **Cari** mencocokkan nomor issue, rilis, kategori, status, atau kata di deskripsi — semua kata yang diketik harus cocok. Klik judul kolom **No. Issue** atau **Rilis** untuk mengurutkan; klik lagi untuk membalik arah. Memilih **Backlog** langsung mengurutkan menurut urutan pengerjaannya.
+ Issue yang dikerjakan bertahap tampil satu baris per bagiannya, misalnya #286 butir 2 di v1.3.0 dan butir 1 & 3 di Backlog, karena setiap bagian punya status sendiri. Butir yang digeser hanya tampil di rilis tujuannya. Butir backlog belum punya kategori (—). Butir backlog tanpa issue GitHub, misalnya catatan tech debt **TD-049**, ikut tampil dengan kodenya tanpa tautan.

> [!tip] Di awal setiap rilis: buka tab Analisa → **Keputusan menunggu owner** dan putuskan dari atas. Lalu bandingkan total poin rilis berikutnya dengan **garis kapasitas**-nya. Kalau jauh di atasnya, mundurkan target atau pindahkan butir ke backlog.

## Kalau bermasalah

**Status di halaman tidak sesuai dengan GitHub** — halaman ini membaca dokumen rencana saat aplikasi dibangun. Perhatikan kotak **Dokumen rencana diperbarui** di bawah judul: perubahan setelah tanggal itu belum tercatat. Perubahan status baru tampil setelah dokumennya diperbarui dan aplikasi dirilis ulang.

**Rilis bertanda "terlambat"** — targetnya sudah lewat tetapi rilisnya belum ditandai dirilis di dokumen rencana. Rilis ini tetap tampil di depan (dan disebut di strip header) sampai dirilis; butir yang tidak ikut digeser ke rilis lain.

**Muncul pesan "Semua rilis yang direncanakan sudah dirilis"** — rencana rilis berikutnya belum ditulis di dokumen rencana. Minta tim pengembang menambahkannya.

**Menu Rencana Pengembangan tidak muncul di sidebar** — menu ini hanya untuk SUPERADMIN, ADMIN, dan MANAGEMENT. Role lain perlu diberi izin VIEW `data-analyst-sprint` lewat Settings → Role & Permission bila memang diputuskan dibuka.
