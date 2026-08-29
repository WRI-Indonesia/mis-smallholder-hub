# Upload Petani

[← Menu Bulk Upload](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Upload Petani (/admin/bulk-upload/farmers)
├── Header
│   └── h2 "Upload Massal Petani" + deskripsi
├── Langkah 1 — Pilih Lembaga Petani
│   ├── Combobox (Popover + Command): "Pilih Lembaga Petani..."
│   ├── Pencarian: "Cari Lembaga Petani berdasarkan nama atau kode..."
│   ├── Empty state: "Lembaga Petani tidak ditemukan."
│   └── Catatan: "Pilih Lembaga Petani tujuan terlebih dahulu..."
├── Langkah 2 — Pilih File Data Petani
│   ├── Input type="file" (accept=".xlsx,.csv"), disabled bila lembaga belum dipilih
│   ├── Peringatan merah: "* Harap pilih Lembaga Petani di atas terlebih dahulu."
│   └── Info berkas: "Tipe file terdeteksi: XLSX/CSV (N baris data)"
├── Petakan Kolom Data
│   ├── Grid Select per target field (8 field, badge Wajib/Opsional)
│   ├── Opsi "-- Kosongkan --" + placeholder "Pilih kolom..."
│   ├── Auto-match via AUTO_MATCH_RULES
│   └── Tombol "Validasi Data"
├── Hasil Validasi & Tinjauan
│   ├── Ringkasan: "N Baris Valid" (hijau) / "N Baris Tidak Lengkap" (kuning)
│   │   / "N Baris Error" (merah)
│   ├── Filter: "Semua (N)" · "Valid (N)" · "Tidak Lengkap (N)" · "Error (N)"
│   ├── Tombol "Download Semua Data" / "Download Data Tidak Lengkap"
│   │   / "Download Data Error Saja"
│   ├── Tabel preview (kolom: Baris, ID Petani, Nama, L/P, NIK,
│   │   Lembaga Petani, Tahun Bergabung, Tanggal Lahir, Status,
│   │   Keterangan / Detail Error)
│   └── Empty state: "Tidak ada data untuk filter ini."
└── Tombol simpan (hanya permission CREATE):
    ├── "Simpan Semua Layak (N)" (hijau solid; label "Simpan N Data Valid"
    │   bila tidak ada baris tidak lengkap)
    └── "Simpan Hanya yang Valid (N)" (outline; tampil hanya bila ada
        baris tidak lengkap)
```

## Atribut sub menu

| Atribut | Nilai |
|---|---|
| Menu key | `bulk-upload-farmers` |
| URL | `/admin/bulk-upload/farmers` |
| Icon | `User` |
| Order | `1` |

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/bulk-upload/farmers/page.tsx` (Server Component) + `src/app/(admin)/admin/bulk-upload/farmers/bulk-upload-client.tsx` (`"use client"`) |
| Tipe | Wizard unggah massal 4 langkah (kartu berurutan, bukan stepper terpisah) |
| Guard | `requirePermission("bulk-upload-farmers")`; aksi data guard `hasPermission("bulk-upload-farmers", "VIEW"\|"CREATE")` |
| Server action / data | `getFarmerGroupsForMapping()` (daftar Lembaga dibatasi scope pengguna — TD-029), `getExistingFarmerIds(farmerGroupId)`, `bulkCreateFarmers()` — semua di `src/server/actions/bulk-upload.ts` |
| Format file diterima | `.xlsx` dan `.csv` (`accept=".xlsx,.csv"`); selain itu toast *"Hanya mendukung file Excel (.xlsx) atau CSV"* |
| Tombol unduh template | **Tidak ada** di halaman ini (hanya unduh hasil validasi) |
| Redirect setelah simpan | `/admin/master-data/farmers` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| "Upload Massal Petani" | Heading (`h2`) | Deskripsi: *"Unggah data petani menggunakan file Excel (.xlsx) atau CSV dengan pencocokan kolom dinamis."* |
| `Panduan` | Tautan | `HelpHint` (`src/app/(admin)/admin/help/help-hint.tsx`) — ikon `?` di header menuju tutorial Bantuan untuk `bulk-upload-farmers` (`findTutorialForMenu`), dibuka di tab baru |
| "1. Pilih Lembaga Petani" | Card + Combobox (Popover + Command) | Placeholder tombol *"Pilih Lembaga Petani..."*; pencarian *"Cari Lembaga Petani berdasarkan nama atau kode..."*; empty state *"Lembaga Petani tidak ditemukan."*; item ditampilkan `Nama (KODE)`. Mengganti lembaga mereset file, header, dan hasil validasi |
| Catatan langkah 1 | Teks bantuan | *"Pilih Lembaga Petani tujuan terlebih dahulu sebelum mengunggah data."* |
| "2. Pilih File Data Petani" | Card + Input `type="file"` | Disabled selama lembaga belum dipilih; peringatan merah *"* Harap pilih Lembaga Petani di atas terlebih dahulu."* |
| Info berkas | Teks | *"Tipe file terdeteksi: **XLSX/CSV** (N baris data)"* |
| "Petakan Kolom Data" | Card + grid Select per field | Subjudul *"Cocokkan kolom dari file unggahan Anda dengan data target sistem."*; tiap field punya badge `Wajib`/`Opsional`, placeholder *"Pilih kolom..."*, opsi *"-- Kosongkan --"*, dan teks bantuan |
| Target field | 8 field | `ID Petani`* (min 2 karakter), `Nama Petani`* (min 2 karakter), `Jenis Kelamin`* (L/P atau Laki-laki/Perempuan), `NIK` (16 digit angka), `Tempat Lahir`, `Tanggal Lahir`, `Alamat`, `Tahun Bergabung` (1900-2100) |
| Auto-match kolom | Otomatis | `AUTO_MATCH_RULES` mencocokkan header file (lowercase, trim) ke target field saat berkas dibaca |
| "Validasi Data" | Tombol | Disabled saat memproses, belum ada baris, atau daftar ID existing masih dimuat (`loadingExistingIds` — cegah race validasi sebelum `existingFarmerIds` siap); loading state *"Memproses..."*; jika ada kolom wajib belum dipetakan → toast *"Kolom wajib berikut belum dipetakan: …"*; sukses → toast *"Validasi selesai"* |
| "Hasil Validasi & Tinjauan" | Card | Subjudul *"Tinjau kembali data sebelum menyimpannya ke database."* |
| Ringkasan hasil | Badge/pill | *"N Baris Valid"* (hijau), *"N Baris Tidak Lengkap"* (kuning), *"N Baris Error"* (merah). Status per baris via `farmerRowStatus` (`src/lib/farmer-upload-status.ts`, #197): **valid** = lolos & lengkap; **incomplete** = lolos tapi ≥1 field opsional kosong (NIK, Tempat/Tanggal Lahir, Alamat, Tahun Bergabung); **error** = gagal validasi |
| Filter hasil | 4 tombol | *"Semua (N)"*, *"Valid (N)"*, *"Tidak Lengkap (N)"*, *"Error (N)"* |
| "Download Semua Data" | Tombol | Ekspor `bulk_upload_petani_full.xlsx` (sheet `Data Petani`) |
| "Download Data Tidak Lengkap" | Tombol (kuning) | Ekspor `bulk_upload_petani_tidak_lengkap.xlsx` (hanya baris status incomplete) |
| "Download Data Error Saja" | Tombol (merah) | Ekspor `bulk_upload_petani_error_only.xlsx` (hanya baris status error) |
| "Simpan Semua Layak (N)" | Tombol (hijau solid) | Hanya jika permission `CREATE`; menyimpan baris valid + tidak lengkap; berlabel *"Simpan N Data Valid"* bila tidak ada baris tidak lengkap; disabled bila tidak ada baris layak |
| "Simpan Hanya yang Valid (N)" | Tombol (outline hijau) | Tampil hanya bila ada baris tidak lengkap; menahan baris tidak lengkap agar bisa dilengkapi di file lalu diunggah ulang (upload hanya menambah, tidak memperbarui) |
| Tabel preview | Tabel | Kolom: `Baris`, `ID Petani`, `Nama`, `L/P`, `NIK`, `Lembaga Petani`, `Tahun Bergabung`, `Tanggal Lahir`, `Status`, `Keterangan / Detail Error` |
| Badge status baris | Badge | `Valid` (hijau) / `Tidak Lengkap` (kuning, latar `bg-amber-500/5`, keterangan *"Kosong: …"*) / `Error` (merah, latar `bg-destructive/5`) |
| Empty state tabel | Teks | *"Tidak ada data untuk filter ini."* |
| Kolom ekspor Excel | 12 kolom | `Baris Asal`, `ID Petani`, `Nama Petani`, `Jenis Kelamin`, `NIK`, `Lembaga Petani`, `Tempat Lahir`, `Tanggal Lahir`, `Tahun Bergabung`, `Alamat`, `Status` (VALID/TIDAK LENGKAP/ERROR), `Keterangan / Detail Error` (alasan error, atau *"Kosong: …"* untuk baris tidak lengkap) |

## Aturan validasi & pesan error (client)

| Kondisi | Pesan |
|---|---|
| Nama kosong / < 2 karakter | *"Nama Petani wajib diisi"* / *"Nama Petani minimal 2 karakter"* |
| ID Petani kosong / < 2 karakter | *"ID Petani wajib diisi"* / *"ID Petani minimal 2 karakter"* |
| Duplikat dalam file | *"ID Petani duplikat di dalam file: "X""* |
| Duplikat di database | *"ID Petani "X" sudah terdaftar di database"* |
| Jenis kelamin tak dikenal | *"Jenis kelamin tidak valid: "X" (Gunakan L/P atau Laki-laki/Perempuan)"* — normalisasi ke `M`/`F` |
| NIK bukan 16 digit | *"NIK harus 16 digit angka (Terdeteksi N digit)"* |
| Lembaga belum dipilih | *"Lembaga Petani wajib dipilih"* |
| Tanggal lahir tak terbaca | *"Format Tanggal Lahir tidak valid: "X""* |
| Tahun bergabung di luar 1900-2100 | *"Tahun bergabung tidak valid: "X" (Gunakan tahun antara 1900-2100)"* |

## Alur upload

1. Pilih **Lembaga Petani** tujuan (wajib, satu lembaga per unggahan).
2. Pilih berkas `.xlsx`/`.csv` → header terdeteksi (`readSpreadsheetFile`, `src/lib/excel-sheet-reader.ts`) → auto-match kolom. Baris header **tidak** diasumsikan baris fisik 1 (#301): dicari baris pertama yang label-labelnya cocok alias auto-match, lalu baris pertama dengan ≥2 sel terisi; header di baris >1 memunculkan toast *"Header ditemukan di baris X"*, berkas tanpa header sama sekali → *"Tidak menemukan baris header pada berkas ini"*. `_rowNum` ("Baris Asal") dihitung dari baris header, bukan dari 2.
3. Perbaiki pemetaan kolom pada kartu "Petakan Kolom Data".
4. Klik **Validasi Data** → seluruh baris divalidasi di client (termasuk cek duplikat dalam file dan terhadap `existingFarmerIds`).
5. Tinjau ringkasan valid/tidak lengkap/error, filter, dan bila perlu unduh berkas hasil (semua / tidak lengkap / error saja) untuk diperbaiki lalu unggah ulang.
6. Klik **Simpan Semua Layak** (valid + tidak lengkap) atau **Simpan Hanya yang Valid** (baris tidak lengkap ditahan) → `bulkCreateFarmers()`: guard `CREATE` → validasi ulang tiap baris dengan `farmerSchema` → cek scope access-context (semua `farmerGroupId` harus dalam scope) → insert dalam satu `prisma.$transaction` dengan `createdBy`.
7. Sukses → toast *"Berhasil menyimpan N data petani"* + redirect ke daftar petani. Gagal → toast berisi pesan error dari action.
