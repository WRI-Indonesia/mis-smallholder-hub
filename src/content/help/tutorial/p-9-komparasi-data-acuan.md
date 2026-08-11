---
title: Membandingkan data MIS dengan angka acuan
icon: GitCompare
menuKey: data-analyst-benchmark-comparison
permission: VIEW
duration: 5
href: /admin/data-analyst/benchmark-comparison
hrefLabel: Buka Komparasi Data Acuan
goal: Anda tahu lembaga mana yang datanya di MIS masih kurang dari angka acuan (GDrive / MD 1st SOW), dan metrik apa saja yang selisihnya harus dikejar.
---

## Sebelum mulai

Halaman **Komparasi Data Acuan** membandingkan dua sisi untuk setiap Lembaga Petani:

- **Acuan** — angka target/acuan manual (dari rekap GDrive "MD 1st SOW") yang dientry ke MIS dan bisa diedit di halaman ini.
- **MIS** — angka live yang dihitung langsung dari database saat halaman dibuka: jumlah petani aktif, persil dan luas lahan aktif, petani terlatih per paket (distinct, konvensi sama dengan Dashboard Training), serta petani yang sudah punya data produksi.

Kolom **Δ (selisih) = Acuan − MIS**. Selisih positif berarti data di MIS masih kurang dari acuan (misalnya lahan belum semua terupload); nol berarti sudah cocok.

+ Metrik yang kolom acuannya kosong tidak dibandingkan (Δ tampil "—"). Lembaga tanpa acuan sama sekali diberi tanda "acuan belum diisi".

## Langkah

1. Buka menu **Data Analyst → Komparasi Data Acuan**.
2. Baca dua kartu ringkas di atas: jumlah **Lembaga Petani** dalam cakupan akses Anda dan berapa yang **masih ada selisih**.
3. Baca matriks selisih (mode **Ringkas**, bawaan): satu sel = satu metrik, isinya angka selisih + persen capaian. Hijau ✓ = cocok, kuning = gap ≤20%, merah = gap >20%, abu-abu "—" = acuan belum diisi.
+ Arahkan kursor ke sel untuk rincian: angka Acuan, MIS live, selisih, dan bar capaian. Baris **TOTAL** menjumlahkan kolom acuan hanya dari lembaga yang acuannya terisi — bila banyak lembaga belum diisi, total acuan wajar lebih kecil dari total MIS.
4. Perlu angka lengkap berdampingan? Klik tab **Detail** untuk tampilan kolom Acuan | MIS | Δ per metrik (lebar, geser tabel ke samping).
5. Persempit dengan alat di atas tabel: filter **distrik**, saklar **Hanya yang masih selisih**, kotak **cari lembaga**, dan **Urut paling bermasalah** (lembaga dengan selisih terbanyak naik ke atas).
+ Pilihan filter tersimpan di alamat halaman, jadi tampilannya bisa di-bookmark atau dikirim ke rekan kerja.
6. Untuk memperbarui angka acuan sebuah lembaga, klik ikon **pensil** di ujung barisnya. Di dialog, tiap kolom menampilkan angka **MIS live** dan preview selisihnya berubah langsung saat Anda mengetik. Isi lalu **Simpan**.
+ Kosongkan kolom yang memang belum ada angka acuannya — kosong artinya "tidak dibandingkan", bukan nol. Kolom **Catatan** untuk konteks selisih, misalnya "56 petani belum ada data produksi".
7. Klik **Ekspor Excel** untuk mengunduh tabel lengkap (Acuan | MIS | Selisih per metrik) sebagai bahan diskusi dengan fasilitator.
+ Ekspor selalu berisi semua lembaga dalam cakupan akses Anda, mengabaikan filter yang sedang aktif.

> [!hati-hati] Angka acuan adalah data entry manual — memperbaruinya tidak mengubah data MIS sama sekali. Sebaliknya, sisi MIS tidak bisa diedit dari halaman ini; kejar selisihnya lewat unggah/entry data di menu terkait (Master Data, Unggah Massal).

## Kalau bermasalah

**Halaman kosong / lembaga tidak muncul** — cek dulu filternya: matikan "Hanya yang masih selisih", kosongkan pencarian, kembalikan distrik ke "Semua". Bila tetap kosong, lembaga tersebut mungkin di luar cakupan akses Anda — cek penugasan distrik/lembaga akun Anda ke admin.

**Tombol pensil tidak ada** — akun Anda tidak punya izin EDIT untuk menu ini; entry acuan hanya untuk peran yang ditugaskan admin.

**Angka MIS terasa basi** — muat ulang halaman; angka dihitung saat halaman dibuka. Bila masih janggal (mis. jumlah petani terlatih beda dengan Dashboard Training), laporkan ke admin.
