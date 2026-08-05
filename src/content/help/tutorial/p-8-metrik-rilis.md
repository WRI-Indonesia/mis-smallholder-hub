---
title: Membaca Metrik Rilis
icon: Activity
menuKey: dashboard-metrics
permission: VIEW
duration: 5
href: /admin/dashboard/metrics
hrefLabel: Buka Metrik Rilis
goal: Memahami seberapa cepat dan seberapa sehat pengembangan aplikasi ini berjalan dari rilis ke rilis — untuk pelaporan ke manajemen atau donor.
---

## Sebelum mulai

Halaman ini memantau pengembangan **aplikasinya sendiri**, bukan data petani. Tiga angka utamanya didefinisikan di dokumen standar versioning: **RVS** (skor nilai kumulatif per rilis, mulai 1000), **Roadmap %** (kemajuan tertimbang menuju go-live 1.0), dan KPI kualitas (test, bug, tech debt, cakupan Bantuan).
+ Sumber datanya file `docs/project/metrics.md` di repositori — diisi manual setiap rilis sebagai bagian checklist rilis, lalu halaman ini membacanya otomatis. Kalau tabel di file itu rusak formatnya, build aplikasi sengaja gagal supaya angka salah tidak pernah tampil.

## Langkah

1. Buka menu **Dashboard → Metrik Rilis**.
2. Baca empat kartu teratas untuk kondisi terkini: RVS, Roadmap %, jumlah test, dan ringkasan kualitas.
+ Angka ber-prefiks **≈** adalah estimasi rekonstruksi (rilis sebelum v0.21.0, dihitung mundur dari changelog) — cukup akurat untuk tren, jangan dikutip sebagai angka pasti.
3. Lihat **Kurva RVS** untuk laju keseluruhan. Jarak antar titik mengikuti kalender sungguhan, jadi celah horizontal = hari tanpa rilis.
+ Titik berongga dengan garis putus-putus = estimasi; garis penuh dengan titik pejal = terukur (sejak anotasi "mulai diukur"). Titik terakhir adalah siklus berjalan — angkanya masih bisa berubah sampai dirilis.
4. Pakai **Perolehan RVS per periode** untuk melihat ritme kerja: toggle Hari/Minggu/Bulan/Tahun, batang dipecah hari kerja vs Sabtu vs Minggu.
+ Perolehan dicatat pada tanggal rilis — pekerjaan sebenarnya berlangsung di hari-hari sebelumnya. Pada mode Bulan/Tahun muncul peringatan bila rentang datanya belum genap, supaya perbandingannya tidak menyesatkan.
5. Dua grafik kecil menjawab dua pertanyaan berbeda: **Progres roadmap** (jarak ke go-live — naiknya bertangga per fase selesai; datar ≠ berhenti, biasanya berarti kerja kualitas) dan **Jumlah test** (pertumbuhan pengaman regresi).
6. Panel kualitas dan **Daftar rilis** di bawah adalah rinciannya — versi, tanggal, Δ RVS, catatan, dan nomor issue GitHub-nya.

> [!tip] Untuk presentasi ke donor, kombinasi paling jujur adalah Roadmap % ("sudah sampai mana") + kartu KPI ("makin baik atau tidak"). RVS lebih cocok untuk cerita internal tim karena angka lamanya estimasi.

## Kalau bermasalah

**Angka di dashboard tidak berubah setelah rilis baru** — pastikan baris baru sudah ditambahkan ke `docs/project/metrics.md` saat rilis (butir Checklist Rilis); halaman ini hanya menampilkan isi file itu.

**Menu Metrik Rilis tidak muncul di sidebar** — menu ini khusus SUPERADMIN; role lain perlu diberi izin VIEW `dashboard-metrics` lewat Settings → Role & Permission bila memang diputuskan dibuka.
