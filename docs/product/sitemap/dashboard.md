# Peta Fitur — Dashboard

> Bagian dari dokumentasi **Produk** · Peta fitur untuk Miro. Indeks: [README.md](README.md) · Legenda: [legend.md](legend.md) · Sumber: [../pages/dashboard/README.md](../pages/dashboard/README.md)

> **Ringkasan:** Menu pembuka aplikasi (order 0): ringkasan angka program untuk dibaca, tanpa tombol ubah data. Enam sub menu (+ Fire Alert sebagai level 3 di bawah Risk Management), enam halaman: dua membaca **snapshot** dari menu Tools (Main Dashboard, BMP Dashboard), tiga membaca DB langsung (Dashboard Pelatihan, Monev BMP, Fire Alert + NASA FIRMS), dan satu prototipe berbasis tabel CSV (Dashboard Rantai Pasok 🟠).

## Pohon navigasi

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  db(["Dashboard"]):::menu
  db_sub_main[["Main Dashboard"]]:::sub
  db_sub_training[["Dashboard Pelatihan"]]:::sub
  db_sub_bmp[["BMP Dashboard (Produksi)"]]:::sub
  db_sub_monev[["Monev BMP"]]:::sub
  db_sub_risk[["Risk Management"]]:::sub
  db_sub_fire[["Fire Alert"]]:::sub
  db_sub_supply[["Dashboard Rantai Pasok 🟠"]]:::sub
  db_main["Main Dashboard"]:::page
  db_training["Dashboard Pelatihan"]:::page
  db_bmp["BMP Dashboard (Produksi)"]:::page
  db_monev["Dashboard Monev BMP"]:::page
  db_fire["Fire Alert"]:::page
  db_supply["Dashboard Rantai Pasok 🟠"]:::page

  db --> db_sub_main --> db_main
  db --> db_sub_training --> db_training
  db --> db_sub_bmp --> db_bmp
  db --> db_sub_monev --> db_monev
  db --> db_sub_risk --> db_sub_fire --> db_fire
  db --> db_sub_supply --> db_supply
  db_monev -.->|Tautan BMP Dashboard| db_bmp

  class db_sub_supply proto
  class db_supply proto

  classDef menu fill:#166534,stroke:#14532d,color:#ffffff,font-weight:bold
  classDef sub fill:#dcfce7,stroke:#166534,color:#14532d
  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef proto stroke-dasharray:5 5
