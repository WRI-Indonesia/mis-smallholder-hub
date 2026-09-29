---
title: Menemukan lahan yang tumpang tindih
icon: Layers
menuKey: data-analyst-parcel-overlap
permission: VIEW
duration: 6
href: /admin/data-analyst/parcel-overlap
hrefLabel: Buka Tumpang Tindih Lahan
goal: Daftar pasangan lahan yang poligonnya saling menumpuk — dipilah Duplikat, Tercakup, atau Sebagian — lengkap dengan peta dan unduhan untuk ditindaklanjuti.
---

## Sebelum mulai

Tumpang tindih hampir mustahil ditemukan lewat mata di peta. Halaman ini membandingkan seluruh poligon lahan aktif satu per satu dan menampilkan pasangan yang **bagian dalamnya** saling beririsan. Lahan bersebelahan yang hanya berbagi batas tidak dihitung.

+ Angkanya dihitung langsung dari data terkini setiap kali halaman dibuka, bukan dari snapshot. Luas lahan dan luas irisan dihitung dari **poligon**, bukan dari kolom luas yang tercatat saat upload, jadi angkanya bisa berbeda sedikit dari Detail Lahan.

## Langkah

1. Buka menu **Data Analyst → Tumpang Tindih Lahan**.
2. Atur filter **Tumpang tindih**: `Semua`, `> 10%`, `> 25%`, `> 50%`, `> 75%`, atau `> 90%`. Bawaannya `Semua`.
+ Persen dihitung terhadap **lahan yang lebih kecil**. Contohnya, lahan 0,5 ha yang separuhnya menumpuk ke lahan 2 ha tertulis 50%. Di tabel juga tampil persen terhadap masing-masing lahan (`A …% · B …%`).
+ Irisan yang sangat kecil (di bawah 100 m² **dan** di bawah 1% lahan terkecil) tidak pernah ditampilkan, bahkan pada pilihan `Semua`. Irisan seperti itu biasanya berasal dari garis batas digitasi yang sedikit meleset, bukan masalah data.
3. Persempit bila perlu dengan **Jenis**, **Distrik**, atau **Lembaga**.
+ Jenis pasangan menentukan tindak lanjutnya. **Petani sama** biasanya berarti lahan yang sama terinput dua kali, sehingga luasnya terhitung ganda. **Beda petani, satu Lembaga** perlu cek batas di lapangan. **Lintas Lembaga** berarti satu lahan mungkin terdaftar di dua Lembaga.
+ Filter Distrik dan Lembaga cocok bila **salah satu** lahan dalam pasangan berada di sana.
+ Semua filter tersimpan di alamat halaman, jadi tautannya bisa dikirim ke rekan dan akan menampilkan daftar yang sama.
4. Baca kolom **Label** di tabel (klik judul kolomnya untuk mengurutkan Duplikat → Tercakup → Sebagian), atau klik chip **Duplikat / Tercakup / Sebagian** di atas tabel untuk menampilkan satu label saja. Chip **Semua** (atau klik chip yang aktif sekali lagi) menampilkan semua label kembali.
+ Arahkan kursor ke badge label untuk melihat artinya. Angka pada chip mengikuti filter lain, jadi tetap terbaca saat salah satu chip aktif.
+ **Duplikat**: irisannya lebih dari 90% dari kedua lahan, jadi kedua poligon hampir identik. Umumnya ini entri ganda.
+ **Tercakup**: lahan kecil lebih dari 90% berada di dalam lahan yang lebih besar. Mungkin lahan dipecah lalu lahan induknya tidak dihapus, atau batasnya salah.
+ **Sebagian**: hanya sebagian lahan yang menumpuk.
5. Periksa pasangan di panel kanan. Pasangan pertama langsung tampil; klik baris lain, atau pakai tombol **Sebelumnya / Berikutnya**, untuk berpindah. Di peta, lahan A biru, lahan B oranye, irisan merah.
+ Setelah mengklik salah satu baris, tombol panah ↑/↓ di keyboard juga berpindah pasangan. Di luar tabel dan panel preview, panah tetap menggulir halaman seperti biasa; di atas peta, panah menggeser peta.
+ Pilihan latar peta (mis. SAT) tetap dipakai saat berpindah pasangan.
+ Di bawah peta tampil ringkasan kedua lahan: petani, Kelompok Tani, Lembaga, Distrik, luas poligon, dan persen yang tertumpang. Tautan **Buka Detail Lahan** membuka halaman lahan itu di **tab baru**, sehingga filter dan posisi Anda di sini tidak hilang.
+ Tanda **+N** di samping ID lahan berarti lahan itu juga tumpang tindih dengan N lahan lain. Ketik ID lahannya di kotak cari untuk melihat semua pasangannya.
+ Nama Lembaga hanya ditulis di tabel untuk pasangan **Lintas Lembaga**. Untuk pasangan lain, arahkan kursor ke sel lahan untuk melihat Lembaga dan Distriknya.
+ Di layar HP, peta ada di bawah tabel; mengklik baris menggulirkan halaman ke sana.
6. Unduh hasilnya lewat **Excel** (semua kolom kedua lahan) atau **Spasial** (Shapefile ZIP / GeoJSON berisi poligon irisan, siap dibuka di QGIS).
+ Unduhan mengikuti filter, pencarian, dan urutan yang sedang aktif. Tombolnya hanya tampil bila akun Anda punya izin **Export** pada menu ini.

> [!penting] Pasangan tampil bila **minimal satu** lahannya ada di wilayah akses Anda. Lahan pasangannya ditampilkan lengkap (nama petani, Lembaga) walaupun di luar wilayah Anda, karena tanpa itu klaim ganda tidak bisa diverifikasi. Detail Lahan untuk lahan di luar wilayah Anda tetap tidak bisa dibuka.

## Kalau bermasalah

**Pasangan yang saya cari tidak muncul** — ubah filter Tumpang tindih ke `Semua`, lepas chip label yang aktif, lalu kosongkan Jenis, Distrik, Lembaga, dan kotak cari. Bila tetap tidak ada, irisannya di bawah ambang (kurang dari 100 m² dan kurang dari 1%), atau salah satu lahannya sudah dinonaktifkan.

**Tertulis "Di luar akses Anda — Detail Lahan tidak bisa dibuka"** — lahan itu milik wilayah atau Lembaga yang tidak ditugaskan ke akun Anda. Hubungi pengguna yang memegang wilayah tersebut, atau admin.

**Tombol panah ↑/↓ tidak berpindah pasangan** — panah hanya bekerja saat fokus ada di tabel atau panel preview (bukan di kotak cari, pilihan filter, atau peta). Klik salah satu baris tabel dulu.

**Setelah memperbaiki lahan, pasangannya masih ada** — muat ulang halaman. Daftar dihitung saat halaman dibuka, jadi perubahan baru terlihat setelah dimuat ulang.
