# Detail Snapshot BMP

[← Dashboard Snapshot BMP](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Detail Snapshot BMP (/admin/tools/snapshot-bmp/[id])
├── Header
│   ├── Heading: Snapshot BMP — {tanggal}
│   └── Tombol: Kembali
├── Card: Informasi Snapshot
│   └── Field: Tanggal Snapshot · Filter Distrik · Dibuat Oleh
├── Kartu skor BMP (BmpScoreCards)
│   └── KPI: Total Produksi · Produktivitas · Lahan dengan Data Produksi · Petani Melapor
├── Heading: Ringkasan per Lembaga Petani
└── Tabel: per Lembaga (DataTable)
    ├── Kolom: Nama · Kategori · Distrik
    ├── Kolom: Produksi (Ton) · Produktivitas (Ton/Ha)
    ├── Kolom: Lahan Ber-data · Petani Melapor
    └── Ekspor tambahan: baik · cukup · kurang · tidakAda
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/tools/snapshot-bmp/[id]/page.tsx` |
| Client | `src/app/(admin)/admin/tools/snapshot-bmp/[id]/snapshot-bmp-detail-client.tsx` |
| Tipe | Server Component (detail) → Client Component (kartu + tabel) |
| Guard | `requirePermission("dashboard-snapshot-bmp")`; `notFound()` bila tidak ada |
| Server action / data | `getBmpSnapshotById(id)`; agregasi client-side `sumBmpGroups()` & `bmpProductivity()` (`src/lib/bmp-dashboard-aggregation.ts`) |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Snapshot BMP — {tanggal} | Heading | `h1` + deskripsi "Data historis dashboard BMP yang tersimpan" |
| Kembali | Tombol | Kembali ke `/admin/tools/snapshot-bmp` |
| Informasi Snapshot | Card metadata | 3 field: Tanggal Snapshot, Filter Distrik (`null` → "Semua Distrik"), Dibuat Oleh |
| Kartu skor BMP | Kartu KPI (`BmpScoreCards`) | Total Produksi (Ton), Produktivitas (Ton/Ha), Lahan dengan Data Produksi (`x / y`), Petani Melapor (`x / y`); label periode "kumulatif semua tahun" |
| Ringkasan per Lembaga Petani | Heading `h2` | Judul tabel di bawahnya |
| Tabel per Lembaga | Tabel (`DataTable`) | Search `name`, placeholder "Cari lembaga petani...", empty "Tidak ada data lembaga petani.", export `snapshot-bmp-{id}` |
| Kolom: Nama Lembaga Petani | Kolom tabel | Nama lembaga |
| Kolom: Kategori | Kolom tabel | `EX_PLASMA` → "Ex-Plasma", `SWADAYA` → "Swadaya" |
| Kolom: Distrik | Kolom tabel | `null` → "—" |
| Kolom: Produksi (Ton) | Kolom tabel | Format `id-ID`, 2 desimal |
| Kolom: Produktivitas (Ton/Ha) | Kolom tabel | Dihitung `bmpProductivity(row)` |
| Kolom: Lahan Ber-data | Kolom tabel | `lahanBerData/totalLahan` |
| Kolom: Petani Melapor | Kolom tabel | `petaniMelapor/totalPetani` |
| Kolom ekspor tambahan | Ekspor | `baik`, `cukup`, `kurang`, `tidakAda` (kategori ketersediaan data) ikut pada baris ekspor |
