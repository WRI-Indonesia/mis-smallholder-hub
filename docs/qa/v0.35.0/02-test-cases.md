# 02 · Kasus uji per issue — v0.35.0

Satu **blok** per kasus; hasil di `runs/`. Dijalankan sebagai **OPERATOR ter-scope Kampar** kecuali disebut lain. Data uji: Lembaga HJP `ICS-1401-03`, lahan `HJP.0001.A.14.01.10.2002`; angka acuan dari `TC-PREP-04` (bukan angka dev di bawah — dev memakai snapshot prod + patok seluruh HJP). Prasyarat umum: `TC-PREP-01…04` selesai.

`Baseline dev` = hasil smoke dev 2026-09-15 di `mis-dev` (HJP 559 lahan · 21 NKT · 1.015 patok · 62 patok NKT) — hanya pembanding bentuk, bukan pengganti hasil staging.

## #317 F1 — geom + GiST

### TC-317-01 · Upload ulang poligon mengisi `geom` otomatis [P0] (5 mnt)
Prasyarat: shapefile ZIP 1 lahan HJP yang sudah ada (revisi +1); `data-qc.ts` A3 sebelum = 0 NULL.
Langkah:
1. Bulk Upload › Lahan › Poligon → unggah → validasi → Simpan
2. `data-qc.ts --section A`
Harapan:
- Upload sukses tanpa error transaksi; A3 tetap 0 NULL (baris revisi baru ikut terisi)
Baseline dev: 14.003 baris identik, 0 NULL

## #326 — Sepadan

### TC-326-01 · Isi sepadan sebagian [P1] (3 mnt)
Prasyarat: EDIT Lahan; `HJP.0001.A`.
Langkah:
1. Detail Lahan › Informasi › kotak Sepadan › **Isi**
2. Utara "Jalan desa", Timur kosong → Simpan; refresh
Harapan:
- Blok hanya menampilkan sisi terisi; tetap ada setelah refresh

### TC-326-02 · Kosongkan semua = hapus, baris tetap [P1] (2 mnt)
Prasyarat: TC-326-01.
Langkah:
1. Ubah → kosongkan semua → Simpan
Harapan:
- "Sepadan belum diisi" + tombol Isi; `data-qc.ts` B6 = 1 baris semua NULL

### TC-326-03 · Import Excel: terisi menimpa, kosong membiarkan [P1] (5 mnt)
Prasyarat: TC-326-01 (Utara terisi); Excel Detail Lahan 1 baris: `Sepadan Utara` = "Sungai", `Sepadan Timur` kosong.
Langkah:
1. Bulk Upload › Lahan › Detail Lahan → validasi → Simpan
Harapan:
- Utara **ditimpa** "Sungai"; Timur **tidak** dikosongkan; ringkasan `sepadan diperbarui 1`

### TC-326-04 · Shapefile DBF `bts_utara` + sepadan utuh lintas revisi [P1] (5 mnt)
Prasyarat: shapefile lahan HJP.0001.A dengan kolom DBF `bts_utara`; lalu shapefile yang sama **tanpa** kolom itu.
Langkah:
1. Unggah yang berkolom → auto-match ke Sepadan Utara → Simpan
2. Unggah yang tanpa kolom (revisi +1)
Harapan:
- Setelah langkah 2 Detail Lahan **masih** menampilkan sepadan (menempel ke identitas)

## #327 — Tetangga ≤ 25 m

### TC-327-01 · Tetangga di peta Detail Lahan [P0] (2 mnt)
Prasyarat: `HJP.0001.A`.
Langkah:
1. Detail Lahan › Informasi; klik nomor tetangga
Harapan:
- Poligon putus-putus abu bernomor 1…n + tabel legenda (No · Pemilik · ID Lahan · Lembaga); popup nama pemilik
Baseline dev: 5 tetangga

### TC-327-02 · Nama petani tetangga luar scope tetap tampil [P0] (3 mnt)
Prasyarat: OPERATOR ter-scope; lahan di tepi Lembaga yang tetangganya milik Lembaga lain (cari via Peta Lahan).
Langkah:
1. Detail Lahan → legenda tetangga
Harapan:
- Nama & kode petani tetangga **tampil** (revisi owner 2026-09-14); tautan ke detail lahan tetangga **tidak** ada

