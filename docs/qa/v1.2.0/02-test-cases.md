# 02 · Kasus uji per issue — v1.2.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

Satu **blok** per kasus. Ditulis dev saat menutup issue; dijalankan QA di staging; hasil di `runs/`. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

Format: `### TC-<issue>-<nn> · <judul> [P0] [regresi] (<menit> mnt)` lalu `Prasyarat:` · `Langkah:` (bernomor) · `Harapan:` (bullet) · opsional `Baseline dev:`.

> Versi diasumsikan **v1.2.0** (MINOR — menu baru). Folder dosir lain (`00-scope`, `01-smoke`, …) dibuat saat rilis dari `_template/`.

## #317 — Tumpang Tindih Lahan (Fase 2, tab Tumpang Tindih)

Prasyarat rilis (bukan kasus uji, cek sebelum run): kode rilis **sudah ter-deploy sebelum** seed menu — ikon `Layers` baru di `ICON_MAP`; seed hanya menu `data-analyst-parcel-overlap` + 8 izin (lihat `docs/project/changelog/2026-09.md` Decision Log 2026-09-24 soal drift judul 2 menu Ketersediaan Data).

### TC-317-01 · Menu & izin per peran [P0] [regresi] (5 mnt)
Prasyarat: akun SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT, DONOR di lingkungan uji.
Langkah:
1. `SELECT role, string_agg(permission::text, ',') FROM rbac_role_permission WHERE menu_key='data-analyst-parcel-overlap' AND is_active GROUP BY 1 ORDER BY 1;`
2. Tiap akun: buka sidebar Data Analyst.
3. Akun DONOR: buka langsung `/admin/data-analyst/parcel-overlap`.
Harapan:
- Langkah 1: SUPERADMIN/ADMIN/MANAGEMENT/OPERATOR masing-masing `VIEW,EXPORT`; **tidak ada** DONOR.
- Empat peran pertama melihat **Tumpang Tindih Lahan** (ikon lapisan) di bawah Data Analyst; halaman terbuka tanpa 404/jendela galat.
- DONOR: menu tidak tampil; URL langsung dialihkan (tanpa data).

### TC-317-02 · Angka halaman = SQL mandiri [P1] (5 mnt)
Prasyarat: akses baca DB; akun SUPERADMIN.
Langkah:
1. Buka halaman tanpa filter (Tumpang tindih `Semua`, chip `Semua`).
2. Jalankan hitungan mandiri (kueri di `docs/product/pages/data-analyst/parcel-overlap.md` §Aturan perhitungan: self-join `ST_Intersects AND NOT ST_Touches`, lahan/petani/Lembaga aktif, buang irisan < 100 m² **dan** < 1% lahan terkecil).
Harapan:
- "N pasangan" dan chip Duplikat/Tercakup/Sebagian sama persis dengan hitungan SQL.
Baseline dev: `mis-dev` (snapshot prod) 2026-09-24 — **136** · Duplikat 24 · Tercakup 45 · Sebagian 67 (petani sama 60 · satu Lembaga 16 · lintas 60).

### TC-317-03 · Filter tersimpan di URL & bawaan [P1] (5 mnt)
Langkah:
1. Buka halaman tanpa query string.
2. Pilih Tumpang tindih `> 50%`, Jenis `Lintas Lembaga`, Lembaga `ISH-1408-04`, klik chip `Tercakup`.
3. Salin URL, buka di tab baru.
4. Klik chip `Semua`.
Harapan:
- Langkah 1: Tumpang tindih `Semua`, chip `Semua` aktif (bawaan).
- Langkah 3: tab baru menampilkan filter & daftar yang sama (`?persen=50&jenis=CROSS_GROUP&lembaga=…&label=CONTAINED`).
- Langkah 4: `label` hilang dari URL; chip label lain tampil penuh (tidak pudar).
- Angka pada chip tidak berubah saat salah satu chip aktif (dihitung dari filter lain).

