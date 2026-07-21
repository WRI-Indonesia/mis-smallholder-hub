---
title: Memperbarui angka dashboard
icon: Wrench
menuKey: dashboard-snapshot
permission: CREATE
duration: 3
href: /admin/tools/snapshot
hrefLabel: Buka Dashboard Snapshot
goal: Main Dashboard dan BMP Dashboard menampilkan angka sesuai data terbaru.
---

## Sebelum mulai

Main Dashboard dan BMP Dashboard membaca **snapshot** — rekaman angka pada satu waktu — bukan menghitung ulang setiap halaman dibuka.

+ Ini pilihan sadar agar halaman tetap ringan meski data program besar. Konsekuensinya, setelah input data besar seseorang harus membuat snapshot baru. Dashboard Pelatihan tidak termasuk: ia menghitung langsung, jadi selalu terkini.

Membuat snapshot butuh izin pada menu Tools, biasanya dipegang admin.

## Langkah

1. Buka menu **Tools → Dashboard Snapshot** (untuk Main Dashboard) atau **Dashboard Snapshot BMP** (untuk BMP Dashboard).
+ Keduanya terpisah dan tidak saling memperbarui. Setelah unggah produksi besar, yang perlu dibuat ulang adalah snapshot BMP.
2. Klik **Generate Snapshot**.
+ Proses ini membaca seluruh data dalam cakupan Anda dan merangkumnya. Untuk data besar bisa memakan waktu — tunggu sampai selesai, jangan mengklik berulang karena akan membuat rekaman ganda.
3. Tunggu hingga baris baru muncul di tabel daftar snapshot.
+ Tabel memuat tanggal, angka ringkasnya, dan siapa yang membuat — berguna untuk menelusuri kapan terakhir angka diperbarui.
4. Buka dashboard terkait dan pastikan angkanya sudah berubah.

> [!tip] Biasakan membuat snapshot setelah setiap unggahan massal selesai, bukan menunggu ada yang bertanya "kenapa angkanya belum berubah".

## Kalau bermasalah

**Tombol Generate Snapshot tidak ada** — akun Anda hanya bisa melihat daftar snapshot, tidak membuatnya. Hubungi administrator.

**Angka masih sama setelah generate** — pastikan Anda membuka dashboard yang benar; snapshot Main dan BMP terpisah.

+ Periksa juga tanggal snapshot terbaru di tabel. Bila tanggalnya bukan hari ini, berarti proses generate-nya belum benar-benar selesai.

**Muncul beberapa snapshot dengan waktu berdekatan** — tombol terklik lebih dari sekali. Dashboard akan memakai yang terbaru; snapshot berlebih bisa dinonaktifkan dari tabel.
