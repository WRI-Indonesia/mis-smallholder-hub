---
title: Memantau Sprint Mingguan
icon: CalendarRange
menuKey: data-analyst-sprint
permission: VIEW
duration: 5
href: /admin/data-analyst/sprint
hrefLabel: Buka Sprint Mingguan
goal: Mengetahui apa yang sedang dikerjakan tim pengembang minggu ini, seberapa jauh kemajuannya, dan keputusan apa yang sedang ditunggu dari owner.
---

## Sebelum mulai

Halaman ini memantau **pengembangan aplikasinya sendiri**, bukan data petani. Pengembangan berjalan per **sprint mingguan** (Senin–Minggu). Setiap sprint berisi daftar pekerjaan, masing-masing merujuk ke issue di GitHub.
+ Sumbernya dokumen `docs/project/sprint.md` di repositori, dibaca otomatis saat aplikasi dibangun. Artinya status di halaman ini baru berubah **setelah rilis berikutnya**, bukan saat issue ditutup di GitHub. Kotak **Dokumen sprint diperbarui** di bawah judul halaman menunjukkan kapan dokumen itu terakhir disunting. Untuk status paling baru, klik nomor issue-nya.

## Langkah

1. Buka menu **Data Analyst → Sprint Mingguan**. Di bawah judul ada strip ringkasan tiga kotak: kapan **dokumen sprint diperbarui** (berlatar kuning bila lebih dari 7 hari lalu), kemajuan **sprint minggu ini**, dan jumlah **keputusan menunggu owner**. Klik jumlah keputusan sprint untuk langsung membuka daftarnya di tab Analisa; tautan **+ n keputusan di backlog** membuka keputusan yang menunggu di backlog (tab Semua Issue).
2. Tab **Sprint** terbuka pada minggu ini (tombol bertitik di baris pemilih minggu). Baris ringkasan di atas papan memuat nomor sprint, judul fokus, tanggal, dan bilah kemajuan dalam **poin**.
+ Setiap butir diberi ukuran **S = 1 poin** (≤ setengah hari), **M = 3** (1–2 hari), atau **L = 5** (3 hari atau lebih). Kemajuan dihitung dalam poin karena jumlah butir menyesatkan: butir kecil dan besar akan terhitung sama. Jumlah butir tetap ditampilkan di sebelahnya.
3. Di bawahnya, papan **kanban** empat kolom menunjukkan tahapan tiap butir, dibaca dari kiri ke kanan: **Belum dimulai** → **Dikerjakan** → **Menunggu keputusan** → **Selesai**. Kepala kolom menuliskan jumlah butir dan poinnya.
+ Kolom **Menunggu keputusan** (berlatar kuning bila berisi) menampilkan pilihan yang perlu diambil owner di setiap kartu, dan berapa poin pekerjaan yang tertahan. Sebaiknya diputuskan **di awal minggu**. Di layar sempit kolom-kolom ini tersusun ke bawah.
4. Kartu dibuat ringkas: judul butir, ukuran (mis. **M · 3**), titik warna kategori (Keamanan, Rilis, Performa, Data, Fitur, Kerapian), dan keputusan owner bila masih ditunggu. Keputusan yang sudah diambil (✅) ada di dalam Detail. Klik **Detail** untuk membaca target minggu ini. Kartu di kolom **Selesai** hanya satu baris bertanda centang; klik panah di kanannya untuk melihat detailnya. Nomor **#…** di judul membuka issue-nya di GitHub di tab baru.
+ Butir yang dipindah ke minggu lain tidak masuk papan; buka lajur **Digeser ke sprint lain** di bawahnya. Poinnya dihitung di sprint tujuan.
+ Papan ini hanya menampilkan: status butir diubah di dokumen sprint, bukan dengan menggeser kartu.
5. Pilih tombol minggu lain untuk melihat rencana sprint berikutnya atau riwayat sprint yang sudah lewat.
6. Buka tab **Analisa** untuk melihat kinerja beberapa minggu sekaligus.
+ Empat kartu di atas meringkas **Rencana** (total poin), **Tertahan keputusan owner**, **Velocity rata-rata** (poin selesai per minggu dari sprint yang sudah selesai — patokan berapa poin yang realistis untuk minggu depan), dan **Carry-over**. Grafik **Beban & kemajuan per sprint** menampilkan satu kolom per sprint: tingginya poin komitmen awal (termasuk butir yang kemudian digeser), isinya menurut status, dengan garis rata-rata selesai begitu ada sprint yang tuntas. **Fokus per kategori** menunjukkan poin per kategori di tiap sprint, sehingga terlihat apakah urutan "risiko prod dulu" benar-benar dijalankan. **Keputusan menunggu owner** mengumpulkan semua butir yang menunggu owner, dikelompokkan per urgensi — butir dari sprint yang sudah lewat masuk kelompok **Terlambat**, tidak hilang dari daftar. **Carry-over** mendaftar butir yang pindah sprint; butir yang digeser lebih dari sekali ditebalkan, tanda estimasi terlalu optimis atau ada penghambat.
7. Buka tab **Semua Issue** untuk melihat seluruh issue dalam rencana, termasuk **backlog**, dalam satu tabel: **No. Issue**, **Sprint** (mis. *Sprint 3*, atau *Backlog (urutan 2)* untuk kelompok backlog ke-2), **Kategori**, **Status**, dan **Deskripsi** singkat.
+ Saring dengan baris **Sprint** (S1…S6 atau **Backlog**) dan baris **Status**; angka di setiap tombol adalah jumlah barisnya. Kotak **Cari** mencocokkan nomor issue, sprint, kategori, status, atau kata di deskripsi — semua kata yang diketik harus cocok. Klik judul kolom **No. Issue** atau **Sprint** untuk mengurutkan; klik lagi untuk membalik arah. Memilih **Backlog** langsung mengurutkan menurut urutan pengerjaannya.
+ Issue yang dikerjakan bertahap tampil satu baris per bagiannya, misalnya #286 butir 2 di Sprint 1 dan butir 1 & 3 di Backlog, karena setiap bagian punya status sendiri. Butir yang digeser hanya tampil di sprint tujuannya. Butir backlog belum punya kategori (—). Butir backlog tanpa issue GitHub, misalnya catatan tech debt **TD-049**, ikut tampil dengan kodenya tanpa tautan. Issue lama yang sudah selesai sebelum Sprint 1 tidak ada di tabel ini.

> [!tip] Untuk rapat mingguan: buka tab Analisa → **Keputusan menunggu owner** dan putuskan dari atas. Lalu bandingkan total poin sprint minggu depan dengan **Velocity rata-rata**. Kalau jauh di atasnya, pindahkan butir ke backlog sebelum minggu dimulai.

## Kalau bermasalah

**Status di halaman tidak sesuai dengan GitHub** — halaman ini membaca dokumen sprint saat aplikasi dibangun. Perhatikan kotak **Dokumen sprint diperbarui** di bawah judul: perubahan setelah tanggal itu belum tercatat. Perubahan status baru tampil setelah dokumennya diperbarui dan aplikasi dirilis ulang.

**Muncul pesan "Semua sprint yang direncanakan sudah lewat"** — rencana minggu berikutnya belum ditulis di dokumen sprint. Minta tim pengembang menambahkannya.

**Menu Sprint Mingguan tidak muncul di sidebar** — menu ini hanya untuk SUPERADMIN, ADMIN, dan MANAGEMENT. Role lain perlu diberi izin VIEW `data-analyst-sprint` lewat Settings → Role & Permission bila memang diputuskan dibuka.
