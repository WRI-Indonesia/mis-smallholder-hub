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
  - Auto-match kolom: header di-lowercase + trim lalu dicocokkan **persis** ke daftar alias per field (`autoMatchColumns`, `src/lib/parcel-bulk-mapping.ts`) — bukan fuzzy; alias baru = tambah ke daftar
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

## Template & pemetaan kolom (#419, #420)

- **Setiap halaman/tab Upload Massal wajib punya tombol "Unduh Template"** (keputusan owner 2026-10-11, #419) — Excel untuk unggahan tabel, ZIP shapefile contoh + `BACA-SAYA.txt` untuk unggahan spasial (Poligon, Pohon). Tombol tidak digate izin dan aktif walau context (Lembaga) belum dipilih.
- **Satu sumber**: tajuk/atribut template diambil dari daftar field parser (`src/lib/*-upload-fields.ts`, `PARCEL_UPLOAD_FIELDS`, `MARKER_UPLOAD_FIELDS`, `PARCEL_DETAIL_TARGET_FIELDS`); spesifikasi template di `src/lib/bulk-upload-templates.ts`, perakit (exceljs / shp-write + jszip) di `bulk-upload-template-download.ts`. Test penjaga `bulk-upload-templates.test.ts`: **tiap tajuk template terpetakan otomatis ke field-nya** dan ZIP contoh terbaca `shpjs`. Mengganti label/tajuk = tetap cocok alias (tajuk lama dijadikan alias agar berkas lapangan lama tak putus, contoh Produksi `Periode (YYYY-MM)`).
- **Excel template**: sheet `Data` (dibaca lebih dulu oleh `readSpreadsheetFile`) berisi tajuk persis alias + baris contoh; sheet `Petunjuk` berisi kolom · wajib · format dengan nama kolom **dikutip** (agar tak lolos deteksi tajuk bila `Data` kosong). Wajib/format ditaruh di catatan sel tajuk, bukan di teks tajuk. Kolom ID/NIK/Periode berformat teks (`@`).
- **ID contoh fiktif `CTH.*`** (repo publik — tak boleh ID/nama asli). Baris contoh yang lupa dihapus **wajib gagal**: Produksi/Lahan/Pohon ditolak "tidak terdaftar"; Petani (ID baru sah) ditolak `isTemplateExampleId` di klien **dan** server.
- **Pemetaan kolom memakai `GroupedFieldMapping`** (`src/components/shared/grouped-field-mapping.tsx`, #420), bukan grid kartu: tiap field satu baris (label · pilihan kolom · contoh nilai baris pertama), ringkasan *n/m terpetakan*. ≥ 10 field → grup buka/tutup (definisi di `src/lib/upload-mapping-groups.ts`, tiap field tepat satu grup — dijaga test); grup tanpa kolom terdeteksi mulai tertutup "tak ada di berkas", grup yang membawa panel tambahan (Bawaan NKT) selalu mulai terbuka. Mengubah pemetaan **mengosongkan hasil validasi**.

