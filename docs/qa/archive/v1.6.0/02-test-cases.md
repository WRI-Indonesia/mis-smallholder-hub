# 02 · Kasus uji per issue — v1.6.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Satu **blok** per kasus. Ditulis dev saat menutup issue; dijalankan QA di staging; hasil di `runs/`. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

Format: `### TC-<issue>-<nn> · <judul> [P0] [regresi] (<menit> mnt)` lalu `Prasyarat:` · `Langkah:` (bernomor) · `Harapan:` (bullet) · opsional `Baseline dev:`.

## #381 — Dashboard & Peta Rantai Pasok (prototipe CSV, perluasan 2026-10-10)

Prasyarat umum: tabel CSV prototipe tersedia di server (`SupplyChainUnavailable` tidak tampil) · akun SUPERADMIN atau MANAGEMENT · tahun survei 2025.
Baseline dev (`mis-dev` = snapshot prod 2026-10-09 + CSV lokal): TBS **195.748 t** · **27** Lembaga · **37** Mill · jarak rata-rata **20,7 km**.

### TC-381-01 · Chip filter global & toast [P1] (3 mnt)
Langkah:
1. Buka Dashboard › Dashboard Rantai Pasok. Klik baris Mill teratas di tabel **Volume per Mill**.
2. Klik node **Siak** di Sankey.
3. Hapus satu chip (✕), lalu **Hapus semua**.
Harapan:
- Tiap klik memunculkan toast "Filter: …" (toast berikutnya mengganti, tidak menumpuk).
- Chip filter tampil **di bawah bar filter** (bukan di kartu Aliran TBS); kartu angka, Sorotan, diagram, dan kedua tabel ikut tersaring.
- Bar filter Dashboard tidak punya tombol Reset; **Hapus semua** melepas semua chip sekaligus.

### TC-381-02 · Tampilan bawaan & toolbar lepasan [P1] (2 mnt)
Langkah:
1. Buka kartu **Aliran TBS** tanpa filter.
2. Ubah **Dari** ke Lembaga, lalu klik **Tampilan bawaan**.
Harapan:
- Toolbar berlabel tampil langsung di bawah tab (bukan di popover); bawaan **Dari: Distrik · Ke: UL / Non-UL · Offtaker: Per jenis · Angka: Ton**, pilihan bawaan selalu di **kiri** tiap toggle.
- Tombol **Tampilan bawaan** hanya muncul saat ada pilihan non-bawaan dan mengembalikan semuanya.

### TC-381-03 · Volume per Mill: urut, sorot, jarak, peta [P1] (3 mnt)
Langkah:
1. Klik judul kolom **Jarak**, lalu **Mill**.
2. Klik satu baris Mill; arahkan kursor ke baris lalu klik ikon peta.
Harapan:
- Urutan mengikuti kolom (nama A–Z; angka menurun; "—" selalu di bawah).
- Baris Mill yang sedang difilter berlatar berwarna.
- Ikon peta membuka Peta Rantai Pasok dengan filter Mill yang sama; baris **Mill tidak diketahui** tidak punya ikon peta.

### TC-381-04 · Unduh Excel 3 sheet [P0] [regresi] (5 mnt)
Prasyarat: akun berizin EXPORT (SUPERADMIN/ADMIN/MANAGEMENT/OPERATOR) dan akun DONOR.
Langkah:
1. Tanpa filter, klik **Unduh Excel**. **Buka berkasnya.**
2. Filter Distrik = Siak, unduh lagi.
3. Login DONOR, buka halaman yang sama.
Harapan:
- Berkas `rantai-pasok_2025.xlsx` / `rantai-pasok_2025_siak.xlsx`, sheet **Jalur · Mill · Lembaga**.
- **Tidak ada kolom kosong**; jumlah kolom Tonase sheet Mill dan Lembaga = kartu **TBS** pada filter yang sama (sheet Jalur boleh selisih ≤ 1 t karena pembulatan per baris).
- Status dan Basis tiap baris tak bertentangan: "Mill tidak diketahui" hanya berbasis "kolom Mill kosong" / "beberapa PT dalam satu sel"; "PKS pasti" berbasis teks survei, satu PKS di UML, **PKS milik PT yang terdekat dari Lembaga** (keputusan owner 2026-10-06: pemetaan nama PT = pasti), atau koordinat survei.
- Kolom yang hanya terisi untuk rantai tertentu (mis. **Offtaker 2** = Agen → RAMP, hanya Rokan Hulu) boleh kosong pada filter distrik tanpa rantai itu.
- DONOR **tidak** melihat tombol Unduh Excel.
Baseline dev: Jalur 244 · Mill 37 · Lembaga 27 baris; 0 kolom kosong.