### TC-327-03 · Profil Lahan PDF dari dua pintu [P1] (3 mnt)
Prasyarat: PRINT.
Langkah:
1. Detail Lahan › Profil Lahan (PDF)
2. Peta Lahan › popup lahan yang sama › Profil Lahan
Harapan:
- Keduanya identik: skala + panah utara, tetangga bernomor, legenda; ≤ 2 halaman; 0 tetangga → "Tidak ada lahan lain dalam 25 m"

## #328 — Status NKT

### TC-328-01 · Isi NKT lewat form [P0] (3 mnt)
Prasyarat: EDIT; lahan HJP **tanpa** NKT (bukan 21 lahan Lampiran).
Langkah:
1. Detail Lahan › kotak NKT › Isi: Terdampak, NKT 4, tanggal, asesor → Simpan
Harapan:
- Badge merah **Terdampak NKT** di header; kotak menampilkan kategori/tanggal/asesor; form **tidak** menawarkan "Termasuk"

### TC-328-02 · Tidak terdampak menghapus kategori [P1] (2 mnt)
Prasyarat: TC-328-01.
Langkah:
1. Ubah → Tidak terdampak (biarkan centang NKT 4) → Simpan
Harapan:
- Tersimpan **tanpa** kategori ("Tidak terdampak", bukan "— NKT 4")

### TC-328-03 · Hapus NKT = baris hilang [P1] (2 mnt)
Prasyarat: TC-328-02; DELETE.
Langkah:
1. Kotak NKT › Hapus
Harapan:
- "Belum dinilai NKT"; `data-qc.ts` B7 = 0 untuk lahan itu

### TC-328-04 · Import dengan bawaan berkas; `0`/`tidak` tidak terbalik [P0] [regresi] (5 mnt)
Prasyarat: template NKT 3 baris lahan HJP tanpa NKT: Status `0` · `tidak` · kosong; bawaan berkas Terdampak + NKT 4.
Langkah:
1. Bulk Upload › Lahan › Detail Lahan → validasi
Harapan:
- Kosong → Terdampak (bawaan); `0` dan `tidak` → **Tidak terdampak**
- Simpan → ringkasan `nkt dibuat 3`

### TC-328-05 · Laporan Lahan filter & KPI NKT [P0] (3 mnt)
Prasyarat: TC-PREP-01.
Langkah:
1. Report › Lahan › HJP › NKT = Terdampak; nyalakan kolom NKT; Excel & PDF
Harapan:
- Baris = 21 (+ yang dibuat TC-328-04); KPI "Termasuk/terdampak NKT" sama; Excel/PDF membawa kolom & filter

### TC-328-06 · Layer Lahan NKT di Peta Lahan [P0] (2 mnt)
Langkah:
1. Peta Lahan Kampar › Muat Data; legenda **Lahan NKT** (nyala bawaan); klik satu poligon merah
Harapan:
- Poligon merah = jumlah KPI TC-328-05; popup baris NKT = status; lahan lain "Belum dinilai"

## #329 — Patok batas

### TC-329-01 · Buat patok dari poligon [P0] (3 mnt)
Prasyarat: CREATE; lahan berpoligon **tanpa** patok (bukan 3 lahan TC-PREP-02).
Langkah:
1. Tab Patok › Buat patok dari poligon → pratinjau → centang semua → Simpan
Harapan:
- Nomor searah jarum jam dari utara; kode `HJP-PTK-00nnnn`; lengkung digitasi tidak jadi puluhan patok

### TC-329-02 · Sudut bersama ditautkan, bukan digandakan [P0] (3 mnt)
Prasyarat: TC-329-01 pada lahan tetangganya.
Langkah:
1. Buat patok dari poligon di lahan tetangga
Harapan:
- Ringkasan "ditautkan ke patok lahan lain" > 0; tab menampilkan "juga patok lahan …"

### TC-329-03 · Idempoten [P1] (1 mnt)
Langkah:
1. Jalankan ulang Buat patok dari poligon pada lahan TC-329-01
Harapan:
- 0 dibuat, 0 ditautkan

