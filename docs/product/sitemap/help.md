# Peta Fitur — Bantuan

> Bagian dari dokumentasi **Produk** · Peta fitur untuk Miro. Indeks: [README.md](README.md) · Legenda: [legend.md](legend.md) · Sumber: [../pages/help/README.md](../pages/help/README.md)

> **Ringkasan:** Panduan penggunaan MIS di dalam aplikasi, tiga lapis materi — **Tutorial** (5 bab, per tugas), **Referensi** (1 bab, arti kolom & tombol), **Konsep** (6 bab, istilah & aturan main) — total 12 bab. Menu tunggal tanpa sub menu; tiga halaman: Indeks Bantuan, Halaman Bab, Halaman Topik, semuanya memakai sidebar bersama berisi pencarian dan pohon bab → topik.

## Pohon navigasi

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  hp(["Bantuan"]):::menu
  hp_index["Indeks Bantuan"]:::page
  hp_chapter["Halaman Bab"]:::page
  hp_topic["Halaman Topik"]:::page
  hp_sidebar("HelpSidebar: pencarian + tree bab→topik"):::section

  hp --> hp_index
  hp --> hp_chapter
  hp --> hp_topic
  hp_index -.->|Buka bab| hp_chapter
  hp_index -.->|Kartu tugas / Kartu topik| hp_topic
  hp_chapter -.->|Baca topik| hp_topic
  hp_index --> hp_sidebar
  hp_chapter --> hp_sidebar
  hp_topic --> hp_sidebar
  hp_sidebar -.->|Judul bab| hp_chapter
  hp_sidebar -.->|Judul topik / hasil cari| hp_topic

  classDef menu fill:#166534,stroke:#14532d,color:#ffffff,font-weight:bold
  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
```

| Halaman | Route | Katalog |
|---|---|---|
| Indeks Bantuan | `/admin/help` | [index.md](../pages/help/index.md) |
| Halaman Bab | `/admin/help/{chapter}` | [chapter.md](../pages/help/chapter.md) |
| Halaman Topik | `/admin/help/{chapter}/{topic}` | [topic.md](../pages/help/topic.md) |

Menu Bantuan tidak punya sub menu di sidebar; `/admin/help` adalah halaman Indeks itu sendiri (bukan redirect). Slug bab/topik yang tak dikenal menampilkan halaman 404.

## Indeks Bantuan

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  hp_index["Indeks Bantuan"]:::page

  hp_sidebar("HelpSidebar: pencarian + tree bab→topik"):::section
  hp_index_sidebar_c["Filter: Cari topik bantuan... · Hapus pencarian (X)<br/>Pesan: {n} topik cocok · Tidak ada topik yang cocok.<br/>Tree: {n}. {judul bab} → {n.m} {judul topik} (semua bab terbuka)<br/>Tombol: Sembunyikan daftar isi / Tampilkan daftar isi"]:::content

  hp_index_hdr("Header"):::section
  hp_index_hdr_c["Judul: Bantuan<br/>Teks: Panduan penggunaan Smallholder HUB MIS. Mulai dari tugas yang ingin Anda kerjakan, atau gunakan pencarian di samping."]:::content

  hp_index_tut("Seksi: Apa yang ingin Anda lakukan? (Tutorial · 5 bab)"):::section
  hp_index_tut_c["Bab: 1 Mengelola Data Harian · 2 Unggah Massal · 3 Memantau & Menindaklanjuti · 4 Laporan & Perawatan · 5 Analisa & Administrasi<br/>Kartu tugas: ikon · judul · hasil akhir · ± {n} menit<br/>Pesan: Di luar hak akses akun Anda"]:::content

  hp_index_ref("Seksi: Referensi halaman (Referensi · 1 bab)"):::section
  hp_index_ref_c["Bab: 6 Referensi Halaman<br/>Kartu topik: 5 topik (Petani · Lahan · Pelatihan · Produksi · Ketersediaan Data)<br/>Teks: Arti tiap kolom, filter, dan tombol — untuk dirujuk saat bekerja, bukan dibaca berurutan."]:::content

  hp_index_kon("Seksi: Konsep & istilah (Konsep · 6 bab)"):::section
  hp_index_kon_c["Bab: 7 Memulai · 8 Mengelola Data · 9 Memantau & Menganalisa · 10 Laporan & Cetak · 11 Administrasi · 12 Bantuan Lanjutan<br/>Kartu bab: ikon · judul · ringkasan · daftar topik {n.m} {judul}<br/>Tombol: Buka bab"]:::content

  hp_chapter["Halaman Bab"]:::page
  hp_topic["Halaman Topik"]:::page

  hp_index --> hp_sidebar --> hp_index_sidebar_c
  hp_index --> hp_index_hdr --> hp_index_hdr_c
  hp_index --> hp_index_tut --> hp_index_tut_c
  hp_index --> hp_index_ref --> hp_index_ref_c
  hp_index --> hp_index_kon --> hp_index_kon_c
  hp_index_tut -.->|Kartu tugas| hp_topic
  hp_index_ref -.->|Kartu topik| hp_topic
  hp_index_kon -.->|Buka bab| hp_chapter

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
```

