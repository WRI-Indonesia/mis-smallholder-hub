# Upload Produksi

[← Menu Bulk Upload](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Upload Produksi (/admin/bulk-upload/production)
├── Header
│   └── h2 "Upload Massal Produksi" + deskripsi
├── Langkah 1 — Pilih File Data Produksi
│   ├── Input type="file" (.xlsx / .csv)
│   ├── Tombol "Unduh Template Excel" (kanan atas kartu)
│   │   └── template_bulk_upload_produksi.xlsx — sheet "Template Produksi"
│   └── Info berkas: "Tipe File: XLSX/CSV (N baris terdeteksi)"
├── Langkah 2 — Petakan Atribut Kolom
│   ├── Grid Select per target field (7 field, wajib/opsional)
│   └── Tombol "Validasi Data Produksi"
├── Langkah 3 — Hasil Validasi & Tinjauan
│   ├── Ringkasan: "N Baris Valid" / "N Baris Error"
│   ├── Filter: "Semua (N)" · "Valid (N)" · "Error (N)"
│   ├── Tombol "Download Semua Data" / "Download Data Error Saja"
│   └── Tabel preview (kolom: No, ID Petani (Asal), Nama Petani (DB),
│       Periode, Tanggal Panen, Panen Ke-, Hasil (kg), ID Lahan,
│       Status, Detail Error)
└── Tombol simpan "Simpan N Data Valid" (hijau, hanya permission CREATE)
```

## Atribut sub menu

| Atribut | Nilai |
|---|---|
| Menu key | `bulk-upload-production` |
| URL | `/admin/bulk-upload/production` |
| Icon | `TrendingUp` |
| Order | `2` |

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/bulk-upload/production/page.tsx` + `bulk-upload-production-client.tsx` (`"use client"`) |
| Tipe | Wizard unggah massal 3 langkah bernomor |
| Guard | `requirePermission("bulk-upload-production")`; aksi guard `hasPermission("bulk-upload-production", …)` |
| Server action / data | `getFarmersForProductionMapping()`, `getExistingProductionRecords()`, `bulkCreateProductionRecords()` — `src/server/actions/bulk-upload-production.ts` |
| Format file diterima | `.xlsx` dan `.csv`; selain itu toast *"Hanya mendukung berkas Excel (.xlsx) atau CSV"* |
| Tombol unduh template | **Ada** — "Unduh Template Excel" → `template_bulk_upload_produksi.xlsx` |
| Access context | `getFarmersForProductionMapping()`/`getExistingProductionRecords()` sudah difilter per mode `ALL` / `BY_FARMER_GROUP` / `BY_DISTRICT` |
| Redirect setelah simpan | `/admin/master-data/production` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| "Upload Massal Produksi" | Heading (`h2`) | Deskripsi: *"Unggah data produksi petani menggunakan file Excel (.xlsx) atau CSV dengan pencocokan kolom dinamis."* |
| "1. Pilih File Data Produksi" | Card + Input `type="file"` | Keterangan *"Unggah file Excel (.xlsx) atau CSV yang berisi data transaksi panen / produksi petani."* |
| "Unduh Template Excel" | Tombol (kanan atas kartu 1) | Membuat workbook sheet `Template Produksi` berisi header `ID Petani`, `Periode (YYYY-MM)`, `Tanggal Panen (DD/MM/YYYY)`, `Panen Ke- (1-4)`, `Hasil Panen (kg)`, `ID Lahan (Opsional)`, `Catatan (Opsional)` + 2 baris contoh (`FARMER-001` / `FARMER-002`) |
| Info berkas | Teks | *"Tipe File: **XLSX/CSV** (N baris terdeteksi)"* |
| "2. Petakan Atribut Kolom" | Card + grid Select | Subjudul *"Cocokkan kolom dari berkas yang diunggah dengan data target sistem produksi."* |
| Target field | 7 field | `ID Petani`* (contoh FARMER-001), `Periode`* (YYYY-MM), `Tanggal Panen`* (harus sesuai bulan periode), `Panen Ke-`* (1 s/d 4), `Hasil Panen (kg)`* (> 0), `ID Lahan` (opsional, CUID sistem), `Catatan` (maks 500 karakter) |
| "Validasi Data Produksi" | Tombol | Loading *"Memproses..."*; sukses toast *"Validasi selesai"* |
| "3. Hasil Validasi & Tinjauan" | Card | Subjudul *"Tinjau kembali hasil pemetaan dan kecocokan data sebelum menyimpan ke database."* |
| Ringkasan hasil | Badge/pill | *"N Baris Valid"* / *"N Baris Error"* |
| Filter hasil | 3 tombol | *"Semua (N)"*, *"Valid (N)"*, *"Error (N)"* |
| "Download Semua Data" / "Download Data Error Saja" | Tombol | `bulk_upload_produksi_full.xlsx` / `bulk_upload_produksi_error_only.xlsx` (sheet `Data Produksi`) |
| "Simpan N Data Valid" | Tombol (hijau) | Hanya bila permission `CREATE` |
| Tabel preview | Tabel | Kolom: `No`, `ID Petani (Asal)`, `Nama Petani (DB)`, `Periode`, `Tanggal Panen`, `Panen Ke-`, `Hasil (kg)`, `ID Lahan`, `Status`, `Detail Error` |
| Kolom ekspor Excel | 11 kolom | `Baris Asal`, `ID Petani`, `Nama Petani`, `Periode`, `Tanggal Panen`, `Panen Ke-`, `Hasil Panen (kg)`, `ID Lahan`, `Catatan`, `Status Validasi`, `Detail Error` |

## Aturan validasi & pesan error (client)

| Kondisi | Pesan |
|---|---|
| ID Petani tidak cocok data referensi | *"ID Petani "X" tidak ditemukan dalam database atau akses Anda"* |
| Periode bukan `YYYY-MM` | *"Format periode tidak valid: "X" (Gunakan YYYY-MM)"* |
| Tanggal panen tak terbaca | *"Format tanggal tidak valid: "X""* |
| Tanggal panen di luar bulan periode | *"Tanggal panen (dd/mm/yyyy) tidak sesuai dengan periode YYYY-MM"* |
| Panen ke- di luar 1-4 | *"Panen Ke- tidak valid: "X" (Harus angka bulat 1 s/d 4)"* |
| Hasil panen ≤ 0 / > 999.999 | *"Hasil panen tidak valid: "X" (Harus berupa angka > 0)"* / *"Hasil panen terlalu besar: "X" (Maks 999.999 kg)"* |
| Catatan > 500 karakter | *"Catatan maksimal 500 karakter"* |
| Duplikat dalam file (petani+lahan+periode+panen ke-) | *"Data panen ke-N periode YYYY-MM terdeteksi ganda di dalam file"* |
| Duplikat di database | *"Data panen ke-N periode YYYY-MM sudah terdaftar di database"* |

## Alur upload

1. (Opsional) klik **Unduh Template Excel** sebagai acuan format.
2. Pilih berkas `.xlsx`/`.csv` → header terdeteksi → auto-match kolom.
3. Perbaiki pemetaan kolom pada kartu "2. Petakan Atribut Kolom".
4. Klik **Validasi Data Produksi** → lookup `ID Petani` ke data referensi, validasi format, cross-check tanggal vs periode, cek duplikat dalam file dan di database.
5. Tinjau ringkasan, filter, unduh hasil bila perlu.
6. Klik **Simpan N Data Valid** → `bulkCreateProductionRecords()`: guard `CREATE` → cek scope access-context untuk semua `farmerId` → validasi Zod `productionSchema` → resolusi `ID Lahan` (cocok pada `LandParcel.id` atau `parcelId`, harus milik petani yang sama) → cek duplikat aktif → satu `createMany`.
7. Sukses → toast *"Berhasil menyimpan N data produksi"* + redirect ke daftar produksi.

**Error server yang mungkin muncul**: *"ID Lahan "X" tidak ditemukan atau tidak aktif"*, *"ID Lahan "X" tidak dimiliki oleh petani terpilih"*, *"Data panen ke-N periode YYYY-MM untuk petani "X" sudah terdaftar"*, *"Tidak memiliki izin untuk membuat data produksi bagi petani dengan ID: "X""*.
