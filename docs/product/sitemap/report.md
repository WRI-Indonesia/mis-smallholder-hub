# Peta Fitur — Report

> Bagian dari dokumentasi **Produk** · Peta fitur untuk Miro. Indeks: [README.md](README.md) · Legenda: [legend.md](legend.md) · Sumber: [../pages/report/README.md](../pages/report/README.md)

> **Ringkasan:** Menu laporan siap cetak: pengguna memilih Distrik → Lembaga Petani (kadang periode), lalu mendapat kartu KPI, tabel pratinjau, dan berkas Excel/PDF — Laporan Lahan juga mencetak peta poligon ber-latar, Laporan Patok menghasilkan berkas spasial. Tujuh sub menu, tujuh halaman (satu halaman per sub menu, tanpa halaman detail).

## Pohon navigasi

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  rp(["Report"]):::menu
  rp_farmer[["Petani"]]:::sub
  rp_land[["Lahan"]]:::sub
  rp_training[["Pelatihan"]]:::sub
  rp_prod[["Produksi"]]:::sub
  rp_kt[["Kelompok Tani (Summary)"]]:::sub
  rp_ktd[["Kelompok Tani (Detail)"]]:::sub
  rp_marker[["Patok"]]:::sub
  rp_farmer_page["Laporan Petani"]:::page
  rp_land_page["Laporan Lahan"]:::page
  rp_training_page["Laporan Pelatihan"]:::page
  rp_prod_page["Laporan Produksi"]:::page
  rp_kt_page["Laporan Kelompok Tani (Ringkasan)"]:::page
  rp_ktd_page["Laporan Kelompok Tani (Detail)"]:::page
  rp_marker_page["Laporan Patok"]:::page

  rp --> rp_farmer --> rp_farmer_page
  rp --> rp_land --> rp_land_page
  rp --> rp_training --> rp_training_page
  rp --> rp_prod --> rp_prod_page
  rp --> rp_kt --> rp_kt_page
  rp --> rp_ktd --> rp_ktd_page
  rp --> rp_marker --> rp_marker_page

  classDef menu fill:#166534,stroke:#14532d,color:#ffffff,font-weight:bold
  classDef sub fill:#dcfce7,stroke:#166534,color:#14532d
  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
