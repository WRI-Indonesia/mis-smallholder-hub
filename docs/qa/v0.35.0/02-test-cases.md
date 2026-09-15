# 02 · Kasus uji per issue — v0.35.0

ID = `TC-<issue>-<nn>`. Dijalankan QA di **staging** setelah migrasi + seed (#333). Data uji memakai **kode** (Lembaga HJP `ICS-1401-03`, lahan `HJP.0001.A.14.01.10.2002`), bukan nama orang. Kolom *Baseline dev* = hasil smoke 2026-09-15 di `mis-dev` (bukan pengganti hasil staging).

## #317 F1 — geom + GiST

| ID | Prasyarat & data uji | Langkah | Hasil harapan | Baseline dev | Hasil aktual | Status | Env | Tester · tanggal | Bukti |
|---|---|---|---|---|---|---|---|---|---|
| TC-317-01 | Migrasi applied | Bulk Upload › Lahan › Poligon: unggah ulang shapefile 1 lahan (revisi +1) | Upload sukses; kolom `geom` terisi otomatis (cek `03` A3), tanpa error transaksi | ✓ (14.003 baris identik) | | | staging | | |

## #326 — Sepadan

| ID | Prasyarat & data uji | Langkah | Hasil harapan | Baseline dev | Hasil aktual | Status | Env | Tester · tanggal | Bukti |
|---|---|---|---|---|---|---|---|---|---|
| TC-326-01 | OPERATOR EDIT Lahan; `HJP.0001.A` | Detail Lahan › Informasi › kotak Sepadan › **Isi** → Utara "Jalan desa", Timur kosong → Simpan | Blok menampilkan hanya sisi terisi; refresh tetap ada | ✓ | | | staging | | |
| TC-326-02 | TC-326-01 | Ubah → kosongkan semua → Simpan | "Sepadan belum diisi" + tombol Isi; baris DB tetap ada (`03` B6) | ✓ | | | staging | | |
| TC-326-03 | Template Detail Lahan | Bulk Upload › Lahan › Detail Lahan: Excel dengan kolom `Sepadan Utara` terisi, `Sepadan Timur` kosong untuk lahan yang sudah punya Timur | Utara **ditimpa**, Timur **tidak dikosongkan**; ringkasan `sepadan diperbarui` benar | ✓ (test) | | | staging | | |
| TC-326-04 | Poligon | Bulk Upload › Lahan › Poligon: shapefile DBF berkolom `bts_utara` | Auto-match ke Sepadan Utara; setelah upload, revisi baru **tetap** membawa sepadan lama (menempel ke identitas) | ✓ (test) | | | staging | | |

## #327 — Tetangga ≤ 25 m

| ID | Prasyarat & data uji | Langkah | Hasil harapan | Baseline dev | Hasil aktual | Status | Env | Tester · tanggal | Bukti |
|---|---|---|---|---|---|---|---|---|---|
| TC-327-01 | `HJP.0001.A` | Detail Lahan › Informasi | Tetangga putus-putus abu bernomor 1…n + tabel legenda (No · Pemilik · ID Lahan · Lembaga); klik nomor → popup | ✓ (5 tetangga) | | | staging | | |
| TC-327-02 | OPERATOR ter-scope Lembaga lain dari tetangga | Buka lahan yang tetangganya milik Lembaga di luar scope | **Nama petani tetangga tetap tampil** (revisi owner); tautan detail tidak ada | belum diuji | | | staging | | |
| TC-327-03 | PRINT | Profil Lahan (PDF) dari Detail Lahan **dan** dari popup Peta Lahan | Peta ber-skala + panah utara, tetangga putus-putus bernomor, legenda; 0 tetangga → baris "Tidak ada lahan lain dalam 25 m"; tetap ≤ 2 halaman | ✓ | | | staging | | |

## #328 — Status NKT

| ID | Prasyarat & data uji | Langkah | Hasil harapan | Baseline dev | Hasil aktual | Status | Env | Tester · tanggal | Bukti |
|---|---|---|---|---|---|---|---|---|---|
| TC-328-01 | EDIT Lahan | Detail Lahan › kotak NKT › Isi: Terdampak, kategori NKT 4, tanggal, asesor → Simpan | Badge merah **Terdampak NKT** di header; kotak menampilkan kategori/tanggal/asesor; form **tidak** menawarkan "Termasuk" | ✓ | | | staging | | |
| TC-328-02 | TC-328-01 | Ubah → status Tidak terdampak (biarkan centang kategori) → Simpan | Tersimpan **tanpa kategori** ("Tidak terdampak", bukan "— NKT 4") | ✓ (test) | | | staging | | |
| TC-328-03 | TC-328-01; DELETE | Kotak NKT › Hapus | Kembali "Belum dinilai NKT"; baris DB hilang (`03` B7) | ✓ | | | staging | | |
| TC-328-04 | `template_nkt_lahan.xlsx` | Bulk Upload › Lahan › Detail Lahan: template NKT, set **bawaan berkas** Terdampak + NKT 4; satu baris kolom Status = `0`, satu = `tidak`, satu kosong | Kosong → Terdampak (bawaan); `0` dan `tidak` → **Tidak terdampak** (bukan terbalik); ringkasan `nkt dibuat/diperbarui` benar | ✓ (test review 09-15) | | | staging | | |
| TC-328-05 | HJP ber-NKT | Report › Lahan: filter **NKT = Terdampak**; kolom NKT; KPI | Baris = 21; KPI "Termasuk/terdampak NKT 21"; Excel & PDF membawa kolom & filter | ✓ (21) | | | staging | | |
| TC-328-06 | Peta Lahan Kampar | Legenda **Lahan NKT** (nyala bawaan) | 21 poligon merah; hitungan 21; popup lahan baris NKT = status / "Belum dinilai" | ✓ | | | staging | | |

## #329 — Patok batas

| ID | Prasyarat & data uji | Langkah | Hasil harapan | Baseline dev | Hasil aktual | Status | Env | Tester · tanggal | Bukti |
|---|---|---|---|---|---|---|---|---|---|
| TC-329-01 | CREATE Lahan; lahan berpoligon **tanpa** patok | Tab Patok › **Buat patok dari poligon** → pratinjau → centang semua → Simpan | Patok bernomor searah jarum jam dari utara; vertex berhimpit (lengkung) tidak jadi puluhan patok; kode `HJP-PTK-00nnnn` | ✓ (4 patok segi empat) | | | staging | | |
| TC-329-02 | TC-329-01 pada lahan **tetangga** yang berbagi sudut | Buat patok dari poligon di lahan tetangga | Sudut bersama **ditautkan** (ringkasan "ditautkan ke patok lahan lain"), bukan patok baru; tab menampilkan "juga patok lahan …" | ✓ (2.292 tautan / 1.015 patok) | | | staging | | |
| TC-329-03 | TC-329-01 | Jalankan ulang Buat patok dari poligon | 0 dibuat (idempoten) | ✓ | | | staging | | |
| TC-329-04 | EDIT | Ubah patok: geser koordinat 300 m | Ditolak "… m dari batas lahan (maks 100 m)"; tukar lat/long → pesan menyebut tertukar | ✓ (test) | | | staging | | |
| TC-329-05 | Foto ≤ 5 MB jpg | Unggah foto patok | Thumbnail tampil; unggah kedua menggantikan | belum diuji | | | staging | | |
| TC-329-06 | DELETE | Lepas patok yang dipakai 2 lahan, lalu lepas dari lahan kedua | Setelah lepas pertama patok tetap aktif (masih dipakai); setelah kedua patok nonaktif | ✓ (test) | | | staging | | |
| TC-329-07 | Template patok (Excel) 3 baris, 1 tanpa No Patok | Bulk Upload › Lahan › **Patok**: validasi → simpan; unggah berkas yang sama sekali lagi | Ringkasan pertama: baru/diperbarui/ditautkan; unggah kedua: 0 baru (idempoten); baris ≤ 5 m dari patok lahan sendiri → diperbarui | ✓ (test) | | | staging | | |

## #330 — NKT di menu harian

| ID | Prasyarat & data uji | Langkah | Hasil harapan | Baseline dev | Hasil aktual | Status | Env | Tester · tanggal | Bukti |
|---|---|---|---|---|---|---|---|---|---|
| TC-330-01 | HJP | MD › Lahan: filter **NKT: Terdampak NKT** | 21 baris, badge NKT merah di kolom ID Lahan; filter **Patok: Ada** menyaring; kolom NKT/Patok bisa dinyalakan & ikut Excel | ✓ (21) | | | staging | | |
| TC-330-02 | HJP | MD › Lembaga › Detail HJP › tab Lahan | KPI **Lahan NKT** 21 (41,33 ha · 538 belum dinilai); legenda peta "Lahan NKT 21"; popup lahan menyebut status | ✓ | | | staging | | |
| TC-330-03 | Petani pemilik `HJP.0001.A` | MD › Petani › Detail › tab Lahan | Kolom NKT di tabel lahan; tepi merah di peta sebaran | ✓ | | | staging | | |

## #331 — Patok di semua menu · kode · Report › Patok

| ID | Prasyarat & data uji | Langkah | Hasil harapan | Baseline dev | Hasil aktual | Status | Env | Tester · tanggal | Bukti |
|---|---|---|---|---|---|---|---|---|---|
| TC-331-01 | Peta Lahan Kampar dimuat | Centang **Patok lahan**, lalu **Patok lahan NKT** | Titik kuning lalu merah muncul; hitungan baris kuning = patok non-NKT (953 di dev, ≠ total 1.015); ikon zoom membawa ke titik | ✓ (953 / 62) | | | staging | | |
| TC-331-02 | TC-331-01 | Untick → tick lagi cepat; ganti dropdown Lembaga **tanpa** Muat Data | Titik tetap muncul (tidak macet); titik **tidak** berganti mengikuti dropdown sebelum Muat Data | ✓ (fix review) | | | staging | | |
| TC-331-03 | EXPORT map-parcel | Ikon unduh baris **Patok lahan NKT** → Excel; baris **Area Lahan** → Shapefile; baris **Patok lahan** → PDF (PRINT) | Excel satu baris per patok fisik, kolom Kode Patok; SHP Polygon; PDF landscape peta + tabel per lahan | ✓ | | | staging | | |
| TC-331-04 | HJP | Report › Lahan: filter **Patok = Ada**, kolom Patok; KPI Ada Patok | Baris & KPI konsisten dengan Master Data (559 · 2.292 tautan) | ✓ | | | staging | | |
| TC-331-05 | HJP | MD › Lembaga › Detail HJP › tab Lahan: KPI Patok; legenda peta Patok/Patok NKT; **Unduh patok** | KPI "1.015 · 0 % terpasang · 62 patok NKT"; legenda 953/62; Excel kolom sama dengan Peta Lahan | ✓ | | | staging | | |
| TC-331-06 | Peran OPERATOR/MANAGEMENT/DONOR | **Report › Patok** tampil di sidebar; Distrik Kampar → Muat Data; filter Kondisi/NKT; Excel (OPERATOR) ; DONOR **tanpa** Excel, ada PDF | Menu & izin sesuai seed (ADMIN 5, OPERATOR/MANAGEMENT/SUPERADMIN 3, DONOR 2); 1.015 patok, KPI kondisi | ✓ (SUPERADMIN) | | | staging | | |
| TC-331-07 | Bulk Upload Patok, Excel berkolom **Kode Patok** | (a) kode patok lahan ini; (b) kode patok Lembaga lain > 100 m dari titik; (c) kode tak dikenal | (a) diperbarui; (b) **ditolak** "bukan patok lahan ini …"; (c) ditolak "tidak ditemukan" | ✓ (test review 09-15) | | | staging | | |

## #332 — Laporan NKT (PDF, 3 KPI)

| ID | Prasyarat & data uji | Langkah | Hasil harapan | Baseline dev | Hasil aktual | Status | Env | Tester · tanggal | Bukti |
|---|---|---|---|---|---|---|---|---|---|
| TC-332-01 | PRINT report-land-parcel; HJP | Report › Lahan › pilih HJP → filter apa pun → **Laporan NKT** | PDF `Laporan_NKT_ISH_1401_03_<tgl>.pdf`; **3 KPI**: Total lahan 559 (21 dinilai · 538 belum) · Lahan NKT 21 (41,33 ha) · Luas NKT 1,16 ha; isi **tidak** mengikuti filter | ✓ (6 KPI → direvisi 3) | | | staging | | |
| TC-332-02 | TC-332-01 | Buka PDF | Peta ikhtisar (konteks ungu berlabel, NKT merah bernomor) + peta rinci per klaster A–E; tabel 21 baris; ringkasan "NKT 4 — 21"; kop menyebut sumber asesmen | ✓ (7 hal.) | | | staging | | |
| TC-332-03 | Lembaga **tanpa** baris NKT | Laporan NKT | PDF tetap terbit: KPI 0, tabel kosong, "sumber asesmen belum dicatat" | belum diuji | | | staging | | |

## Review 2026-09-15 — regresi yang dikunci

| ID | Prasyarat & data uji | Langkah | Hasil harapan | Baseline dev | Hasil aktual | Status | Env | Tester · tanggal | Bukti |
|---|---|---|---|---|---|---|---|---|---|
| TC-REV-01 | Shapefile Point patok yang DBF-nya punya kolom `LINTANG`/`BUJUR` lama | Bulk Upload › Patok | Koordinat memakai **geometri**, bukan atribut | ✓ (test) | | | staging | | |
| TC-REV-02 | Dua baris GPS di titik sama tanpa No Patok | Bulk Upload › Patok | 1 dibuat + 1 diperbarui (bukan 2 patok) | ✓ (test) | | | staging | | |
| TC-REV-03 | Lahan dengan GeoJSON cacat (`geom` NULL) | Tambah patok manual | Tidak menolak dengan "Infinity m"; guard dilewati | ✓ (test) | | | staging | | |
| TC-REV-04 | Detail Lembaga HJP | Muat halaman, ukur waktu tab Lahan | Tidak lebih lambat dari v0.34.1 secara kasat mata (patok dimuat sejajar; lazy → #335) | — | | | staging | | |
| TC-REV-05 | Report › Lahan filter NKT "Terdampak" | Bandingkan jumlah dengan Peta Lahan hitungan Lahan NKT | Sama (satu konstanta `NKT_AFFECTED_STATUSES`) | ✓ (21 = 21) | | | staging | | |

## #336 · #337 · #338 — hasil audit menu

| ID | Prasyarat & data uji | Langkah | Hasil harapan | Baseline dev | Hasil aktual | Status | Env | Tester · tanggal | Bukti |
|---|---|---|---|---|---|---|---|---|---|
| TC-336-01 | Peta Lahan Kampar | Klik `HJP.0001.A` | Popup baris **Patok: 4 patok**; lahan tanpa patok → "Belum ada patok" | ✓ (4) | | | staging | | |
| TC-337-01 | HJP | Report › KT (Summary): Kolom → nyalakan **Lahan NKT** & **Patok** | Baris HJP: Lahan NKT 21 (merah), Patok 2.292; kartu Lahan NKT 21; Excel/PDF ikut kolom | ✓ (builder) | | | staging | | |
| TC-337-02 | HJP | Report › KT (Detail) HJP › Buka semua | Header seksi "… 21 Lahan NKT · 2.292 Patok"; kolom Lahan NKT/Patok per petani ("—" bila 0) | ✓ | | | staging | | |
| TC-337-03 | Lembaga tanpa NKT/patok | Report › KT (Detail) | Header seksi **tanpa** "Lahan NKT/Patok"; kolom "—" | belum diuji | | | staging | | |
| TC-338-01 | — | MD › Lembaga Petani: Kolom → **Lahan NKT**; urutkan menurun | HJP teratas dengan badge "21 NKT"; Excel memuat kolom | ✓ (kueri) | | | staging | | |
| TC-338-02 | — | MD › Petani: Kolom → **Lahan NKT**; filter Lembaga HJP; urutkan | 21 petani berbadge; lainnya "—" | ✓ (kueri: 21) | | | staging | | |
