---
title: Membaca Ringkasan Petani
icon: Eye
menuKey: data-analyst-farmer-summary
permission: VIEW
duration: 5
href: /admin/data-analyst/farmer-summary
hrefLabel: Buka Ringkasan Petani
goal: Daftar petani beserta jumlah persilnya — dan daftar petani yang belum punya lahan — untuk satu distrik atau lembaga, terunduh sebagai Excel.
---

## Sebelum mulai

Halaman ini menjawab dua pertanyaan sekaligus: berapa dan siapa petani dalam satu cakupan, serta **siapa saja yang belum punya lahan** — daftar kerja yang paling sering diminta sebelum pemetaan lahan.

Angkanya dihitung langsung dari data terkini setiap kali tombol Analisa diklik, bukan dari snapshot.

## Langkah

1. Buka menu **Data Analyst → Ringkasan Petani**.
2. Pilih filter **Distrik** dan/atau **Lembaga Petani** — keduanya opsional; tanpa filter, hasilnya seluruh wilayah akses Anda.
+ Memilih Distrik akan mengosongkan pilihan Lembaga dan memuat ulang daftarnya, jadi pilih Distrik dulu baru Lembaga. Untuk cakupan yang sangat luas, proses analisa bisa terasa lama — persempit filternya.
3. Klik **Analisa**.
+ Hasil tidak menyegarkan diri saat filter diubah — angka lama tetap tampil sampai Analisa diklik lagi. Biasakan: ubah filter → klik Analisa.
4. Baca tab **Detail Petani**: empat kartu (lembaga, petani, persil, luas) dan tabel per petani dengan jumlah persilnya.
5. Buka tab **Petani Tanpa Lahan** untuk daftar kerjanya.
+ Definisinya: petani aktif yang tidak punya satu pun persil aktif — termasuk yang persilnya pernah ada tapi sudah dinonaktifkan. Kartu persentase dibaca terhadap total petani pada filter yang sama. Daftar ini adalah subset tab pertama, jadi jangan menjumlahkan keduanya.
6. Unduh lewat tombol **Excel** di toolbar tabel.
+ Tiap tab menghasilkan berkas sendiri. Isinya mengikuti pencarian, urutan, dan kolom yang sedang tampil — tetapi memuat semua halaman, bukan hanya yang terlihat. Tombol Excel hanya tampil bila akun Anda punya izin **Export** pada menu ini.

> [!penting] Kotak pencarian hanya mencari **nama petani**. Mengetik ID petani atau nama lembaga tidak akan menemukan apa-apa — gunakan urutan kolom atau filter untuk itu.

## Kalau bermasalah

**Angka tidak berubah setelah ganti filter** — klik **Analisa** lagi; halaman memang tidak memuat ulang otomatis.

**Petani berstatus "Belum ada lahan" padahal lahannya pernah diinput** — persilnya sudah dinonaktifkan. Periksa status lahannya di Master Data → Lahan.

**Tombol Analisa lama sekali** — cakupan "Semua Distrik" menarik seluruh data sekaligus. Pilih distrik atau lembaga tertentu dulu.
