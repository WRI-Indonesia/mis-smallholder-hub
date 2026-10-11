# 02 · Kasus uji per issue — v1.7.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Satu **blok** per kasus. Ditulis dev saat menutup issue; dijalankan QA di staging; hasil di `runs/`. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

Format: `### TC-<issue>-<nn> · <judul> [P0] [regresi] (<menit> mnt)` lalu `Prasyarat:` · `Langkah:` (bernomor) · `Harapan:` (bullet) · opsional `Baseline dev:`.

## #386 — Anti-eskalasi Settings › Users & Role & Permission

### TC-386-01 · Akun sendiri terkunci di User Management [P0] [regresi] (3 mnt)
Prasyarat: login SUPERADMIN.
Langkah:
1. Settings › User Management → cari akun sendiri.
2. Klik **Edit** pada akun sendiri.
Harapan:
- Baris akun sendiri hanya punya **Edit** (tanpa Nonaktifkan, Akses Data, Hak Akses Menu); baris akun lain lengkap.
- Di form Edit, Role tampil sebagai teks terkunci; ubah nama lalu **Simpan** berhasil dan role tidak berubah.

### TC-386-02 · Pengelola ber-scope & Role & Permission [P1] (4 mnt)
Prasyarat: akun non-SUPERADMIN yang diberi izin Settings › Users / Role & Permission lewat override (opsional; bila tidak ada, cukup diwakili test `user-escalation-guard.test.ts`).
Langkah:
1. Akun ber-scope distrik membuka Settings › User Management.
2. Akun ADMIN tanpa batasan wilayah mencoba mengubah satu sel di Role & Permission.
Harapan:
- Langkah 1: halaman gagal memuat daftar dengan pesan "Pengelolaan pengguna hanya untuk akun tanpa batasan wilayah".
- Langkah 2: sel kembali seperti semula + pemberitahuan "Hanya SUPERADMIN yang dapat mengubah Role & Permission".

## #384 — Peta BMP: opsi filter menerima `map-bmp` tanpa `map-parcel`

### TC-384-01 · Pengguna hanya `map-bmp` bisa memuat filter Peta BMP [P1] (4 mnt)
Prasyarat: SUPERADMIN + satu akun uji non-SUPERADMIN (mis. `qa-operator`). Di Settings › User Management › Hak Akses Menu akun uji: **cabut** VIEW `Map › Peta Lahan` (override revoke), pastikan VIEW `Map › Peta BMP` tetap ada.
Langkah:
1. Login akun uji → Map › Peta BMP.
2. Pilih Provinsi, lalu Distrik, lalu Lembaga; tunggu peta memuat.
3. Buka Map › Peta Lahan lewat URL `/admin/map/parcel`.
4. Pulihkan override akun uji.
Harapan:
- Langkah 1–2: halaman terbuka, ketiga dropdown terisi tanpa toast "Tidak memiliki izin untuk mengakses data ini"; lahan tampil.
- Langkah 3: diarahkan keluar (tanpa izin `map-parcel`) — izin peta lahan tidak ikut terbuka.
Baseline dev: `map-guard.test.ts` — `requireFilterView` menolak bila keduanya tidak ada, menerima `map-bmp` saja, dan tidak mengecek `map-bmp` bila `map-parcel` ada.

## #387 — Temuan kecil audit test

