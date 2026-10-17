# Peta Fitur — Data Analyst

> Bagian dari dokumentasi **Produk** · Peta fitur untuk Miro. Indeks: [README.md](README.md) · Legenda: [legend.md](legend.md) · Sumber: [../pages/data-analyst/README.md](../pages/data-analyst/README.md)

> **Ringkasan:** Menu kerja analis data: memeriksa **kelengkapan, cakupan, dan kualitas** data yang sudah masuk — ringkasan petani per Lembaga, skor Ketersediaan Data (semua Lembaga → satu Lembaga → kalender produksi), komparasi dengan angka acuan, dan temuan spasial tumpang tindih lahan. Empat sub menu level 2 (satu di antaranya induk **Ketersediaan Data** dengan tiga anak level 3), enam halaman. Semua halaman membaca data secara live dan menautkan temuan ke halaman Master Data untuk diperbaiki.

## Pohon navigasi

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  da(["Data Analyst"]):::menu
  da_sub_fs[["Ringkasan Petani"]]:::sub
  da_sub_avail[["Ketersediaan Data"]]:::sub
  da_sub_all[["Semua Lembaga"]]:::sub
  da_sub_per[["Per Lembaga"]]:::sub
  da_sub_prod[["Produksi"]]:::sub
  da_sub_bench[["Komparasi Data Acuan"]]:::sub
  da_sub_ovl[["Tumpang Tindih Lahan"]]:::sub
  da_fs["Ringkasan Petani"]:::page
  da_all["Ketersediaan Data — Semua Lembaga"]:::page
  da_per["Ketersediaan Data — Per Lembaga"]:::page
  da_prod["Ketersediaan Data — Produksi"]:::page
  da_bench["Komparasi Data Acuan"]:::page
  da_ovl["Tumpang Tindih Lahan 🟠"]:::page
  class da_ovl proto

  da --> da_sub_fs --> da_fs
  da --> da_sub_avail
  da_sub_avail --> da_sub_all --> da_all
  da_sub_avail --> da_sub_per --> da_per
  da_sub_avail --> da_sub_prod --> da_prod
  da --> da_sub_bench --> da_bench
  da --> da_sub_ovl --> da_ovl
  da_all -.->|Nama Lembaga| da_per
  da_prod -.->|Nama Lembaga| da_per

  classDef menu fill:#166534,stroke:#14532d,color:#ffffff,font-weight:bold
  classDef sub fill:#dcfce7,stroke:#166534,color:#14532d
  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef proto stroke-dasharray:5 5
```

| Halaman | Route | Katalog |
|---|---|---|
| Ringkasan Petani | `/admin/data-analyst/farmer-summary` | [farmer-summary.md](../pages/data-analyst/farmer-summary.md) |
| Ketersediaan Data — Semua Lembaga | `/admin/data-analyst/data-availability` | [data-availability.md](../pages/data-analyst/data-availability.md) |
| Ketersediaan Data — Per Lembaga | `/admin/data-analyst/data-completeness?lembaga={id}` | [data-completeness.md](../pages/data-analyst/data-completeness.md) |
| Ketersediaan Data — Produksi | `/admin/data-analyst/availability/production` | [availability-production.md](../pages/data-analyst/availability-production.md) |
| Komparasi Data Acuan | `/admin/data-analyst/benchmark-comparison` | [benchmark-comparison.md](../pages/data-analyst/benchmark-comparison.md) |
| Tumpang Tindih Lahan 🟠 | `/admin/data-analyst/parcel-overlap?tab={tab}` | [parcel-overlap.md](../pages/data-analyst/parcel-overlap.md) |

Halaman induk `/admin/data-analyst` tidak punya isi; ia mengalihkan ke sub menu pertama yang boleh diakses. Induk level 2 **Ketersediaan Data** (`/admin/data-analyst/availability`) juga hanya mengalihkan — ke **Semua Lembaga** (atau anak pertama yang boleh diakses). Ketiga anak Ketersediaan Data berbagi satu header `Ketersediaan Data` dengan sub-nav Semua Lembaga · Per Lembaga · Produksi. Tumpang Tindih Lahan berstatus 🟠 karena guard unggah dan layer Peta Lahan belum dikerjakan (#317 Fase 3–4). Metrik Rilis, Peta Data & Skema, dan Rencana Pengembangan **bukan** bagian menu ini (grup Platform Developer).

## Ringkasan Petani

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  da_fs["Ringkasan Petani"]:::page

  da_fs_hdr("Header"):::section
  da_fs_hdr_c["Judul: Ringkasan Petani<br/>Teks: Analisis data petani berdasarkan district dan Lembaga Petani<br/>Tombol: Panduan (?) → Bantuan"]:::content

  da_fs_flt("Filter"):::section
  da_fs_flt_c["Filter: Distrik (cari, bawaan Semua Distrik) · Lembaga Petani (ISH) (cari, cascade, bawaan Semua ISH)<br/>Tombol: Analisa → Menganalisa… (memuat kedua tab)<br/>Pesan: Klik tombol Analisa untuk memulai (keadaan awal)<br/>Pesan: Analisis data berhasil dimuat · Gagal memuat analisis data"]:::content

  da_fs_tab1("Tab: Detail Petani (bawaan)"):::section
  da_fs_tab1_c["KPI: Total Lembaga Petani · Total Petani · Total Persil · Luas Lahan (ha)<br/>Kolom: Nama Lembaga Petani · ID Petani · Nama Petani · Total Persil<br/>Filter: Cari petani… · paginasi 10/25/50/100 (bawaan 25)<br/>Ekspor: Excel (detail-petani-tanggal)"]:::content

  da_fs_tab2("Tab: Petani Tanpa Lahan"):::section
  da_fs_tab2_c["KPI: Total Lembaga Petani · Petani Tanpa Lahan · % dari Total Petani<br/>Kolom: Nama Lembaga Petani · ID Petani · Nama Petani · Status Lahan (badge Belum ada lahan)<br/>Filter: Cari petani… · paginasi bawaan 25<br/>Ekspor: Excel (petani-tanpa-lahan-tanggal)"]:::content

  da_fs --> da_fs_hdr --> da_fs_hdr_c
  da_fs --> da_fs_flt --> da_fs_flt_c
  da_fs --> da_fs_tab1 --> da_fs_tab1_c
  da_fs --> da_fs_tab2 --> da_fs_tab2_c

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
```

