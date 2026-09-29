---
title: Memantau Sprint Mingguan
icon: CalendarRange
menuKey: data-analyst-sprint
permission: VIEW
duration: 4
href: /admin/data-analyst/sprint
hrefLabel: Buka Sprint Mingguan
goal: Mengetahui apa yang sedang dikerjakan tim pengembang minggu ini, seberapa jauh kemajuannya, dan keputusan apa yang sedang ditunggu dari owner.
---

## Sebelum mulai

Halaman ini memantau **pengembangan aplikasinya sendiri**, bukan data petani. Pengembangan berjalan per **sprint mingguan** (Senin–Minggu). Setiap sprint berisi daftar pekerjaan, masing-masing merujuk ke issue di GitHub.
+ Sumbernya dokumen `docs/project/sprint.md` di repositori, dibaca otomatis saat aplikasi dibangun. Artinya status di halaman ini baru berubah **setelah rilis berikutnya**, bukan saat issue ditutup di GitHub. Untuk status paling baru, klik nomor issue-nya.

## Langkah

1. Buka menu **Data Analyst → Sprint Mingguan**. Tab **Sprint** terbuka pada minggu ini (tombol bertitik di baris pemilih minggu).
2. Baca kartu ringkasan: nomor sprint, **hari ke-n dari 7**, judul fokus minggu ini, dan bilah kemajuan dalam **poin**.
+ Setiap butir diberi ukuran **S = 1 poin** (≤ setengah hari), **M = 3** (1–2 hari), atau **L = 5** (3 hari atau lebih). Kemajuan dihitung dalam poin karena jumlah butir menyesatkan: butir kecil dan besar akan terhitung sama. Jumlah butir tetap ditampilkan di sebelahnya.
3. Periksa kotak kuning **Butuh keputusan owner**. Setiap baris menuliskan pilihan yang perlu diambil dan berapa poin pekerjaan yang tertahan olehnya. Sebaiknya diputuskan **di awal minggu**.
4. Di bawahnya, butir dikelompokkan: **Dikerjakan**, **Belum dimulai**, **Selesai**, dan **Digeser ke sprint lain**. Klik satu baris untuk membuka target minggu ini dan keputusan terkaitnya.
+ Butir yang menunggu keputusan hanya tampil di kotak kuning, tidak diulang di kelompok. Titik berwarna di kanan baris menandai kategori (Keamanan, Rilis, Performa, Data, Fitur, Kerapian). Tombol kecil **#… ↗** di ujung baris membuka issue-nya di GitHub di tab baru.
5. Pilih tombol minggu lain untuk melihat rencana sprint berikutnya atau riwayat sprint yang sudah lewat. Tombol **Backlog** menampilkan pekerjaan yang sudah diurutkan tetapi belum masuk sprint.
6. Buka tab **Analisa** untuk melihat kinerja beberapa minggu sekaligus.
+ Empat kartu di atas meringkas **Rencana** (total poin), **Tertahan keputusan owner**, **Velocity rata-rata** (poin selesai per minggu dari sprint yang sudah selesai — patokan berapa poin yang realistis untuk minggu depan), dan **Carry-over**. Grafik **Beban & kemajuan per sprint** menampilkan satu kolom per sprint: tingginya poin komitmen awal (termasuk butir yang kemudian digeser), isinya menurut status, dengan garis rata-rata selesai begitu ada sprint yang tuntas. **Fokus per kategori** menunjukkan poin per kategori di tiap sprint, sehingga terlihat apakah urutan "risiko prod dulu" benar-benar dijalankan. **Keputusan menunggu owner** mengumpulkan semua butir yang menunggu owner, dikelompokkan per urgensi — butir dari sprint yang sudah lewat masuk kelompok **Terlambat**, tidak hilang dari daftar. **Carry-over** mendaftar butir yang pindah sprint; butir yang digeser lebih dari sekali ditebalkan, tanda estimasi terlalu optimis atau ada penghambat.

> [!tip] Untuk rapat mingguan: buka tab Analisa → **Keputusan menunggu owner** dan putuskan dari atas. Lalu bandingkan total poin sprint minggu depan dengan **Velocity rata-rata**. Kalau jauh di atasnya, pindahkan butir ke backlog sebelum minggu dimulai.

## Kalau bermasalah

**Status di halaman tidak sesuai dengan GitHub** — halaman ini membaca dokumen sprint saat aplikasi dibangun. Perubahan status baru tampil setelah dokumennya diperbarui dan aplikasi dirilis ulang.

**Muncul pesan "Semua sprint yang direncanakan sudah lewat"** — rencana minggu berikutnya belum ditulis di dokumen sprint. Minta tim pengembang menambahkannya.

**Menu Sprint Mingguan tidak muncul di sidebar** — menu ini hanya untuk SUPERADMIN, ADMIN, dan MANAGEMENT. Role lain perlu diberi izin VIEW `data-analyst-sprint` lewat Settings → Role & Permission bila memang diputuskan dibuka.
