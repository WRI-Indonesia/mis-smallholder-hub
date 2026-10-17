# 02 · Kasus uji per issue — v1.9.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Satu **blok** per kasus. Ditulis dev saat menutup issue; dijalankan QA di staging; hasil di `runs/`. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

Format: `### TC-<issue>-<nn> · <judul> [P0] [regresi] (<menit> mnt)` lalu `Prasyarat:` · `Langkah:` (bernomor) · `Harapan:` (bullet) · opsional `Baseline dev:`.

Prasyarat umum rilis ini: `TC-PREP-01` (seed menu `platform-developer-sitemap`) sudah dijalankan di env uji. Tanpa migrasi. Kartu Aliran TBS mengingat tab terakhir per browser — mulai dari tab **Sankey** dengan tombol **Tampilan bawaan** bila tampil.

## #437 — Platform Developer › Peta Fitur

### TC-437-01 · Menu Peta Fitur hanya untuk SUPERADMIN, ADMIN, MANAGEMENT [P0] [regresi] (4 mnt)
Prasyarat: tiga akun (SUPERADMIN/ADMIN, OPERATOR, DONOR).
Langkah:
1. Login SUPERADMIN → sidebar **Platform Developer** → **Peta Fitur**.
2. Login OPERATOR, lalu DONOR → cari "Peta Fitur" di **Cari menu…**; buka langsung `/admin/platform-developer/sitemap`.
Harapan:
- Langkah 1: menu tampil (ikon rambu, urutan terakhir di grup) dan halaman terbuka dengan 11 tombol berkas + tab tampilan berkelompok **Teks · Interaktif · Hierarki**; bawaan **Mermaid**.
- Langkah 2: menu tidak tampil; URL langsung dialihkan (tanpa akses), bukan halaman kosong atau galat.
Baseline dev: `menu-access.test.ts`; DB lokal `mis-dev` 2026-10-17 (menu + 3 izin VIEW).

### TC-437-02 · Dua belas tampilan menu Map tampil tanpa galat [P1] (8 mnt)
Prasyarat: login SUPERADMIN; buka Peta Fitur → tombol **Map**.
Langkah:
1. Klik bergiliran tiap tab: Mermaid · Mermaid ELK · Sketsa · Graphviz · React Flow · React Flow ELK · Kolom · Jaringan · Pohon · Peta pikiran · Sunburst · Daftar; tunggu tiap tab selesai memuat.
2. Pada React Flow dan React Flow ELK, periksa kartu **Peta Lahan — bagian 2/2**.
3. Pada Jaringan, ganti tema terang/gelap.
Harapan:
- Tiap tab menampilkan 6 diagram (+ 1 kartu teks Urutan demo) tanpa pesan merah "tidak dapat dirender" / "gagal"; Graphviz memuat sekali (±3 MB) lalu cepat.
- Langkah 2: garis tidak menumpuk di satu batang dan tidak menembus kotak; label garis tidak menimpa kotak.
- Langkah 3: overlay "Menata jaringan…" tampil lalu diagram muncul lagi.
Baseline dev: smoke lokal 2026-10-17 (menu Map: 6 kanvas, 109 node, 116 garis di tiap kanvas interaktif; 0 galat konsol).

### TC-437-03 · Urutan demo tampil sebagai kartu teks [P2] (2 mnt)
Prasyarat: Peta Fitur → tombol **Dashboard**, tab apa pun.
Langkah:
1. Di layar lebar, klik **Urutan demo yang disarankan** di daftar isi kiri.
Harapan:
- Halaman melompat ke kartu teks bernomor (tanpa diagram) di urutan terakhir, sesuai Bantuan `p-20` langkah 4.

### TC-437-04 · Tautan tampilan bisa dibagikan [P2] (2 mnt)
Langkah:
1. Pilih Bulk Upload + tab Sunburst; salin URL; buka di tab browser baru.
2. Buka `/admin/platform-developer/sitemap?view=flow`.
Harapan:
- Langkah 1: berkas dan tab yang sama terbuka (`?menu=bulk-upload&view=sunburst`).
- Langkah 2: tab **React Flow** terbuka (tautan lama tetap berlaku).

## #381 (prototipe) — Kartu Aliran TBS: 10 tab, Arah, Sembunyikan, UL di atas, chip filter