```

| Halaman | Route | Katalog |
|---|---|---|
| Main Dashboard | `/admin/dashboard/main` | [main.md](../pages/dashboard/main.md) |
| Dashboard Pelatihan | `/admin/dashboard/training` | [training.md](../pages/dashboard/training.md) |
| BMP Dashboard (Produksi) | `/admin/dashboard/bmp` | [bmp.md](../pages/dashboard/bmp.md) |
| Dashboard Monev BMP | `/admin/dashboard/bmp-monev` | [bmp-monev.md](../pages/dashboard/bmp-monev.md) |
| Fire Alert | `/admin/dashboard/risk/fire` | [risk/fire.md](../pages/dashboard/risk/fire.md) |
| Dashboard Rantai Pasok 🟠 | `/admin/dashboard/supply-chain` | [supply-chain.md](../pages/dashboard/supply-chain.md) |

Halaman induk `/admin/dashboard` (dan `/admin`) tidak punya isi; ia mengalihkan ke sub menu pertama yang boleh diakses (bawaan Main Dashboard). Grup **Risk Management** hanya wadah level 3 — tidak punya halaman sendiri. **Metrik Rilis** (`/admin/dashboard/metrics`) bukan bagian menu ini: di sidebar ia ada di grup Platform Developer.

## Main Dashboard

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  db_main["Main Dashboard"]:::page

  db_main_hdr("Header"):::section
  db_main_hdr_c["Judul: Main Dashboard<br/>Tombol: Panduan (?) → Bantuan<br/>Teks: Nilai di bawah di-generate pada {tanggal snapshot}"]:::content

  db_main_flt("Filter"):::section
  db_main_flt_c["Filter: Distrik (Semua Distrik) · Lembaga Petani (Semua Lembaga Petani) · Tahun Bergabung (Semua Tahun)<br/>Pesan: Distrik tidak ditemukan. · Kelompok tani tidak ditemukan."]:::content

  db_main_kpi("Kartu tematik (5)"):::section
  db_main_kpi_c["KPI: Kelembagaan — Lembaga Petani ↗ · Kelompok Tani ↗<br/>KPI: Sertifikasi & assurance — RSPO ↗ · ISPO ↗ · Assurance SAP/MAP ↗ ({n} lembaga · {n} plan)<br/>KPI: Petani — total + bar Laki-laki / Perempuan (jumlah · %)<br/>KPI: Lahan — Persil lahan · Total luas (ha)<br/>KPI: Pelatihan — Paket 1 BMP/NKT/RSPO · Paket 2 MK · Paket 2 HSE · Paket 3 & 4 GEDSI/BUSDEV ({n} petani · {p}%)"]:::content

  db_main_dlg{{"Dialog: Rincian kartu"}}:::dialog
  db_main_dlg_c["Judul: judul kartu + deskripsi angka<br/>Teks: chip ringkasan (angka sama dengan kartu)<br/>Filter: cari nama lembaga, kode, atau distrik (bila daftar > 8)<br/>Kolom: Nama · Kode · Distrik — baris = tautan Detail Lembaga Petani (tab baru)<br/>Teks: seksi Tersertifikasi / Ter-assurance · Plan (+ badge tahun) — kartu sertifikasi<br/>Teks: jumlah KT per lembaga + baris Total — kartu Kelompok Tani<br/>Teks: Nilai di-generate pada {timestamp snapshot}<br/>Pesan: Tidak ada data pada filter ini."]:::content

  db_main_map("Panel peta: Peta sebaran Lembaga Petani"):::section
  db_main_map_c["Layer: cluster (klik → zoom ke anggota) · titik Lembaga (hijau, oranye bila terpilih) · label nama<br/>Tombol: Cari Lembaga Petani (cari & terbang ke titik) · Lihat Semua<br/>Tombol: basemap STREET · LIGHT · DARK · SAT · HYBRID (bawaan STREET)<br/>Pesan: Tidak ada data lokasi yang tersedia untuk ditampilkan di peta"]:::content

  db_main_info("Kartu: Panel info Lembaga"):::section
  db_main_info_c["Judul: nama Lembaga + kode · badge RSPO / ISPO / SAP-MAP<br/>KPI: Total Petani · Laki-laki / Perempuan · Total Persil · Luas Lahan (ha)<br/>KPI: Cakupan pelatihan — Paket 1 - BMP · Paket 2 - MK · Paket 2 - HSE · Paket 3 & 4 ({peserta}/{total petani})<br/>Pesan: Pilih Lembaga Petani — klik marker di peta untuk melihat detail"]:::content

  db_main_empty("Empty state halaman"):::section
  db_main_empty_c["Pesan: Belum ada snapshot — buat snapshot terlebih dahulu melalui menu Tools<br/>Tombol: Ke Dashboard Snapshot"]:::content

  tl_snap_db[("Snapshot tersimpan (JSON)")]:::data
  tl_snap_list["Daftar Snapshot"]:::page
  md_groups_detail["Detail Lembaga Petani"]:::page

  db_main --> db_main_hdr --> db_main_hdr_c
  db_main --> db_main_flt --> db_main_flt_c
  db_main --> db_main_kpi --> db_main_kpi_c
  db_main_kpi -.->|Klik baris ↗| db_main_dlg --> db_main_dlg_c
  db_main_dlg -.->|Baris lembaga| md_groups_detail
  db_main --> db_main_map --> db_main_map_c
  db_main_map -.->|Klik titik| db_main_info --> db_main_info_c
  db_main --> db_main_empty --> db_main_empty_c
  db_main_empty -.->|Ke Dashboard Snapshot| tl_snap_list
  tl_snap_db -.->|snapshot terbaru| db_main

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

Kartu Petani, Lahan, dan Pelatihan tidak punya dialog rincian; kartu sertifikasi tidak ikut filter Tahun. Semua filter diiris di browser dari satu snapshot.

## Dashboard Pelatihan — bagian 1/2

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  db_training["Dashboard Pelatihan"]:::page

  db_training_hdr("Header"):::section
  db_training_hdr_c["Judul: Dashboard Pelatihan<br/>Tombol: Panduan (?) → Bantuan<br/>Teks: Cakupan & efektivitas program pelatihan petani — data per {tanggal generate}"]:::content

  db_training_flt("Filter (tersimpan di URL)"):::section
  db_training_flt_c["Filter: Distrik (Semua Distrik) · Lembaga Petani (Semua Lembaga Petani) · Tahun (Semua Tahun)<br/>Teks: ganti Distrik mereset Lembaga · bisa di-bookmark/dibagikan"]:::content

  db_training_kpi("Kartu KPI (4)"):::section
  db_training_kpi_c["KPI: Petani Terlatih ({persen} dari total petani terdaftar)<br/>KPI: Total Sesi<br/>KPI: Partisipasi Perempuan (% dari kehadiran)<br/>KPI: Petani Lulus Post-Test (post-test ≥ 60, % dari petani terlatih)"]:::content

  db_training_benefit("Kartu lipat: Training Benefit per year"):::section
  db_training_benefit_c["Tab: Capaian — Tabel · Grafis · vs Kontrak (bawaan Tabel)<br/>Tombol: ⓘ Cara menghitung · Excel<br/>Kolom (Tabel): Package (P1 · P2 Group Dynamic · P2 HSE · P3) + Petani pernah mengikuti pelatihan (minimal 1) × tahun ≤ t−2 · t−1 · t (Actual · Kumulative)<br/>Grafik (Grafis): bar bertumpuk per paket — segmen ≤ t−2 · t−1 · t, trek = total petani terdaftar<br/>Grafik (vs Kontrak): 5 trayektori target kumulatif vs realisasi · label tertinggal N / di atas target / ≈ sesuai target<br/>Teks: filter Tahun diabaikan · target dari Master Data › Target Program<br/>Ekspor: Excel 3 sheet — Capaian · Kontrak · Detail (per petani, tanpa nama/NIK)"]:::content

  db_training_district("Kartu lipat: Capaian Paket per Distrik"):::section
  db_training_district_c["Kolom: Total (Riau) · per distrik (header memuat total petani)<br/>Baris: Paket 1 · Paket 2 - MK · Paket 2 - HSE · Paket 3 & 4 · Pernah Ikut Pelatihan<br/>Teks: sel = % + stacked bar Sudah (hijau) / Belum (abu) · 3 segmen saat filter Tahun (Dilatih {tahun} · Tahun lain · Belum pernah)<br/>Teks: tooltip per sel — jumlah · persen · dari {n} petani terdaftar<br/>Teks: disembunyikan saat filter Lembaga aktif<br/>Pesan: Tidak ada distrik pada filter ini."]:::content

  db_training_xlsx[("training-benefit-per-year.xlsx")]:::data
  md_programtarget["Target Program"]:::page

  db_training --> db_training_hdr --> db_training_hdr_c
  db_training --> db_training_flt --> db_training_flt_c
  db_training --> db_training_kpi --> db_training_kpi_c
  db_training --> db_training_benefit --> db_training_benefit_c
  db_training_benefit ==>|Excel| db_training_xlsx
  md_programtarget -.->|target kontrak| db_training_benefit
  db_training --> db_training_district --> db_training_district_c

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

## Dashboard Pelatihan — bagian 2/2

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  db_training["Dashboard Pelatihan"]:::page

  db_training_matrix("Kartu lipat: Capaian Paket per Lembaga (matriks heatmap)"):::section
  db_training_matrix_c["Kolom: Lembaga Petani (kode · distrik) · Petani · Paket 1 · Paket 2 - MK · Paket 2 - HSE · Paket 3 & 4 · Lainnya · Pernah Ikut Pelatihan<br/>Teks: klik judul kolom = urutkan · sel = % + jumlah petani · heatmap 0% → 100%<br/>Teks: tooltip sel — Sudah ikut / Belum (atau Ikut {tahun} / Ikut tahun lain / Belum pernah) + Kurang {n} menuju target<br/>Teks: ringkasan terlipat — {n} Lembaga · {p}% petani terlatih · belum tersentuh · kurang menuju target<br/>Teks: legenda skala 0% · <25% · 25–49% · 50–74% · 75–99% · 100%<br/>Pesan: Tidak ada Lembaga Petani pada filter ini."]:::content

  db_training_dlg{{"Dialog: Petani belum mengikuti {paket}"}}:::dialog
  db_training_dlg_c["Judul: nama Lembaga — {paket} — {tahun / semua tahun}<br/>Kolom: ID Petani · Nama · L/P · Tahun Lain (saat filter Tahun, badge Dilatih {tahun})<br/>Filter: Hanya yang belum pernah sama sekali mengikuti paket ini<br/>Teks: {n} petani · {x} pernah dilatih di tahun lain<br/>Tombol: Salin · Excel (sheet Belum Dilatih)<br/>Pesan: Memuat daftar petani... · Semua petani terdaftar di Lembaga ini sudah mengikuti pelatihan tersebut."]:::content

  db_training_trend("Grafik: Tren Kehadiran Pelatihan — {label tahun}"):::section
  db_training_trend_c["Grafik: stacked bar kehadiran per tahun (Semua Tahun) atau per bulan (satu tahun), segmen per paket<br/>Teks: legenda Paket 1 · Paket 2 - MK · Paket 2 - HSE · Paket 3 & 4 · Lainnya<br/>Teks: tooltip — {n} sesi · {n} kehadiran · rincian per paket<br/>Pesan: Belum ada data pelatihan pada filter ini."]:::content

  db_training_eff("Panel: Efektivitas Pre / Post-Test"):::section
  db_training_eff_c["Grafik: bar Pre vs Post per paket + selisih +/−{n}<br/>Teks: {n} dari {n} kehadiran ber-skor · {n} turun · {n} tetap<br/>Teks: hanya peserta dengan skor pre dan post terisi<br/>Pesan: Belum ada peserta dengan skor pre & post terisi."]:::content

  db_training_pass("Panel: Kelulusan Post-Test per Paket"):::section
  db_training_pass_c["Grafik: stacked bar lulus (emerald) vs belum lulus (amber) per paket + % lulus<br/>Teks: {n} lulus · {n} belum lulus · dari {n} petani ber-skor (petani unik, lulus bila post-test ≥ 60)<br/>Pesan: Belum ada peserta dengan skor pre & post terisi."]:::content

  db_training_quality("Panel: Kualitas Data"):::section
  db_training_quality_c["KPI: Sesi tanpa bukti · Sesi tanpa lokasi · Sesi tanpa peserta ({persen} dari {total sesi}, amber bila > 0)<br/>KPI: Peserta tanpa skor lengkap ({persen} dari {total kehadiran})<br/>Tombol: Buka Master Data Pelatihan untuk melengkapi →"]:::content

  db_training_dlg_xlsx[("petani-{paket}-{lembaga}.xlsx")]:::data
  md_training_list["Pelatihan (daftar)"]:::page

  db_training --> db_training_matrix --> db_training_matrix_c
  db_training_matrix -.->|Klik sel belum capai target| db_training_dlg --> db_training_dlg_c
  db_training_dlg ==>|Excel| db_training_dlg_xlsx
  db_training --> db_training_trend --> db_training_trend_c
  db_training --> db_training_eff --> db_training_eff_c
  db_training --> db_training_pass --> db_training_pass_c
  db_training --> db_training_quality --> db_training_quality_c
  db_training_quality -.->|Buka Master Data Pelatihan| md_training_list

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

Dashboard Pelatihan membaca DB langsung (bukan snapshot); hanya daftar petani di dialog yang di-query saat dialog dibuka. Tombol Excel dan Salin hanya tampil bagi pengguna berizin EXPORT.

## BMP Dashboard (Produksi)

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  db_bmp["BMP Dashboard (Produksi)"]:::page

  db_bmp_hdr("Header"):::section
  db_bmp_hdr_c["Judul: BMP Dashboard (Produksi)<br/>Tombol: Panduan (?) → Bantuan<br/>Teks: Nilai di bawah di-generate pada {tanggal snapshot}"]:::content

  db_bmp_flt("Filter"):::section
  db_bmp_flt_c["Filter: Kategori Lembaga (Semua Kategori · Ex-Plasma · Swadaya) · Distrik · Lembaga Petani · Tahun (bawaan tahun berjalan, Rataan di paling bawah)<br/>Tombol: Excel (produktivitas per umur tanaman, mengabaikan filter)"]:::content

  db_bmp_kpi("Kartu KPI (4)"):::section
  db_bmp_kpi_c["KPI: Produktivitas ({n} Ton/Ha/tahun — produksi disetahunkan ÷ luas terdata)<br/>KPI: Total Produksi ({n} Ton · {persen} dari total luas)<br/>KPI: Luasan ({terdata} Ha · {persen} dari total luas)<br/>KPI: Petani Terdata ({persen} dari total petani)<br/>Teks: label tahun — rata-rata per tahun / tahun {YYYY}"]:::content

  db_bmp_trend("Grafik: Tren Produksi & Cakupan Data Bulanan — {tahun}"):::section
  db_bmp_trend_c["Grafik: batang Produksi (Ton) 12 bulan + garis Cakupan data (% lahan terdata)<br/>Teks: tooltip — Produksi: {n} Ton · Lahan terdata: {n} ({p}%)<br/>Teks: legenda Produksi (Ton) · Cakupan data (% lahan terdata)<br/>Pesan: Belum ada data produksi."]:::content

  db_bmp_rank("Grafik: Produktivitas per Lembaga — Top 10"):::section
  db_bmp_rank_c["Grafik: bar horizontal Ton/Ha/tahun per lembaga, maks 10, warna Ex-Plasma / Swadaya<br/>Teks: legenda kategori · catatan rumus disetahunkan<br/>Pesan: Belum ada lembaga dengan luas terdata."]:::content

  db_bmp_cat("Kartu: Ex-Plasma vs Swadaya — {label tahun}"):::section
  db_bmp_cat_c["KPI: Total Produksi (Ton) · Produktivitas (Ton/Ha/tahun) · Luas Terdata (Ha) — dua nilai Ex-Plasma / Swadaya<br/>Kolom: Produktivitas per Distrik (Ton/Ha/tahun) — distrik × Ex-Plasma · Swadaya + mini bar<br/>Kolom: Produktivitas per Umur Tanaman — <3 thn (TBM) · 3–8 thn (TM muda) · 9–15 thn (TM prima) · 16–25 thn (TM tua) · >25 thn (renta) · Tanpa thn tanam<br/>Teks: — = belum ada lahan terdata · mengikuti filter aktif kecuali Kategori<br/>Pesan: Snapshot ini belum memuat data umur tanaman — generate ulang snapshot BMP"]:::content

  db_bmp_empty("Empty state halaman"):::section
  db_bmp_empty_c["Pesan: Belum ada snapshot — buat snapshot terlebih dahulu melalui menu Tools<br/>Tombol: Ke Dashboard Snapshot BMP"]:::content

  db_bmp_xlsx[("produktivitas-umur-tanaman-bmp-{tanggal}.xlsx (Produktivitas · Luas terdata · Keterangan)")]:::data
  tl_snapbmp_db[("Snapshot BMP tersimpan (JSON)")]:::data
  tl_snapbmp_list["Daftar Snapshot BMP"]:::page

  db_bmp --> db_bmp_hdr --> db_bmp_hdr_c
  db_bmp --> db_bmp_flt --> db_bmp_flt_c
  db_bmp_flt ==>|Excel| db_bmp_xlsx
  db_bmp --> db_bmp_kpi --> db_bmp_kpi_c
  db_bmp --> db_bmp_trend --> db_bmp_trend_c
  db_bmp --> db_bmp_rank --> db_bmp_rank_c
  db_bmp --> db_bmp_cat --> db_bmp_cat_c
  db_bmp --> db_bmp_empty --> db_bmp_empty_c
  db_bmp_empty -.->|Ke Dashboard Snapshot BMP| tl_snapbmp_list
  tl_snapbmp_db -.->|snapshot terbaru| db_bmp

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

Tidak ada dialog di halaman ini. Semua filter diiris di browser dari satu snapshot BMP; tombol Excel hanya tampil bagi pengguna berizin EXPORT.

## Dashboard Monev BMP

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  db_monev["Dashboard Monev BMP"]:::page

  db_monev_hdr("Header + Filter (tersimpan di URL)"):::section
  db_monev_hdr_c["Judul: Dashboard Monev BMP<br/>Tombol: Panduan (?) → Bantuan · tautan BMP Dashboard (Produksi)<br/>Teks: deskripsi + tanggal data<br/>Filter: Distrik · Lembaga Petani (menyempit ikut Distrik) · Tahun survei (Survei {tahun}, bawaan tahun terbaru ber-data)"]:::content

  db_monev_s1("Seksi 1 · Gambaran umum"):::section
  db_monev_s1_c["KPI: Petani Dinilai (dari petani terdaftar) · Rerata Skor (0–3) · Menerapkan BMP (Perintis + Praktisi + Teladan) · Lembaga Tercakup<br/>Grafik: Sebaran Kategori Petani — 4 ubin (jumlah + %, tooltip arti kategori) + batang 100% terendah → tertinggi"]:::content

  db_monev_s2("Seksi 2 · Lembaga Petani"):::section
  db_monev_s2_c["Kolom (Papan Lembaga Petani): peringkat · nama (klik = filter Lembaga) · batang komposisi · rerata + badge · cakupan<br/>Filter: urut Rerata / Cakupan / Abjad · legenda kategori · tombol Semua Lembaga<br/>Grafik (Profil Kelembagaan): heatmap Lembaga × indikator level LEMBAGA (14, chip 0–3) + kolom Rerata + baris rerata · ★ = ikut skor petani · urut Rerata / Abjad"]:::content

  db_monev_s3("Seksi 3 · Kegiatan & indikator"):::section
  db_monev_s3_c["Grafik (Profil 5 Kegiatan BMP): radar skala 0–3 berpita 4 kategori — seri A vs B<br/>Filter: selektor A & B — Semua / Distrik / Lembaga (lepas dari filter halaman, B = filter aktif)<br/>Kolom: Kegiatan · Bobot · A · B · Selisih<br/>Grafik (Indikator Terlemah): 5 indikator berbobot rerata terendah (n dinilai · n tak dinilai)<br/>Teks: seksi tampil hanya bila ada rincian skor kegiatan atau profil Lembaga tahun itu"]:::content

  db_monev_s4("Seksi 4 · Tindak lanjut & tren"):::section
  db_monev_s4_c["Kolom (Petani Prioritas Pendampingan): 10 terendah + kegiatan terlemah — tautan detail penilaian<br/>Kolom (Petani Teladan): 10 tertinggi + kegiatan terkuat — tautan detail penilaian<br/>Grafik: Sebaran Skor Petani (histogram 0,25 + garis rerata) · Tren Kategori per Tahun Survei (stacked bar)<br/>Kolom (Rekap per Lembaga Petani {tahun}): per Lembaga ber-data + {n} belum dinilai<br/>Tombol: Lipat / Buka · Tampilkan {n} belum dinilai / Sembunyikan yang belum dinilai · Unduh Excel"]:::content

  db_monev_empty("Empty state halaman"):::section
  db_monev_empty_c["Pesan: Belum ada penilaian Monev BMP<br/>Tombol: tautan Master Data › Monev BMP"]:::content

  db_monev_xlsx[("monev-bmp-per-lembaga-{tahun}.xlsx (sheet Per Lembaga)")]:::data
  md_bmpmonev_detail["Detail Penilaian"]:::page
  md_bmpmonev_list["Monev BMP (daftar)"]:::page
  db_bmp["BMP Dashboard (Produksi)"]:::page

  db_monev --> db_monev_hdr --> db_monev_hdr_c
  db_monev_hdr -.->|Tautan BMP Dashboard| db_bmp
  db_monev --> db_monev_s1 --> db_monev_s1_c
  db_monev --> db_monev_s2 --> db_monev_s2_c
  db_monev --> db_monev_s3 --> db_monev_s3_c
  db_monev --> db_monev_s4 --> db_monev_s4_c
  db_monev_s4 -.->|Baris petani| md_bmpmonev_detail
  db_monev_s4 ==>|Unduh Excel| db_monev_xlsx
  db_monev --> db_monev_empty --> db_monev_empty_c
  db_monev_empty -.->|Master Data › Monev BMP| md_bmpmonev_list

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

Realtime (bukan snapshot). Daftar Petani Prioritas / Teladan dimuat terpisah saat seksi tampil (nama petani tidak ikut payload utama). Seksi 4 bernomor 3 bila Seksi 3 tidak tampil.

## Fire Alert

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  db_fire["Fire Alert"]:::page

  db_fire_map("Panel peta (¾ lebar, full-bleed)"):::section
  db_fire_map_c["Layer: batas administrasi kabupaten (garis putus abu + label) · boundary lembaga (poligon ungu + label, terpilih = pekat) · titik api dalam boundary (ikon api) · titik api luar (lingkaran, warna = confidence)<br/>Teks: popup Titik Api — nama lembaga / Di luar boundary lembaga · waktu WIB · confidence · satelit · FRP (bisa digeser)<br/>Teks: popup boundary — nama · distrik · jumlah titik<br/>Teks: legenda kiri-bawah (confidence, dalam/luar, boundary, batas kabupaten)<br/>Tombol: ⛶ Zoom ke satu Riau · basemap StreetMap · Light · Dark · Satellite · Hybrid · GIBS<br/>Teks: chip Citra GIBS: {tanggal} · VIIRS NOAA-20, 250 m"]:::content

  db_fire_range("Panel kanan: Rentang waktu"):::section
  db_fire_range_c["Filter: 24 jam · 5 · 10 · 30 hari terakhir (bawaan 5)<br/>Filter: Bulan tertentu (laporan bulanan) → Select Bulan + Tahun (Jan 2020 … bulan berjalan)<br/>Teks: cakupan parsial (bulan berjalan) · sumber FIRMS arsip SP / NRT · tanggal belum tersedia (amber)"]:::content

  db_fire_kpi("Panel kanan: Kartu ringkasan (4, ber-tooltip)"):::section
  db_fire_kpi_c["KPI: Dalam Boundary (tooltip per distrik program)<br/>KPI: Lembaga Terdampak (tooltip daftar lembaga ber-titik api)<br/>KPI: Luar Boundary (tooltip per kabupaten program + Kab. Lainnya)<br/>KPI: Total se-Riau (tooltip per kabupaten program + Kab. Lainnya)"]:::content

  db_fire_conf("Panel kanan: Keyakinan deteksi (dalam boundary)"):::section
  db_fire_conf_c["Kolom: tingkat keyakinan · jumlah · bar porsi (nilai 0 diredupkan)<br/>Teks: baris Total dalam boundary"]:::content

  db_fire_tbl("Panel kanan: Tabel Titik api per lembaga — {periode}"):::section
  db_fire_tbl_c["Kolom: Lembaga · jumlah titik (hanya lembaga ber-titik)<br/>Aksi: klik baris = zoom + highlight boundary · klik ulang = batal<br/>Pesan: Tidak ada boundary lembaga dalam cakupan akses Anda. · Tidak ada titik api dalam boundary lembaga pada rentang ini."]:::content

  db_fire_print("Panel kanan: Print Map"):::section
  db_fire_print_c["Filter: scope Full Riau / per Distrik<br/>Tombol: Cetak Peta (PDF) · Cetak Laporan Bulanan (PDF) — mode bulan · Batalkan<br/>Teks: progres Peta lembaga n dari N…"]:::content

  db_fire_pdf[("laporan-titik-api-{scope}-{YYYY-MM}.pdf — Laporan Titik Api (Hotspot) A4: kartu · peta · tabel per titik · lampiran per lembaga · tren harian & rekap (bulanan)")]:::data
  db_fire_boundary[("Boundary Lembaga (ICS, buffer 1,5 km) & batas administrasi BIG")]:::data
  db_fire_firms[/"NASA FIRMS VIIRS (via proxy same-origin)"/]:::external
  db_fire_gibs[/"NASA GIBS — citra satelit harian"/]:::external

  db_fire --> db_fire_map --> db_fire_map_c
  db_fire --> db_fire_range --> db_fire_range_c
  db_fire --> db_fire_kpi --> db_fire_kpi_c
  db_fire --> db_fire_conf --> db_fire_conf_c
  db_fire --> db_fire_tbl --> db_fire_tbl_c
  db_fire_tbl -.->|Klik baris| db_fire_map
  db_fire --> db_fire_print --> db_fire_print_c
  db_fire_print ==>|Cetak PDF| db_fire_pdf
  db_fire_boundary -.->|poligon| db_fire_map
  db_fire_firms -.->|titik api per rentang / bulan| db_fire_range
  db_fire_gibs -.->|basemap GIBS| db_fire_map

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

Tidak ada dialog; rincian kartu berupa tooltip. Titik api tidak disimpan di DB — diambil langsung dari NASA FIRMS tiap kali rentang berubah; deteksi dalam/luar boundary dihitung di browser (point-in-polygon). Seksi Print Map hanya tampil bagi pengguna berizin PRINT.

## Dashboard Rantai Pasok 🟠

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  db_supply["Dashboard Rantai Pasok 🟠"]:::page

  db_supply_hdr("Header"):::section
  db_supply_hdr_c["Judul: Dashboard Rantai Pasok · badge Prototipe<br/>Tombol: Panduan (?) → Bantuan · Unduh Excel · Lihat di Peta (membawa filter)"]:::content

  db_supply_flt("Bar filter (bersama Peta, tersimpan di URL)"):::section
  db_supply_flt_c["Filter (Lingkup): Distrik · Kategori (Swadaya / Ex-Plasma) · UL & Non-UL · Tahun<br/>Filter (Rantai): Lembaga › Agen·KT/Koperasi › RAMP › Mill (faset)<br/>Tombol: ↺ Reset<br/>Teks: chip filter aktif (✕ per chip)"]:::content

  db_supply_kpi("Kartu KPI (4)"):::section
  db_supply_kpi_c["KPI: TBS · Ke Mill Pemasok UL · Sampai PKS Pasti (% disebut langsung) · Offtaker"]:::content

  db_supply_insight("Kartu lipat: Sorotan"):::section
  db_supply_insight_c["KPI: Konsentrasi ke Mill · Ketergantungan offtaker (≥ 80% ke satu pembeli luar) · Mill belum pasti (Lembaga ≥ 50% tak pasti) · Jarak garis lurus<br/>Aksi: nama = tombol filter · +N lagi = buka kartu Volume per Lembaga + tampilkan semua"]:::content

  db_supply_path("Kartu lipat: Jalur TBS & Kepastian Mill"):::section
  db_supply_path_c["Grafik: batang 100% Jalur (= legenda warna) · batang 100% Kepastian Mill (disebut · dipetakan · belum pasti · tak diketahui)<br/>Aksi: klik segmen = filter"]:::content

  db_supply_flow("Kartu lipat: Aliran TBS"):::section
  db_supply_flow_c["Tab: Sankey · Diagram Alur (garis beranimasi) · Jalur (baris per jalur) · Tabel Pohon · Sunburst · Partisi · Treemap · Matriks (Asal × Tujuan) · Chord · Batang<br/>Filter (toolbar): Arah Hulu→Hilir / Hilir→Hulu (semua tab kecuali Chord) · Dari Distrik / Lembaga · Ke UL/Non-UL / Mill · Offtaker Per jenis / Satu per satu (+ N teratas) / Sembunyikan (pita dilebur) · Angka Ton / %<br/>Tombol: Tampilan bawaan · Reset (strip chip filter di kartu)<br/>Teks: Menampilkan … · Ke Mill UL selalu teratas<br/>Aksi: hover/klik = sorot jalur penuh · klik node / irisan / ikon corong = filter (toast) atau turun ke rincian"]:::content

  db_supply_mill("Kartu lipat: Volume per Mill"):::section
  db_supply_mill_c["Kolom: Mill · Tonase · Jarak (rata-rata garis lurus, tertimbang tonase) · ikon peta per baris<br/>Aksi: urut kolom · baris Mill terfilter disorot · top 10 + tampilkan semua"]:::content

  db_supply_group("Kartu lipat: Volume per Lembaga"):::section
  db_supply_group_c["Kolom: Lembaga · Tonase (porsi UL) · % ke UL · % PKS pasti (amber bila ≤ 50%) · Offtaker utama + % (⚠ pembeli luar) · Mill utama + % · Jarak<br/>Aksi: klik baris = filter · ikon peta · urut, lipat & tampilkan-semua dikendalikan Sorotan"]:::content

  db_supply_note("Banner: Catatan data (bisa dilipat)"):::section
  db_supply_note_c["Teks: keterbatasan data prototipe (survei rantai pasok 2025)"]:::content

  db_supply_xlsx[("rantai-pasok.xlsx (Jalur · Mill · Lembaga, filter aktif)")]:::data
  db_supply_csv[/"Tabel CSV survei rantai pasok 2025 (S3 privat prototype/supply-chain)"/]:::external
  mp_supply["Peta Rantai Pasok 🟠"]:::page

  db_supply --> db_supply_hdr --> db_supply_hdr_c
  db_supply_hdr ==>|Unduh Excel| db_supply_xlsx
  db_supply_hdr -.->|Lihat di Peta| mp_supply
  db_supply --> db_supply_flt --> db_supply_flt_c
  db_supply --> db_supply_kpi --> db_supply_kpi_c
  db_supply --> db_supply_insight --> db_supply_insight_c
  db_supply_insight -.->|+N lagi| db_supply_group
  db_supply --> db_supply_path --> db_supply_path_c
  db_supply --> db_supply_flow --> db_supply_flow_c
  db_supply --> db_supply_mill --> db_supply_mill_c
  db_supply --> db_supply_group --> db_supply_group_c
  db_supply --> db_supply_note --> db_supply_note_c
  db_supply_csv -.->|dibaca| db_supply

  class db_supply proto
  class mp_supply proto

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  classDef proto stroke-dasharray:5 5
```