### TC-317-04 · Split view: navigasi, sortir, basemap [P0] [regresi] (8 mnt)
Langkah:
1. Buka halaman — panel kanan langsung berisi peta pasangan pertama (tidak kosong).
2. Klik judul kolom **Label**, lalu klik lagi.
3. Klik judul kolom **Lahan A**.
4. Pilih basemap `SAT`, klik **Berikutnya ›** tiga kali.
5. Klik baris **ke-25** (terakhir di halaman 1 tabel), tekan ↓ dua kali, lalu ↑ dua kali.
6. Klik di area kosong di luar tabel, tekan ↓.
7. Klik peta, tekan ↓.
Harapan:
- Langkah 2–3: **halaman tidak crash** ("Terjadi Kesalahan" = Fail — bug loop render yang ditemukan saat wrap-up); Label naik = Duplikat → Tercakup → Sebagian, turun diawali Sebagian; setelah sortir tabel kembali ke halaman 1.
- Langkah 4: peta tetap tampil selama memuat (berlapis spinner), basemap tetap `SAT`; penghitung "n / N" naik satu per klik.
- Langkah 5: pasangan & sorotan baris berpindah satu per tekan (25 → 26 → 27 → 26 → 25); tabel pindah ke halaman 2 lalu kembali ke halaman 1; **fokus tetap di baris terpilih** sehingga ↓ kedua dan ↑ tetap bekerja (dulu fokus jatuh ke halaman di batas 25 baris dan panah mulai menggulir — temuan wrap-up 2026-09-29).
- Langkah 6: halaman **menggulir**, pasangan tidak berpindah.
- Langkah 7: peta bergeser, pasangan tidak berpindah.

### TC-317-05 · Scope: minimal satu sisi, sisi lawan lengkap [P0] [regresi] (8 mnt)
Prasyarat: akun B = user BY_FARMER_GROUP yang hanya memegang **ISH-1408-04 (ASERMISAS)**; akun A = SUPERADMIN.
Langkah:
1. Akun A: filter Lembaga ISH-1408-04 → catat jumlah pasangan.
2. Akun B: buka halaman tanpa filter.
3. Akun B: pilih pasangan Lintas Lembaga (mis. lahan `MIS.*` vs `DYN.*`/`SSB.*`), lihat kartu A & B.
Harapan:
- Jumlah di akun B = jumlah akun A langkah 1 (semua pasangan yang **salah satu** sisinya ASERMISAS; tidak ada pasangan tanpa sisi ASERMISAS).
- Kartu sisi lain Lembaga menampilkan nama & kode petani, Lembaga, poligon lengkap, dengan teks **"Di luar akses Anda — Detail Lahan tidak bisa dibuka"** (tanpa tautan). Sisi ASERMISAS punya tautan **Buka Detail Lahan** (tab baru).
Baseline dev: ISH-1408-04 = **60** pasangan (59 dengan sisi lawan di luar Lembaga).

### TC-317-06 · Ekspor Excel & Spasial [P1] (8 mnt)
Prasyarat: akun dengan izin Export; filter Lembaga ISH-1408-04.
Langkah:
1. Klik **Excel**; buka berkasnya.
2. **Spasial ▾ → Shapefile (ZIP)**; buka di QGIS.
3. Akun tanpa izin Export (bila ada override): buka halaman.
Harapan:
- Nama berkas `tumpang-tindih-lahan_asermisas_<YYYYMMDD-HHmm>.xlsx` / `.zip` (tanpa filter apa pun: `…_semua_…`).
- Excel: sheet "Tumpang Tindih", baris = jumlah pasangan, 20 kolom (Label, Jenis, %, Luas Irisan, lalu 8 kolom per sisi A/B) tanpa kolom kosong total (Kelompok Tani boleh kosong mengikuti data).
- SHP: satu layer `irisan` Polygon WGS84, atribut `label, jenis, pct_min, irisan_ha, lahan_a, petani_a, lembaga_a, pct_a, lahan_b, petani_b, lembaga_b, pct_b`; poligon jatuh tepat di irisan lahan. Jumlah fitur ≥ jumlah pasangan (irisan MultiPolygon dipecah).
- Langkah 3: tombol Excel & Spasial tidak tampil.
Baseline dev: ISH-1408-04 → 60 baris Excel, 61 fitur SHP.

### TC-317-07 · Regresi DataTable di halaman lain [P1] [regresi] (4 mnt)
Langkah:
1. Settings › Users: urutkan kolom, pindah ke halaman 2, urutkan lagi; klik tombol aksi di satu baris.
2. Master Data › Lembaga Petani: urutkan kolom, cari, pindah halaman.
Harapan:
- Tidak ada crash; sortir mengembalikan ke halaman 1; tombol aksi bekerja seperti biasa; baris **tidak** bisa difokus/dipilih (perilaku lama — hanya tabel ber-`onRowClick` yang berubah).

## #378 — Sprint Mingguan (menu Data Analyst)

Prasyarat rilis (bukan kasus uji, cek sebelum run): kode rilis **sudah ter-deploy sebelum** seed menu — ikon `CalendarRange` baru di `ICON_MAP`; seed `node scripts/seed/seed-menu-key.mjs data-analyst-sprint` (menu + 3 izin VIEW dari CSV).

