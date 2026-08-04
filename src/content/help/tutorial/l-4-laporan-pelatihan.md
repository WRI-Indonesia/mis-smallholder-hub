---
title: Mencetak Laporan Pelatihan
icon: GraduationCap
menuKey: report-training
permission: VIEW
duration: 7
href: /admin/report/training
hrefLabel: Buka Laporan Pelatihan
goal: PDF atau Excel laporan pelatihan satu lembaga — rekap cakupan per petani, atau daftar peserta satu kegiatan lengkap dengan nilai pre/post-test.
---

## Sebelum mulai

Satu halaman ini menghasilkan **dua laporan berbeda**: rekap cakupan pelatihan seluruh petani, atau daftar peserta satu kegiatan tertentu. Yang menentukan bukan tombolnya, melainkan **filter yang sedang aktif** saat tombol PDF diklik.

Seperti laporan lain, halaman ini membaca **data terkini**, bukan snapshot dashboard.

+ Jadi sesi yang baru dicatat langsung terhitung di sini, meskipun angka di Main Dashboard belum berubah karena snapshot-nya belum di-generate ulang.

## Langkah

1. Buka menu **Report → Pelatihan**.
2. Pilih **Distrik** lalu **Lembaga Petani**, kemudian klik **Tampilkan Laporan**. Keduanya wajib diisi.
3. Baca kartu ringkasan: Total Sesi, Total Peserta, Total Unik, dan persentase cakupan tiap paket.
+ Total Peserta menghitung setiap kehadiran (satu petani ikut tiga sesi dihitung tiga), sedangkan Total Unik menghitung orangnya. Persentase cakupan dibaca terhadap seluruh petani aktif lembaga itu.
4. Tinjau isi dua tab: **Sesi Pelatihan** (daftar sesi beserta tanggal, lokasi, dan jumlah peserta) dan **Detail per Pelatihan** (tanda paket apa saja yang sudah diikuti tiap petani).
5. Untuk rekap lengkap, klik **Excel (2-Sheet)** atau **PDF** di kanan baris tab.
+ Excel-nya satu berkas dua sheet — "Sesi Pelatihan" dan "Cakupan per Petani". PDF-nya berjudul *Laporan Cakupan Pelatihan Petani*: matriks paket per petani, cocok untuk lampiran laporan program.
6. Untuk **daftar peserta satu kegiatan**, buka tab Detail per Pelatihan, pilih **Filter Jenis Pelatihan**, lalu pilih **Filter Tanggal Pelatihan** yang muncul setelahnya — baru klik **PDF**.
+ Dengan filter ini PDF berubah menjadi *Laporan Kegiatan Pelatihan*: daftar peserta bernomor urut dengan Farmer ID, tanggal, dan nilai pre/post-test — siap dipakai sebagai arsip kegiatan atau bukti pelaksanaan. Memilih "Semua Tanggal" menggabungkan seluruh sesi paket itu: tiap petani tampil **satu baris** dengan tanggal dan nilai dari sesi terakhirnya.

> [!penting] Sebelum mencetak, pastikan filternya benar-benar yang Anda maksud. Tombol PDF yang sama menghasilkan laporan cakupan **atau** daftar peserta, tergantung filter Jenis Pelatihan sedang terisi atau tidak.

## Kalau bermasalah

**Halaman hanya menampilkan "Filter Wajib Belum Lengkap"** — Distrik dan Lembaga Petani belum dipilih, atau tombol Tampilkan Laporan belum diklik.

**Sesi yang sudah dicatat tidak muncul di laporan** — laporan ini hanya menghitung empat paket program. Kegiatan berkategori **Lainnya** sengaja tidak diikutkan, baik di daftar sesi maupun angka cakupan.

**PDF berisi matriks cakupan, padahal yang dibutuhkan daftar peserta** — filter Jenis Pelatihan masih "Semua". Pilih paketnya dulu di tab Detail per Pelatihan, lalu klik PDF lagi.

**Nilai pre/post-test tampil "—"** — skor peserta itu belum diisi saat sesi dicatat. Lengkapi lewat menu Pelatihan (lihat tutorial **Mencatat pelatihan**), lalu cetak ulang.

**Angka cakupan berbeda dengan Dashboard Pelatihan** — periksa filter Tahun di dashboard; laporan ini tidak memfilter tahun dan selalu menghitung seluruh riwayat.
