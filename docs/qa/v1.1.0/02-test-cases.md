# 02 · Kasus uji per issue — v1.1.0

Satu **blok** per kasus. Ditulis dev saat menutup issue; dijalankan QA di staging; hasil di `runs/`. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

Format: `### TC-<issue>-<nn> · <judul> [P0] [regresi] (<menit> mnt)` lalu `Prasyarat:` · `Langkah:` (bernomor) · `Harapan:` (bullet) · opsional `Baseline dev:`.

> **Data uji utama:** Lembaga **ISH-1401-01** (APSS - Sei Galuh, Distrik Kampar) — 541 lahan, 3 KT (termasuk isian **"Tidak Ada"** = 314 lahan), 30 Blok + 162 lahan tanpa Blok. Blok **1 F** = 9 lahan dalam dua baris (6 atas, 3 bawah) — tata letak yang dipakai owner untuk menilai urutan posisi.

## #370 — Excel lahan: kolom Jumlah Node + Koordinat

### TC-370-01 · Peta Lahan › Area Lahan Petani › Excel: dua kolom baru di ujung kanan [P0] (4 mnt)
Prasyarat: izin Export `map-parcel`; filter Distrik **Kampar** (tanpa Lembaga) → Muat Data.
Langkah:
1. Legenda › baris **Area Lahan Petani** › ikon unduh › **Excel**.
2. Buka berkas.
Harapan:
- Excel langsung terunduh **tanpa modal** (filter bukan satu Lembaga).
- Dua kolom terakhir berurutan **Jumlah Node**, lalu **Koordinat**; kolom lain tidak bergeser (kolom pertama tetap ID Lahan).
- Isi Koordinat: `Lintang,Bujur` 6 desimal, dipisah `; `; node penutup (sama dengan node pertama) **tidak** diulang — jumlah pasangan = Jumlah Node.
- Excel baris **Point Lahan Petani** dan **Lahan terdampak NKT** **tidak** punya kedua kolom ini.

### TC-370-02 · Koordinat Excel = geometri GeoJSON lahan yang sama [P0] [regresi] (6 mnt)
Prasyarat: seperti TC-370-01, filter Lembaga **ISH-1401-01**.
Langkah:
1. Unduh Excel Area Lahan (1 sheet) dan **GeoJSON** Area Lahan.
2. Ambil 3 ID Lahan acak; bandingkan kolom Koordinat dengan koordinat poligon di GeoJSON (urutan lat/lon dibalik: GeoJSON = `[bujur, lintang]`).
Harapan:
- Sama persis hingga 6 desimal. **ID Lahan kembar** (dua lahan ber-ID sama, masalah data lama) cocok ke salah satu fiturnya.
Baseline dev: 541/541 cocok (mis-dev, 2026-09-23).

### TC-370-03 · Laporan Lahan: "Koordinat (Excel)" hanya di Excel [P1] (5 mnt)
Prasyarat: izin Export + Print `report-land-parcel`; Lembaga **ISH-1401-01** dimuat.
Langkah:
1. Buka selektor **Kolom** — pastikan **Koordinat (Excel)** tercentang (bawaan).
2. Unduh **Excel**, lalu **PDF**.
3. Matikan Koordinat (Excel), unduh Excel lagi.
Harapan:
- Tabel layar tidak pernah punya kolom Koordinat/Jumlah Node, apa pun keadaan toggle.
- Excel (langkah 2): Jumlah Node + Koordinat di ujung kanan sheet **Lahan**; baris **Total** kosong di kedua kolom itu.
- PDF: tanpa kedua kolom; footer Total tidak bergeser.
- Excel (langkah 3): kedua kolom hilang.

## #371 — Excel per Kelompok Tani / Blok + Urutan No