### TC-381-01 · Sepuluh tab tampil dan klik = filter [P0] [regresi] (6 mnt)
Prasyarat: login ADMIN/MANAGEMENT/SUPERADMIN; Dashboard › Dashboard Rantai Pasok, tahun survei terbaru, tanpa filter.
Langkah:
1. Di kartu **Aliran TBS**, klik bergiliran: Sankey · Diagram Alur · Jalur · Tabel Pohon · Sunburst · Partisi · Treemap · Matriks · Chord · Batang.
2. Di tab **Sunburst**, klik irisan Distrik terbesar.
3. Lepas filter lewat chip di kartu.
Harapan:
- Tiap tab menampilkan data (bukan "Tidak ada aliran bertonase"), satu kalimat ciri tab tampil di kanan atas.
- Langkah 2: toast "Filter: <Distrik>", chip Distrik muncul di bawah bar filter atas **dan** di kartu, semua kartu ikut tersaring; diagram tidak tinggal redup.
- Langkah 3: data kembali penuh.
Baseline dev: smoke lokal 2026-10-17 (10 tab, 0 galat konsol); `supply-chain-views.test.ts`.

### TC-381-02 · Arah Hilir → Hulu di semua tab kecuali Chord [P1] (6 mnt)
Langkah:
1. Arah = **Hilir → Hulu**; buka Sankey, Diagram Alur, Jalur, Matriks, Batang.
2. Buka Chord.
Harapan:
- Sankey & Diagram Alur: kolom Mill/UL di kiri, asal di kanan; garis tidak melingkar balik melewati kotak.
- Jalur: kolom pertama = UL/Non-UL (atau Mill), panah **←**.
- Matriks: baris = tujuan, kolom = asal (judul "Tujuan ↓ · Asal →"). Batang: satu batang per tujuan, maks 8 warna + "Asal lain (n)".
- Chord: tertulis "Arah Hilir → Hulu tidak berlaku di Chord"; tombol **Tampilan bawaan** tetap tampil.

### TC-381-03 · Offtaker › Sembunyikan melebur pita [P1] (5 mnt)
Langkah:
1. Offtaker = **Satu per satu**, Tampilkan = 8 teratas, lalu Offtaker = **Sembunyikan**; Ke = Mill.
2. Sankey: arahkan kursor ke pita gabungan Lembaga → Mill. Jalur: lihat baris yang sama.
Harapan:
- Diagram hanya dua kolom; satu pita per pasangan asal–tujuan; tooltip "Gabungan — jalur terbesar …" + rincian per jalur (ton · %).
- Jumlah Mill tidak terpotong ke 8 (pilihan Tampilkan tersembunyi tak berlaku).
- Jalur: batang baris terbagi warna per jalur; kolom Offtaker hilang.
Baseline dev: `supply-chain-flow.test.ts` (hideMiddle), `supply-chain-views.test.ts` (`aliranMaxPerColumn`).

### TC-381-04 · Ke Mill UL selalu teratas [P1] (3 mnt)
Langkah:
1. Ke = **UL / Non-UL**; lihat Sankey, Matriks, Tabel Pohon (Hilir → Hulu).
2. Ke = **Mill**; lihat Sankey dan Batang.
Harapan:
- "Ke Mill UL" di urutan pertama kolom tujuan walau tonasenya lebih kecil; "Mill tidak diketahui" selalu terakhir.
- Mode Mill: Mill ber-badge **UL** di atas Mill lain; badge UL tidak muncul pada node gabungan "Ke Mill UL" dan tooltipnya tidak menyebut "Mill pemasok program UL".

### TC-381-05 · Chip filter + Reset di kartu [P2] (3 mnt)
Langkah:
1. Pasang filter Distrik dari bar atas; gulir ke kartu Aliran TBS.
2. Klik **Reset** di kartu.
3. Hanya ganti **Tahun** ke tahun sebelumnya.
Harapan:
- Langkah 1: strip "Filter: Distrik: …" + Reset tampil di bawah toolbar kartu.
- Langkah 2: semua filter lepas (sama dengan Reset bar atas).
- Langkah 3: strip **tidak** tampil di kartu (Tahun bukan chip); Reset bar atas tetap tampil.

### TC-381-06 · Angka % di tab hierarki [P2] (2 mnt)
Langkah:
1. Angka = **%**; buka Treemap, Partisi, Sunburst; arahkan kursor ke kotak/irisan.
Harapan:
- Label kotak Treemap/Partisi berupa persen (mis. "7,5%"), bukan ton; tooltip memuat ton dan "% dari total".