### TC-378-01 · Menu & izin per peran [P0] [regresi] (4 mnt)
Prasyarat: akun SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT, DONOR.
Langkah:
1. `SELECT role, string_agg(permission::text, ',') FROM rbac_role_permission WHERE menu_key='data-analyst-sprint' AND is_active GROUP BY 1 ORDER BY 1;`
2. Tiap akun: buka sidebar Data Analyst.
3. Akun OPERATOR dan DONOR: buka langsung `/admin/data-analyst/sprint`.
Harapan:
- Langkah 1: ADMIN, MANAGEMENT, SUPERADMIN masing-masing `VIEW`; tidak ada OPERATOR/DONOR.
- SUPERADMIN/ADMIN/MANAGEMENT melihat **Sprint Mingguan** (ikon kalender rentang) di bawah Data Analyst; halaman terbuka tanpa 404/jendela galat.
- Langkah 3: dialihkan, tanpa isi rencana.

### TC-378-02 · Tab Sprint: pemilih minggu, keputusan, backlog [P1] (5 mnt)
Langkah:
1. Buka halaman tanpa query string.
2. Pilih tombol minggu lain, lalu **Backlog**; salin URL, buka di tab baru.
3. Kembali ke sprint aktif; klik satu baris butir; klik tautan **#… ↗** di ujung baris.
Harapan:
- Langkah 1: tab **Sprint** aktif, minggu terpilih = sprint yang memuat tanggal hari ini (WIB) bertanda "Minggu ini", ringkasan "hari ke-n dari 7" + bilah progres poin.
- Butir ⚖️ hanya tampil di kotak kuning **Butuh keputusan owner**, tidak diulang di kelompok Dikerjakan / Belum dimulai / Selesai / Digeser.
- Langkah 2: `?sprint=<n>` / `?sprint=backlog` di URL; tab baru menampilkan pilihan yang sama; Backlog = daftar bernomor.
- Langkah 3: baris membuka Target & Keputusan; tautan membuka issue GitHub di tab baru (baris tidak ikut terbuka/tertutup).
- Isi cocok dengan `docs/project/sprint.md` §Sprint Focus di commit yang ter-deploy.

### TC-378-03 · Tab Analisa: kartu, beban per status, keputusan [P1] (6 mnt)
Langkah:
1. Buka tab **Analisa** (`?tab=analisa`).
2. Arahkan kursor, lalu Tab keyboard, ke setiap kolom grafik **Beban & kemajuan per sprint**.
3. Bandingkan dengan `sprint.md`: jumlahkan poin (S=1, M=3, L=5) tiap sprint, termasuk butir ⏭️ digeser.
Harapan:
- 4 kartu: **Rencana** (poin tanpa butir digeser · n sprint · tanggal akhir), **Tertahan keputusan owner** (poin + % rencana + rincian `n terlambat · n minggu ini · n mendatang`; rincian bernilai 0 **tidak** ditulis), **Velocity rata-rata** ("—" + progres sprint berjalan bila belum ada sprint selesai), **Carry-over**.
- Tinggi kolom = angka di atasnya = total langkah 3; **puncak kolom sejajar garis sumbu Y** (kolom setinggi nilai sumbu teratas menyentuh garis teratas — dulu menyusut ±10%). Label sumbu Y memakai koma desimal bila pecahan ("12,5").
- Isi kolom bertumpuk per status (Selesai · Dikerjakan · Menunggu keputusan · Belum dimulai · Digeser putus-putus) sesuai legenda; tooltip muncul saat hover **dan** fokus keyboard.
- **Keputusan menunggu owner** dikelompokkan Terlambat / Minggu ini / Sprint mendatang; butir dari sprint yang sudah lewat tetap tampil di Terlambat.
Baseline dev: 2026-09-29 (lokal) — 6 sprint, Rencana 84 poin, Tertahan 24 poin "29% rencana · 4 minggu ini · 6 mendatang", kolom 18/13/17/14/11/11.

### TC-378-04 · Format `sprint.md` rusak = build gagal [P2] (5 mnt, lokal dev)
Langkah:
1. Lokal: di `docs/project/sprint.md` ubah satu status menjadi teks tak dikenal (mis. `❓ Entah`), jalankan `npx vitest run src/test/sprint-plan.test.ts`; kembalikan.
2. Tambahkan `<details><summary>x</summary>y</details>` satu baris di bawah tabel Sprint 1; jalankan test yang sama; buka halaman di `npm run dev`; kembalikan.
Harapan:
- Langkah 1: test gagal dengan pesan `sprint.md: status tak dikenal …` (build akan gagal dengan pesan sama — bukan salah render diam-diam).
- Langkah 2: test lulus; semua sprint & Backlog tetap tampil (blok satu baris tidak menelan sprint berikutnya).

