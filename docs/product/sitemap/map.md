# Peta Fitur — Map

> Bagian dari dokumentasi **Produk** · Peta fitur untuk Miro. Indeks: [README.md](README.md) · Legenda: [legend.md](legend.md) · Sumber: [../pages/map/README.md](../pages/map/README.md)

> **Ringkasan:** Menu peta interaktif: **Peta Lahan** menampilkan sebaran Lembaga, lahan, lahan terdampak NKT, dan patok dengan overlay referensi pemerintah/EUDR dan titik api NASA FIRMS; **Peta BMP** mewarnai poligon lahan satu Lembaga menurut ketersediaan data produksi atau produktivitas; **Peta Rantai Pasok** (prototipe) menggambar aliran TBS Lembaga → agen/RAMP → Mill dari tabel survei. Tiga sub menu, tiga halaman (masing-masing satu halaman peta full-bleed tanpa daftar/detail terpisah).

## Pohon navigasi

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  mp(["Map"]):::menu
  mp_parcel_sub[["Peta Lahan"]]:::sub
  mp_bmp_sub[["Peta BMP"]]:::sub
  mp_supply_sub[["Peta Rantai Pasok 🟠"]]:::sub
  mp_parcel["Peta Lahan"]:::page
  mp_bmp["Peta BMP"]:::page
  mp_supply["Peta Rantai Pasok 🟠"]:::page

  mp --> mp_parcel_sub --> mp_parcel
  mp --> mp_bmp_sub --> mp_bmp
  mp --> mp_supply_sub --> mp_supply

  class mp_supply_sub proto
  class mp_supply proto

  classDef menu fill:#166534,stroke:#14532d,color:#ffffff,font-weight:bold
  classDef sub fill:#dcfce7,stroke:#166534,color:#14532d
  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef proto stroke-dasharray:5 5
