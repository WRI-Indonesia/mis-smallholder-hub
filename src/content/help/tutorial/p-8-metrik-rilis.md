---
title: Membaca Metrik Rilis
icon: Activity
menuKey: dashboard-metrics
permission: VIEW
duration: 6
href: /admin/dashboard/metrics
hrefLabel: Buka Metrik Rilis
goal: Memahami seberapa cepat dan seberapa sehat pengembangan aplikasi ini berjalan dari rilis ke rilis, dan apa saja sisa pekerjaan menuju go-live — untuk pelaporan ke manajemen atau donor.
---

## Sebelum mulai

Halaman ini memantau pengembangan **aplikasinya sendiri**, bukan data petani. Tiga angka utamanya didefinisikan di dokumen standar versioning: **RVS** (skor nilai kumulatif per rilis, mulai 1000), **Roadmap %** (kemajuan tertimbang menuju go-live 1.0), dan KPI kualitas (test, bug, tech debt, cakupan Bantuan).
+ Sumbernya dua file di repositori: `docs/project/metrics.md` (satu baris per rilis, diisi manual sebagai bagian checklist rilis) dan `docs/project/roadmap.md` (daftar fase beserta bobotnya). Halaman membacanya otomatis saat aplikasi dibangun. Kalau format tabelnya rusak, build sengaja gagal supaya angka salah tidak pernah tampil.

## Langkah

1. Buka menu **Data Analyst → Metrik Rilis**.
2. Baca **tiga kartu teratas** untuk kondisi terkini: RVS sekarang, Roadmap, dan jumlah test otomatis.
+ Angka ber-prefiks **≈** adalah estimasi rekonstruksi (rilis sebelum v0.21.0, dihitung mundur dari changelog) — cukup akurat untuk tren, jangan dikutip sebagai angka pasti.
3. Pilih **rentang waktu** sekali di atas grafik. Satu pilihan itu berlaku untuk ketiga grafik sekaligus.
+ Rentang menyaring data, bukan memperbesar tampilan — karena itu sumbu waktu ketiganya selalu sama dan boleh dibandingkan berdampingan ("waktu roadmap datar itu, RVS-nya bagaimana?"). Pilihan yang isinya sudah sama dengan "Semua" sengaja tidak ditampilkan, jadi jumlah tombolnya bertambah sendiri seiring umur data.
4. Baca ketiga grafik: **Kurva RVS** (laju keseluruhan; jarak antar titik mengikuti kalender sungguhan, jadi celah horizontal = hari tanpa rilis), **Progres roadmap** (jarak ke go-live, naik bertangga tiap fase selesai), dan **Jumlah test** (pertumbuhan pengaman regresi).
+ Titik berongga dengan garis putus-putus = estimasi; titik pejal bergaris penuh = terukur. Titik terakhir adalah siklus berjalan — angkanya masih bisa berubah sampai dirilis. Pada Progres roadmap, garis datar **bukan** berarti berhenti: biasanya kerja sedang bergeser ke kualitas, yang terlihat dari RVS dan jumlah test yang tetap naik.
5. Klik kartu **Roadmap** (atau tautan **lihat rincian** di grafiknya) untuk membuka **Detail roadmap** — bagian yang menjawab "dari mana angka itu datang".
+ Isinya: rincian hitung (fase inti bernilai dua kali fase pendukung), sebaran per stream di mana satu kotak = satu fase dengan lebar mengikuti bobotnya, lalu daftar sisa fase dikelompokkan per horizon (Now/Next/Later/Blocked). Arahkan kursor ke kotak untuk melihat fase apa itu.
6. Di tabel sisa, baca kolom **Bila selesai**: berapa poin persen yang bertambah kalau fase itu tuntas. Daftarnya sudah diurutkan dari yang paling menggerakkan jarum — inilah bahan untuk memilih pekerjaan berikutnya.
+ Angka besar tidak berarti pekerjaannya ringan, hanya bobotnya lebih besar: satu fase **inti** yang belum mulai menyumbang sekitar +2,35 pp, sedangkan fase **pendukung** yang tinggal separuh hanya +0,59 pp. Baca bersama kolom Horizon — fase "Later" memang direncanakan sesudah go-live, jadi bukan penghambat 1.0.
7. Jalur **Kualitas** (bug terbuka · tech debt · audit Bantuan · payload peta) ada di bawah grafik; angka Tech debt bisa diklik untuk membuka daftarnya.
8. Sisanya berupa panel yang dibuka saat perlu: **Daftar rilis** (versi, tanggal, Δ RVS, catatan ber-link issue), **Laju RVS per periode**, dan **Tech debt aktif**.
+ Laju RVS per periode adalah tampilan paling rinci: toggle Hari/Minggu/Bulan/Tahun dengan batang dipecah hari kerja / Sabtu / Minggu. Perolehan dicatat pada tanggal rilis — pekerjaan sebenarnya berlangsung di hari-hari sebelumnya, dan periode di tepi rentang bisa belum genap.

> [!tip] Untuk presentasi ke donor, kombinasi paling jujur adalah Roadmap % ("sudah sampai mana") + Detail roadmap ("sisanya apa saja") + jalur kualitas ("makin baik atau tidak"). RVS lebih cocok untuk cerita internal tim karena angka lamanya estimasi.

## Kalau bermasalah

**Angka di dashboard tidak berubah setelah rilis baru** — pastikan baris baru sudah ditambahkan ke `docs/project/metrics.md` saat rilis (butir Checklist Rilis); halaman ini hanya menampilkan isi file itu.

**Roadmap % di kartu berbeda dengan hasil hitung di Detail roadmap** — kartu membaca `metrics.md`, sedangkan Detail roadmap menghitung ulang dari tabel fase di `roadmap.md`. Selisih kecil (di bawah 0,1 poin persen) wajar karena pembulatan; selisih besar berarti salah satu file belum diperbarui — dan itu akan membuat test otomatis gagal saat pengembang menjalankan gate.

**Fase yang sudah selesai masih tampil sebagai sisa** — statusnya belum diubah di tabel Phase Status `roadmap.md`. Halaman tidak pernah menebak status dari kode; ia hanya membaca tabel itu.

**Menu Metrik Rilis tidak muncul di sidebar** — cari di grup **Data Analyst**, bukan Dashboard (alamat halamannya memang masih `/admin/dashboard/metrics`, peninggalan penempatan lama). Menu ini juga khusus SUPERADMIN; role lain perlu diberi izin VIEW `dashboard-metrics` lewat Settings → Role & Permission bila memang diputuskan dibuka.