### TC-387-01 · Pindah Lembaga pelatihan ditolak selama ada peserta [P1] (3 mnt)
Prasyarat: satu pelatihan dengan ≥1 peserta (kode Lembaga asal A, Lembaga tujuan B dalam scope).
Langkah:
1. Master Data › Pelatihan → Edit pelatihan itu → ganti Lembaga Petani ke B → Simpan.
2. Buka tab Peserta → hapus semua peserta → ulangi langkah 1.
Harapan:
- Langkah 1: ditolak dengan pesan pada kolom Lembaga "masih punya n peserta dari Lembaga asal…"; data tidak berubah.
- Langkah 2: berhasil; peserta baru hanya bisa dipilih dari anggota B.
Baseline dev: `training-guard.test.ts` (#387 butir 6); butir 1/3 (`menu-guard`, `user-menu-access-guard`) dan butir 7 (`land-parcel-guard`) hanya lewat test.

## #409 — Distrik tujuan Lembaga wajib dalam scope

Prasyarat umum: akun **ADMIN** yang dibatasi per distrik (UserDistrict/UserProvince) dan akun **ADMIN** yang dibatasi per Lembaga (UserFarmerGroup), keduanya ber-izin CREATE/EDIT Master Data › Lembaga Petani. Login akun dilakukan owner.

### TC-409-01 · ADMIN per distrik: buat & ubah Lembaga hanya di distrik scope [P0] [regresi] (4 mnt)
Langkah:
1. Master Data › Lembaga Petani → **Tambah Lembaga Petani**; buka dropdown Distrik.
2. Ubah satu Lembaga dalam scope; buka dropdown Distrik.
Harapan:
- Kedua dropdown hanya berisi distrik scope akun.
- Simpan dengan distrik scope berhasil; Lembaga tetap tampil di daftar.
- (Dev, tanpa UI) pemanggilan langsung dengan distrik di luar scope ditolak "Distrik tidak dalam akses Anda" — dijaga `farmer-group-guard.test.ts`.

### TC-409-02 · ADMIN per Lembaga: tanpa Tambah, Distrik terkunci [P1] (3 mnt)
Langkah:
1. Master Data › Lembaga Petani.
2. Klik pensil pada Lembaga milik akun.
Harapan:
- Tombol **Tambah Lembaga Petani** tidak tampil.
- Kolom Distrik di form ubah tampil sebagai teks terkunci (bukan dropdown); ubah nama lalu **Simpan** berhasil dan distrik tidak berubah.

## #416 — Ketersediaan Data › Produksi (menu induk + kalender cakupan)

### TC-416-01 · Menu tiga tingkat & kalender Distrik → Lembaga → petani → lahan [P0] [regresi] (5 mnt)
Prasyarat: seed menu sudah `--apply` di env ini; login SUPERADMIN.
Langkah:
1. Sidebar: Data Analyst → **Ketersediaan Data** ▾ → Semua Lembaga · Per Lembaga · **Produksi**; buka Semua Lembaga dan Per Lembaga (URL lama).
2. Buka **Produksi**: ganti Tahun ke tahun lalu, lalu kembali; klik ▸ satu Distrik → ▸ satu Lembaga → ▸ satu petani.
3. Arahkan kursor ke satu sel Lembaga berwarna; klik satu sel kg di baris lahan.
4. Klik **Tutup semua**, lalu **Buka Distrik**; ubah Urut, lalu klik **Reset**.
Harapan:
- Kedua halaman lama terbuka seperti biasa; judul menu Semua Lembaga / Per Lembaga.
- Kalender terisi; baris petani dan lahan dimuat (indikator "Memuat…" lalu baris muncul); sel kg membuka Master Data Produksi terfilter Lembaga + periode + petani dan daftar tidak kosong.
- Tooltip sel menampilkan lahan melapor / lahan non-PSR, record, Σ kg.
- Tutup semua melipat semua baris; Reset mengosongkan parameter URL dan mengembalikan tahun berjalan.

### TC-416-02 · Scope & izin [P0] [regresi] (4 mnt)
Prasyarat: akun OPERATOR ter-scope 1 Distrik; akun DONOR.
Langkah:
1. OPERATOR membuka Produksi; catat Distrik/Lembaga yang tampil; buka ▸ satu Lembaga.
2. OPERATOR membuka URL `/admin/data-analyst/availability/production?lembaga=<id Lembaga di luar scope>`.
3. DONOR mencari menu Ketersediaan Data di sidebar dan membuka URL Produksi langsung.
Harapan:
- Langkah 1: hanya Distrik/Lembaga dalam scope; baris petani termuat.
- Langkah 2: filter Lembaga diabaikan (tautan basi → bawaan), tidak ada data Lembaga lain.
- Langkah 3: menu tidak tampil; URL langsung ditolak (redirect/403).

### TC-416-03 · Ekspor Excel 2 sheet [P1] (3 mnt)
Prasyarat: login SUPERADMIN; filter Lembaga = satu Lembaga yang punya produksi tahun berjalan.
Langkah:
1. Klik **Excel**; buka berkas.
Harapan:
- Sheet 1 `Lembaga <tahun>`: kolom Distrik · Kategori · Lembaga Petani · Kode · … · 12 bulan · ringkasan; baris sesuai filter. Sejak review pra-rilis (owner 2026-10-12): tajuk `Record <tahun>` dst. = jumlah tahun itu saja (sama dengan Sheet 2), kolom bulan tanpa teks "n rec", kolom **Catatan** untuk Lembaga semua-PSR.
- Akun dengan VIEW tanpa EXPORT: tombol Excel tak tampil **dan** aksi Sheet 2 ditolak server ("Tidak memiliki izin untuk mengekspor …").
- Sheet 2 `Lahan <abrv>`: lahan × bulan (kg) + pemilik; tidak ada kolom kosong/meluber.
Baseline dev: `production-availability.test.ts` (17 test), review #416 10 temuan ✅ (`5da9581`).

## #417 — Ketersediaan Data › Semua Lembaga: tata letak ringkas & satu tempat

### TC-417-01 · Kerangka ringkas, filter aktif, bookmark lama [P0] [regresi] (5 mnt)
Prasyarat: seed menu #416 sudah `--apply`; login SUPERADMIN; layar ≥ 1.440 px.
Langkah:
1. Buka Data Analyst › Ketersediaan Data › Semua Lembaga tanpa parameter.
2. Klik segmen "perhatian" di bar sebaran, lalu chip **Urutkan** pada kartu Produksi.
3. Klik ✕ pada chip "Tingkat skor", lalu **Reset semua**.
4. Buka URL lama `?tampilan=inti&band=bad&urut=produksi`.
Harapan:
- Langkah 1: tab Semua Lembaga · Per Lembaga · Produksi di bawah judul; hero satu baris; radar 10 kartu + "Tampilkan 22 lagi"; Daftar Kerja tampak dalam ≤ 2 scroll; tanpa baris Filter aktif.
- Langkah 2: baris Filter aktif berisi chip "Tingkat skor: perhatian" dan "Urut: produksi ↑"; kartu Produksi bertuliskan **Terurut**.
- Langkah 3: chip hilang satu per satu; Reset mengembalikan URL bersih.
- Langkah 4: tampilan Heatmap, chip "kritis" & "produksi ↑" tampil.

### TC-417-02 · Toolbar matriks & tiga tampilan [P1] (4 mnt)
Prasyarat: login OPERATOR ter-scope 1 Distrik.
Langkah:
1. Gulir matriks radar ke bawah; amati toolbar.
2. Pindah ke Heatmap; periksa kolom domain.
3. Pindah ke Cakupan modul; klik judul satu modul; ketik nama Lembaga di Cari.
Harapan:
- Toolbar (status · ⓘ · tab · Urut · arah · Cari) tetap terlihat saat digulir.
- Heatmap: kelima kolom domain terlihat tanpa scroll mendatar (≥ 1.024 px konten).
- Modul: URL memuat `urut=modul:<key>`; pencarian menyaring baris; hanya Lembaga dalam scope.

### TC-417-03 · Daftar Kerja bertab [P1] (3 mnt)
Prasyarat: login SUPERADMIN.
Langkah:
1. Di Daftar Kerja, buka tab Per entitas lalu Tertinggal per domain; muat ulang halaman.
2. Di tab Sistemik, buka tombol "n Lembaga ▾" satu baris dengan keyboard (Tab lalu Enter).
Harapan:
- Tab terakhir bertahan setelah muat ulang (`?kerja=`); badge jumlah di tiap tab.
- Popover daftar Lembaga terbuka; tiap nama tertaut ke Per Lembaga. Label memakai "Lahan", bukan "Persil".
Baseline dev: `availability-layout.test.ts` (7), `matrix-rows.test.ts` (12); tinggi halaman bawaan 1.680 px terukur lokal 2026-10-11.

## #419 — Template file di semua fitur Upload Massal

### TC-419-01 · Tujuh tombol template terunduh & isinya benar [P1] (4 mnt)
Prasyarat: login ADMIN/SUPERADMIN.
Langkah:
1. Bulk Upload › Petani, Produksi, Lahan (tab Poligon · Detail · Patok), Pohon → klik setiap tombol **Unduh Template**.
2. Buka tiap berkas: Excel → sheet `Data` + `Petunjuk`; ZIP → berkas rata di akar + `BACA-SAYA.txt`.
Harapan:
- Petani: 8 tajuk (ID Petani … Tahun Bergabung) + 2 contoh `CTH.*`, kolom NIK berformat teks; tombol aktif walau Lembaga belum dipilih.
- Produksi: tajuk `ID Petani · Periode · Tanggal Panen · Panen Ke- · Hasil Panen (kg) · ID Lahan · Catatan`.
- Poligon: `template_poligon_lahan.{shp,shx,dbf,prj,cpg}` 1 poligon fiktif; Pohon: `template_pohon_sawit.*` 2 titik; atribut ≤ 10 karakter.

### TC-419-02 · Template diunggah ulang apa adanya → terpetakan otomatis [P0] [regresi] (4 mnt)
Langkah:
1. Unggah kembali template Produksi tanpa diubah (juga satu berkas bertajuk template lama `Periode (YYYY-MM)` dkk., bila ada) → lihat Petakan Atribut Kolom.
2. Unggah template Petani (pilih Lembaga dulu), Poligon ZIP, dan Pohon ZIP tanpa diubah → Validasi.
Harapan:
- Semua kolom wajib sudah terpetakan otomatis (tanpa pilih manual); validasi menolak baris contoh karena ID fiktif **tidak terdaftar**, bukan karena kolom/atribut tidak dikenali.
- Pohon: pratinjau "Lahan tidak ditemukan" untuk `CTH.0001.A…`; Poligon: peta pratinjau menampilkan persegi contoh di Riau.
- Petani (review #419): baris contoh `CTH.*` berstatus **Error** "ID contoh dari template (CTH.…) — hapus baris contoh sebelum mengunggah" — tidak bisa tersimpan (klien & server).
Baseline dev: `bulk-upload-templates.test.ts` (11: tajuk = alias parser, tajuk lama Produksi, workbook Data+Petunjuk, ZIP dibaca shpjs).

## #420 — Tata letak berkelompok (pemetaan kolom, Dashboard Main, form Lahan)

### TC-420-01 · Pemetaan kolom berkelompok di 5 halaman Upload Massal [P0] [regresi] (5 mnt)
Langkah:
1. Lahan › Detail Lahan: unggah berkas Detail Lahan nyata (atau template) → lihat langkah 2.
2. Ulangi di Poligon (ZIP), Patok (Excel), Petani (pilih Lembaga), Produksi.
3. Di Detail Lahan, buka grup yang tertutup, petakan 1 kolom manual, lalu Validasi.
Harapan:
- Detail Lahan: 5 grup (Identitas · Legalitas · Kelompok & Blok · Sepadan · NKT); header "n/m"; grup tanpa kolom terdeteksi tertutup "tak ada di berkas"; Bawaan NKT di ujung grup NKT. Poligon 4 grup, Patok 3 grup; Petani & Produksi satu daftar ringkas.
- Di samping tiap pilihan tampil contoh nilai baris pertama; field wajib kosong bertanda "Wajib dipetakan".
- Hasil validasi sama dengan sebelum perubahan (pemetaan otomatis & aturan tidak berubah); memilih "-- Kosongkan --" benar-benar mengosongkan (dulu tersimpan `_empty`).

### TC-420-02 · Dashboard Main 5 kartu tematik [P1] (3 mnt)
Langkah: buka Main Dashboard → ganti filter Distrik/Tahun → klik baris Lembaga Petani, Kelompok Tani, dan satu sertifikasi.
Harapan: kartu Kelembagaan · Sertifikasi & assurance · Petani (bar L/P) · Lahan · Pelatihan (4 bar % dari total petani), satu warna aksen; angka sama dengan dashboard sebelumnya; dialog rincian terbuka dari baris ↗. Tools › Snapshot Detail memakai kartu yang sama tanpa dialog.

### TC-420-03 · Form Tambah/Edit Lahan berseksi [P2] (2 mnt)
Langkah: Master Data › Lahan → Tambah Lahan (lalu Batal) dan Edit 1 lahan (simpan tanpa ubah).
Harapan: 4 seksi (Identitas · Kebun · Tanaman · Status & Catatan) berisi 12 field yang sama; simpan berhasil seperti sebelumnya.
Baseline dev: `upload-mapping-groups.test.ts` (7: tiap field tepat satu grup, format contoh, render statis); verifikasi browser lokal 2026-10-11 (Poligon template 14/14, Detail Lahan 5 grup, Dashboard, form Lahan).