## Halaman Bab

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  hp_chapter["Halaman Bab"]:::page

  hp_sidebar("HelpSidebar: pencarian + tree bab→topik"):::section
  hp_chapter_sidebar_c["Filter: Cari topik bantuan...<br/>Tree: bab aktif terbuka & ditandai warna utama<br/>Tombol: Sembunyikan daftar isi / Tampilkan daftar isi"]:::content

  hp_chapter_hdr("Header"):::section
  hp_chapter_hdr_c["Tombol: ← Bantuan<br/>Judul: Bab {n} — {judul} + ikon bab<br/>Teks: ringkasan bab"]:::content

  hp_chapter_grid("Grid kartu topik (2 kolom)"):::section
  hp_chapter_grid_c["Kartu: ikon topik · {n.m} {judul topik} · intro (maks 3 baris)<br/>Tombol: Baca topik"]:::content

  hp_chapter_nav("Navigasi bab"):::section
  hp_chapter_nav_c["Tombol: ← Bab {n-1} — {judul} · Bab {n+1} — {judul} →<br/>Teks: disembunyikan pada bab pertama / terakhir"]:::content

  hp_index["Indeks Bantuan"]:::page
  hp_topic["Halaman Topik"]:::page

  hp_chapter --> hp_sidebar --> hp_chapter_sidebar_c
  hp_chapter --> hp_chapter_hdr --> hp_chapter_hdr_c
  hp_chapter --> hp_chapter_grid --> hp_chapter_grid_c
  hp_chapter --> hp_chapter_nav --> hp_chapter_nav_c
  hp_chapter_hdr -.->|← Bantuan| hp_index
  hp_chapter_grid -.->|Baca topik| hp_topic
  hp_chapter_nav -.->|Bab sebelumnya · berikutnya| hp_chapter

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
```

## Halaman Topik

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  hp_topic["Halaman Topik"]:::page

  hp_sidebar("HelpSidebar: pencarian + tree bab→topik"):::section
  hp_topic_sidebar_c["Filter: Cari topik bantuan...<br/>Tree: bab aktif terbuka · topik aktif ditandai<br/>Tombol: Sembunyikan daftar isi / Tampilkan daftar isi"]:::content

  hp_topic_hdr("Header"):::section
  hp_topic_hdr_c["Breadcrumb: Bantuan / Bab {n} — {judul bab}<br/>Judul: {n.m} {judul topik} + ikon topik<br/>Teks: intro topik"]:::content

  hp_topic_goal("Kartu tujuan (hanya topik tutorial)"):::section
  hp_topic_goal_c["Teks: Hasil akhir: {tujuan} · ± {n} menit<br/>Tombol: {label menu} → halaman menu terkait (tab baru)<br/>Pesan: Menu ini di luar hak akses akun Anda"]:::content

  hp_topic_depth("Toggle kedalaman"):::section
  hp_topic_depth_c["Tombol: Kedalaman: Ringkas · Detail<br/>Teks: tampil hanya bila topik punya materi tingkat Detail"]:::content

  hp_topic_body("Materi"):::section
  hp_topic_body_c["Teks: sub-judul · paragraf · daftar berpoin · baris definisi istilah · langkah bernomor<br/>Teks: callout Tip / Penting / Hati-hati · blok Detail (mode Detail)<br/>Media: gambar · video · embed YouTube/Vimeo + keterangan"]:::content

  hp_topic_nav("Navigasi topik"):::section
  hp_topic_nav_c["Tombol: ← {n.m} sebelumnya · {n.m} berikutnya → (menyeberang bab)<br/>Teks: Panduan ini bersifat umum — tampilan menu dapat berbeda mengikuti hak akses Anda."]:::content

  hp_content_md[("Materi src/content/help/*.md")]:::data
  hp_media_s3[/"Media S3 (presigned URL)"/]:::external
  hp_chapter["Halaman Bab"]:::page

  hp_topic --> hp_sidebar --> hp_topic_sidebar_c
  hp_topic --> hp_topic_hdr --> hp_topic_hdr_c
  hp_topic --> hp_topic_goal --> hp_topic_goal_c
  hp_topic --> hp_topic_depth --> hp_topic_depth_c
  hp_topic --> hp_topic_body --> hp_topic_body_c
  hp_topic --> hp_topic_nav --> hp_topic_nav_c
  hp_content_md ==>|dimuat saat build| hp_topic_body
  hp_media_s3 ==>|presign tiap render| hp_topic_body
  hp_topic_hdr -.->|Breadcrumb Bab| hp_chapter
  hp_topic_nav -.->|Topik sebelumnya · berikutnya| hp_topic

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

## Alur lintas menu

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  hp_admin_header["Header halaman admin (semua menu)"]:::page
  hp_index["Indeks Bantuan"]:::page
  hp_chapter["Halaman Bab"]:::page
  hp_topic["Halaman Topik"]:::page
  hp_content_md[("Materi src/content/help/*.md")]:::data
  hp_media_s3[/"Media S3 (presigned URL)"/]:::external

  hp_admin_header -.->|Tombol Panduan → tab baru| hp_topic
  hp_topic -.->|Kartu tujuan → menu terkait, tab baru| hp_admin_header
  hp_content_md ==>|dimuat saat build| hp_index
  hp_content_md ==>|dimuat saat build| hp_chapter
  hp_content_md ==>|dimuat saat build| hp_topic
  hp_media_s3 ==>|presign tiap render| hp_topic

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

Tombol **Panduan (?)** di header tiap halaman admin membuka Halaman Topik tutorial yang membahas menu itu (dicari dari `menuKey` materi lapis tutorial; tidak dirender bila menu belum punya tutorial). Sebaliknya, kartu tujuan di topik tutorial membawa pengguna kembali ke halaman menu terkait. Materi tiga lapis ditulis sebagai Markdown di `src/content/help/` dan dibundel saat build — perubahan materi tampil setelah build ulang; gambar/video privat memakai sintaks `s3://` dan ditukar presigned URL pada tiap render topik.

## Urutan demo yang disarankan

1. Buka Bantuan dari sidebar: tunjukkan tiga seksi Indeks — tugas (Tutorial), Referensi halaman, Konsep & istilah — dan sidebar dengan semua bab terbuka.
2. Ketik di `Cari topik bantuan...` (mis. "produksi"), tunjukkan jumlah `{n} topik cocok` dan klik satu hasil.
3. Di Halaman Topik: breadcrumb, kartu tujuan (`Hasil akhir`, durasi, tombol ke menu terkait), lalu ganti `Kedalaman` Ringkas → Detail.
4. Pakai navigasi topik berikutnya hingga menyeberang bab; klik breadcrumb bab untuk kembali ke Halaman Bab dan tunjukkan `Baca topik` + navigasi bab ← →.
5. Kembali ke Indeks, buka kartu bab Konsep lewat `Buka bab`, tunjukkan penanda `Di luar hak akses akun Anda` pada akun terbatas.
6. Pindah ke halaman menu lain (mis. Master Data › Petani), klik `Panduan (?)` di header: tutorial terkait terbuka di tab baru.
