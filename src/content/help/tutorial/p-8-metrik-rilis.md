---
title: Membaca Metrik Rilis
icon: Activity
menuKey: dashboard-metrics
permission: VIEW
duration: 6
href: /admin/dashboard/metrics
hrefLabel: Buka Metrik Rilis
goal: Memahami seberapa cepat dan seberapa sehat pengembangan aplikasi ini berjalan dari rilis ke rilis, dan apa saja sisa fase roadmap — untuk pelaporan ke manajemen atau donor.
---

## Sebelum mulai

Halaman ini memantau pengembangan **aplikasinya sendiri**, bukan data petani. Tiga angka utamanya didefinisikan di dokumen standar versioning: **RVS** (skor nilai kumulatif per rilis, mulai 1000), **Roadmap %** (kemajuan tertimbang fase Roadmap 2026–2027), dan KPI kualitas (test, bug, tech debt, cakupan Bantuan).
+ Sumbernya dua file di repositori: `docs/project/metrics.md` (satu baris per rilis, diisi manual sebagai bagian checklist rilis) dan `docs/project/roadmap.md` (daftar fase beserta bobotnya). Halaman membacanya otomatis saat aplikasi dibangun. Kalau format tabelnya rusak, build sengaja gagal supaya angka salah tidak pernah tampil.

## Langkah

1. Buka menu **Platform Developer → Metrik Rilis**.
2. Baca **dua kartu teratas**. **Rilis terakhir** memuat RVS (nilai kumulatif kerja yang sudah dirilis) dan Progres roadmap. **Rilis berjalan** memuat rilis yang sedang dikejar: versi, target, progres butir, dan sisa hari.
+ Baris kecil di bawah angka RVS adalah **perolehan rilis terakhir** (mis. "+91 dari rilis ini"). Arahkan kursor ke ikon ⓘ di samping RVS untuk definisinya. Di Progres roadmap, baris itu memuat poin yang sudah diperoleh dari total poin dan jumlah fase roadmap aktif, ditambah nilai akhir baseline lama yang sudah dibekukan.
+ Kartu **Rilis berjalan** dibaca dari `docs/project/sprint.md` — rencana yang sama dengan halaman **Rencana Pengembangan** (tautannya tampil bila Anda boleh membuka halaman itu). Butir yang **Digeser** ke rilis lain tidak dihitung; angka "menunggu keputusan" berwarna kuning bila ada keputusan owner yang belum diambil. Rilis yang melewati target tanpa ditandai dirilis tampil dengan keterangan "lewat n hari".
+ Angka ber-prefiks **≈** adalah estimasi rekonstruksi (rilis sebelum v0.21.0, dihitung mundur dari changelog) — cukup akurat untuk tren, jangan dikutip sebagai angka pasti.
3. Baca jalur **kesehatan** di bawahnya: **Bug terbuka**, **Tech debt aktif**, **Bantuan** (menu ber-tutorial), dan **Test otomatis**. Panah menunjukkan arah dibanding rilis sebelumnya — hijau bila arahnya baik (tech debt turun, test naik), kuning bila sebaliknya. Klik **Tech debt aktif** untuk membuka daftarnya.
4. Di kartu grafik, pilih tab **Kurva RVS**, **Progres roadmap**, atau **Jumlah test**, lalu pilih **rentang waktu** di kanan atas. Rentang berlaku untuk ketiga tab, jadi berpindah tab membandingkan periode yang sama.
+ Rentang menyaring data, bukan memperbesar tampilan. Pilihan yang isinya sudah sama dengan "Semua" sengaja tidak ditampilkan, jadi jumlah tombolnya bertambah sendiri seiring umur data.
+ **Kurva RVS**: jarak antar titik mengikuti kalender sungguhan, jadi celah horizontal = hari tanpa rilis. **Progres roadmap** naik bertangga tiap fase selesai; garis datar **bukan** berarti berhenti — biasanya kerja sedang bergeser ke kualitas, yang terlihat dari RVS dan jumlah test yang tetap naik. Bila roadmap pernah direset, garisnya **terputus** di garis vertikal "reset": bagian pudar di kiri adalah baseline lama, bagian tegas di kanan roadmap yang berlaku sekarang. Titik berongga dengan garis putus-putus = estimasi; titik terakhir = siklus berjalan.
5. Klik **Progres roadmap** di kartu Rilis terakhir (atau tautan **lihat rincian fase** di tab grafiknya) untuk membuka **Detail roadmap** — bagian yang menjawab "dari mana angka itu datang".
+ Isinya: rincian hitung (fase inti bernilai dua kali fase pendukung), sebaran per stream di mana satu kotak = satu fase dengan lebar mengikuti bobotnya, lalu **Sisa fase roadmap**. Arahkan kursor ke kotak untuk melihat fase apa itu.
6. Di **Sisa fase roadmap**, fase yang belum selesai dikelompokkan per horizon, dan setiap kelompok berjudul periodenya: **Now** (kuartal berjalan), **Next** (semester berikutnya), **Later** (paruh akhir roadmap). Di tiap kelompok, fase inti tampil dulu. Klik satu baris untuk membuka **Sudah ada** dan **Langkah berikutnya**.
+ Angka di kanan baris adalah bobot dan tambahan Roadmap % bila fase itu tuntas. Angka besar tidak berarti pekerjaannya ringan, hanya bobotnya lebih besar: fase **inti** yang belum mulai bernilai dua kali fase **pendukung**. Judul kelompok menjumlahkan poin yang masih terbuka dan tambahan persen bila seluruh kelompok tuntas.
7. Sisanya berupa panel yang dibuka saat perlu: **Daftar rilis** (versi, tanggal, Δ RVS, catatan ber-link issue), **Laju RVS per periode**, dan **Tech debt aktif**.
+ Laju RVS per periode adalah tampilan paling rinci: toggle Hari/Minggu/Bulan/Tahun dengan batang dipecah hari kerja / Sabtu / Minggu. Perolehan dicatat pada tanggal rilis — pekerjaan sebenarnya berlangsung di hari-hari sebelumnya, dan periode di tepi rentang bisa belum genap.