## Ketersediaan Data — Semua Lembaga

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  da_all["Ketersediaan Data — Semua Lembaga"]:::page

  da_all_hdr("Header + sub-nav"):::section
  da_all_hdr_c["Judul: Ketersediaan Data · Tab: Semua Lembaga · Per Lembaga · Produksi<br/>Teks: Kelengkapan data 5 domain lintas Lembaga Petani · data per tanggal<br/>Tombol: Panduan (?) → Bantuan<br/>Filter: Kategori (Semua/Ex-Plasma/Swadaya) · Distrik · Lembaga (cascade) · ↺ Reset<br/>Ekspor: Excel 2 sheet (Kelengkapan Inti · Cakupan Modul)"]:::content

  da_all_chip("Filter aktif"):::section
  da_all_chip_c["Teks: chip per pilihan — Kategori · Distrik · Lembaga · Tingkat skor · Urut — dengan ✕<br/>Pesan: tidak tampil tanpa pilihan"]:::content

  da_all_hero("Hero: Skor Keseluruhan"):::section
  da_all_hero_c["KPI: cincin Skor Keseluruhan · label tingkat skor · n Lembaga · n petani · n lahan<br/>Tombol: bar sebaran Lembaga per tingkat (kritis · perhatian · baik · lengkap) = filter Tingkat skor<br/>Pesan: Tidak ada Lembaga Petani pada filter ini."]:::content

  da_all_dom("Kartu domain (5)"):::section
  da_all_dom_c["KPI: Profil (bobot 10%) · Petani (25%) · Lahan (25%) · Pelatihan (20%) · Produksi (20%)<br/>Teks: skor % · bar · n entitas · n kritis<br/>Tombol: Urutkan ⇅ / Terurut ↑ → urutkan matriks menurut domain"]:::content

  da_all_mx("Matriks per Lembaga"):::section
  da_all_mx_c["Teks: toolbar lengket — n Lembaga · n kritis · 10 tampil · ⓘ cara baca<br/>Tab: Radar (bawaan) · Heatmap · Cakupan modul<br/>Filter: Urut (Skor Total/domain/nama/petani) · arah · Cari Lembaga / kode / distrik<br/>Tombol: Tampilkan n lagi / Ringkas — 10 baris pertama saja"]:::content

  da_all_rad("Tampilan: Radar"):::section
  da_all_rad_c["Teks: kartu per Lembaga — nama (tautan Per Lembaga) · Skor Total · kode · distrik · n petani<br/>Teks: pentagon 5 domain, cincin ambang 50/80/100<br/>Tombol: Perbesar (hover/fokus) → modal"]:::content

  da_all_heat("Tampilan: Heatmap"):::section
  da_all_heat_c["Kolom: Lembaga Petani (tautan Per Lembaga) · Skor Total · Petani (n) · Profil · Petani · Lahan · Pelatihan · Produksi<br/>Teks: sel warna skala kontinu merah → hijau, 100 = lengkap penuh<br/>Teks: legenda ramp 0 → 99 + ambang 50 & 80"]:::content

  da_all_mod("Tampilan: Cakupan modul"):::section
  da_all_mod_c["Kolom: Lembaga Petani (sticky) · 15 modul per domain (% atau ✓/✗)<br/>Teks: baris Semua Lembaga (pilihan filter) · — = belum dimulai di Lembaga itu<br/>Filter: Urut per modul · Cari · Ringkas 10"]:::content

  da_all_dlg{{"Dialog: Perbesar radar"}}:::dialog
  da_all_dlg_c["Judul: nama Lembaga · Skor Total · label tingkat · kode · distrik · kategori · n petani · n lahan · n temuan<br/>Teks: radar besar (kiri) · tabel Domain · Bobot · Skor · Kontribusi + Skor Total n / 100 (kanan)<br/>Tombol: Buka daftar kerja · Detail Lembaga · Sebelumnya / Berikutnya (← →)"]:::content

  da_all_wl("Daftar Kerja"):::section
  da_all_wl_c["Tab: Sistemik (unggah massal) · Per entitas · Tertinggal per domain — badge jumlah<br/>Kolom: label temuan · angka · n Lembaga ▾ (popover Lembaga terdampak) · bar · Isi lewat menu › kolom<br/>Teks: Tertinggal per domain = 5 kolom × ≤ 5 Lembaga di bawah 100%"]:::content

  da_per["Ketersediaan Data — Per Lembaga"]:::page

  da_all --> da_all_hdr --> da_all_hdr_c
  da_all --> da_all_chip --> da_all_chip_c
  da_all --> da_all_hero --> da_all_hero_c
  da_all --> da_all_dom --> da_all_dom_c
  da_all --> da_all_mx --> da_all_mx_c
  da_all_mx --> da_all_rad --> da_all_rad_c
  da_all_mx --> da_all_heat --> da_all_heat_c
  da_all_mx --> da_all_mod --> da_all_mod_c
  da_all_rad -.->|Perbesar| da_all_dlg --> da_all_dlg_c
  da_all --> da_all_wl --> da_all_wl_c
  da_all_rad -.->|Nama Lembaga| da_per
  da_all_heat -.->|Nama Lembaga| da_per
  da_all_dlg -.->|Buka daftar kerja| da_per
  da_all_wl -.->|Nama Lembaga| da_per

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
```

## Ketersediaan Data — Per Lembaga — bagian 1/2

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  da_per["Ketersediaan Data — Per Lembaga"]:::page

  da_per_hdr("Header + sub-nav"):::section
  da_per_hdr_c["Judul: Ketersediaan Data · Tab: Semua Lembaga · Per Lembaga · Produksi<br/>Teks: Rincian kelengkapan & daftar kerja anomali satu Lembaga Petani (Profil, Petani, Lahan, Pelatihan, Produksi)<br/>Tombol: Panduan (?) → Bantuan"]:::content

  da_per_flt("Filter"):::section
  da_per_flt_c["Filter: Distrik (Semua Distrik) · Lembaga Petani (wajib, cascade — analisa otomatis saat dipilih)<br/>Tombol: Muat ulang → Menganalisa…<br/>Pesan: Pilih Lembaga Petani — analisa berjalan otomatis<br/>Pesan: Lembaga Petani pada tautan ini tidak ditemukan atau di luar akses Anda"]:::content

  da_per_res("Header hasil"):::section
  da_per_res_c["Teks: nama Lembaga + kode · Distrik · n petani · n temuan<br/>KPI: angka Index besar (warna tingkat) + label tingkat<br/>Teks: radar pentagon 5 domain berangka — label sumbu = tautan ke seksi<br/>Ekspor: Excel multi-sheet (analisa-ketersediaan-kode-tanggal)<br/>Pesan: Lembaga Petani ini belum memiliki data petani terdaftar (0 petani)"]:::content

  da_per_pri("Kartu: Prioritas perbaikan"):::section
  da_per_pri_c["Kolom: nomor · tindakan (klik → seksi) · +n poin Δ Index · bar relatif · domain · n/total · Perbaiki lewat (tautan)<br/>Pesan: Semua check berskor sudah lengkap<br/>Tombol: Buka semua / Tutup semua"]:::content

  da_per --> da_per_hdr --> da_per_hdr_c
  da_per --> da_per_flt --> da_per_flt_c
  da_per --> da_per_res --> da_per_res_c
  da_per --> da_per_pri --> da_per_pri_c

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
```