## #263 (revisi 2026-09-29) — Izin DONOR mengikuti produksi

### TC-263-01 · DONOR: master data baca-saja, report & menu tercabut [P0] [regresi] (6 mnt)
Prasyarat: akun DONOR (scope ALL) di lingkungan uji; DB ter-seed dari `role-permissions.csv` terbaru.
Langkah:
1. `SELECT menu_key, string_agg(permission::text, ',' ORDER BY permission) FROM rbac_role_permission WHERE role='DONOR' AND is_active GROUP BY 1 ORDER BY 1;`
2. Login DONOR: buka sidebar; buka Master Data › Lembaga Petani, Petani, Lahan, Pelatihan, Monev BMP, dan Dashboard › Risk Management.
3. Buka langsung `/admin/report/kelompok-tani`, `/admin/report/marker`.
Harapan:
- Langkah 1: master data (`master-data-groups/-farmers/-parcels/-training/-bmp-monev`) dan `dashboard-risk` = `PRINT,VIEW`; **tidak ada** `report-kelompok-tani`, `report-kelompok-tani-detail`, `report-marker`, maupun VIEW induk `dashboard`/`map`/`report`; tidak ada `CREATE/EDIT/DELETE/EXPORT` di mana pun.
- Langkah 2: menu induk tetap tampil karena anaknya; halaman master data terbuka **tanpa** tombol Tambah/Ubah/Hapus/Import/Export (daftar Petani menampilkan NIK — disengaja, keputusan owner).
- Langkah 3: dialihkan; menu Kelompok Tani & Patok tidak tampil di Report.

## #388 — Audit repo & restrukturisasi docs (pencatatan)

### TC-388-01 · Halaman indeks & Snapshot pasca-audit [P1] (3 mnt)
Langkah:
1. Akun SUPERADMIN: buka `/admin/data-analyst`, `/admin/settings`, `/admin/dashboard/risk` (juga dengan mengklik remah roti).
2. Buka Tools › Snapshot.
Harapan:
- Langkah 1: dialihkan berturut-turut ke Ketersediaan Data — Semua Lembaga, User Management, Fire Alert (bukan 404).
- Langkah 2: halaman tampil tanpa filter Distrik/Tahun; catatan "Snapshot dibuat untuk Semua Distrik & Semua Tahun"; tombol **Generate Snapshot** tampil untuk peran ber-CREATE.

## #364 — Label menu = prod; judul & urutan menu terkunci dari UI

### TC-364-01 · Label menu Ketersediaan Data [P0] [regresi] (3 mnt)
Langkah:
1. `SELECT key, title, "order" FROM tbl_menu_item WHERE key IN ('data-analyst-data-availability','data-analyst-data-completeness') ORDER BY 3;`
2. Akun ADMIN: buka sidebar **Data Analyst**, klik kedua menu itu.
Harapan:
- Langkah 1: `Data — All Lembaga` (order 2) · `Data — Per Lembaga` (order 3) — sama dengan `menu.csv`.
- Sidebar menampilkan label yang sama; judul halaman tetap **Ketersediaan Data — Semua Lembaga** / **Ketersediaan Data — Per Lembaga** (disengaja).
- `npx tsx scripts/qa/data-qc.ts` F3 ✓.

### TC-364-02 · Menu Management hanya Aktif & Visible [P0] [regresi] (4 mnt)
Prasyarat: akun SUPERADMIN.
Langkah:
1. Settings › Menu Management: perhatikan toolbar.
2. **Edit** menu `data-analyst-sprint`.
3. Matikan **Visible**, **Simpan**; buka sidebar Data Analyst; lalu Edit lagi, nyalakan **Visible**, **Simpan**.
Harapan:
- Langkah 1: tidak ada tombol **Tambah Menu**.
- Langkah 2: Key, Title, URL, Parent, Order, Icon tampil sebagai teks (tidak bisa diubah) + catatan "…hanya bisa diubah lewat `menu.csv` + seed…"; hanya saklar **Aktif** & **Visible** yang bisa diubah.
- Langkah 3: saat Visible mati, baris diberi badge **Tersembunyi** dan Sprint Mingguan hilang dari sidebar; setelah dinyalakan tampil kembali; judul/urutan/ikon di daftar tidak berubah; `modified_at` baris terbarui.
Baseline dev: lokal 2026-09-29 — lolos (SUPERADMIN; `is_visible` f → t, kolom struktur tetap).

