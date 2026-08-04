# Detail Snapshot

[← Dashboard Snapshot](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Detail Snapshot (/admin/tools/snapshot/[id])
├── Header
│   ├── Heading: Snapshot — {tanggal}
│   └── Tombol: Kembali
├── Card: Informasi Snapshot
│   └── Field: Tanggal Snapshot · Filter Distrik · Filter Tahun · Dibuat Oleh
├── Kartu ringkasan (DashboardSummaryCards)
│   └── KPI: Lembaga Petani · Kelompok Tani · Sertifikasi · Petani · Lahan · Paket Pelatihan
├── Heading: Ringkasan per Lembaga Petani
├── Tombol: Download PDF
└── Tabel: Lembaga Petani (DataTable)
    └── Kolom: Nama · Kelompok Tani · Total Petani · Total Persil · Luas Lahan · Cakupan Pelatihan
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/tools/snapshot/[id]/page.tsx` |
| Client | `src/app/(admin)/admin/tools/snapshot/[id]/snapshot-detail-client.tsx` |
| Tipe | Server Component (detail) → Client Component (kartu + tabel) |
| Guard | `requirePermission("dashboard-snapshot")`; `notFound()` bila snapshot tidak ada |
| Server action / data | `getSnapshotById(id)` (`src/server/actions/snapshot.ts`) — data dibaca dari kolom JSON snapshot, bukan query live |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Snapshot — {tanggal} | Heading | `h1` + deskripsi "Data historis dashboard yang tersimpan" |
| Kembali | Tombol | Kembali ke `/admin/tools/snapshot` |
| Informasi Snapshot | Card metadata | 4 field: Tanggal Snapshot, Filter Distrik (`null` → "Semua Distrik"), Filter Tahun (`null` → "Semua Tahun"), Dibuat Oleh |
| Kartu ringkasan | Kartu KPI (`DashboardSummaryCards`) | Dirender dari `snapshot.data`: Total Lembaga Petani, Total Kelompok Tani, Sertifikasi RSPO, Sertifikasi ISPO, Assurance SAP/MAP, Total Petani, Petani Laki-laki, Petani Perempuan, Total Persil Lahan, Total Luas Lahan, Paket 1 - BMP/NKT/RSPO, Paket 2 - MK, Paket 2 - HSE, Paket 3 & 4 - GEDSI/BUSDEV. Statis — tanpa dialog rincian kartu (#206, khusus Main Dashboard) |
| Ringkasan per Lembaga Petani | Heading `h2` | Judul tabel di bawahnya |
| Download PDF | Tombol | Saat ini hanya toast info "Fitur download PDF akan segera tersedia" |
| Tabel Lembaga Petani | Tabel (`DataTable`) | Search `name`, placeholder "Cari lembaga petani...", empty "Tidak ada data lembaga petani.", export `snapshot-{id}-kt` |
| Kolom: Nama Lembaga Petani | Kolom tabel | Nama lembaga |
| Kolom: Kelompok Tani | Kolom tabel | Jumlah kelompok tani |
| Kolom: Total Petani | Kolom tabel | Angka |
| Kolom: Total Persil | Kolom tabel | Angka |
| Kolom: Luas Lahan | Kolom tabel | Format `x,xx ha` |
| Kolom: Cakupan Pelatihan | Kolom tabel | `n/4 paket` — jumlah paket dengan cakupan > 0 |