## Ketersediaan Data — Per Lembaga — bagian 2/2

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  da_per["Ketersediaan Data — Per Lembaga"]:::page

  da_per_sec("Seksi per domain (collapsible, bawaan: skor terendah terbuka)"):::section
  da_per_sec_c["Teks: judul domain · chip bobot n % Index · badge n temuan / Lengkap · badge skor (tooltip rumus)"]:::content

  da_per_prof("Seksi: Profil Lembaga Petani"):::section
  da_per_prof_c["Teks: check — Kode Lembaga Petani · Koordinat Lokasi · Tahun Bergabung · Singkatan (Abrv) · Tipe Grup · Tahun Berdiri<br/>Teks: kualitas — sertifikasi konsisten · tahun bergabung vs berdiri · koordinat dalam distrik<br/>Teks: modul — boundary · acuan · Monev Lembaga · sertifikasi terisi<br/>Aksi: isi di Detail Lembaga › Edit"]:::content

  da_per_frm("Seksi: Petani"):::section
  da_per_frm_c["KPI: Total Petani · Petani Lengkap · Petani dengan Anomali · % Kelengkapan Field<br/>Teks: check — NIK (terisi, 16 digit, tidak duplikat) · ID Petani tidak duplikat · alamat · tanggal lahir · tempat lahir · tahun bergabung<br/>Teks: kualitas — NIK vs tanggal lahir · NIK vs jenis kelamin · umur wajar · kemungkinan ganda"]:::content

  da_per_prc("Seksi: Lahan"):::section
  da_per_prc_c["KPI: Total Persil Aktif · Petani Tanpa Lahan · Persil dengan Anomali · Total Luas (ha) · Persil kena NKT · Di Luar Boundary ICS<br/>Teks: check — geometry · luas · jenis tanaman · Kelompok Tani (bobot 3) · tahun tanam · status lahan · blok (bobot 1)<br/>Teks: kualitas — di luar boundary · luas beda geometri · luas tidak wajar · tahun tanam tidak wajar<br/>Kolom: Per Kelompok Tani — KT · Petani · Persil · Luas · Skor Lahan · Skor Petani · Persil Berproduksi"]:::content

  da_per_trn("Seksi: Pelatihan"):::section
  da_per_trn_c["KPI: Total Petani · Petani Lengkap · Belum Lengkap · % Cakupan Paket<br/>Teks: Ringkasan per Paket (kartu per paket, expand → petani belum ikut)<br/>Kolom: Matriks Cakupan — Petani (sticky) × paket (✓/✗)<br/>Kolom: Petani Belum Lengkap — ID Petani · Nama Petani · Cakupan · Paket yang Masih Kurang<br/>Teks: check — peserta tanpa pre-test / post-test · belum ada aktivitas pelatihan"]:::content

  da_per_prd("Seksi: Produksi"):::section
  da_per_prd_c["KPI: Total Petani · Petani dengan Produksi · Petani Tanpa Produksi · Berlahan Tanpa Produksi · Lahan Berproduksi (non-PSR)<br/>Teks: check — petani tanpa produksi · berlahan (non-PSR) tanpa produksi · produksi tidak terhubung ke persil · tidak diperbarui ≥ 3 bulan · lahan aktif non-PSR tanpa produksi"]:::content

  da_per_chk("Baris checklist (semua domain)"):::section
  da_per_chk_c["Teks: legenda jenis — Inti · Lapangan · Validitas (berskor) · Kualitas · Modul (informatif)<br/>Kolom: chip jenis · label · badge sistemik · bobot a/b · bar % OK · status (lengkap / n dari total / belum ada di Lembaga ini)<br/>Teks: baris bermasalah dibuka → penjelasan sistemik · Perbaiki lewat (tautan menu)<br/>Kolom: daftar kerja — ID Petani · Nama Petani · Detail / ID Lahan (NIK disensor)<br/>Tombol: Tampilkan semua (n) / Ringkas (batas 50 baris)"]:::content

  da_per_xls("Ekspor"):::section
  da_per_xls_c["Ekspor: Excel multi-sheet — Ringkasan · Prioritas · Checklist · Per Kelompok Tani<br/>Ekspor: Petani · Lahan · Pelatihan · Produksi (daftar kerja per domain, tanpa sensor) · Matriks Pelatihan · Petani Belum Lengkap<br/>Teks: tanpa CSV/PDF"]:::content

  md_farmers_detail["Detail Petani"]:::page
  md_parcels_detail["Detail Lahan"]:::page

  da_per --> da_per_sec --> da_per_sec_c
  da_per_sec --> da_per_prof --> da_per_prof_c
  da_per_sec --> da_per_frm --> da_per_frm_c
  da_per_sec --> da_per_prc --> da_per_prc_c
  da_per_sec --> da_per_trn --> da_per_trn_c
  da_per_sec --> da_per_prd --> da_per_prd_c
  da_per_sec --> da_per_chk --> da_per_chk_c
  da_per --> da_per_xls --> da_per_xls_c
  da_per_chk -.->|Nama Petani| md_farmers_detail
  da_per_chk -.->|ID Lahan| md_parcels_detail

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
```

## Ketersediaan Data — Produksi

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  da_prod["Ketersediaan Data — Produksi"]:::page

  da_prod_hdr("Header + sub-nav"):::section
  da_prod_hdr_c["Judul: Ketersediaan Data · Tab: Semua Lembaga · Per Lembaga · Produksi<br/>Teks: kalender cakupan produksi — bulan mana yang sudah punya record · data per tanggal<br/>Tombol: Panduan (?) → Bantuan"]:::content

  da_prod_tb("Toolbar"):::section
  da_prod_tb_c["Filter: Tahun (bawaan tahun berjalan) · Kategori · Distrik · Lembaga (cascade) · ↺ Reset<br/>Ekspor: Excel 2 sheet — Lembaga tahun · Lahan Lembaga (hanya bila filter Lembaga)"]:::content

  da_prod_kpi("Strip KPI"):::section
  da_prod_kpi_c["KPI: Tahun (n Distrik · n Lembaga) · Cakupan tahun (rata-rata 12 bulan, tertimbang lahan non-PSR) · Tanpa record tahun · Basi"]:::content

  da_prod_ctl("Kontrol tabel"):::section
  da_prod_ctl_c["Filter: Cari · Urut (cakupan / nama / bulan ber-data / periode terakhir) · arah<br/>Tombol: Per Distrik (baris Distrik nyala/mati) · Tutup semua · Buka Distrik (bawaan)"]:::content

  da_prod_tbl("Tabel pohon: kalender Lembaga × bulan"):::section
  da_prod_tbl_c["Kolom: Distrik/Lembaga (sticky) · Lahan (non-PSR) · Jan … Des · Bulan (x/12) · Rentang · Jeda · Penanda (0 n · TP n)<br/>Teks: baris Distrik (agregat) ▸ Lembaga ▸ petani ▸ lahan (dimuat saat dibuka)<br/>Teks: sel = % lahan non-PSR melapor (warna skala) · abu = tanpa record · transparan = bulan belum tiba · n rec = tanpa lahan non-PSR<br/>Teks: baris lahan — kode · badge PSR / lain · sel kg · baris semu Tanpa persil<br/>Pesan: Memuat… · error (klik lagi = muat ulang) · kosong"]:::content

  da_prod_lgd("Legenda"):::section
  da_prod_lgd_c["Teks: % lahan non-PSR melapor · tanpa record · belum tiba · penanda 0 / TP · jeda merah (basi ≥ 3 bulan)"]:::content

  da_per["Ketersediaan Data — Per Lembaga"]:::page
  md_farmers_detail["Detail Petani"]:::page
  md_parcels_detail["Detail Lahan"]:::page
  md_production_list["Produksi (daftar)"]:::page

  da_prod --> da_prod_hdr --> da_prod_hdr_c
  da_prod --> da_prod_tb --> da_prod_tb_c
  da_prod --> da_prod_kpi --> da_prod_kpi_c
  da_prod --> da_prod_ctl --> da_prod_ctl_c
  da_prod --> da_prod_tbl --> da_prod_tbl_c
  da_prod --> da_prod_lgd --> da_prod_lgd_c
  da_prod_tbl -.->|Nama Lembaga| da_per
  da_prod_tbl -.->|Nama petani| md_farmers_detail
  da_prod_tbl -.->|Kode lahan| md_parcels_detail
  da_prod_tbl -.->|Sel kg lahan| md_production_list

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
```

