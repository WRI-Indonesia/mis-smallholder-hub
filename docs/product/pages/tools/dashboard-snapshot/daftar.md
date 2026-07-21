# Daftar Snapshot

[← Dashboard Snapshot](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Daftar Snapshot (/admin/tools/snapshot)
├── Header
│   └── Heading: Dashboard Snapshot
├── Card: Buat Snapshot Baru (permission CREATE)
│   ├── Filter: Distrik (disabled)
│   ├── Filter: Tahun Bergabung (disabled)
│   ├── Tombol: Generate Snapshot
│   ├── Tombol: Reset (tidak dirender)
│   └── Teks: Catatan filter
├── Tabel: Daftar snapshot (DataTable)
│   ├── Kolom: Aksi · Tanggal Snapshot · Distrik · Tahun Bergabung
│   ├── Kolom: Total Lembaga Petani · Total Kelompok Tani · Total Petani
│   ├── Kolom: Petani L · Petani P · Dibuat Oleh
│   └── Ekspor tambahan: totalPersilLahan · totalLuasLahan
└── Dialog: Nonaktifkan Snapshot
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/tools/snapshot/page.tsx` |
| Client | `src/app/(admin)/admin/tools/snapshot/snapshot-client.tsx` |
| Tipe | Server Component (list) → Client Component (form generate + tabel) |
| Guard | `requirePermission("dashboard-snapshot")` |
| Server action / data | `getSnapshots()`, `getSnapshotFilterOptions()` (`src/server/actions/snapshot.ts`), `getUserPermissionsForMenu("dashboard-snapshot")`; mutasi `generateSnapshot()` (CREATE), `deleteSnapshot()` (DELETE) |
| Loading | `loading.tsx` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Dashboard Snapshot | Heading | `h1` + deskripsi "Buat dan kelola snapshot historis dari data dashboard" |
| Buat Snapshot Baru | Card | Hanya tampil bila permission `CREATE`; ikon `Camera` |
| Distrik | Filter (combobox) | Popover + Command, opsi "Semua Distrik" + daftar distrik; pencarian "Cari distrik...", empty "Distrik tidak ditemukan." — **disabled** (`FILTERS_ENABLED = false`) |
| Tahun Bergabung | Filter (select) | Opsi "Semua Tahun" + daftar tahun — **disabled** (`FILTERS_ENABLED = false`) |
| Generate Snapshot | Tombol | Memanggil `generateSnapshot({ districtId: null, joinedYear: null })`; label saat proses "Membuat…"; toast "Snapshot berhasil dibuat" |
| Reset | Tombol | Hanya dirender bila `FILTERS_ENABLED` — saat ini tidak tampil |
| Catatan filter | Teks | "Filter dinonaktifkan sementara — snapshot dibuat untuk **Semua Distrik** & **Semua Tahun**." |
| Daftar snapshot | Tabel (`DataTable`) | Search keys: `districtName`, `createdByName`; placeholder "Cari distrik atau pembuat..."; empty "Belum ada snapshot."; export `dashboard-snapshots` |
| Kolom: Aksi | Kolom tabel | `TableActions` — `view` (title "Lihat" → `/admin/tools/snapshot/{id}`), `delete` (title "Nonaktifkan") |
| Kolom: Tanggal Snapshot | Kolom tabel | Format `dd Mmm yyyy, HH:mm` (bulan Indonesia) |
| Kolom: Distrik | Kolom tabel | Default disembunyikan; `null` → "Semua" |
| Kolom: Tahun Bergabung | Kolom tabel | Default disembunyikan; `null` → "Semua" |
| Kolom: Total Lembaga Petani | Kolom tabel | Angka, rata kanan |
| Kolom: Total Kelompok Tani | Kolom tabel | Angka, rata kanan |
| Kolom: Total Petani | Kolom tabel | Angka, rata kanan |
| Kolom: Petani L | Kolom tabel | Jumlah petani laki-laki |
| Kolom: Petani P | Kolom tabel | Jumlah petani perempuan |
| Kolom: Dibuat Oleh | Kolom tabel | Nama pembuat snapshot |
| Kolom ekspor tambahan | Ekspor | `totalPersilLahan` dan `totalLuasLahan` (format `id-ID`, 2 desimal) ikut pada baris ekspor meski tidak jadi kolom tabel |
| Nonaktifkan Snapshot | Dialog (`DeleteDialog`) | Deskripsi "Snapshot akan dinonaktifkan (soft delete) dan tidak lagi muncul di daftar. Lanjutkan?"; sukses → toast "Snapshot berhasil dinonaktifkan" |