### TC-371-01 · Laporan Lahan › Sheet per Blok: nama sheet = nama Blok [P0] (6 mnt)
Prasyarat: Laporan Lahan, Lembaga **ISH-1401-01** dimuat.
Langkah:
1. Pilih **Sheet per Blok** (select di samping tombol Excel), klik **Excel**.
2. Buka berkas; periksa daftar sheet dan sheet **Ringkasan**.
Harapan:
- Nama berkas berakhiran `_per_Blok`.
- Urutan sheet: **Ringkasan, Lahan**, lalu satu sheet per Blok dengan **nama Blok saja** (`1 F`, `1 G`, `2 F` … `11 F` … `DUSUN 1`…), urut natural (`2 F` sebelum `11 F`), **Tanpa Blok** terakhir. Tidak ada nama terpotong seperti `… – 11` atau `… (2)`.
- Jumlah baris lahan semua sheet Blok = jumlah baris sheet Lahan (tiap sheet punya baris Total bila kolom Luas menyala).
- Tiap sheet Blok punya **gambar peta** lahannya.
- Ringkasan memuat baris `Berkas · Pecah sheet · Blok (31 sheet)`.
Baseline dev: 33 sheet (Ringkasan + Lahan + 31), 541 lahan.

### TC-371-02 · Urutan Posisi: nomor di peta = kolom No, utara-kiri dulu [P0] [regresi] (6 mnt)
Prasyarat: seperti TC-371-01.
Langkah:
1. Pilih **Urut: Posisi lahan**; perhatikan tabel layar.
2. Sheet per Blok › Excel; buka sheet **1 F**, lihat gambar petanya.
Harapan:
- Tabel layar berganti urutan (tidak lagi abjad pemilik).
- Sheet 1 F: No mulai **1**; di gambar peta, baris lahan atas bernomor **1→6 dari kiri ke kanan**, baris bawah **7→9**.
- Ringkasan memuat baris `Urutan No · Posisi lahan …`.
- PDF juga mengikuti urutan posisi dan mencantumkan "Urutan No" di metadata.

### TC-371-03 · Sheet per Kelompok Tani: isian "Tidak Ada" = Tanpa KT [P1] (4 mnt)
Prasyarat: seperti TC-371-01.
Langkah:
1. Sheet per Kelompok Tani › Excel.
Harapan:
- Sheet KT: `Deli makmur`, `KUD Terbit Sentosa Makmur`, **Tanpa KT** (terakhir) — **tidak ada** sheet bernama "Tidak Ada".
- Sheet Tanpa KT berisi lahan ber-KT "Tidak Ada" + lahan tanpa KT.
Baseline dev: 2 / 213 / 326 lahan.

### TC-371-04 · Mode Grid peta tidak berubah dari v1.0.0 [P1] [regresi] (4 mnt)
Prasyarat: Laporan Lahan, Lembaga dimuat, Grid 2×2, Urut abjad.
Langkah:
1. Sheet per **Grid peta** (bawaan) › Excel.
Harapan:
- Sheet: Ringkasan, Lahan, `Peta A1` … — sama dengan v1.0.0; nama berkas **tanpa** akhiran `_per_…`; Ringkasan **tanpa** baris "Pecah sheet"/"Urutan No".

### TC-371-05 · Latar peta sheet KT/Blok tak terkunci oleh grid besar [P2] (5 mnt)
Prasyarat: Laporan Lahan, Lembaga dimuat.
Langkah:
1. Pilih latar **satelit**, lalu set Grid **6×6** (latar terkunci "none" untuk grid > 30 sel).
2. Sheet per **Kelompok Tani** › Excel.
Harapan:
- Sheet KT (≤ 30 sheet) **ber-latar satelit**; ikhtisar di sheet Lahan juga ber-latar.
- Mode Blok dengan > 30 sheet: toast "Latar peta tidak dipasang …", poligon tetap tergambar.

### TC-371-06 · Peta Lahan: modal Excel hanya bila filter 1 Lembaga [P1] (5 mnt)
Prasyarat: izin Export `map-parcel`.
Langkah:
1. Filter Kampar + Lembaga **ISH-1401-01** → Muat Data → Area Lahan › Excel.
2. Modal: **Sheet per Kelompok Tani**, Urutan **Abjad** → Unduh Excel.
3. Kosongkan Lembaga → Muat Data → Area Lahan › Excel.
Harapan:
- Langkah 1: modal **Unduh Excel — Area Lahan Petani** (Sheet × Urutan).
- Langkah 2: berkas `_per_KT`, sheet **Semua** + satu per KT; baris urut Lembaga → KT → nama.
- Langkah 3: **tanpa modal**, langsung 1 sheet.