## Komparasi Data Acuan

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  da_bench["Komparasi Data Acuan"]:::page

  da_bench_hdr("Header"):::section
  da_bench_hdr_c["Judul: Komparasi Data Acuan<br/>Teks: angka acuan (MD 1st SOW) vs angka MIS live · selisih = acuan − MIS per 8 metrik<br/>Tombol: Panduan (?) → Bantuan"]:::content

  da_bench_sum("Kartu ringkas"):::section
  da_bench_sum_c["KPI: n Lembaga dalam scope · n masih selisih<br/>Ekspor: Ekspor Excel (satu sheet Komparasi, mengikuti filter & urutan yang tampil)"]:::content

  da_bench_tb("Toolbar"):::section
  da_bench_tb_c["Tab: Ringkas (bawaan) · Detail<br/>Filter: Distrik (Semua distrik) · Urut kode lembaga / Urut paling bermasalah<br/>Filter: Hanya yang masih selisih (switch) · Cari lembaga…<br/>Teks: legenda warna (mode Ringkas) — ✓ cocok · kuning ≤ 20% · merah di atas 20% · — tanpa acuan"]:::content

  da_bench_tbl("Tabel per distrik (kartu collapsible)"):::section
  da_bench_tbl_c["Teks: header distrik — n lembaga · n masih selisih · n tanpa acuan · badge jumlah selisih<br/>Kolom: Lembaga (nama · kode · badge cocok / acuan belum diisi · pill catatan)<br/>Kolom: 8 metrik — Petani · Persil Lahan · Luas Lahan (ha) · Training Paket 1 · Paket 2-MK · Paket 2-K3 · Paket 3&4 · Produksi (petani)<br/>Teks: mode Ringkas = matriks Δ (selisih + % capaian, tooltip Acuan/MIS/Selisih) · mode Detail = Acuan · MIS · Δ per metrik<br/>Aksi: Edit acuan (per baris) · baris TOTAL distrik<br/>Pesan: tidak ada lembaga cocok dengan filter"]:::content

  da_bench_dlg{{"Dialog: Entry data acuan"}}:::dialog
  da_bench_dlg_c["Field: 8 angka acuan (tiap field tampil MIS live + preview Δ · kosong = tidak dibandingkan)<br/>Field: Catatan<br/>Tombol: Simpan · Batal<br/>Pesan: tabel diperbarui langsung setelah tersimpan"]:::content

  da_bench --> da_bench_hdr --> da_bench_hdr_c
  da_bench --> da_bench_sum --> da_bench_sum_c
  da_bench --> da_bench_tb --> da_bench_tb_c
  da_bench --> da_bench_tbl --> da_bench_tbl_c
  da_bench_tbl -.->|Edit| da_bench_dlg --> da_bench_dlg_c

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
```

## Tumpang Tindih Lahan — bagian 1/2 (tab Tumpang Tindih)

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  da_ovl["Tumpang Tindih Lahan 🟠"]:::page
  class da_ovl proto

  da_ovl_hdr("Header"):::section
  da_ovl_hdr_c["Judul: Tumpang Tindih Lahan<br/>Teks: temuan spasial lahan — poligon beririsan, di luar boundary ICS, luas kolom ≠ poligon<br/>Tombol: Panduan (?) → Bantuan<br/>Tab: Tumpang Tindih n · Luar Boundary n · Selisih Luas n"]:::content

  da_ovl_flt("Toolbar filter"):::section
  da_ovl_flt_c["Filter: Tumpang tindih (Semua · lebih dari 10% · 25% · 50% · 75% · 90%)<br/>Filter: Jenis (Semua jenis · Petani sama · Beda petani, satu Lembaga · Lintas Lembaga)<br/>Filter: Distrik · Lembaga (opsi dari kedua sisi temuan)"]:::content

  da_ovl_sum("Ringkasan"):::section
  da_ovl_sum_c["KPI: n pasangan · total irisan (ha)<br/>Tombol: chip Semua / Duplikat / Tercakup / Sebagian = filter label"]:::content

  da_ovl_tbl("Split view kiri: Tabel pasangan"):::section
  da_ovl_tbl_c["Kolom: Lahan A · Lahan B (ID lahan · badge +n · nama petani · Lembaga bila lintas) · % · Irisan (% terkecil · ha · A/B) · Label (Duplikat → Tercakup → Sebagian)<br/>Filter: Cari ID lahan / petani… · paginasi bawaan 25 · klik / Enter / Spasi = pilih<br/>Ekspor: Excel · Spasial ▾ (Shapefile ZIP · GeoJSON — poligon irisan)<br/>Pesan: Tidak ada lahan tumpang tindih pada filter ini."]:::content

  da_ovl_prev("Split view kanan: Preview pasangan (sticky)"):::section
  da_ovl_prev_c["Tombol: ‹ Sebelumnya · n / N · Berikutnya › (↑/↓ saat fokus di tabel)<br/>Layer: lahan A biru · lahan B oranye putus · irisan merah · basemap · legenda<br/>Tombol: Zoom ke Lahan<br/>Teks: kartu A & B — petani (kode) · Kelompok Tani · Lembaga · Distrik · luas poligon · % tertumpang · +n lahan lain<br/>Tombol: Buka Detail Lahan (tab baru) / Di luar akses Anda"]:::content

  da_ovl_ftn("Catatan kaki"):::section
  da_ovl_ftn_c["Teks: definisi % (irisan ÷ lahan lebih kecil) · Duplikat (lebih dari 90% kedua lahan) / Tercakup · ambang buang (di bawah 100 m² dan 1%) · arti +n"]:::content

  da_ovl_shp[("Shapefile ZIP / GeoJSON — poligon irisan")]:::data
  md_parcels_detail["Detail Lahan"]:::page

  da_ovl --> da_ovl_hdr --> da_ovl_hdr_c
  da_ovl --> da_ovl_flt --> da_ovl_flt_c
  da_ovl --> da_ovl_sum --> da_ovl_sum_c
  da_ovl --> da_ovl_tbl --> da_ovl_tbl_c
  da_ovl --> da_ovl_prev --> da_ovl_prev_c
  da_ovl --> da_ovl_ftn --> da_ovl_ftn_c
  da_ovl_tbl -.->|Pilih baris| da_ovl_prev
  da_ovl_tbl ==>|Spasial| da_ovl_shp
  da_ovl_prev -.->|Buka Detail Lahan| md_parcels_detail

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef proto stroke-dasharray:5 5
```