### TC-329-04 · Guard koordinat [P1] (2 mnt)
Prasyarat: EDIT.
Langkah:
1. Ubah patok: geser 300 m → Simpan
2. Ubah: tukar lat/long → Simpan
Harapan:
- (1) ditolak "… m dari batas lahan (maks 100 m)"; (2) pesan menyebut lat/long tertukar

### TC-329-05 · Foto patok [P2] (2 mnt)
Prasyarat: jpg ≤ 5 MB.
Langkah:
1. Unggah foto; unggah foto kedua
Harapan:
- Thumbnail tampil; foto kedua menggantikan

### TC-329-06 · Lepas patok bersama [P1] (3 mnt)
Prasyarat: DELETE; patok yang dipakai 2 lahan.
Langkah:
1. Lepas dari lahan A → cek lahan B
2. Lepas dari lahan B
Harapan:
- (1) patok tetap ada di lahan B; (2) patok nonaktif (tidak muncul di Report › Patok)

### TC-329-07 · Unggah Excel patok idempoten [P0] (5 mnt)
Prasyarat: TC-PREP-03 (berkas yang sama).
Langkah:
1. Unggah ulang `input/patok-gps-hjp.xlsx`
Harapan:
- 0 baru; baris ≤ 5 m dari patok lahan sendiri → diperbarui

## #330 — NKT di menu harian

### TC-330-01 · Master Data Lahan filter NKT & Patok [P0] (3 mnt)
Langkah:
1. MD › Lahan: NKT = Terdampak NKT; lalu Patok = Ada; nyalakan kolom NKT/Patok; Excel
Harapan:
- Jumlah = TC-328-05; badge NKT merah di kolom ID Lahan; Excel membawa kolom yang aktif

### TC-330-02 · Detail Lembaga HJP tab Lahan [P0] (2 mnt)
Langkah:
1. MD › Lembaga Petani › HJP › tab Lahan
Harapan:
- KPI **Lahan NKT** = TC-PREP-04 D1; legenda peta "Lahan NKT n"; popup lahan menyebut status

### TC-330-03 · Detail Petani tab Lahan [P1] (2 mnt)
Prasyarat: petani pemilik `HJP.0001.A`.
Langkah:
1. MD › Petani › detail › tab Lahan
Harapan:
- Kolom NKT di tabel lahan; tepi merah di peta sebaran

## #331 — Patok di semua menu · kode · Report › Patok

### TC-331-01 · Layer patok Peta Lahan & hitungan legenda [P0] (3 mnt)
Langkah:
1. Peta Lahan Kampar › Muat Data; centang Patok lahan, lalu Patok lahan NKT; klik ikon zoom
Harapan:
- Titik kuning lalu merah; hitungan baris kuning = patok **non-NKT** (≠ total), merah = patok NKT (D3)
Baseline dev: 953 / 62

### TC-331-02 · Unduhan per baris legenda [P0] (4 mnt)
Prasyarat: EXPORT `map-parcel`; PRINT untuk PDF.
Langkah:
1. Baris Patok lahan NKT → Excel; baris Area Lahan → Shapefile; baris Patok lahan → PDF
Harapan:
- Excel satu baris per patok fisik ber-kolom Kode Patok; SHP Polygon; PDF landscape peta + tabel per lahan

### TC-331-03 · Laporan Lahan filter & KPI patok [P1] (2 mnt)
Langkah:
1. Report › Lahan › HJP › Patok = Ada; kolom Patok
Harapan:
- Baris & KPI "Ada Patok" konsisten dengan MD › Lahan filter Patok = Ada

### TC-331-04 · Detail Lembaga KPI Patok + Unduh patok [P1] (3 mnt)
Langkah:
1. MD › Lembaga › HJP › tab Lahan; legenda Patok/Patok NKT; **Unduh patok**
Harapan:
- KPI "n patok · % terpasang · n patok NKT" = D2/D3; Excel kolom sama dengan unduhan Peta Lahan

### TC-331-05 · Report › Patok per peran [P0] (4 mnt)
Prasyarat: OPERATOR, lalu DONOR.
Langkah:
1. Sidebar Report › Patok; Distrik Kampar → Muat Data; filter Kondisi = Belum dipasang; NKT = Ya; Excel
2. Ulangi sebagai DONOR
Harapan:
- Menu tampil untuk keduanya; OPERATOR ada Excel; DONOR **tanpa** Excel, PDF ada; jumlah = D2