### TC-371-07 · Detail Lembaga › Unduh Lahan › Lahan (Excel) [P1] (4 mnt)
Prasyarat: izin Export `master-data-groups`.
Langkah:
1. Detail Lembaga **ISH-1401-01** › tab Lahan › **Unduh Lahan** › **Lahan (Excel)**.
2. Pilih Sheet per Blok + Posisi → Unduh Excel.
Harapan:
- Modal selalu muncul (cakupan pasti satu Lembaga).
- Berkas: sheet Semua + per Blok, kolom sama dengan Excel Area Lahan Peta Lahan (Jumlah Node → Koordinat); sheet 1 F berurutan sama dengan TC-371-02.
- Tanpa izin Export menu Lembaga Petani, tombol Unduh Lahan tidak tampil.

## #372 — Sebaran Lahan: warna per Kelompok Tani / Blok

### TC-372-01 · Tombol Kelompok Tani · Blok di Detail Lembaga [P1] (4 mnt)
Prasyarat: Detail Lembaga **ISH-1401-01** › tab Lahan.
Langkah:
1. Klik **Blok** di atas legenda peta Sebaran Lahan; perbesar peta.
2. Hilangkan centang satu Blok, lalu **Zoom ke tercentang**.
3. Klik **Kelompok Tani** lagi.
Harapan:
- Judul legenda "LEGENDA — BLOK", 30 Blok + Tanpa Blok urut natural, daftar bisa digulir.
- Poligon berwarna per Blok; **nama Blok tertulis di atas lahan Blok itu sendiri** (bukan di area kosong/Blok lain).
- Blok yang tak dicentang hilang dari peta beserta labelnya; zoom mengikuti yang tercentang.
- Kembali ke KT: semua grup tercentang lagi (checklist direset).

### TC-372-02 · Mode KT: "Tidak Ada" = Tanpa Kelompok Tani; Detail Petani tanpa tombol [P2] (3 mnt)
Prasyarat: seperti TC-372-01.
Langkah:
1. Lihat legenda mode Kelompok Tani.
2. Buka Detail Petani mana pun › tab Lahan.
Harapan:
- Legenda: Deli makmur, KUD Terbit Sentosa Makmur, **Tanpa Kelompok Tani** (abu, 326) — tidak ada baris "Tidak Ada".
- Detail Petani: tidak ada tombol Kelompok Tani · Blok.
- Catatan: tabel **Struktur Kelembagaan** di tab Ringkasan masih menampilkan "Tidak Ada" sebagai KT — **diketahui**, bukan bagian rilis ini.

## #373 — UL Parcel Code boleh di >1 lahan

### TC-373-01 · Constraint baru terpasang di lingkungan uji [P0] (2 mnt)
Prasyarat: akses baca DB lingkungan yang diuji.
Langkah:
1. `SELECT indexname FROM pg_indexes WHERE tablename='tbl_land_parcel_external_id' ORDER BY 1;`
Harapan:
- Ada `…_parcel_uid_source_code_key` dan `…_source_code_idx`; **tidak ada** `…_source_code_key`.
- **Tidak ada → Fail, hentikan rilis:** aplikasi baru memakai `parcelUid_source_code` dan akan galat saat menambah/mengubah UL Parcel Code.

### TC-373-02 · "Juga dipakai": tautan hanya dalam scope [P0] [regresi] (8 mnt)
Prasyarat: satu UL Parcel Code aktif di **dua lahan dari Lembaga berbeda** (di prod ada 82 kode ganda; cari dengan `SELECT source, code FROM tbl_land_parcel_external_id WHERE is_active GROUP BY 1,2 HAVING count(*) > 1`); akun A = SUPERADMIN, akun B = user BY_FARMER_GROUP yang hanya memegang Lembaga lahan pertama.
Langkah:
1. Akun A: Detail Lahan pertama › tab Legalitas.
2. Akun B: halaman yang sama.
Harapan:
- A: tanda amber **"Juga dipakai [ID lahan kedua] — cek silang"**, ID bisa diklik → detail lahan kedua terbuka.
- B: ID lahan kedua **tampil sebagai teks biasa (tak bisa diklik)** — tidak ada tautan ke lahan di luar scope, tidak ada 404.