## Tumpang Tindih Lahan — bagian 2/2 (tab Luar Boundary & Selisih Luas)

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  da_ovl["Tumpang Tindih Lahan 🟠"]:::page
  class da_ovl proto

  da_ovl_ob("Tab: Luar Boundary"):::section
  da_ovl_ob_warn("Kotak peringatan + jumlah per Lembaga"):::section
  da_ovl_ob_warn_c["Pesan: ≥ 50% di 3 Lembaga → boundary-nya yang perlu diperbarui<br/>Tombol: batang 8 Lembaga teratas = filter Lembaga (klik ulang = lepas)"]:::content
  da_ovl_ob_flt("Filter"):::section
  da_ovl_ob_flt_c["Filter: chip Sepenuhnya di luar (bawaan) / Sebagian di luar · Distrik · Lembaga<br/>KPI: n lahan"]:::content
  da_ovl_ob_sv("Split view: tabel + preview"):::section
  da_ovl_ob_sv_c["Kolom: Lahan · Di luar (ha · % dari luas) · Jarak ke boundary<br/>Layer: lahan biru · boundary ICS oranye putus · titik pusat lahan<br/>Tombol: Zoom ke Lahan · Lahan + boundary · Buka Detail Lahan (tab baru)<br/>Ekspor: Excel (sheet Luar Boundary) · Spasial (layer luar_boundary — poligon lahan utuh)<br/>Teks: catatan kaki — buffer 1,5 km · Lembaga tanpa boundary tak dicek · setara check Per Lembaga"]:::content

  da_ovl_am("Tab: Selisih Luas"):::section
  da_ovl_am_flt("Filter"):::section
  da_ovl_am_flt_c["Filter: chip Semua / Kolom lebih besar dari poligon / Kolom lebih kecil dari poligon · Distrik · Lembaga"]:::content
  da_ovl_am_sv("Split view: tabel + preview"):::section
  da_ovl_am_sv_c["Kolom: Lahan · Kolom (ha) · Poligon (ha) · Selisih (% · arah) — urut selisih terbesar<br/>Layer: peta lahan · ringkasan luas tercatat vs poligon<br/>Tombol: Zoom ke Lahan · Buka Detail Lahan (tab baru)<br/>Ekspor: Excel (sheet Selisih Luas) · Spasial (layer selisih_luas)<br/>Teks: catatan kaki — selisih di atas 20% = check Per Lembaga"]:::content

  da_ovl_shp2[("Shapefile ZIP / GeoJSON — poligon lahan")]:::data
  md_parcels_detail["Detail Lahan"]:::page

  da_ovl --> da_ovl_ob
  da_ovl_ob --> da_ovl_ob_warn --> da_ovl_ob_warn_c
  da_ovl_ob --> da_ovl_ob_flt --> da_ovl_ob_flt_c
  da_ovl_ob --> da_ovl_ob_sv --> da_ovl_ob_sv_c
  da_ovl --> da_ovl_am
  da_ovl_am --> da_ovl_am_flt --> da_ovl_am_flt_c
  da_ovl_am --> da_ovl_am_sv --> da_ovl_am_sv_c
  da_ovl_ob_sv ==>|Spasial| da_ovl_shp2
  da_ovl_am_sv ==>|Spasial| da_ovl_shp2
  da_ovl_ob_sv -.->|Buka Detail Lahan| md_parcels_detail
  da_ovl_am_sv -.->|Buka Detail Lahan| md_parcels_detail

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef proto stroke-dasharray:5 5
```

Status 🟠: ketiga tab sudah tersedia; yang belum adalah guard saat unggah shapefile (Fase 3) dan layer temuan di Peta Lahan (Fase 4).

## Alur lintas menu

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  da_all["Ketersediaan Data — Semua Lembaga"]:::page
  da_per["Ketersediaan Data — Per Lembaga"]:::page
  da_prod["Ketersediaan Data — Produksi"]:::page
  da_ovl["Tumpang Tindih Lahan 🟠"]:::page
  class da_ovl proto

  md_groups_detail["Detail Lembaga Petani"]:::page
  md_farmers_list["Petani (daftar)"]:::page
  md_farmers_detail["Detail Petani"]:::page
  md_parcels_list["Lahan (daftar)"]:::page
  md_parcels_detail["Detail Lahan"]:::page
  md_production_list["Produksi (daftar)"]:::page
  bu_parcels["Upload Massal Lahan (3 tab)"]:::page

  da_all -.->|Nama Lembaga / Buka daftar kerja| da_per
  da_all -.->|Detail Lembaga| md_groups_detail
  da_all -.->|Isi lewat menu Petani| md_farmers_list
  da_all -.->|Isi lewat menu Lahan| md_parcels_list
  da_all -.->|Isi lewat menu Produksi| md_production_list
  md_groups_detail -.->|Kartu KPI Ketersediaan Data| da_per
  da_per -.->|Nama Petani| md_farmers_detail
  da_per -.->|ID Lahan| md_parcels_detail
  da_per -.->|Perbaiki lewat Petani| md_farmers_list
  da_per -.->|Perbaiki lewat Lahan| md_parcels_list
  da_per -.->|Perbaiki lewat Produksi| md_production_list
  da_per -.->|Perbaiki lewat Unggah Lahan| bu_parcels
  da_prod -.->|Nama Lembaga| da_per
  da_prod -.->|Nama petani| md_farmers_detail
  da_prod -.->|Kode lahan| md_parcels_detail
  da_prod -.->|Sel kg → filter Lembaga + periode + petani| md_production_list
  da_ovl -.->|Buka Detail Lahan| md_parcels_detail

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef proto stroke-dasharray:5 5
```