### TC-364-03 · Saklar Aktif butuh izin Delete [P1] (4 mnt)
Prasyarat: akun uji dengan override `settings-menu` VIEW+EDIT tanpa DELETE.
Langkah:
1. Edit satu menu uji, matikan **Aktif**, **Simpan**.
2. Edit menu yang sama, matikan **Visible** saja, **Simpan**; lalu kembalikan.
Harapan:
- Langkah 1: toast "Tidak memiliki izin untuk menonaktifkan/mengaktifkan menu"; menu tetap aktif.
- Langkah 2: tersimpan (Visible cukup izin Edit).

## #237 — "Aktifkan kembali" Menu Management

### TC-237-01 · Nonaktifkan lalu aktifkan kembali menu [P0] [regresi] (3 mnt)
Prasyarat: akun SUPERADMIN; menu uji `data-analyst-sprint`.
Langkah:
1. Settings › Menu Management: cari `data-analyst-sprint`, klik ikon **Nonaktifkan**, konfirmasi.
2. Klik ikon **Aktifkan kembali** (panah melingkar) pada baris yang sama.
Harapan:
- Langkah 1: dialog "Nonaktifkan Menu"; setelah konfirmasi badge **Nonaktif**, menu hilang dari sidebar.
- Langkah 2: **tanpa** dialog Nonaktifkan; toast "Menu diaktifkan kembali"; badge **Aktif** tanpa **Tersembunyi**; Sprint Mingguan tampil lagi di sidebar (`is_active` & `is_visible` = true).

### TC-237-02 · Aktifkan kembali: induk nonaktif & peran tanpa Delete [P1] (5 mnt)
Prasyarat: akun SUPERADMIN; akun uji dengan override `settings-menu` VIEW+EDIT tanpa DELETE.
Langkah:
1. SUPERADMIN: Nonaktifkan `data-analyst-sprint`, lalu Nonaktifkan induknya `data-analyst`.
2. Klik **Aktifkan kembali** pada `data-analyst-sprint`.
3. Aktifkan kembali `data-analyst`, lalu `data-analyst-sprint`.
4. Akun uji tanpa DELETE: buka Menu Management.
Harapan:
- Langkah 2: toast `Induk menu "Data Analyst" masih nonaktif — aktifkan induknya dulu`; baris tetap **Nonaktif**.
- Langkah 3: keduanya **Aktif** & tampil di sidebar.
- Langkah 4: ikon Nonaktifkan / Aktifkan kembali tidak tampil (hanya Edit).

## #385 — Kunci berkas bukti pelatihan & path unggahan S3

### TC-385-01 · Unggah & ganti bukti pelatihan tetap berjalan [P0] [regresi] (4 mnt)
Prasyarat: akun ADMIN (scope distrik) dengan izin CREATE+EDIT Pelatihan; berkas PDF uji < 10 MB bernama dengan spasi/kurung, mis. `Bukti Pelatihan (1).pdf`.
Langkah:
1. Master Data › Pelatihan → **Tambah Pelatihan** dengan berkas Evidence; simpan.
2. Buka detailnya, klik tautan bukti.
3. **Edit** pelatihan yang sama, ganti Evidence dengan PDF lain; simpan; buka lagi tautan bukti.
4. Data Analyst › Data — Per Lembaga: pilih Lembaga ITM (pelatihan hasil import), lihat modul **Aktivitas ber-bukti**.
Harapan:
- Langkah 1–3: tersimpan tanpa galat; tautan membuka PDF yang benar (yang terbaru di langkah 3).
- Langkah 4: pelatihan import tanpa berkas (`evidence_key = ''`) **tidak** terhitung ber-bukti — sama dengan panel Kualitas Data di Dashboard Pelatihan.
- Nama berkas ber-en dash/kutip (mis. `Laporan – "GAP".pdf`) bisa diunggah; tautan membuka PDF.
- `SELECT evidence_key FROM tbl_training_activity WHERE id = '<id langkah 1>'` → `training/<id>/<timestamp>-bukti-pelatihan-1-.pdf`.

(Jalur serangan — kunci objek lain / `activityId` ber-`../` / pelatihan di luar scope — dikunci unit test `training-guard`, `upload-guard`, `training-evidence`; tidak diuji manual.)

