# Peta Fitur — Tools

> Bagian dari dokumentasi **Produk** · Peta fitur untuk Miro. Indeks: [README.md](README.md) · Legenda: [legend.md](legend.md) · Sumber: [../pages/tools/README.md](../pages/tools/README.md)

> **Ringkasan:** Menu perawatan angka dashboard: membekukan data menjadi **snapshot** historis agar Main Dashboard dan BMP Dashboard membaca angka yang sudah dihitung, bukan query langsung. Dua sub menu, empat halaman.

## Pohon navigasi

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  tl(["Tools"]):::menu
  tl_snap[["Dashboard Snapshot"]]:::sub
  tl_snapbmp[["Dashboard Snapshot BMP"]]:::sub
  tl_snap_list["Daftar Snapshot"]:::page
  tl_snap_detail["Detail Snapshot"]:::page
  tl_snapbmp_list["Daftar Snapshot BMP"]:::page
  tl_snapbmp_detail["Detail Snapshot BMP"]:::page

  tl --> tl_snap --> tl_snap_list
  tl_snap_list -.->|Lihat| tl_snap_detail
  tl --> tl_snapbmp --> tl_snapbmp_list
  tl_snapbmp_list -.->|Lihat| tl_snapbmp_detail

  classDef menu fill:#166534,stroke:#14532d,color:#ffffff,font-weight:bold
  classDef sub fill:#dcfce7,stroke:#166534,color:#14532d
  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
```

| Halaman | Route | Katalog |
|---|---|---|
| Daftar Snapshot | `/admin/tools/snapshot` | [snapshot/list.md](../pages/tools/snapshot/list.md) |
| Detail Snapshot | `/admin/tools/snapshot/{id}` | [snapshot/detail.md](../pages/tools/snapshot/detail.md) |
| Daftar Snapshot BMP | `/admin/tools/snapshot-bmp` | [snapshot-bmp/list.md](../pages/tools/snapshot-bmp/list.md) |
| Detail Snapshot BMP | `/admin/tools/snapshot-bmp/{id}` | [snapshot-bmp/detail.md](../pages/tools/snapshot-bmp/detail.md) |

Halaman induk `/admin/tools` tidak punya isi; ia mengalihkan ke sub menu pertama yang boleh diakses.

## Daftar Snapshot

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  tl_snap_list["Daftar Snapshot"]:::page

  tl_snap_list_hdr("Header"):::section
  tl_snap_list_hdr_c["Judul: Dashboard Snapshot<br/>Tombol: Panduan (?) → Bantuan"]:::content

  tl_snap_list_gen("Kartu: Buat Snapshot Baru"):::section
  tl_snap_list_gen_c["Tombol: Generate Snapshot<br/>Teks: Snapshot dibuat untuk Semua Distrik & Semua Tahun<br/>Pesan: Snapshot berhasil dibuat"]:::content

  tl_snap_list_tbl("Tabel: Daftar snapshot"):::section
  tl_snap_list_tbl_c["Filter: Cari distrik atau pembuat<br/>Kolom: Aksi · Tanggal Snapshot · Distrik · Tahun Bergabung<br/>Kolom: Total Lembaga Petani · Total Kelompok Tani · Total Petani<br/>Kolom: Petani L · Petani P · Dibuat Oleh<br/>Aksi: Lihat · Nonaktifkan<br/>Ekspor: Excel (+ Total Persil · Luas Lahan)"]:::content

  tl_snap_list_del{{"Dialog: Nonaktifkan Snapshot"}}:::dialog
  tl_snap_list_del_c["Pesan: Snapshot akan dinonaktifkan (soft delete) … Lanjutkan?<br/>Tombol: Batal · Nonaktifkan"]:::content

  tl_snap_db[("Snapshot tersimpan (JSON)")]:::data
  tl_snap_detail["Detail Snapshot"]:::page

  tl_snap_list --> tl_snap_list_hdr --> tl_snap_list_hdr_c
  tl_snap_list --> tl_snap_list_gen --> tl_snap_list_gen_c
  tl_snap_list --> tl_snap_list_tbl --> tl_snap_list_tbl_c
  tl_snap_list_tbl -.->|Nonaktifkan| tl_snap_list_del --> tl_snap_list_del_c
  tl_snap_list_gen ==>|Generate| tl_snap_db
  tl_snap_list_tbl -.->|Lihat| tl_snap_detail

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

## Detail Snapshot

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  tl_snap_detail["Detail Snapshot"]:::page

  tl_snap_detail_hdr("Header"):::section
  tl_snap_detail_hdr_c["Judul: Snapshot — {tanggal}<br/>Tombol: Kembali"]:::content

  tl_snap_detail_info("Kartu: Informasi Snapshot"):::section
  tl_snap_detail_info_c["Field: Tanggal Snapshot · Filter Distrik · Filter Tahun · Dibuat Oleh"]:::content

  tl_snap_detail_kpi("Kartu ringkasan (5 kartu tematik)"):::section
  tl_snap_detail_kpi_c["KPI: Kelembagaan (Lembaga · Kelompok Tani)<br/>KPI: Sertifikasi (RSPO · ISPO · SAP/MAP)<br/>KPI: Petani (total + bar L/P)<br/>KPI: Lahan (persil · luas)<br/>KPI: Pelatihan (4 paket, % petani)"]:::content

  tl_snap_detail_tbl("Tabel: Ringkasan per Lembaga Petani"):::section
  tl_snap_detail_tbl_c["Filter: Cari lembaga petani<br/>Kolom: Nama · Kelompok Tani · Total Petani · Total Persil · Luas Lahan · Cakupan Pelatihan (n/4 paket)<br/>Ekspor: Excel · Download PDF (SNAPSHOT DASHBOARD)"]:::content

  tl_snap_detail --> tl_snap_detail_hdr --> tl_snap_detail_hdr_c
  tl_snap_detail --> tl_snap_detail_info --> tl_snap_detail_info_c
  tl_snap_detail --> tl_snap_detail_kpi --> tl_snap_detail_kpi_c
  tl_snap_detail --> tl_snap_detail_tbl --> tl_snap_detail_tbl_c

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
```