Prototipe #379: datanya **bukan dari DB**, melainkan tabel CSV hasil konversi form survei 2025 yang dibaca dari S3 privat. Posisi lipat kartu dan tab terakhir diingat per browser (bukan URL); filter dibagi dengan Peta Rantai Pasok lewat URL. Tidak ada dialog.

## Alur lintas menu

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  tl_snap_list["Daftar Snapshot"]:::page
  tl_snapbmp_list["Daftar Snapshot BMP"]:::page
  tl_snap_db[("Snapshot tersimpan (JSON)")]:::data
  tl_snapbmp_db[("Snapshot BMP tersimpan (JSON)")]:::data
  db_main["Main Dashboard"]:::page
  db_bmp["BMP Dashboard (Produksi)"]:::page
  db_training["Dashboard Pelatihan"]:::page
  db_monev["Dashboard Monev BMP"]:::page
  db_fire["Fire Alert"]:::page
  db_supply["Dashboard Rantai Pasok 🟠"]:::page
  md_groups_detail["Detail Lembaga Petani"]:::page
  md_training_list["Pelatihan (daftar)"]:::page
  md_programtarget["Target Program"]:::page
  md_bmpmonev_detail["Detail Penilaian"]:::page
  md_bmpmonev_list["Monev BMP (daftar)"]:::page
  mp_supply["Peta Rantai Pasok 🟠"]:::page
  db_fire_firms[/"NASA FIRMS"/]:::external
  db_supply_csv[/"Tabel CSV survei rantai pasok (S3)"/]:::external

  tl_snap_list ==>|Generate| tl_snap_db -.->|dibaca| db_main
  tl_snapbmp_list ==>|Generate| tl_snapbmp_db -.->|dibaca| db_bmp
  db_main -.->|Ke Dashboard Snapshot| tl_snap_list
  db_bmp -.->|Ke Dashboard Snapshot BMP| tl_snapbmp_list
  db_main -.->|Dialog rincian → baris lembaga| md_groups_detail
  db_training -.->|Buka Master Data Pelatihan| md_training_list
  md_programtarget -.->|target kontrak| db_training
  db_monev -.->|Tautan BMP Dashboard| db_bmp
  db_monev -.->|Petani Prioritas / Teladan| md_bmpmonev_detail
  db_monev -.->|Empty state| md_bmpmonev_list
  db_fire_firms -.->|titik api| db_fire
  db_supply -.->|Lihat di Peta| mp_supply
  db_supply_csv -.->|dibaca| db_supply

  class db_supply proto
  class mp_supply proto

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  classDef proto stroke-dasharray:5 5
```

Main Dashboard dan BMP Dashboard hanya berubah setelah snapshot baru dibuat di menu Tools (lihat [tools.md](tools.md)). Dashboard Pelatihan, Monev BMP, dan Fire Alert membaca data terkini — isi Master Data (Pelatihan, Monev BMP, Target Program) langsung tercermin. Setiap halaman punya tombol Panduan (?) ke tutorial Bantuan.

## Urutan demo yang disarankan

1. Masuk → otomatis mendarat di Main Dashboard; tunjukkan catatan tanggal snapshot dan 5 kartu tematik.
2. Klik baris Lembaga Petani ↗ → dialog rincian; cari satu lembaga, buka Detail Lembaga Petani di tab baru.
3. Pakai filter Distrik → kartu dan peta menyempit; klik marker di peta → panel info Lembaga.
4. Buka Dashboard Pelatihan: 4 KPI, Training Benefit (Tabel → Grafis → vs Kontrak), lalu klik sel merah di matriks Capaian Paket per Lembaga → dialog petani belum dilatih → Excel.
5. Buka BMP Dashboard (Produksi): ganti Tahun ke Rataan, lihat tren bulanan, Top 10, dan Ex-Plasma vs Swadaya per umur tanaman; tutup dengan tombol Excel.
6. Buka Monev BMP: Sebaran Kategori, Papan Lembaga (klik nama = filter), radar A vs B, Petani Prioritas → Detail Penilaian.
7. Buka Risk Management › Fire Alert: ganti rentang 5 hari → 30 hari → Bulan tertentu; klik baris lembaga di tabel → peta zoom; Cetak Laporan Bulanan (PDF).
8. Tutup dengan Dashboard Rantai Pasok 🟠: filter Distrik, tab Sankey → Diagram Alur, lalu Lihat di Peta untuk menyambung ke menu Map.
