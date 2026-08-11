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
3. Telusuri tabel per distrik. Sel Δ berwarna oranye = masih selisih; badge **cocok** = seluruh metrik yang ada acuannya sudah sama.
+ Baris **TOTAL** menjumlahkan kolom acuan hanya dari lembaga yang acuannya terisi — bila banyak lembaga belum diisi, total acuan wajar lebih kecil dari total MIS.
4. Untuk memperbarui angka acuan sebuah lembaga, klik ikon **pensil** di ujung barisnya, isi metrik yang ada acuannya, lalu **Simpan**.
+ Kosongkan kolom yang memang belum ada angka acuannya — kosong artinya "tidak dibandingkan", bukan nol. Kolom **Catatan** untuk konteks selisih, misalnya "56 petani belum ada data produksi".
5. Klik **Ekspor Excel** untuk mengunduh tabel lengkap (Acuan | MIS | Selisih per metrik) sebagai bahan diskusi dengan fasilitator.

> [!hati-hati] Angka acuan adalah data entry manual — memperbaruinya tidak mengubah data MIS sama sekali. Sebaliknya, sisi MIS tidak bisa diedit dari halaman ini; kejar selisihnya lewat unggah/entry data di menu terkait (Master Data, Unggah Massal).

## Kalau bermasalah

**Halaman kosong / lembaga tidak muncul** — lembaga di luar cakupan akses Anda tidak ditampilkan. Cek penugasan distrik/lembaga akun Anda ke admin.

**Tombol pensil tidak ada** — akun Anda tidak punya izin EDIT untuk menu ini; entry acuan hanya untuk peran yang ditugaskan admin.

**Angka MIS terasa basi** — muat ulang halaman; angka dihitung saat halaman dibuka. Bila masih janggal (mis. jumlah petani terlatih beda dengan Dashboard Training), laporkan ke admin.