## Daftar Snapshot BMP

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  tl_snapbmp_list["Daftar Snapshot BMP"]:::page

  tl_snapbmp_list_hdr("Header"):::section
  tl_snapbmp_list_hdr_c["Judul: Dashboard Snapshot BMP<br/>Tombol: Panduan (?) → Bantuan"]:::content

  tl_snapbmp_list_gen("Kartu: Buat Snapshot Baru"):::section
  tl_snapbmp_list_gen_c["Tombol: Generate Snapshot<br/>Teks: Snapshot dibuat untuk Semua Data — filter dilakukan di BMP Dashboard<br/>Pesan: Snapshot BMP berhasil dibuat"]:::content

  tl_snapbmp_list_tbl("Tabel: Daftar snapshot"):::section
  tl_snapbmp_list_tbl_c["Filter: Cari distrik atau pembuat<br/>Kolom: Aksi · Tanggal Snapshot · Distrik<br/>Kolom: Total Produksi (Ton) · Lahan Ber-data · Luas Terdata (Ha) · Petani Terdata<br/>Kolom: Dibuat Oleh<br/>Aksi: Lihat · Nonaktifkan<br/>Ekspor: Excel"]:::content

  tl_snapbmp_list_del{{"Dialog: Nonaktifkan Snapshot"}}:::dialog
  tl_snapbmp_list_del_c["Pesan: Snapshot akan dinonaktifkan (soft delete) … Lanjutkan?<br/>Tombol: Batal · Nonaktifkan"]:::content

  tl_snapbmp_db[("Snapshot BMP tersimpan (JSON)")]:::data
  tl_snapbmp_detail["Detail Snapshot BMP"]:::page

  tl_snapbmp_list --> tl_snapbmp_list_hdr --> tl_snapbmp_list_hdr_c
  tl_snapbmp_list --> tl_snapbmp_list_gen --> tl_snapbmp_list_gen_c
  tl_snapbmp_list --> tl_snapbmp_list_tbl --> tl_snapbmp_list_tbl_c
  tl_snapbmp_list_tbl -.->|Nonaktifkan| tl_snapbmp_list_del --> tl_snapbmp_list_del_c
  tl_snapbmp_list_gen ==>|Generate| tl_snapbmp_db
  tl_snapbmp_list_tbl -.->|Lihat| tl_snapbmp_detail

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