> [!tip] Untuk presentasi ke donor, kombinasi paling jujur adalah Roadmap % ("sudah sampai mana") + Detail roadmap ("sisanya apa saja") + jalur kesehatan ("makin baik atau tidak"). RVS lebih cocok untuk cerita internal tim karena angka lamanya estimasi.

## Kalau bermasalah

**Kartu Payload peta tidak ada lagi** — sengaja dihapus (#421): ukurannya terakhir diukur di v0.35.0 dan tidak pernah dipantau otomatis, sehingga angkanya menyesatkan bila tampil sejajar angka terkini. Riwayatnya tetap ada di **Daftar rilis** (kolom KPI) dan `docs/project/metrics.md`.

**Kartu Rilis berjalan menunjukkan rilis yang sudah keluar** — heading rilis di `docs/project/sprint.md` belum diberi penanda `(dirilis YYYY-MM-DD)`; halaman tidak menebak dari tanggal.

**Angka di dashboard tidak berubah setelah rilis baru** — pastikan baris baru sudah ditambahkan ke `docs/project/metrics.md` saat rilis (butir Checklist Rilis); halaman ini hanya menampilkan isi file itu.

**Roadmap % di kartu Rilis terakhir berbeda dengan hasil hitung di Detail roadmap** — kartu membaca `metrics.md`, sedangkan Detail roadmap menghitung ulang dari tabel fase di `roadmap.md`. Selisih kecil (di bawah 0,1 poin persen) wajar karena pembulatan; selisih besar berarti salah satu file belum diperbarui — dan itu akan membuat test otomatis gagal saat pengembang menjalankan gate.

**Grafik Progres roadmap terputus: bagian kiri pudar di 88,5%, titik baru jauh lebih rendah (11,4% di v1.3.0)** — itu reset baseline, bukan kemunduran. Setelah MVP (v1.0.0), roadmap lama dibekukan dan diganti Roadmap 2026–2027 yang berisi fase pasca-MVP dan modul visi produk (30 September 2026). Titik sebelum reset mengukur jalan menuju go-live; titik sesudahnya mengukur rencana 2026–2027, jadi keduanya sengaja tidak disambung garis.

**Fase yang sudah selesai masih tampil sebagai sisa** — statusnya belum diubah di tabel Phase Status `roadmap.md`. Halaman tidak pernah menebak status dari kode; ia hanya membaca tabel itu.

**Menu Metrik Rilis tidak muncul di sidebar** — cari di grup **Platform Developer**, bukan Dashboard atau Data Analyst (alamat halamannya memang masih `/admin/dashboard/metrics`, peninggalan penempatan lama). Menu ini hanya dibuka untuk SUPERADMIN, ADMIN, dan MANAGEMENT; role lain perlu diberi izin VIEW `dashboard-metrics` lewat Settings → Role & Permission bila memang diputuskan dibuka.
