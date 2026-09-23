---
title: Memantau titik api (Fire Alert)
icon: Map
menuKey: dashboard-risk-fire
permission: VIEW
duration: 5
href: /admin/dashboard/risk/fire
hrefLabel: Buka Fire Alert
goal: Anda bisa melihat lembaga mana yang wilayahnya memuat titik api, mencetak petanya sebagai PDF, dan menerbitkan laporan bulanan untuk bulan mana pun sejak 2020.
---

## Sebelum mulai

Fire Alert menampilkan **titik api (hotspot)** deteksi satelit VIIRS (NASA FIRMS) di seluruh Riau, lalu memisahkannya menjadi titik **di dalam boundary lembaga** dan **di luar boundary**.

+ Boundary lembaga adalah poligon wilayah kerja tiap ICS/lembaga petani yang diunggah admin dari shapefile. Poligon itu digambar **sudah termasuk buffer 1,5 km** di sekeliling area lahan — jadi "dalam boundary" berarti titik api berada di wilayah lembaga *atau* dalam 1,5 km dari tepinya (karena itu judul kartu dan tabel di PDF menulis "termasuk buffer 1,5 km"). Ini berbeda dengan fitur Titik Api di **Peta Lahan** yang mengukur *jarak* ke titik kantor lembaga (radius 15 km) — Fire Alert menguji apakah titiknya benar-benar jatuh *di dalam* poligon wilayah lembaga.

Data satelit bersifat *near-real-time* dengan jeda ± 3 jam. Rentang yang bisa dilihat: **24 jam**, **5 hari**, **10 hari**, atau **30 hari** ke belakang, atau **satu bulan kalender tertentu** (laporan bulanan, sejak Januari 2020). Halaman ini tidak menyimpan riwayat — semua data diambil langsung dari NASA saat halaman dibuka, termasuk bulan-bulan lampau yang diambil dari **arsip** FIRMS.

+ Layanan FIRMS hanya melayani 5 hari per permintaan, jadi rentang 10 dan 30 hari diambil sebagai beberapa potongan 5 hari lalu digabung. Karena itu muat pertama rentang 30 hari bisa terasa lebih lama (beberapa detik); potongan yang sudah lewat disimpan sementara di server sehingga pembukaan berikutnya jauh lebih cepat. Hari dihitung menurut **tanggal UTC** (satuan yang dipakai satelit), sehingga "5 hari" berarti 5 hari kalender UTC termasuk hari ini — label rentang di laporan PDF mengikuti aturan yang sama.

+ Layanan FIRMS mengambil data per kotak persegi yang ikut mencakup wilayah tetangga (Malaysia, Sumbar, Jambi) — titik di luar batas administrasi Provinsi Riau otomatis disaring sebelum ditampilkan, jadi semua angka di halaman ini benar-benar se-Riau.

## Langkah