## Detail Snapshot BMP

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  tl_snapbmp_detail["Detail Snapshot BMP"]:::page

  tl_snapbmp_detail_hdr("Header"):::section
  tl_snapbmp_detail_hdr_c["Judul: Snapshot BMP — {tanggal}<br/>Tombol: Kembali"]:::content

  tl_snapbmp_detail_info("Kartu: Informasi Snapshot"):::section
  tl_snapbmp_detail_info_c["Field: Tanggal Snapshot · Filter Distrik · Dibuat Oleh"]:::content

  tl_snapbmp_detail_kpi("Kartu skor BMP"):::section
  tl_snapbmp_detail_kpi_c["KPI: Produktivitas (Ton/Ha/tahun) · Total Produksi (Ton)<br/>KPI: Luasan (Ha terdata, % dari total) · Petani Terdata<br/>Teks: periode kumulatif semua tahun"]:::content

  tl_snapbmp_detail_tbl("Tabel: Ringkasan per Lembaga Petani"):::section
  tl_snapbmp_detail_tbl_c["Filter: Cari lembaga petani<br/>Kolom: Nama · Kategori (Ex-Plasma/Swadaya) · Distrik<br/>Kolom: Produksi (Ton) · Produktivitas (Ton/Ha/tahun)<br/>Kolom: Lahan Ber-data · Luas Terdata (Ha) · Petani Terdata<br/>Ekspor: Excel (8 kolom tabel)"]:::content

  tl_snapbmp_detail --> tl_snapbmp_detail_hdr --> tl_snapbmp_detail_hdr_c
  tl_snapbmp_detail --> tl_snapbmp_detail_info --> tl_snapbmp_detail_info_c
  tl_snapbmp_detail --> tl_snapbmp_detail_kpi --> tl_snapbmp_detail_kpi_c
  tl_snapbmp_detail --> tl_snapbmp_detail_tbl --> tl_snapbmp_detail_tbl_c

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
```

## Alur lintas menu

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  tl_snap_list["Daftar Snapshot"]:::page
  tl_snapbmp_list["Daftar Snapshot BMP"]:::page
  tl_snap_db[("Snapshot tersimpan")]:::data
  tl_snapbmp_db[("Snapshot BMP tersimpan")]:::data
  db_main["Main Dashboard"]:::page
  db_bmp["BMP Dashboard (Produksi)"]:::page

  tl_snap_list ==>|Generate| tl_snap_db -.->|dibaca| db_main
  tl_snapbmp_list ==>|Generate| tl_snapbmp_db -.->|dibaca| db_bmp

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

Main Dashboard dan BMP Dashboard menampilkan snapshot **terbaru**; angka berubah hanya setelah snapshot baru dibuat (lihat [dashboard.md](dashboard.md)).

## Urutan demo yang disarankan

1. Buka Tools → Dashboard Snapshot, tunjukkan daftar dan tanggal snapshot terakhir.
2. Klik Generate Snapshot, tunggu toast, baris baru muncul di atas.
3. Buka Lihat → Detail Snapshot: kartu ringkasan, tabel per Lembaga, Download PDF.
4. Kembali ke Main Dashboard: angka kini mengikuti snapshot baru.
5. Ulangi pola yang sama untuk Snapshot BMP → BMP Dashboard.