```

| Halaman | Route | Katalog |
|---|---|---|
| Peta Lahan | `/admin/map/parcel` | [parcel.md](../pages/map/parcel.md) |
| Peta BMP | `/admin/map/bmp` | [bmp.md](../pages/map/bmp.md) |
| Peta Rantai Pasok 🟠 | `/admin/map/supply-chain` | [supply-chain.md](../pages/map/supply-chain.md) |

Halaman induk `/admin/map` tidak punya isi; ia mengalihkan ke sub menu pertama (urut `order`) yang boleh diakses pengguna. Ketiga peta memakai basemap yang sama (STREET / LIGHT / DARK / SAT / HYBRID; bawaan mengikuti tema aplikasi) dan popup lahan terstandar dengan aksi **Lihat Detail** / **Edit Lahan**.

## Peta Lahan — bagian 1/2 (panel kiri)

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  mp_parcel["Peta Lahan"]:::page

  mp_parcel_hdr("Panel kiri: Peta Lahan (mengambang, bisa diminimalkan)"):::section
  mp_parcel_hdr_c["Judul: Peta Lahan<br/>Tombol: Minimalkan · Buka panel filter · Panduan (?) → Bantuan"]:::content

  mp_parcel_filter("Filter"):::section
  mp_parcel_filter_c["Filter: Provinsi (Semua Provinsi) · Distrik (wajib) · Lembaga Petani (Semua Lembaga Petani)<br/>Tombol: Muat Data<br/>Pesan: Silakan pilih Distrik terlebih dahulu · Tidak ada data untuk filter ini · Data berhasil dimuat<br/>Teks: Filter tertutup otomatis setelah data dimuat"]:::content

  mp_parcel_dl("Dropdown: Unduh Lahan"):::section
  mp_parcel_dl_c["Ekspor: Shapefile (ZIP) · GeoJSON · KML — mengikuti filter aktif, tanpa perlu Muat Data<br/>Pesan: toast jumlah lahan (+ yang dilewati bila geometri invalid)"]:::content

  mp_parcel_legend("Legenda (muncul setelah data dimuat)"):::section
  mp_parcel_legend_c["Layer: Point Lembaga Petani · Point Lahan Petani (bawaan mati) · Area Lahan Petani · Lahan terdampak NKT · Patok lahan (bawaan mati)<br/>Aksi: centang tampil/sembunyi · jumlah fitur · zoom ke layer (ikon / klik label) · unduh per baris<br/>Ekspor: Excel · Shapefile (ZIP) · GeoJSON · KML · PDF (A4 landscape) — format spasial sesuai tipe fitur baris (Point / Polygon)"]:::content

  mp_parcel_xlsx{{"Dialog: Unduh Excel — {baris legenda}"}}:::dialog
  mp_parcel_xlsx_c["Teks: hanya Excel baris lahan + filter satu Lembaga<br/>Field: Sheet (1 sheet · Sheet per Kelompok Tani · Sheet per Blok) · Urutan (Abjad pemilik · Posisi lahan utara → selatan, kiri → kanan)"]:::content

  mp_parcel_overlay("Peta Lainnya (overlay referensi)"):::section
  mp_parcel_overlay_c["Layer: Kemenhut / BIG — Kawasan Hutan · Fungsi Ekosistem Gambut · Penutupan Lahan 2025 · PIPPIB 2026 Periode I · Deforestasi 2024–2025 · Deforestasi 2023–2024<br/>Layer: EUDR (Global Forest Watch) — Tutupan Hutan 2020 (JRC) · Kehilangan Tutupan Pohon ≥ 2021 · Peringatan Deforestasi Terpadu<br/>Teks: legend warna kelas + Sumber per layer aktif · chip n aktif per kelompok<br/>Filter: slider Transparansi (10–100%, bawaan 70%)"]:::content

  mp_parcel_hotspot("Titik Api (Hotspot)"):::section
  mp_parcel_hotspot_c["Filter: Tampilkan titik api (+ jumlah) · Rentang 24 jam / 5 hari / 10 hari / 30 hari<br/>Layer: legenda keyakinan Tinggi · Nominal (Medium) · Rendah + jumlah per kelas<br/>Teks: Deteksi anomali panas VIIRS 375 m, bukan konfirmasi kebakaran · Sumber NASA FIRMS · jeda ±3 jam · dipangkas ke outline Provinsi Riau<br/>Tombol: Lihat Ringkasan · Unduh SHP · Cetak PDF (aktif setelah data lahan dimuat)<br/>Pesan: Kalkulasi jarak titik api selesai — Cetak PDF siap"]:::content

  mp_parcel_hotspot_sum{{"Dialog: Ringkasan titik api"}}:::dialog
  mp_parcel_hotspot_sum_c["Judul: rentang + Data lahan: {wilayah} + sumber<br/>KPI: Total titik se-Riau · Kurang dari 15 km dari Lembaga · bar sebaran keyakinan<br/>Kolom: No · Waktu WIB · Satelit · Keyakinan · FRP · Lembaga Terdekat · Jarak (km) & Arah dari Kantor Lembaga<br/>Aksi: klik baris → zoom ke titik<br/>Tombol: Unduh SHP · Cetak PDF<br/>Teks: tabel dipotong pada 500 baris"]:::content

  mp_parcel_gis("Tambah Data GIS Lain"):::section
  mp_parcel_gis_c["Tab: WMS URL · Shapefile · GeoJSON<br/>Field: Nama layer (opsional) · URL WMS / template tile · Nama layer WMS<br/>Tombol: Tambah Layer · Pilih file Shapefile (ZIP/RAR) · Pilih file GeoJSON<br/>Aksi: centang visibilitas · swatch warna · badge WMS/VEC · hapus · Zoom ke {nama} · Warna tunggal / Warna per {atribut}<br/>Teks: diproses di browser, layer sesi saja (tidak disimpan)"]:::content

  mp_parcel_files[("Berkas unduhan: SHP ZIP · GeoJSON · KML · Excel · PDF")]:::data
  mp_ext_gov[/"ArcGIS pemerintah: geoportal Kemenhut & Satu Peta BIG (via proxy MIS)"/]:::external
  mp_ext_gfw[/"Global Forest Watch (langsung)"/]:::external
  mp_ext_firms[/"NASA FIRMS VIIRS (via proxy MIS)"/]:::external

  mp_parcel --> mp_parcel_hdr --> mp_parcel_hdr_c
  mp_parcel --> mp_parcel_filter --> mp_parcel_filter_c
  mp_parcel --> mp_parcel_dl --> mp_parcel_dl_c
  mp_parcel --> mp_parcel_legend --> mp_parcel_legend_c
  mp_parcel_legend -.->|Excel| mp_parcel_xlsx --> mp_parcel_xlsx_c
  mp_parcel --> mp_parcel_overlay --> mp_parcel_overlay_c
  mp_parcel --> mp_parcel_hotspot --> mp_parcel_hotspot_c
  mp_parcel_hotspot -.->|Lihat Ringkasan| mp_parcel_hotspot_sum --> mp_parcel_hotspot_sum_c
  mp_parcel --> mp_parcel_gis --> mp_parcel_gis_c
  mp_parcel_dl ==>|Unduh| mp_parcel_files
  mp_parcel_legend ==>|Unduh per baris| mp_parcel_files
  mp_parcel_hotspot ==>|Unduh SHP / Cetak PDF| mp_parcel_files
  mp_ext_gov -.->|tile overlay| mp_parcel_overlay
  mp_ext_gfw -.->|tile overlay| mp_parcel_overlay
  mp_ext_firms -.->|titik api| mp_parcel_hotspot

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

## Peta Lahan — bagian 2/2 (peta, popup, panel kanan, tombol)

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  mp_parcel["Peta Lahan"]:::page

  mp_parcel_map("Peta (full-bleed)"):::section
  mp_parcel_map_c["Layer: Basemap STREET / LIGHT / DARK / SAT / HYBRID<br/>Layer: Point Lembaga Petani (hijau) · Point Lahan Petani (biru) · Area Lahan Petani (ungu) · Lahan terdampak NKT (merah) · Patok lahan (kuning)<br/>Layer: Overlay Peta Lainnya · Titik api · Layer GIS tambahan · Highlight lahan terpilih (kuning, selalu tampil)<br/>Teks: label nama lembaga di bawah titik · nama petani di dalam poligon bila muat · Legend"]:::content

  mp_parcel_popup_other{{"Popup fitur: Lembaga Petani · Titik Api · Patok"}}:::dialog
  mp_parcel_popup_other_c["Lembaga Petani: Kode · Distrik · Koordinat<br/>Titik Api: usia deteksi · Waktu Deteksi (WIB) · Satelit · Keyakinan · FRP · Koordinat · catatan sumber FIRMS<br/>Patok: kode patok · Lahan · No · Kondisi · Koordinat<br/>Teks: popup bisa digeser lewat pegangan"]:::content

  mp_parcel_popup{{"Popup Lahan"}}:::dialog
  mp_parcel_popup_c["Judul: nama petani · ID Petani · ID Lahan · Lembaga Petani · Luas Lahan (ha)<br/>Tab: Detail Lahan (Tahun Tanam · Komoditas · Status Lahan · NKT · Patok) · Pelatihan Petani (paket + centang + tanggal) · Produksi (Rata-rata / per tahun, grafik batang bulanan kg)<br/>Tombol: Profil Lahan (PDF) · Lihat Detail · Edit Lahan<br/>Pesan: Gagal memuat pelatihan. · Belum ada data produksi. · Gagal membuat PDF profil lahan"]:::content

  mp_parcel_edit{{"Modal: Edit Lahan"}}:::dialog
  mp_parcel_edit_c["Field: formulir lahan + pemilik (dimuat saat modal dibuka)<br/>Pesan: Lahan tidak ditemukan atau di luar akses Anda · Gagal memuat data lahan<br/>Teks: setelah simpan, peta memuat ulang data dengan filter aktif"]:::content

  mp_parcel_passport[("PDF Profil Lahan: kartu ringkasan · Layout Lahan + tetangga · Legalitas & Dokumen · Pelatihan · Produksi")]:::data

  mp_parcel_ruler("Panel kanan atas: Ukur jarak & luas"):::section
  mp_parcel_ruler_c["Tombol: toggle Ukur jarak & luas · Hapus titik terakhir · Hapus ukuran<br/>Teks: Jarak (≥ 2 titik) · Luas (≥ 3 titik) · Klik pada peta untuk mulai mengukur. · {n} titik · klik menambah · Esc selesai."]:::content

  mp_parcel_list("Panel kanan atas: Daftar Lahan (n)"):::section
  mp_parcel_list_c["Filter: Cari nama / ID petani / ID lahan<br/>Kolom: Aksi (Zoom ke lahan) · Petani (nama + kode) · ID Lahan<br/>Pesan: Tidak ada lahan."]:::content

  mp_parcel_tools("Tombol kanan bawah"):::section
  mp_parcel_tools_c["Tombol: Terrain 3D (relief AWS Terrain Tiles) · Kompas — Kembali ke utara & tampilan 2D · Putar kiri 30° · Putar kanan 30° · Miringkan 15° (3D) · Tegakkan 15° (2D) · Zoom ke semua data<br/>Tombol: Basemap STREET / LIGHT / DARK / SAT / HYBRID<br/>Teks: SAT & HYBRID menggagalkan capture cetak PDF"]:::content

  mp_ext_basemap[/"Tile basemap: OpenStreetMap · OpenFreeMap · Google (SAT/HYBRID) · AWS Terrain Tiles"/]:::external
  md_parcels_detail["Detail Lahan"]:::page

  mp_parcel --> mp_parcel_map --> mp_parcel_map_c
  mp_parcel_map -.->|Klik fitur| mp_parcel_popup_other --> mp_parcel_popup_other_c
  mp_parcel_map -.->|Klik lahan| mp_parcel_popup --> mp_parcel_popup_c
  mp_parcel_popup -.->|Edit Lahan| mp_parcel_edit --> mp_parcel_edit_c
  mp_parcel_popup ==>|Profil Lahan| mp_parcel_passport
  mp_parcel_popup -.->|Lihat Detail| md_parcels_detail
  mp_parcel --> mp_parcel_ruler --> mp_parcel_ruler_c
  mp_parcel --> mp_parcel_list --> mp_parcel_list_c
  mp_parcel_list -.->|Zoom ke lahan| mp_parcel_map
  mp_parcel --> mp_parcel_tools --> mp_parcel_tools_c
  mp_ext_basemap -.->|tile| mp_parcel_map

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

## Peta BMP

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  mp_bmp["Peta BMP"]:::page

  mp_bmp_hdr("Panel kiri: Peta BMP (mengambang, bisa diminimalkan)"):::section
  mp_bmp_hdr_c["Judul: Peta BMP<br/>Tombol: Minimalkan · Buka panel filter · Panduan (?) → Bantuan"]:::content

  mp_bmp_filter("Filter"):::section
  mp_bmp_filter_c["Filter: Provinsi (Semua Provinsi) · Distrik (Semua Distrik) · Lembaga Petani (wajib)<br/>Tombol: Muat Data<br/>Teks: Lembaga Petani wajib dipilih. Provinsi & Distrik hanya menyaring daftar Lembaga Petani.<br/>Pesan: Pilih Lembaga Petani lalu klik Muat Data untuk menampilkan peta. · Silakan pilih Lembaga Petani terlebih dahulu · Tidak ada lahan untuk filter ini · Data berhasil dimuat"]:::content

  mp_bmp_avail("Layer: Ketersediaan Data Produksi (radio)"):::section
  mp_bmp_avail_c["Tombol: Aktifkan layer ini<br/>Layer: Baik (di atas 2 tahun) · Cukup (min. 1 tahun) · Kurang (di bawah 1 tahun) · Tidak ada data — centang + jumlah persil<br/>Teks: Kategori dihitung dari run bulan berturut-turut produksi yang tertaut ke lahan."]:::content

  mp_bmp_prod("Layer: Produktivitas (Ton/Ha/tahun) (radio)"):::section
  mp_bmp_prod_c["Tombol: Aktifkan layer ini<br/>Filter: Tahun (Rata-rata · tahun tersedia)<br/>Layer: Tinggi (min. 20) · Sedang (15–20) · Rendah (10–15) · Sangat Rendah (di bawah 10) · Tidak ada data — centang + jumlah<br/>Teks: produksi tahun terpilih disetahunkan (× 12 ÷ bulan ber-data Lembaga) ÷ luas persil, sama dengan BMP Dashboard"]:::content

  mp_bmp_export("Tombol cetak & ekspor (label ikut layer aktif)"):::section
  mp_bmp_export_c["Tombol: Cetak Peta dan Matriks Ketersediaan Data / Cetak Peta dan Tabel Produktivitas (PDF)<br/>Ekspor: Download Ketersediaan Data (Excel) — Nama · ID Petani · ID Lahan · Status · Luas Lahan (Ha) · kolom per bulan<br/>Ekspor: Download Produktivitas (Excel) — Nama · ID Petani · ID Lahan · Luas Lahan (Ha) · kolom per tahun · Rata-rata<br/>Pesan: Gagal mengambil gambar peta. Coba basemap StreetMap/Light/Dark (bukan Satellite/Hybrid)."]:::content

  mp_bmp_files[("Berkas: peta-bmp-{lembaga}.pdf · Excel Ketersediaan Data / Produktivitas")]:::data

  mp_bmp_map("Peta (full-bleed)"):::section
  mp_bmp_map_c["Layer: Basemap STREET / LIGHT / DARK / SAT / HYBRID<br/>Layer: Area lahan (poligon berwarna kelas layer aktif · Tidak ada data = outline saja) · Label nama petani<br/>Teks: Legend ikut layer aktif · tanpa titik centroid"]:::content

  mp_bmp_popup{{"Popup Lahan BMP"}}:::dialog
  mp_bmp_popup_c["Judul: nama petani · ID Petani · ID Lahan · Lembaga Petani<br/>Teks: badge Ketersediaan Data (Baik/Cukup/Kurang/Tidak ada data) · badge Produktivitas (tahun / rata-rata)<br/>Tab: Detail Lahan (Luas · Tahun Tanam · Komoditas · Status Lahan · Run Bulan Berturut · Periode Awal · Periode Akhir · Produktivitas · Tahun Terdata / Bulan Terdata n/12) · Produksi Bulanan (grafik)<br/>Tombol: Lihat Detail · Edit Lahan"]:::content

  mp_bmp_edit{{"Modal: Edit Lahan"}}:::dialog
  mp_bmp_edit_c["Field: formulir lahan + pemilik (dimuat saat modal dibuka)<br/>Pesan: Lahan tidak ditemukan atau di luar akses Anda · Gagal memuat data lahan<br/>Teks: setelah simpan, peta memuat ulang data"]:::content

  mp_bmp_matrix("Panel kanan: Ketersediaan Data per Lahan (bawaan diminimalkan)"):::section
  mp_bmp_matrix_c["Tombol: Buka tabel ketersediaan data · Minimalkan<br/>Filter: Cari nama / ID petani / ID lahan<br/>Kolom: Aksi (Zoom ke lahan) · Nama · ID Petani · ID Lahan · bulan dikelompokkan per tahun (sel hijau = ada data)<br/>Teks: Legenda matriks Ada data produksi · Tidak ada<br/>Pesan: Tidak ada lahan."]:::content

  mp_bmp_tools("Tombol kanan bawah"):::section
  mp_bmp_tools_c["Tombol: Zoom ke semua data · Basemap STREET / LIGHT / DARK / SAT / HYBRID"]:::content

  md_parcels_detail["Detail Lahan"]:::page

  mp_bmp --> mp_bmp_hdr --> mp_bmp_hdr_c
  mp_bmp --> mp_bmp_filter --> mp_bmp_filter_c
  mp_bmp --> mp_bmp_avail --> mp_bmp_avail_c
  mp_bmp --> mp_bmp_prod --> mp_bmp_prod_c
  mp_bmp --> mp_bmp_export --> mp_bmp_export_c
  mp_bmp_export ==>|Cetak / Download| mp_bmp_files
  mp_bmp --> mp_bmp_map --> mp_bmp_map_c
  mp_bmp_map -.->|Klik lahan| mp_bmp_popup --> mp_bmp_popup_c
  mp_bmp_popup -.->|Edit Lahan| mp_bmp_edit --> mp_bmp_edit_c
  mp_bmp_popup -.->|Lihat Detail| md_parcels_detail
  mp_bmp --> mp_bmp_matrix --> mp_bmp_matrix_c
  mp_bmp_matrix -.->|Zoom ke lahan| mp_bmp_map
  mp_bmp --> mp_bmp_tools --> mp_bmp_tools_c

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

## Peta Rantai Pasok 🟠

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  mp_supply["Peta Rantai Pasok 🟠"]:::page

  mp_supply_hdr("Panel kiri (bisa dilipat)"):::section
  mp_supply_hdr_c["Judul: Peta Rantai Pasok + badge Prototipe · Panduan (?) → Bantuan<br/>KPI: total TBS · % tergambar · tautan Dashboard (membawa filter)<br/>Tab: Ringkas (Lembaga → Mill) · Detail (singgah agen/RAMP bertitik + titik lahan)<br/>Teks: chip Menyorot: … (✕) saat jaringan disorot · posisi lipat tiap bagian diingat per browser"]:::content

  mp_supply_filter("Filter (terbuka bawaan, sama dengan Dashboard)"):::section
  mp_supply_filter_c["Filter: Distrik · Kategori (Swadaya/Ex-Plasma) · UL & Non-UL · Tahun<br/>Filter: Lembaga › Agen·KT/Koperasi › RAMP › Mill (faset)<br/>Tombol: ↺ Reset<br/>Teks: tersimpan di URL, peta menyesuaikan tiap filter berubah"]:::content

  mp_supply_layers("Lapisan"):::section
  mp_supply_layers_c["Filter: garis alir · animasi arah · label · titik lahan · garis lahan → Mill<br/>Teks: saklar diingat per browser"]:::content

  mp_supply_overlay("Peta Lainnya (overlay referensi, sama dengan Peta Lahan)"):::section
  mp_supply_overlay_c["Layer: Kemenhut / BIG — Kawasan Hutan · Fungsi Ekosistem Gambut · Penutupan Lahan 2025 · PIPPIB 2026 Periode I · Deforestasi 2024–2025 · Deforestasi 2023–2024<br/>Layer: EUDR (Global Forest Watch) — Tutupan Hutan 2020 (JRC) · Kehilangan Tutupan Pohon ≥ 2021 · Peringatan Deforestasi Terpadu<br/>Teks: legend + Sumber per layer · visual saja (belum ada hitungan tumpang tindih) · tidak diingat<br/>Filter: slider Transparansi"]:::content

  mp_supply_legend("Legenda (panel) & Ringkasan"):::section
  mp_supply_legend_c["Legenda: warna jalur · contoh tebal garis 3 tonase · titik Lembaga / offtaker · 3 ikon Mill<br/>Ringkasan: tonase tergambar / tidak tergambar · daftar nama Mill tanpa koordinat · Lembaga tanpa titik · offtaker dilewati tanpa titik + tonase"]:::content

  mp_supply_map("Peta (full-bleed)"):::section
  mp_supply_map_c["Layer: garis alir melengkung — warna = jalur · tebal ∝ √tonase · dash putih beranimasi (arah) / panah bila animasi mati<br/>Layer: titik Lembaga · offtaker bertitik · ikon pabrik Mill (biru UL · abu · abu muda putus-putus = PKS belum pasti) + halo ∝ tonase · titik lahan (bertepi gelap = koordinat survei)<br/>Layer: label selektif — 8 terbesar per jenis selalu, sisanya zoom ≥ 10<br/>Aksi: hover = tooltip nama + tonase & garis menyala · klik node = sorot jaringan, sisanya diredupkan"]:::content

  mp_supply_popup{{"Popup: Mill · Lembaga · offtaker · lahan · garis"}}:::dialog
  mp_supply_popup_c["Mill: badge UL · UML ID · Distrik · porsi · status · RSPO · Lembaga·offtaker · jarak rata-rata · Lembaga teratas<br/>Lembaga: porsi · % UL · % PKS pasti · offtaker utama · jarak · Mill tujuan<br/>offtaker: aksi hanya bila tertangkap filter · pembeli kedua non-RAMP → keterangan<br/>Tombol: Jadikan filter · Lihat di Dashboard<br/>Teks: auto-pan di kanan panel, bisa digeser"]:::content

  mp_supply_ctrl("Tumpukan kontrol kanan atas"):::section
  mp_supply_ctrl_c["Tombol: zoom +/− · Paskan · Lapisan (popover saklar + Peta Lainnya) · Basemap (popover STREET / LIGHT / DARK / SAT / HYBRID)"]:::content

  mp_supply_strip("Strip legenda mendatar (bawah tengah)"):::section
  mp_supply_strip_c["Legenda: warna jalur · Lembaga · offtaker · 3 ikon Mill<br/>Tombol: ✕ sembunyikan ↔ chip Legenda (diingat per browser)<br/>Teks: digeser ke kanan selebar panel saat panel terbuka"]:::content

  mp_supply_src[("Tabel CSV survei rantai pasok 2025 (lokal / S3 privat), bukan DB · titik lahan dari poligon MIS")]:::data
  db_supply["Dashboard Rantai Pasok 🟠"]:::page

  mp_supply --> mp_supply_hdr --> mp_supply_hdr_c
  mp_supply --> mp_supply_filter --> mp_supply_filter_c
  mp_supply --> mp_supply_layers --> mp_supply_layers_c
  mp_supply --> mp_supply_overlay --> mp_supply_overlay_c
  mp_supply --> mp_supply_legend --> mp_supply_legend_c
  mp_supply --> mp_supply_map --> mp_supply_map_c
  mp_supply_map -.->|Klik node / garis| mp_supply_popup --> mp_supply_popup_c
  mp_supply_popup -.->|Jadikan filter| mp_supply_filter
  mp_supply_popup -.->|Lihat di Dashboard| db_supply
  mp_supply_hdr -.->|Dashboard| db_supply
  mp_supply --> mp_supply_ctrl --> mp_supply_ctrl_c
  mp_supply --> mp_supply_strip --> mp_supply_strip_c
  mp_supply_src -.->|dibaca| mp_supply
  mp_ext_gov -.->|tile overlay| mp_supply_overlay
  mp_ext_gfw -.->|tile overlay| mp_supply_overlay

  mp_ext_gov[/"ArcGIS pemerintah: geoportal Kemenhut & Satu Peta BIG (via proxy MIS)"/]:::external
  mp_ext_gfw[/"Global Forest Watch (langsung)"/]:::external

  class mp_supply proto
  class db_supply proto

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  classDef proto stroke-dasharray:5 5
```

