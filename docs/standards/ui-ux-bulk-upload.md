# Standar — UI/UX: Bulk Upload

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Induk: [ui-ux.md](./ui-ux.md) · Terkait: [ui-ux-tables.md](./ui-ux-tables.md) · [ui-ux-map.md](./ui-ux-map.md) · [ui-ux-bulk-upload.md](./ui-ux-bulk-upload.md) · [ui-ux-help.md](./ui-ux-help.md)

## Pola UI/UX & Validasi Bulk Upload

Untuk fitur bulk upload data massal (misalnya Petani, Lembaga Petani, atau Region), ikuti aturan alur dan antarmuka berikut:
- **Alur Step-by-Step**:
  1. Pilih context / parent entity (misalnya Lembaga Petani) di paling atas menggunakan searchable Combobox. Pilihan file input harus tetap *disabled* sampai context dipilih.
  2. Pilih berkas Excel (`.xlsx`) atau CSV. Input file dinonaktifkan jika context di atas belum dipilih.
  3. Pemetaan kolom dinamis (*Dynamic Column Mapping*): sediakan pemetaan drop-down kolom file dengan field target database, lengkap dengan aturan auto-matching.
  4. Hasil validasi dan review: Tampilkan status per baris, jumlah ringkasan valid vs error, serta filter tampilan data.
- **Smart Validations**:
  - Validasi keunikan ID: Cek keunikan baik di tingkat berkas (*file-level*) maupun terhadap database (*DB-level*).
  - Normalisasi data: Konversi format gender (L/P -> M/F), bersihkan format NIK (hanya angka 16 digit), dan parse berbagai format tanggal (Excel serial number atau string tanggal).
- **Download Feedback**:
  - Pengguna wajib diberikan opsi untuk mengunduh laporan hasil validasi baik data penuh (*full data*) maupun baris yang gagal saja (*error-only*), dengan menyertakan kolom "Keterangan" penjelasan error.

## Pola Bulk Upload Shapefile (Data Geospasial)

Untuk upload data geospatial menggunakan Shapefile (`.shp` dalam format ZIP), ikuti pattern berikut:
- **Format Input**: ZIP file berisi `.shp`, `.shx`, `.dbf`, dan file pendukung lainnya
- **Parsing**: Gunakan library `shpjs` untuk membaca geometri dan atribut dari Shapefile (parse buffer ZIP langsung, tanpa ekstraksi manual)
- **Column Mapping**: 
  - Sediakan dropdown mapping untuk setiap kolom dari DBF attributes ke field database target
  - Auto-match kolom berdasarkan similarity name (fuzzy matching)
  - Wajib mapping: Farmer ID/Name, Parcel ID, dan geometry field
- **Geometry Validation**:
  - Validasi tipe geometry (Polygon/MultiPolygon untuk land parcel)
  - Extract centroid untuk location_lat/location_long
  - Convert geometry ke GeoJSON format untuk field polygon
  - Hitung area otomatis dari polygon geometry
- **Smart Validations**:
  - Validasi farmerId terhadap database (must exist & active)
  - Check uniqueness parcelId per farmer (file-level + DB-level)
  - Validasi geometry: tidak boleh null, harus valid polygon
  - Optional fields: planting year (1900-2100), notes
- **Preview & Save**:
  - Tampilkan preview tabel dengan status validasi per row
  - Show geometry info: area (ha), centroid coordinates, polygon complexity
  - Bulk insert dengan transaction-based (all-or-nothing)
  - Auto-increment revision untuk update parcel yang sudah ada
- **Implementasi Reference**: Lihat `src/server/actions/bulk-upload-parcel.ts` (issue #88)