### TC-331-06 · Kode patok tampil konsisten [P1] (2 mnt)
Langkah:
1. Bandingkan kode satu patok di: tab Patok, popup Peta Lahan, PDF Profil Lahan, Excel Report › Patok
Harapan:
- Kode identik di keempatnya

### TC-331-07 · Unggahan ber-Kode Patok: sendiri / tetangga dekat / tak dikenal [P0] [regresi] (5 mnt)
Prasyarat: Excel 3 baris: (a) kode patok lahan ini; (b) kode patok lahan tetangga ≤ 100 m; (c) `HJP-PTK-999999`.
Langkah:
1. Bulk Upload › Lahan › Patok → validasi → Simpan
Harapan:
- (a) diperbarui; (b) ditautkan; (c) ditolak "tidak ditemukan". (Kode Lembaga lain > 100 m: lihat TC-REV-03)

## #332 — Laporan NKT (PDF, 3 KPI)

### TC-332-01 · Laporan NKT mengabaikan filter [P0] (3 mnt)
Prasyarat: PRINT `report-land-parcel`.
Langkah:
1. Report › Lahan › HJP › pasang filter Status Surat apa pun → **Laporan NKT**
Harapan:
- Berkas `Laporan_NKT_ISH_1401_03_<tgl>.pdf`; **3 KPI**: Total lahan (n dinilai · n belum) · Lahan NKT (Σ ha) · Luas NKT; isi = seluruh lahan aktif, bukan hasil filter

### TC-332-02 · Isi PDF [P1] (3 mnt)
Langkah:
1. Buka PDF TC-332-01
Harapan:
- Peta ikhtisar (konteks ungu berlabel nama petani, NKT merah bernomor) + peta rinci per klaster bila fitur kecil; tabel hanya lahan NKT; ringkasan per kategori; kop menyebut sumber asesmen
Baseline dev: 7 halaman, 5 klaster A–E

### TC-332-03 · Lembaga tanpa NKT [P2] (2 mnt)
Prasyarat: Lembaga lain tanpa baris NKT.
Langkah:
1. Laporan NKT
Harapan:
- PDF terbit: KPI 0, tabel kosong, "sumber asesmen belum dicatat"

## #336 · #337 · #338 — hasil audit menu

### TC-336-01 · Popup lahan menyebut jumlah patok [P1] (2 mnt)
Langkah:
1. Peta Lahan Kampar › klik `HJP.0001.A`; klik lahan tanpa patok
Harapan:
- "Patok: n patok" (= tab Patok); lahan tanpa patok → "Belum ada patok"

### TC-337-01 · Report KT Summary kolom Lahan NKT & Patok [P1] (3 mnt)
Langkah:
1. Report › KT (Summary) › Kolom → nyalakan Lahan NKT & Patok; Excel; PDF
Harapan:
- Baris HJP: Lahan NKT (merah) = D1, Patok = Σ tautan (D2); "—" bila 0; kartu Lahan NKT; Excel/PDF ikut kolom

### TC-337-02 · Report KT Detail [P1] (2 mnt)
Langkah:
1. Report › KT (Detail) › HJP › Buka semua
Harapan:
- Header seksi "… n Lahan NKT · n Patok"; kolom Lahan NKT/Patok per petani ("—" bila 0)

### TC-337-03 · Lembaga tanpa NKT/patok [P2] (1 mnt)
Langkah:
1. Report › KT (Detail) › Lembaga lain
Harapan:
- Header seksi **tanpa** "Lahan NKT/Patok"; kolom "—"

### TC-338-01 · Daftar Lembaga kolom Lahan NKT [P1] (2 mnt)
Langkah:
1. MD › Lembaga Petani › Kolom → Lahan NKT; urutkan menurun; Excel
Harapan:
- HJP teratas berbadge "n NKT" (= D1); Excel memuat kolom (karena dinyalakan)

### TC-338-02 · Daftar Petani kolom Lahan NKT [P1] (2 mnt)
Langkah:
1. MD › Petani › filter Lembaga HJP › Kolom → Lahan NKT; urutkan
Harapan:
- Petani ber-lahan NKT berbadge; lainnya "—"; jumlah petani berbadge = D1 (bila 1 lahan/petani)