Garis di peta ini = garis lurus (dilengkungkan agar tidak tumpang tindih) menurut data pengakuan survei, bukan rute angkut.

## Alur lintas menu

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  mp_parcel["Peta Lahan"]:::page
  mp_bmp["Peta BMP"]:::page
  mp_supply["Peta Rantai Pasok 🟠"]:::page
  mp_parcel_popup{{"Popup Lahan"}}:::dialog
  mp_bmp_popup{{"Popup Lahan BMP"}}:::dialog
  mp_parcel_edit{{"Modal: Edit Lahan"}}:::dialog
  mp_bmp_edit{{"Modal: Edit Lahan"}}:::dialog
  md_parcels_detail["Detail Lahan"]:::page
  db_supply["Dashboard Rantai Pasok 🟠"]:::page
  hp_topic["Halaman Topik"]:::page
  mp_x_lahan_db[("Data lahan Master Data")]:::data
  mp_x_passport[("PDF Profil Lahan")]:::data
  mp_ext_gov[/"ArcGIS pemerintah: geoportal Kemenhut & Satu Peta BIG (via proxy MIS)"/]:::external
  mp_ext_gfw[/"Global Forest Watch"/]:::external
  mp_ext_firms[/"NASA FIRMS"/]:::external

  mp_parcel -.->|Klik lahan| mp_parcel_popup
  mp_bmp -.->|Klik lahan| mp_bmp_popup
  mp_parcel_popup -.->|Lihat Detail| md_parcels_detail
  mp_bmp_popup -.->|Lihat Detail| md_parcels_detail
  mp_parcel_popup -.->|Edit Lahan| mp_parcel_edit ==>|Simpan| mp_x_lahan_db
  mp_bmp_popup -.->|Edit Lahan| mp_bmp_edit ==>|Simpan| mp_x_lahan_db
  mp_x_lahan_db -.->|dibaca| mp_parcel
  mp_x_lahan_db -.->|dibaca| mp_bmp
  mp_parcel_popup ==>|Profil Lahan| mp_x_passport
  mp_supply -.->|Lihat di Dashboard, membawa filter| db_supply
  db_supply -.->|Lihat di Peta, membawa filter| mp_supply
  mp_parcel -.->|Panduan| hp_topic
  mp_bmp -.->|Panduan| hp_topic
  mp_supply -.->|Panduan| hp_topic
  mp_ext_gov -.->|Peta Lainnya| mp_parcel
  mp_ext_gfw -.->|Peta Lainnya| mp_parcel
  mp_ext_gov -.->|Peta Lainnya| mp_supply
  mp_ext_gfw -.->|Peta Lainnya| mp_supply
  mp_ext_firms -.->|Titik Api| mp_parcel

  class mp_supply proto
  class db_supply proto

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  classDef proto stroke-dasharray:5 5
```

- **Lihat Detail** di popup Peta Lahan & Peta BMP membuka halaman Detail Lahan di Master Data › Lahan; **Edit Lahan** menyimpan ke data lahan yang sama lalu peta memuat ulang (lihat [master-data.md](master-data.md)).
- Filter Peta Rantai Pasok dan Dashboard Rantai Pasok sama dan saling terbawa lewat URL (lihat [dashboard.md](dashboard.md)).
- Proxy titik api NASA FIRMS juga dipakai Dashboard Fire Alert; overlay Peta Lainnya dipakai bersama Peta Lahan dan Peta Rantai Pasok.
- Peta Sebaran Lahan di detail Lembaga/Petani (Master Data) memakai popup lahan dan aksi yang sama, tetapi berada di menu Master Data.

## Urutan demo yang disarankan

1. Buka Map → Peta Lahan: pilih Distrik (wajib), opsional Lembaga Petani, klik **Muat Data**; peta auto-zoom, panel Filter tertutup, Legenda muncul.
2. Mainkan Legenda: nyalakan Point Lahan & Patok lahan (dimuat malas), klik label untuk zoom ke layer, tunjukkan ikon unduh per baris (Excel per Kelompok Tani / Blok, Shapefile, PDF).
3. Klik satu lahan: popup Detail Lahan → tab Pelatihan & Produksi → **Profil Lahan** (PDF) → **Lihat Detail** ke Master Data › Lahan → **Edit Lahan** dari popup, simpan, peta memuat ulang.
4. Buka **Peta Lainnya**: centang Kawasan Hutan (Kemenhut) dan Tutupan Hutan 2020 (GFW), geser Transparansi; lalu **Titik Api** 30 hari → tunggu kalkulasi jarak → Ringkasan titik api → Cetak PDF.
5. Tunjukkan Tambah Data GIS Lain (WMS/Shapefile/GeoJSON), Ukur jarak & luas, Daftar Lahan, Terrain 3D + kompas/putar/miring, ganti basemap SAT.
6. Pindah ke Peta BMP: pilih Lembaga Petani (wajib) → Muat Data; ganti radio Ketersediaan Data ↔ Produktivitas (pilih Tahun), buka panel matriks kanan, lalu Cetak Peta (PDF) dan Download Excel.
7. Tutup dengan Peta Rantai Pasok (prototipe): toggle Ringkas ↔ Detail, klik satu Mill untuk menyorot jaringannya, **Jadikan filter**, lalu **Lihat di Dashboard**.
