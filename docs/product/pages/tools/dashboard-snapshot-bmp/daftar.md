# Daftar Snapshot BMP

[← Dashboard Snapshot BMP](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Daftar Snapshot BMP (/admin/tools/snapshot-bmp)
├── Header
│   └── Heading: Dashboard Snapshot BMP
├── Card: Buat Snapshot Baru (permission CREATE)
│   ├── Tombol: Generate Snapshot
│   └── Teks: Catatan cakupan
├── Tabel: Daftar snapshot (DataTable)
│   ├── Kolom: Aksi · Tanggal Snapshot · Distrik
│   ├── Kolom: Total Produksi (Ton) · Lahan Ber-data · Petani Melapor
│   └── Kolom: Dibuat Oleh
└── Dialog: Nonaktifkan Snapshot
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/tools/snapshot-bmp/page.tsx` |
| Client | `src/app/(admin)/admin/tools/snapshot-bmp/snapshot-bmp-client.tsx` |
| Tipe | Server Component (list) → Client Component (tombol generate + tabel) |
| Guard | `requirePermission("dashboard-snapshot-bmp")` |
| Server action / data | `getBmpSnapshots()` (`src/server/actions/snapshot-bmp.ts`), `getUserPermissionsForMenu("dashboard-snapshot-bmp")`; mutasi `generateBmpSnapshot()` (CREATE), `deleteBmpSnapshot()` (DELETE) |
| Loading | `loading.tsx` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Dashboard Snapshot BMP | Heading | `h1` + deskripsi "Buat dan kelola snapshot historis dari data dashboard BMP" |
| Buat Snapshot Baru | Card | Hanya tampil bila permission `CREATE`; ikon `Camera` |
| Generate Snapshot | Tombol | `generateBmpSnapshot({ districtId: null })`; label saat proses "Membuat…"; toast "Snapshot BMP berhasil dibuat" |
| Catatan cakupan | Teks | "Snapshot dibuat untuk **Semua Data** — filter Distrik/Lembaga/Kategori/Tahun dilakukan langsung di BMP Dashboard." |
| Daftar snapshot | Tabel (`DataTable`) | Search keys: `districtName`, `createdByName`; placeholder "Cari distrik atau pembuat..."; empty "Belum ada snapshot."; export `bmp-dashboard-snapshots` |
| Kolom: Aksi | Kolom tabel | `view` ("Lihat" → `/admin/tools/snapshot-bmp/{id}`), `delete` ("Nonaktifkan") |
| Kolom: Tanggal Snapshot | Kolom tabel | Format `dd Mmm yyyy, HH:mm` |
| Kolom: Distrik | Kolom tabel | Default disembunyikan; `null` → "Semua" |
| Kolom: Total Produksi (Ton) | Kolom tabel | Format `id-ID`, 2 desimal |
| Kolom: Lahan Ber-data | Kolom tabel | `lahanBerData/totalLahan` |
| Kolom: Petani Melapor | Kolom tabel | `petaniMelapor/totalPetani` |
| Kolom: Dibuat Oleh | Kolom tabel | Nama pembuat snapshot |
| Nonaktifkan Snapshot | Dialog (`DeleteDialog`) | Deskripsi sama dengan snapshot utama; sukses → toast "Snapshot berhasil dinonaktifkan" |