### TC-381-05 · Peta: tata letak panel & kontrol [P1] (3 mnt)
Prasyarat: bersihkan penyimpanan situs (atau jendela privat) agar bawaan terlihat.
Langkah:
1. Buka Map › Peta Rantai Pasok.
2. Buka tombol **Lapisan** dan **Basemap** di tumpukan kanan atas; ganti basemap ke SAT lalu LIGHT.
3. Lipat panel kiri; sembunyikan strip legenda (✕) lalu munculkan lagi lewat chip **Legenda**.
Harapan:
- Panel kiri **setinggi isinya**; hanya **Filter** terbuka, Lapisan/Legenda/Ringkasan terlipat dengan ringkasan di judul.
- Kanan atas: perbesar · perkecil · Paskan · Lapisan · Basemap. Tidak ada lagi lima pil basemap di kanan bawah.
- Strip legenda mendatar di bawah tengah, tidak tertutup panel; setelah ganti basemap, garis, animasi, dan ikon Mill tetap tampil.

### TC-381-06 · Peta: hover, sorot, Jadikan filter [P0] [regresi] (4 mnt)
Langkah:
1. Arahkan kursor ke ikon Mill, lalu ke sebuah garis.
2. Klik ikon Mill → popup. Klik **Jadikan filter**.
3. Mode **Detail**: klik titik offtaker oranye → popup → **Lihat di Dashboard**.
Harapan:
- Tooltip nama + tonase; garis yang di-hover menebal; tooltip tidak bergoyang saat kursor bergerak di garis yang sama.
- Klik node: chip **Menyorot: …** di panel, sisanya redup; ✕ di chip mengembalikan.
- Jadikan filter: peta tersaring, toast "Peta dan Dashboard ikut tersaring. Lepas lewat bagian Filter di panel (Reset)" (tidak menyebut chip).
- Tonase peta setelah filter = angka **TBS melewati** di popup offtaker; Lihat di Dashboard membawa filter yang sama.

### TC-381-07 · Peta: animasi & gerak dikurangi [P2] (2 mnt)
Langkah:
1. Matikan **Animasi arah TBS** di Lapisan; muat ulang halaman.
2. Aktifkan "Reduce motion" di OS, muat ulang.
Harapan:
- Animasi mati → panah putih tampil; pilihan diingat setelah muat ulang.
- Reduce motion → animasi mati otomatis, saklar non-aktif dengan keterangan.

### TC-381-08 · Peta: Ringkasan "tidak tergambar" bernama [P1] (2 mnt)
Langkah:
1. Mode Detail, buka bagian **Ringkasan**; buka daftar tiap baris berpanah.
Harapan:
- Jumlah tonase daftar **Mill tanpa koordinat** = angka barisnya; begitu juga **Lembaga tanpa titik lokasi**.
- Daftar offtaker tanpa titik berisi sebanyak angka "Lewat N offtaker" (tonase per offtaker boleh melebihi angka baris bila satu record melompati dua offtaker).

## #382 — Analisa jarak, ketergantungan & kepastian (prototipe CSV)

### TC-382-01 · Kartu Sorotan [P0] (4 mnt)
Langkah:
1. Dashboard Rantai Pasok tanpa filter → kartu **Sorotan**.
2. Klik nama Mill di ubin Konsentrasi; lepas filter. Klik nama Lembaga di ubin Ketergantungan.
3. Filter Lembaga `ISH-1408-04`.
Harapan:
- Empat ubin: Konsentrasi ke Mill · Ketergantungan offtaker · Mill belum pasti · Jarak garis lurus; nama = tombol filter.
- Konsentrasi tidak pernah menampilkan "Mill tidak diketahui" sebagai Mill terbesar.
- Ketergantungan (≥ 80%) dihitung terhadap pembeli **luar**: Lembaga yang menjual lewat koperasinya sendiri langsung ke Mill **tidak** tercantum (`ISH-1408-04` 100% lewat koperasinya → tidak tercantum); bila koperasi itu menjual ke satu pembeli, pembeli itulah yang dihitung.
Baseline dev: Konsentrasi 12,9% · Ketergantungan 2 Lembaga · Mill belum pasti 1,3% · Jarak 20,7 km (98,4% TBS berkoordinat).

### TC-382-02 · Volume per Lembaga [P1] (3 mnt)
Langkah:
1. Kartu **Volume per Lembaga** → urutkan **Offtaker utama**, lalu **PKS pasti**.
2. Lipat kartu, muat ulang, lalu buka lagi.
Harapan:
- Ikon ⚠ hanya pada Lembaga ≥ 80% lewat satu pembeli **luar** — daftar Lembaga ber-⚠ sama dengan daftar di Sorotan Ketergantungan; urut Offtaker utama mengikuti porsi pembeli luar.
- PKS pasti ≤ 50% berwarna kuning — Lembaga yang sama dengan daftar Sorotan "≥ 50% tak pasti".
- Posisi lipat diingat setelah muat ulang.

### TC-382-03 · Jarak konsisten antar tampilan [P1] (2 mnt)
Langkah:
1. Catat kolom **Jarak** Mill teratas di tabel Volume per Mill.
2. Buka Mill yang sama di Peta (ikon peta) → klik ikonnya.
Harapan:
- **Jarak rata-rata (garis lurus)** di popup = kolom Jarak tabel; label menyebut "garis lurus", bukan jarak tempuh.
Baseline dev: Mill terjauh di Sorotan 82,1 km = popup Mill yang sama.