Pola alurnya satu arah: **ringkasan → satu Lembaga → entitas**. Semua Lembaga dan Produksi menyerahkan konteks Lembaga ke Per Lembaga lewat `?lembaga=`; Per Lembaga dan Produksi menyerahkan entitas ke halaman Master Data (Detail Petani / Detail Lahan / Daftar Produksi berfilter) untuk diperbaiki; baris *Perbaiki lewat* dan *Isi lewat* menautkan ke menu pengisian (Master Data atau Bulk Upload). Kartu KPI Ketersediaan Data di Detail Lembaga Petani membuka Per Lembaga dengan Lembaga itu terpilih. Ringkasan Petani dan Komparasi Data Acuan berdiri sendiri (hanya ekspor Excel, tanpa tautan keluar).

## Urutan demo yang disarankan

1. Buka Data Analyst → Ringkasan Petani: pilih Distrik dan Lembaga, klik Analisa, tunjukkan dua tab (Detail Petani, Petani Tanpa Lahan) dan Excel per tab.
2. Buka Ketersediaan Data → Semua Lembaga: baca cincin Skor Keseluruhan dan bar sebaran, klik satu segmen tingkat skor (chip filter aktif muncul), klik Urutkan di kartu Lahan.
3. Di matriks yang sama ganti tampilan Radar → Heatmap → Cakupan modul, klik Perbesar pada satu radar, lalu Berikutnya di modal; tutup, buka Daftar Kerja dan tunjukkan tab Sistemik beserta popover *n Lembaga*.
4. Klik nama Lembaga (atau Buka daftar kerja) → Per Lembaga: angka Index + radar, Prioritas perbaikan, buka seksi berskor terendah, klik baris bermasalah → daftar kerja → Nama Petani membuka Detail Petani di Master Data.
5. Kembali, klik tab Produksi: pilih tahun, buka satu Distrik ▸ Lembaga ▸ petani ▸ lahan, tunjukkan sel kg yang membuka Daftar Produksi berfilter; unduh Excel 2 sheet dengan filter Lembaga.
6. Buka Komparasi Data Acuan: mode Ringkas vs Detail, aktifkan *Hanya yang masih selisih*, klik Edit pada satu Lembaga, ubah satu angka (preview Δ berubah), Simpan.
7. Buka Tumpang Tindih Lahan: filter lebih dari 50% dan chip Duplikat, pilih baris → preview peta A/B/irisan, Berikutnya dengan ↓, Buka Detail Lahan; unduh Spasial → GeoJSON.
8. Pindah ke tab Luar Boundary (klik batang Lembaga teratas) dan Selisih Luas, tutup dengan catatan kaki bahwa keduanya memakai check yang sama dengan Per Lembaga.
