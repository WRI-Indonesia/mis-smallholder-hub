---
title: Platform Developer
icon: Code2
---

Grup menu untuk memantau **aplikasinya sendiri** — rilis, rencana pengembangan, issue GitHub, dan struktur datanya — bukan data petani. Metrik Rilis, Rencana Pengembangan, dan Peta Data & Skema dulu berada di grup Data Analyst; alamat halamannya tidak berubah, jadi tautan dan bookmark lama tetap berlaku.

**Metrik Rilis** — Memantau pengembangan aplikasinya sendiri, bukan data petani: kecepatan rilis, kemajuan fase roadmap, jumlah test, dan kualitas. Menu ini berada di grup Platform Developer meskipun alamat halamannya masih `/admin/dashboard/metrics`.

**Rencana Pengembangan** — Rencana pengembangan aplikasi **per rilis** (v1.3.0, v1.4.0, …, masing-masing dengan tanggal mulai dan target), juga tentang aplikasinya sendiri, bukan data petani. Tab **Rilis** menampilkan rilis yang sedang dikejar: kemajuan dalam poin (S = 1, M = 3, L = 5) dan papan **kanban** tahapan butir (Belum dimulai → Dikerjakan → Menunggu keputusan → Selesai). Tab **Analisa** menampilkan beban & kemajuan per rilis beserta kapasitas perkiraannya, fokus per kategori, keputusan menunggu owner, dan carry-over. Tab **Semua Issue** mendaftar setiap issue dalam rencana, termasuk backlog. Isinya diambil dari dokumen rencana di repositori, jadi baru berubah setelah aplikasi dirilis ulang.

**Daftar Issue** — Semua issue GitHub aplikasi, yang masih terbuka maupun yang sudah ditutup, dibaca **langsung dari GitHub** (disegarkan paling lama tiap 30 menit) — beda dengan Rencana Pengembangan yang membaca dokumen rencana. Tampil sebagai **List**, **Kalender** (dibuat & ditutup per tanggal), **Tren mingguan**, dan **Kanban** (kolom dari label status di GitHub). Tombol **Unduh Excel** hanya tampil bagi peran yang berizin unduh di menu ini.

**Peta Fitur** — Peta seluruh menu, halaman, bagian, dan isi aplikasi sebagai diagram alur, satu berkas per menu (dari dokumentasi produk). Diagram yang sama bisa dibaca dalam 12 tampilan — teks (Mermaid, Graphviz, sketsa), kanvas interaktif yang bisa digeser dan di-zoom, atau hierarki (pohon, peta pikiran, sunburst, daftar yang bisa dicari). Cocok untuk orientasi pengguna baru dan bahan video tutorial; tentang aplikasinya sendiri, bukan data petani.

**Peta Data & Skema** — Menjelaskan *bentuk* datanya, bukan isinya: entitas apa saja yang ada di sistem, bagaimana antar-entitas terhubung, kolom mana yang ternyata tidak pernah diisi, dan menu mana mengambil data dari entitas apa. Angkanya bersifat nasional — tidak disaring per wilayah, jadi yang tampil bukan hanya wilayah kerja Anda. Untuk kelengkapan data per Lembaga, pakai Ketersediaan Data — Per Lembaga. Menu ini, Rencana Pengembangan, Daftar Issue, dan Metrik Rilis secara bawaan hanya untuk SUPERADMIN, ADMIN, dan MANAGEMENT.