### TC-373-03 · Tambah kode manual: tolak ganda di lahan sendiri, terima di lahan lain [P1] (5 mnt)
Prasyarat: izin Create/Edit legalitas lahan; kode `QA-KODE-1` (pemeta Meridia) sudah ada di lahan X.
Langkah:
1. Lahan X › Legalitas › tambah UL Parcel Code `QA-KODE-1` Meridia lagi.
2. Lahan Y › tambah `QA-KODE-1` Meridia.
Harapan:
- Langkah 1: ditolak "Lahan ini sudah punya kode ini untuk pemeta yang sama".
- Langkah 2: tersimpan; kedua lahan menampilkan "Juga dipakai …" satu sama lain.
- Bersihkan: nonaktifkan kode uji di kedua lahan.

### TC-373-04 · Import Detail Lahan: kode sama di >1 lahan tidak ditolak [P1] (6 mnt)
Prasyarat: izin Bulk Upload lahan; berkas uji Detail Lahan dengan dua baris lahan berbeda ber-UL Parcel Code sama.
Langkah:
1. Bulk Upload › Upload Data Lahan › tab Detail Lahan › unggah → validasi → simpan.
Harapan:
- Validasi **tidak** menolak kode ganda.
- Toast ringkasan memuat "(n juga dipakai lahan lain — cek silang)".
- Unggah ulang berkas yang sama: kode "tanpa perubahan", tidak ada record ganda.

## #374 — KT "Tidak Ada" = kosong

### TC-374-01 · Data bersih di lingkungan uji [P0] (2 mnt)
Prasyarat: akses baca DB lingkungan yang diuji.
Langkah:
1. `SELECT count(*) FROM tbl_land_parcel WHERE trim(sub_group_lv2) ILIKE 'tidak ada';`
Harapan:
- **0**. Bila > 0, pembersihan data (#374) belum dijalankan di lingkungan ini — catat, jangan Fail-kan fitur lain.
Baseline dev: mis-dev 417 → 0 (2026-09-23).

### TC-374-02 · Detail Lembaga: KT tanpa "Tidak Ada" [P1] (3 mnt)
Prasyarat: TC-374-01 = 0; Detail Lembaga **ISH-1401-01**.
Langkah:
1. Lihat kartu **Kelompok Tani** dan tabel **Struktur Kelembagaan** (tab Ringkasan).
Harapan:
- Kartu = **2**; tabel: Deli makmur, KUD Terbit Sentosa Makmur, **(tidak diketahui)** (326 lahan); tidak ada baris "Tidak Ada".

### TC-374-03 · Input "Tidak Ada" disimpan kosong [P1] [regresi] (5 mnt)
Prasyarat: izin Edit Lahan.
Langkah:
1. Edit satu lahan uji: isi Kelompok Tani `Tidak Ada`, simpan.
2. Import Detail Lahan satu baris dengan Nama Kelompok Tani `-` untuk lahan ber-KT kosong.
Harapan:
- Langkah 1: KT lahan tersimpan **kosong** (detail lahan menampilkan KT belum diisi).
- Langkah 2: pratinjau tidak menandai KT akan diisi; KT lahan tetap kosong.
- Kembalikan KT lahan uji ke nilai semula.

## #375 — Nama berkas unduhan legenda

### TC-375-01 · Nama berkas tanpa "lahan" berulang [P2] (4 mnt)
Prasyarat: Peta Lahan, Lembaga **ISH-1401-01** dimuat.
Langkah:
1. Unduh Excel dari baris Point Lembaga, Point Lahan, Area Lahan (1 sheet), Patok; lalu Unduh Lahan › GeoJSON.
Harapan:
- `lembaga_ish-1401-01_…`, `titik-lahan_ish-1401-01_…`, `lahan_ish-1401-01_…`, `patok_ish-1401-01_…`; tak ada `lahan-lahan_` atau `patok-lahan_`.
- Unduh Lahan GeoJSON tetap `lahan_ish-1401-01_<tanggal-jam>.geojson`.