```

| Halaman | Route | Katalog |
|---|---|---|
| Laporan Petani | `/admin/report/farmer` | [farmer.md](../pages/report/farmer.md) |
| Laporan Lahan | `/admin/report/land-parcel` | [land-parcel.md](../pages/report/land-parcel.md) |
| Laporan Pelatihan | `/admin/report/training` | [training.md](../pages/report/training.md) |
| Laporan Produksi | `/admin/report/production` | [production.md](../pages/report/production.md) |
| Laporan Kelompok Tani (Ringkasan) | `/admin/report/kelompok-tani` | [kelompok-tani.md](../pages/report/kelompok-tani.md) |
| Laporan Kelompok Tani (Detail) | `/admin/report/kelompok-tani-detail` | [kelompok-tani-detail.md](../pages/report/kelompok-tani-detail.md) |
| Laporan Patok | `/admin/report/marker` | [marker.md](../pages/report/marker.md) |

Halaman induk `/admin/report` tidak punya isi; ia mengalihkan ke sub menu pertama (urut `order`) yang boleh diakses pengguna.

## Laporan Petani

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  rp_farmer_page["Laporan Petani"]:::page

  rp_farmer_hdr("Header"):::section
  rp_farmer_hdr_c["Judul: Laporan Petani<br/>Teks: Analisis ringkasan dan rincian data petani<br/>Tombol: Panduan (?) → Bantuan"]:::content

  rp_farmer_flt("Filter"):::section
  rp_farmer_flt_c["Filter: Distrik * · Lembaga Petani * (aktif setelah Distrik dipilih)<br/>Tombol: Tampilkan Laporan<br/>Pesan: Filter Wajib Belum Lengkap · Laporan berhasil dimuat"]:::content

  rp_farmer_kpi("Kartu KPI"):::section
  rp_farmer_kpi_c["KPI: Total Petani · Total Lahan (Persil) · Total Luas Lahan (Ha) · Rata-rata Luas (Ha / Petani)"]:::content

  rp_farmer_tbl("Tabel: Petani"):::section
  rp_farmer_tbl_c["Filter: Cari nama petani · paginasi 10/25/50/100<br/>Kolom: ID Petani · Nama Petani · L/P · NIK (disensor di layar) · Tahun Bergabung · Jumlah Lahan (Persil) · Total Luas (Ha)<br/>Ekspor: Excel · PDF (LAPORAN RINGKASAN DATA PETANI)"]:::content

  rp_farmer_xls[("Excel: Laporan_Petani_{Distrik}_{Lembaga}")]:::data
  rp_farmer_pdf[("PDF: Laporan Ringkasan Data Petani")]:::data

  rp_farmer_page --> rp_farmer_hdr --> rp_farmer_hdr_c
  rp_farmer_page --> rp_farmer_flt --> rp_farmer_flt_c
  rp_farmer_page --> rp_farmer_kpi --> rp_farmer_kpi_c
  rp_farmer_page --> rp_farmer_tbl --> rp_farmer_tbl_c
  rp_farmer_tbl ==>|Excel| rp_farmer_xls
  rp_farmer_tbl ==>|PDF| rp_farmer_pdf

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

## Laporan Lahan — bagian 1/2 (filter, KPI, peta cetak)

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  rp_land_page["Laporan Lahan"]:::page

  rp_land_hdr("Header"):::section
  rp_land_hdr_c["Judul: Laporan Lahan<br/>Teks: Roster lahan per Lembaga Petani (Lembaga, Petani, ID Petani, ID Lahan, Kelompok Tani)<br/>Tombol: Panduan (?) → Bantuan"]:::content

  rp_land_flt("Filter"):::section
  rp_land_flt_c["Filter: Distrik · Lembaga Petani (wajib — laporan dimuat setelah dipilih)<br/>Filter: Cakupan Pendataan (Semua lahan / Sudah didata) · Status Surat · Jenis Surat (multi) · Status STDB (+ per tahap)<br/>Filter: NKT · Patok · Selisih Luas (≥ 0,50 Ha)<br/>Tombol: ↺ Reset (muncul bila filter ≠ bawaan)<br/>Teks: catatan filter & semantik legalitas<br/>Pesan: Pilih Lembaga Petani untuk memuat laporan · Tidak Ada Data Lahan"]:::content

  rp_land_kpi("Kartu KPI"):::section
  rp_land_kpi_c["KPI: Total Petani · Kelompok Tani · Total Lahan · Total Luas (Ha)"]:::content

  rp_land_legal("Kartu: Ringkasan Legalitas"):::section
  rp_land_legal_c["KPI: Lahan (hasil filter) · Ada Surat (n + %) · Ada STDB (n + %)<br/>KPI: Selisih Luas ≥ 0,50 Ha · Termasuk/terdampak NKT · Ada Patok<br/>Teks: angka yang sama dipakai blok Ringkasan di PDF & sheet Ringkasan Excel"]:::content

  rp_land_map("Kartu: Peta Cetak — Latar, Grid & Label"):::section
  rp_land_map_c["Filter: Grid Index (Baris × Kolom, maks. 26 × 20)<br/>Layer: Latar Peta — Polos (bawaan) · StreetMap · Satellite · Hybrid (terkunci bila grid lebih dari 30 sel)<br/>Filter: Kepekatan Latar (slider 0–100%) · Label Poligon (No · Nama · ID Petani · ID Lahan · Kelompok Tani)<br/>Pesan: Menyiapkan latar peta… n/m halaman<br/>Layer: Preview peta SVG — ikhtisar grid + peta per sel · panah utara · skala batang · atribusi penyedia latar"]:::content

  rp_land_basemap[/"Proxy latar peta (tile raster StreetMap / Satellite / Hybrid)"/]:::external

  rp_land_page --> rp_land_hdr --> rp_land_hdr_c
  rp_land_page --> rp_land_flt --> rp_land_flt_c
  rp_land_page --> rp_land_kpi --> rp_land_kpi_c
  rp_land_page --> rp_land_legal --> rp_land_legal_c
  rp_land_page --> rp_land_map --> rp_land_map_c
  rp_land_basemap ==>|tile dijahit jadi latar| rp_land_map

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

## Laporan Lahan — bagian 2/2 (tabel, ekspor, Laporan NKT)

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  rp_land_page["Laporan Lahan"]:::page

  rp_land_tbl("Tabel: Lahan (1 baris = 1 lahan)"):::section
  rp_land_tbl_c["Filter: Urut No (Abjad pemilik / Posisi lahan) · Tampilkan Kolom (Pilih semua · Kosongkan · Bawaan)<br/>Kolom: No · Lembaga Petani · Nama Petani · ID Petani · ID Lahan · Kelompok Tani · Tahun Tanam · Luas (Ha)<br/>Kolom (opsional): Blok · Komoditas · Species · PSR · Surat Kepemilikan · Nama di Surat · Luas Tertera (Ha) · STDB<br/>Kolom (opsional): UL Parcel Code · Program · NKT · Luas NKT (Ha) · Patok<br/>Teks: baris Total luas · tanpa paginasi & pencarian"]:::content

  rp_land_exp("Toolbar ekspor"):::section
  rp_land_exp_c["Filter: Sheet per — Grid peta (bawaan) · Kelompok Tani · Blok (Excel saja)<br/>Ekspor: Excel (sheet Ringkasan + Lahan + satu sheet per sel grid / KT / Blok, gambar peta per sheet, +Jumlah Node · Koordinat)<br/>Ekspor: PDF ber-peta (metadata · Filter Legalitas · Ringkasan Legalitas · tabel + Total · halaman peta per grid & label)<br/>Ekspor: Laporan NKT (PDF per Lembaga, mengabaikan filter)<br/>Pesan: Geometri lahan masih dimuat — coba lagi sebentar"]:::content

  rp_land_xls[("Excel: Laporan_Lahan_{Lembaga} (multi-sheet ber-gambar peta)")]:::data
  rp_land_pdf[("PDF: Laporan Lahan ber-peta (landscape)")]:::data
  rp_land_nkt[("PDF: Laporan NKT — {Lembaga} (KPI · peta klaster · tabel lahan NKT · ringkasan kategori)")]:::data

  rp_land_page --> rp_land_tbl --> rp_land_tbl_c
  rp_land_page --> rp_land_exp --> rp_land_exp_c
  rp_land_exp ==>|Excel| rp_land_xls
  rp_land_exp ==>|PDF| rp_land_pdf
  rp_land_exp ==>|Laporan NKT| rp_land_nkt

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

## Laporan Pelatihan

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  rp_training_page["Laporan Pelatihan"]:::page

  rp_training_hdr("Header"):::section
  rp_training_hdr_c["Judul: Laporan Pelatihan<br/>Teks: Analisis ringkasan sesi pelatihan dan cakupan petani<br/>Tombol: Panduan (?) → Bantuan"]:::content

  rp_training_flt("Kartu: Parameter Laporan (collapsible)"):::section
  rp_training_flt_c["Filter: Distrik * · Lembaga Petani * (aktif setelah Distrik dipilih)<br/>Tombol: Tampilkan Laporan<br/>Pesan: Filter Wajib Belum Lengkap"]:::content

  rp_training_kpi("Kartu KPI"):::section
  rp_training_kpi_c["KPI: Total Sesi · Total Peserta · Total Unik (petani)<br/>KPI: Cakupan Paket 1 · Cakupan Paket 2 - MK · Cakupan Paket 2 - HSE (K3) · Cakupan P3 & 4 (% + n dari total petani)"]:::content

  rp_training_tab1("Tab: Sesi Pelatihan"):::section
  rp_training_tab1_c["Filter: Cari paket pelatihan · paginasi 10<br/>Kolom: Paket Pelatihan · Tanggal Pelatihan · Lokasi · Total Peserta"]:::content

  rp_training_tab2("Tab: Detail per Pelatihan"):::section
  rp_training_tab2_c["Filter: Jenis Pelatihan (Semua Pelatihan / Paket 1 / Paket 2 - MK / Paket 2 - HSE (K3) / Paket 3 & 4) · Tanggal Pelatihan (bila paket spesifik)<br/>Kolom (Semua Pelatihan): ID Petani · Nama Petani · L/P · Paket 1 · Paket 2 - MK · Paket 2 - K3 · Paket 3 & 4<br/>Kolom (paket spesifik): NO · Nama Petani · Farmer ID · Tanggal · Pre-Test · Post-Test<br/>Teks: Semua Tanggal → petani unik, baris = sesi terakhirnya<br/>Ekspor: Excel per tabel · PDF per tabel"]:::content

  rp_training_exp("Toolbar ekspor (baris tab)"):::section
  rp_training_exp_c["Ekspor: Excel (2-Sheet) — sheet Sesi Pelatihan + Cakupan per Petani<br/>Ekspor: PDF — LAPORAN CAKUPAN PELATIHAN PETANI atau LAPORAN KEGIATAN PELATIHAN (paket spesifik)"]:::content

  rp_training_xls[("Excel: Laporan_Pelatihan_{Distrik}_{Lembaga} (2 sheet)")]:::data
  rp_training_pdf[("PDF: Cakupan Pelatihan / Kegiatan Pelatihan")]:::data

  rp_training_page --> rp_training_hdr --> rp_training_hdr_c
  rp_training_page --> rp_training_flt --> rp_training_flt_c
  rp_training_page --> rp_training_kpi --> rp_training_kpi_c
  rp_training_page --> rp_training_tab1 --> rp_training_tab1_c
  rp_training_page --> rp_training_tab2 --> rp_training_tab2_c
  rp_training_page --> rp_training_exp --> rp_training_exp_c
  rp_training_exp ==>|Excel 2-Sheet| rp_training_xls
  rp_training_exp ==>|PDF| rp_training_pdf

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

## Laporan Produksi

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  rp_prod_page["Laporan Produksi"]:::page

  rp_prod_hdr("Header"):::section
  rp_prod_hdr_c["Judul: Laporan Produksi<br/>Teks: Matriks produksi bulanan per petani/lahan dalam satu Lembaga Petani<br/>Tombol: Panduan (?) → Bantuan"]:::content

  rp_prod_flt("Filter"):::section
  rp_prod_flt_c["Filter: Distrik * · Lembaga Petani * · Periode Awal * (bulan) · Periode Akhir * (bulan)<br/>Tombol: Tampilkan Laporan<br/>Teks: maksimal 24 bulan<br/>Pesan: Periode Akhir harus sama dengan atau setelah Periode Awal · Rentang periode maksimal 24 bulan<br/>Pesan: Filter Wajib Belum Lengkap · Tidak Ada Data Produksi"]:::content

  rp_prod_kpi("Kartu KPI"):::section
  rp_prod_kpi_c["KPI: Total Petani · Total Baris Lahan · Total Produksi (kg) · Jumlah Bulan"]:::content

  rp_prod_tbl("Tabel: Matriks Produksi"):::section
  rp_prod_tbl_c["Kolom: No (sticky) · Nama Petani · Id Petani · Id Lahan · Luas (Ha) · satu kolom per Bulan · Total<br/>Teks: baris Total per Bulan · sel tanpa data kosong (bukan 0) · scroll horizontal, tanpa paginasi<br/>Ekspor: Excel · PDF (CATATAN PRODUKSI PETANI, landscape)"]:::content

  rp_prod_xls[("Excel: Laporan_Produksi_{Lembaga}_{awal}_sd_{akhir}")]:::data
  rp_prod_pdf[("PDF: Catatan Produksi Petani (landscape)")]:::data

  rp_prod_page --> rp_prod_hdr --> rp_prod_hdr_c
  rp_prod_page --> rp_prod_flt --> rp_prod_flt_c
  rp_prod_page --> rp_prod_kpi --> rp_prod_kpi_c
  rp_prod_page --> rp_prod_tbl --> rp_prod_tbl_c
  rp_prod_tbl ==>|Excel| rp_prod_xls
  rp_prod_tbl ==>|PDF| rp_prod_pdf

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

## Laporan Kelompok Tani (Ringkasan)

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  rp_kt_page["Laporan Kelompok Tani (Ringkasan)"]:::page

  rp_kt_hdr("Header"):::section
  rp_kt_hdr_c["Judul: Laporan Kelompok Tani (Ringkasan)<br/>Teks: Rekap Kelompok Tani turunan dari data lahan (per Lembaga Petani)<br/>Tombol: Panduan (?) → Bantuan"]:::content

  rp_kt_flt("Filter"):::section
  rp_kt_flt_c["Filter: Distrik (opsional) · Lembaga Petani (opsional) · Cari (Lembaga / KT, sisi klien)<br/>Teks: Rekap real-time — dimuat otomatis saat halaman dibuka & filter berubah<br/>Pesan: Tidak Ada Data Kelompok Tani · Tidak ada baris yang cocok dengan pencarian"]:::content

  rp_kt_kpi("Kartu KPI"):::section
  rp_kt_kpi_c["KPI: Lembaga Petani · Kelompok Tani · Total Petani · Total Lahan · Total Luas (Ha) · Lahan NKT"]:::content

  rp_kt_tbl("Tabel: Kelompok Tani"):::section
  rp_kt_tbl_c["Filter: Tampilkan Kolom<br/>Kolom: No · Lembaga Petani · Kelompok Tani · Total Petani · Total Lahan · Total Luas (Ha)<br/>Kolom (opsional, mati bawaan): Lahan NKT · Patok<br/>Teks: baris Total mengikuti hasil pencarian · tanpa paginasi<br/>Ekspor: Excel · PDF (LAPORAN KELOMPOK TANI)"]:::content

  rp_kt_xls[("Excel: Laporan_Kelompok_Tani_{Lembaga/Distrik/Semua}")]:::data
  rp_kt_pdf[("PDF: Laporan Kelompok Tani")]:::data

  rp_kt_page --> rp_kt_hdr --> rp_kt_hdr_c
  rp_kt_page --> rp_kt_flt --> rp_kt_flt_c
  rp_kt_page --> rp_kt_kpi --> rp_kt_kpi_c
  rp_kt_page --> rp_kt_tbl --> rp_kt_tbl_c
  rp_kt_tbl ==>|Excel| rp_kt_xls
  rp_kt_tbl ==>|PDF| rp_kt_pdf

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

## Laporan Kelompok Tani (Detail)

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  rp_ktd_page["Laporan Kelompok Tani (Detail)"]:::page

  rp_ktd_hdr("Header"):::section
  rp_ktd_hdr_c["Judul: Laporan Kelompok Tani (Detail)<br/>Teks: Roster per Lembaga Petani — rincian Kelompok Tani → daftar Petani (turunan data lahan)<br/>Tombol: Panduan (?) → Bantuan"]:::content

  rp_ktd_flt("Filter"):::section
  rp_ktd_flt_c["Filter: Distrik (opsional) · Lembaga Petani * (memilih langsung memuat laporan)<br/>Teks: Pilih satu Lembaga Petani untuk menampilkan roster rinci<br/>Pesan: Pilih Lembaga Petani · Memuat laporan… · Tidak Ada Data"]:::content

  rp_ktd_kpi("Kartu KPI"):::section
  rp_ktd_kpi_c["KPI: Kelompok Tani · Total Petani · Total Lahan · Total Luas · Lahan NKT"]:::content

  rp_ktd_bar("Toolbar"):::section
  rp_ktd_bar_c["Teks: Lembaga Petani: {nama}<br/>Tombol: Buka semua ⇄ Tutup semua<br/>Ekspor: Excel · PDF (LAPORAN KELOMPOK TANI (DETAIL))"]:::content

  rp_ktd_roster("Roster collapsible: satu seksi per Kelompok Tani"):::section
  rp_ktd_roster_c["Judul: {Kelompok Tani} — n Petani · n Lahan · n Ha (+ n Lahan NKT / n Patok bila ada)<br/>Kolom: No · Nama Petani · ID Petani · Jml Lahan · Luas (Ha) · Lahan NKT · Patok<br/>Teks: tanpa paginasi & pencarian · nilai kosong (tidak diketahui)"]:::content

  rp_ktd_xls[("Excel: Laporan_Kelompok_Tani_Detail_{Lembaga} (sheet Detail KT, diratakan + Total)")]:::data
  rp_ktd_pdf[("PDF: Laporan Kelompok Tani (Detail)")]:::data

  rp_ktd_page --> rp_ktd_hdr --> rp_ktd_hdr_c
  rp_ktd_page --> rp_ktd_flt --> rp_ktd_flt_c
  rp_ktd_page --> rp_ktd_kpi --> rp_ktd_kpi_c
  rp_ktd_page --> rp_ktd_bar --> rp_ktd_bar_c
  rp_ktd_page --> rp_ktd_roster --> rp_ktd_roster_c
  rp_ktd_bar ==>|Excel| rp_ktd_xls
  rp_ktd_bar ==>|PDF| rp_ktd_pdf

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

## Laporan Patok

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  rp_marker_page["Laporan Patok"]:::page

  rp_marker_hdr("Header"):::section
  rp_marker_hdr_c["Judul: Laporan Patok<br/>Teks: Patok batas lahan per Distrik/Lembaga Petani — kondisi, bahan, lahan pemakai · satu baris per patok fisik<br/>Tombol: Panduan (?) → Bantuan"]:::content

  rp_marker_flt("Filter"):::section
  rp_marker_flt_c["Filter: Distrik (wajib) · Lembaga Petani (opsional, Semua Lembaga Petani)<br/>Tombol: Muat Data<br/>Filter (setelah dimuat, sisi klien): Kondisi (Semua kondisi · Ada · Hilang · Rusak · Belum dipasang)<br/>Pesan: Pilih Distrik terlebih dahulu · Tidak ada patok pada filter ini"]:::content

  rp_marker_kpi("Kartu KPI"):::section
  rp_marker_kpi_c["KPI: Patok · Ada (terpasang, % dari patok) · Hilang · Rusak · Belum dipasang"]:::content

  rp_marker_tbl("Tabel: Patok"):::section
  rp_marker_tbl_c["Kolom: Kode · KT / Blok · Lahan (Nama Petani · ID Petani · ID Lahan #no, satu per baris) · Kondisi · Bahan · Lintang, Bujur<br/>Teks: urut Kelompok Tani → Blok → kode · N dari M bila tersaring<br/>Pesan: Tidak ada patok yang cocok dengan filter"]:::content

  rp_marker_dl("Tombol: Unduh (dropdown, atas subset tersaring)"):::section
  rp_marker_dl_c["Ekspor: Excel (Kode Patok …)<br/>Ekspor: Shapefile (ZIP) Point · GeoJSON Point · KML Point<br/>Ekspor: PDF peta + tabel (landscape, peta klaster + tabel per lahan)<br/>Pesan: Tidak ada patok untuk diunduh · Gagal membuat berkas"]:::content

  rp_marker_xls[("Excel: patok_{label}_{YYYYMMDD-HHmm}")]:::data
  rp_marker_geo[("Spasial Point: Shapefile ZIP / GeoJSON / KML")]:::data
  rp_marker_pdf[("PDF: peta klaster + tabel patok")]:::data

  rp_marker_page --> rp_marker_hdr --> rp_marker_hdr_c
  rp_marker_page --> rp_marker_flt --> rp_marker_flt_c
  rp_marker_page --> rp_marker_kpi --> rp_marker_kpi_c
  rp_marker_page --> rp_marker_tbl --> rp_marker_tbl_c
  rp_marker_page --> rp_marker_dl --> rp_marker_dl_c
  rp_marker_dl ==>|Excel| rp_marker_xls
  rp_marker_dl ==>|Shapefile · GeoJSON · KML| rp_marker_geo
  rp_marker_dl ==>|PDF| rp_marker_pdf

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

## Alur lintas menu

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  rp_land_page["Laporan Lahan"]:::page
  rp_marker_page["Laporan Patok"]:::page
  rp_land_nkt[("PDF: Laporan NKT — {Lembaga}")]:::data
  md_groups_detail["Detail Lembaga Petani"]:::page
  mp_parcel["Peta Lahan"]:::page
  bu_parcels["Upload Massal Lahan (3 tab)"]:::page
  rp_land_basemap[/"Proxy latar peta (tile raster)"/]:::external

  rp_land_page ==>|Laporan NKT| rp_land_nkt
  md_groups_detail ==>|Laporan NKT — pintu kedua, data sama| rp_land_nkt
  bu_parcels -.->|mengisi UL Parcel Code · surat · STDB yang menjadi kolom & filter legalitas| rp_land_page
  mp_parcel -.->|baris legenda patok & helper ekspor yang sama| rp_marker_page
  rp_land_basemap ==>|latar peta cetak| rp_land_page

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

Semua laporan membaca data **real-time** dari Master Data (petani, lahan, pelatihan, produksi) — berbeda dengan Dashboard yang membaca snapshot (lihat [tools.md](tools.md)). Laporan NKT yang sama bisa dicetak dari Laporan Lahan maupun dari Detail Lembaga Petani di Master Data; keduanya memuat seluruh lahan aktif Lembaga, tidak mengikuti filter. Filter "Cakupan Pendataan: Sudah didata" di Laporan Lahan bergantung pada UL Parcel Code yang masuk lewat Bulk Upload Detail Lahan.

## Urutan demo yang disarankan

1. Buka Report → Petani: pilih Distrik, lalu Lembaga Petani, klik Tampilkan Laporan — tunjukkan pola yang sama berlaku di semua laporan (KPI → tabel → Excel/PDF).
2. Report → Pelatihan: buka tab Detail per Pelatihan, ganti Jenis Pelatihan dari Semua Pelatihan ke satu paket, tunjukkan tabel peserta dan bentuk PDF yang berubah.
3. Report → Produksi: isi Periode Awal/Akhir (≤ 24 bulan), tunjukkan matriks bulanan dan PDF landscape.
4. Report → Kelompok Tani (Summary) lalu (Detail): rekap otomatis tanpa tombol, selektor kolom Lahan NKT & Patok, roster collapsible Buka semua.
5. Report → Lahan: pilih Lembaga, mainkan filter legalitas dan tombol ↺ Reset, lihat kartu Ringkasan Legalitas ikut berubah.
6. Masih di Lahan: atur Grid Index, ganti Latar Peta ke Hybrid dan kepekatan, tunggu indikator latar, lalu unduh PDF ber-peta dan Excel multi-sheet (Sheet per Kelompok Tani).
7. Klik Laporan NKT dan tunjukkan bahwa PDF-nya tidak mengikuti filter.
8. Report → Patok: Muat Data, saring Kondisi, unduh Shapefile/GeoJSON/KML dan PDF peta + tabel.
