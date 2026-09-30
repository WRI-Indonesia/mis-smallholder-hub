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

1. Buka menu **Data Analyst → Metrik Rilis**.
2. Baca **tiga kartu teratas** untuk kondisi terkini: RVS sekarang, Roadmap, dan jumlah test otomatis.
+ Baris kecil di bawah angka RVS dan Test adalah **perolehan rilis terakhir** (mis. "+183 di v1.2.0"). Di kartu Roadmap, baris itu memuat poin yang sudah diperoleh dari total poin dan jumlah fase roadmap aktif, ditambah nilai akhir baseline lama yang sudah dibekukan.
+ Angka ber-prefiks **≈** adalah estimasi rekonstruksi (rilis sebelum v0.21.0, dihitung mundur dari changelog) — cukup akurat untuk tren, jangan dikutip sebagai angka pasti.
3. Pilih **rentang waktu** sekali di atas grafik. Satu pilihan itu berlaku untuk ketiga grafik sekaligus.
+ Rentang menyaring data, bukan memperbesar tampilan — karena itu sumbu waktu ketiganya selalu sama dan boleh dibandingkan berdampingan ("waktu roadmap datar itu, RVS-nya bagaimana?"). Pilihan yang isinya sudah sama dengan "Semua" sengaja tidak ditampilkan, jadi jumlah tombolnya bertambah sendiri seiring umur data.
4. Baca ketiga grafik: **Kurva RVS** (laju keseluruhan; jarak antar titik mengikuti kalender sungguhan, jadi celah horizontal = hari tanpa rilis), **Progres roadmap** (kemajuan fase roadmap, naik bertangga tiap fase selesai), dan **Jumlah test** (pertumbuhan pengaman regresi).
+ Titik berongga dengan garis putus-putus = estimasi; titik pejal bergaris penuh = terukur. Titik terakhir adalah siklus berjalan — angkanya masih bisa berubah sampai dirilis. Pada Progres roadmap, garis datar **bukan** berarti berhenti: biasanya kerja sedang bergeser ke kualitas, yang terlihat dari RVS dan jumlah test yang tetap naik. Bila roadmap pernah direset, garisnya **terputus** di garis vertikal "reset": bagian pudar di kiri adalah baseline lama yang dibekukan, bagian tegas di kanan adalah roadmap yang berlaku sekarang.
5. Klik kartu **Roadmap** (atau tautan **lihat rincian** di grafiknya) untuk membuka **Detail roadmap** — bagian yang menjawab "dari mana angka itu datang".
+ Isinya: rincian hitung (fase inti bernilai dua kali fase pendukung), sebaran per stream di mana satu kotak = satu fase dengan lebar mengikuti bobotnya, lalu **Sisa fase roadmap**. Arahkan kursor ke kotak untuk melihat fase apa itu.
6. Di **Sisa fase roadmap**, fase yang belum selesai dikelompokkan per horizon, dan setiap kelompok berjudul periodenya: **Now** (kuartal berjalan), **Next** (semester berikutnya), **Later** (paruh akhir roadmap). Di tiap kelompok, fase inti tampil dulu. Klik satu baris untuk membuka **Sudah ada** dan **Langkah berikutnya**.
+ Angka di kanan baris adalah bobot dan tambahan Roadmap % bila fase itu tuntas. Angka besar tidak berarti pekerjaannya ringan, hanya bobotnya lebih besar: fase **inti** yang belum mulai bernilai dua kali fase **pendukung**. Judul kelompok menjumlahkan poin yang masih terbuka dan tambahan persen bila seluruh kelompok tuntas.
7. Jalur **Kualitas** (bug terbuka · tech debt · audit Bantuan · payload peta) ada di bawah grafik; angka Tech debt bisa diklik untuk membuka daftarnya.
8. Sisanya berupa panel yang dibuka saat perlu: **Daftar rilis** (versi, tanggal, Δ RVS, catatan ber-link issue), **Laju RVS per periode**, dan **Tech debt aktif**.
+ Laju RVS per periode adalah tampilan paling rinci: toggle Hari/Minggu/Bulan/Tahun dengan batang dipecah hari kerja / Sabtu / Minggu. Perolehan dicatat pada tanggal rilis — pekerjaan sebenarnya berlangsung di hari-hari sebelumnya, dan periode di tepi rentang bisa belum genap.

> [!tip] Untuk presentasi ke donor, kombinasi paling jujur adalah Roadmap % ("sudah sampai mana") + Detail roadmap ("sisanya apa saja") + jalur kualitas ("makin baik atau tidak"). RVS lebih cocok untuk cerita internal tim karena angka lamanya estimasi.

## Kalau bermasalah

**Angka di dashboard tidak berubah setelah rilis baru** — pastikan baris baru sudah ditambahkan ke `docs/project/metrics.md` saat rilis (butir Checklist Rilis); halaman ini hanya menampilkan isi file itu.

**Roadmap % di kartu berbeda dengan hasil hitung di Detail roadmap** — kartu membaca `metrics.md`, sedangkan Detail roadmap menghitung ulang dari tabel fase di `roadmap.md`. Selisih kecil (di bawah 0,1 poin persen) wajar karena pembulatan; selisih besar berarti salah satu file belum diperbarui — dan itu akan membuat test otomatis gagal saat pengembang menjalankan gate.

**Grafik Progres roadmap terputus: bagian kiri pudar di 88,5%, titik baru di 8,6%** — itu reset baseline, bukan kemunduran. Setelah MVP (v1.0.0), roadmap lama dibekukan dan diganti Roadmap 2026–2027 yang berisi fase pasca-MVP dan modul visi produk (30 September 2026). Titik sebelum reset mengukur jalan menuju go-live; titik sesudahnya mengukur rencana 2026–2027, jadi keduanya sengaja tidak disambung garis.

**Fase yang sudah selesai masih tampil sebagai sisa** — statusnya belum diubah di tabel Phase Status `roadmap.md`. Halaman tidak pernah menebak status dari kode; ia hanya membaca tabel itu.

**Menu Metrik Rilis tidak muncul di sidebar** — cari di grup **Data Analyst**, bukan Dashboard (alamat halamannya memang masih `/admin/dashboard/metrics`, peninggalan penempatan lama). Menu ini hanya dibuka untuk SUPERADMIN, ADMIN, dan MANAGEMENT; role lain perlu diberi izin VIEW `dashboard-metrics` lewat Settings → Role & Permission bila memang diputuskan dibuka.