1. Buka menu **Dashboard → Risk Management → Fire Alert**.
2. Baca peta (¾ layar kiri): poligon ungu = boundary lembaga; garis putus-putus abu = batas kabupaten; titik = hotspot.
+ Titik **berikon api** berada di dalam boundary lembaga; titik berbentuk **lingkaran kecil** di luar. Warna keduanya menunjukkan keyakinan deteksi: merah tua = Tinggi, oranye = Nominal (Medium), kuning = Rendah. Legenda lengkap ada di pojok kiri-bawah peta.
3. Klik sebuah titik untuk melihat detailnya: waktu deteksi (WIB), keyakinan, satelit, FRP, dan lembaga pemilik boundary-nya. Klik poligon boundary untuk melihat jumlah titik di dalamnya.
+ **FRP (MW)** = *Fire Radiative Power* — daya radiasi panas titik api dalam megawatt saat satelit melintas; indikator **intensitas** (bukan luas): makin besar makin hebat apinya. Gunakan untuk memprioritaskan titik mana yang diverifikasi lebih dulu.
4. Baca panel kanan: kartu ringkasan (titik dalam boundary, lembaga terdampak, titik luar, total se-Riau) dan tabel **titik api per lembaga**, urut dari yang terbanyak.
+ Hanya lembaga yang **memiliki** titik api yang ditampilkan — lembaga aman (0 titik) tidak memenuhi daftar. Aturan yang sama berlaku pada tabel di PDF hasil cetak. Klik sebuah baris untuk **zoom peta ke boundary** lembaga tersebut. Boundary bisa **tumpang-tindih** (atau sengaja dimiliki bersama, mis. KBJ & KSJ): titik di wilayah itu dihitung di **tiap lembaga pemiliknya** dan diberi keterangan "*n* bersama", sehingga jumlah kolom Titik bisa melebihi angka kartu Dalam Boundary yang menghitung **titik unik** — caption di bawah tabel menjelaskan selisihnya. Arahkan kursor ke kartu **Dalam Boundary** untuk rincian per distrik program, dan kartu **Luar Boundary** (atau **Total se-Riau**) untuk rincian per kabupaten. Yang dirinci hanya **kabupaten wilayah program**; kabupaten Riau lainnya digabung ke satu baris **"Kab. Lainnya"**.
5. Ganti **Rentang waktu** bila perlu: **5 hari terakhir** (bawaan), **24 jam terakhir** untuk fokus ke kejadian paling baru, atau **10 / 30 hari terakhir** untuk melihat pola sepanjang musim kemarau.
+ Pada rentang 30 hari saat musim kebakaran, jumlah titik bisa mencapai ribuan; peta dan tabel tetap sanggup, tetapi **Cetak Peta (PDF) Full Riau** akan jauh lebih lama karena lampiran peta per lembaga makin banyak. Untuk laporan, pertimbangkan cakupan **Distrik** atau rentang yang lebih pendek.
6. Untuk **laporan bulanan** (mis. "Riau – Januari 2025"), klik **Bulan tertentu (laporan bulanan)** lalu pilih **Bulan** dan **Tahun** — bawaan bulan lalu. Peta, kartu, keyakinan, dan tabel lembaga langsung mengikuti bulan itu.
+ Bulan lampau diambil dari **arsip** FIRMS (*Standard Processing* — data yang sudah diproses ulang, lebih akurat, terbit ± 3 bulan setelah kejadian); bulan-bulan terbaru yang arsipnya belum terbit diambil dari data *near-real-time* seperti rentang biasa. Halaman menyebutkan sumber mana yang dipakai di bawah pemilih bulan. **Bulan berjalan** boleh dipilih — isinya tanggal 1 sampai hari ini dan ditandai **(parsial)**. Bila ada tanggal yang **belum tersedia** di FIRMS (jeda antara arsip dan data terbaru), halaman menyebutkannya terang-terangan; angka pada tanggal itu **bukan** "tidak ada api" — tunggu beberapa hari lalu buka lagi. Satu bulan = ± 7 permintaan ke NASA, jadi muat pertama bisa beberapa detik; bulan lampau disimpan di server hingga sebulan sehingga pembukaan berikutnya cepat. Bulan paling awal yang bisa dipilih: **Januari 2020**.
7. Untuk mencetak, pilih cakupan pada **Print Map** — **Full Riau** atau langsung nama **Distrik** — lalu klik **Cetak Peta (PDF)** (pada mode bulan: **Cetak Laporan Bulanan (PDF)**).
+ Hasilnya **Laporan Titik Api (Hotspot)**: halaman ber-logo WRI berisi kartu ringkasan, peta sebaran (peta otomatis di-zoom ke cakupan terpilih), tabel detail tiap titik dalam boundary (waktu, satelit, keyakinan, koordinat, lembaga), lalu lampiran **peta per lembaga** yang ada titik apinya. Proses agak lama karena peta di-capture satu per satu: tombolnya menghitung kemajuan (*"Peta lembaga 7 dari 23…"*), dan selama itu tersedia tombol **Batalkan** bila Anda tak ingin menunggu — pembatalan berarti **tidak ada PDF** yang terbit, bukan laporan separuh jadi. Pada cakupan **Full Riau** saat banyak lembaga terdampak, wajar bila menunggu beberapa menit. Tombol ini hanya muncul bila Anda punya izin Print.
+ Pada mode bulan, dokumennya berjudul **Laporan Bulanan Titik Api (Hotspot)** dan menambah tiga bagian setelah kartu ringkasan: **Tren Harian** (titik per tanggal — dalam/luar boundary, hari puncak ditandai merah, tanggal yang tak tersedia ditulis "tidak tersedia di FIRMS", bukan 0), **Rekap per Kabupaten** (total · dalam boundary · keyakinan tinggi, plus baris Total), dan **Rekap per Lembaga** yang ber-titik api. Catatan metodologi di akhir menyebut sumber data yang benar-benar dipakai (arsip / near-real-time) dan tanggal yang kosong. Tabel detail per titik tetap **lengkap** — pada bulan musim kebakaran bisa ratusan halaman; pilih cakupan **Distrik** bila hanya satu kabupaten yang dilaporkan. Nama berkas berakhiran bulan, mis. `laporan-titik-api-full-riau-2025-01.pdf`.

> [!hati-hati] Keyakinan **Rendah** kerap berupa pantulan permukaan panas (bukan api), dan sebaliknya kebakaran kecil di bawah tutupan bisa lolos deteksi. Jadikan Fire Alert sinyal awal untuk verifikasi lapangan, bukan bukti akhir.

## Kalau bermasalah

**"Gagal memuat titik api"** — layanan NASA FIRMS sedang tidak merespons. Muat ulang halaman beberapa menit kemudian.

**Tabel lembaga kosong ("Tidak ada titik api dalam boundary…")** — belum tentu galat; artinya memang tidak ada deteksi dalam boundary pada rentang terpilih. Bandingkan dengan kartu **Total se-Riau**.

**"n tanggal belum tersedia di FIRMS"** pada mode bulan — arsip NASA untuk tanggal itu belum terbit dan data terbarunya sudah lewat masa simpan. Bukan galat aplikasi; laporan yang dicetak tetap menyebutkan tanggal itu. Coba lagi beberapa hari kemudian.

**Bulan yang diinginkan tidak ada di daftar** — pilihan dibatasi Januari 2020 sampai bulan berjalan; bulan yang belum tiba memang tidak ditawarkan.

**Cetak gagal mengambil gambar peta** — basemap citra (**Hybrid** dan **Satellite**) tidak bisa di-capture. Pindah ke **StreetMap**, **Light**, atau **Dark** (tombol kanan-bawah peta) lalu cetak ulang.

**Tabel kosong / lembaga tidak lengkap** — Anda hanya melihat lembaga dalam cakupan akses akun Anda. Bila seharusnya lebih luas, hubungi admin untuk menyesuaikan hak akses wilayah.
