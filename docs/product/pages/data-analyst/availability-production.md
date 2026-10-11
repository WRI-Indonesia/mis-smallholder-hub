# Ketersediaan Data — Produksi

[← Menu Data Analyst](README.md) · [← Katalog halaman](../README.md)

Sub menu `data-analyst-availability-production` (anak level 3 dari induk **Ketersediaan Data** `data-analyst-availability`), satu halaman: `/admin/data-analyst/availability/production` (DA-08, epic #415, sub-issue #416, owner 2026-10-11).

Kalender cakupan produksi: **bulan apa saja** yang sudah punya record produksi, per Lembaga Petani, turun ke petani dan lahan. Melengkapi dua halaman skor ([Semua Lembaga](data-availability.md), [Per Lembaga](data-completeness.md)) yang menjawab *seberapa lengkap*, bukan *bulan apa yang ada*. Keputusan terkunci K1–K9 ada di #415.

## Diagram objek

```text
Halaman: Ketersediaan Data — Produksi (/admin/data-analyst/availability/production)
├── Header: judul + deskripsi (tanggal generate) + HelpHint
├── Toolbar (state di URL — useUrlFilters)
│   ├── Tahun (Select) — ?tahun= (bawaan tahun berjalan; pilihan = tahun ber-record + tahun berjalan)
│   ├── Kategori (Select) — ?kategori=
│   ├── Distrik (FilterCombobox) — ?distrik=
│   ├── Lembaga (FilterCombobox, cascade) — ?lembaga=
│   └── Excel (gate EXPORT) — 2 sheet (K6)
└── Card kalender (ProductionCalendarTable)
    ├── Ringkasan: n Lembaga · tahun · n tanpa record tahun ini · n basi
    ├── Cari (client) · Urut (Select: cakupan | nama | bulan ber-data | periode terakhir) — ?urut= ?arah=
    ├── Tabel pohon (table-fixed, border-spacing 2px, min-w 1280)
    │   ├── Kolom: Lembaga · Lahan (non-PSR) · Jan…Des · Bulan (x/12) · Rentang · Jeda · Est. · TP
    │   ├── Baris Distrik (bawaan nyala, tombol "Per Distrik" / ?tingkat=lembaga mematikan; bawaan terbuka) — agregat `groupRowsByDistrict`/`mergeCells`: Σ lahan melapor ÷ Σ lahan non-PSR Lembaga-Lembaganya
    │   ├── Baris Lembaga (depth 1 di bawah Distrik) — ▸ buka petani (lazy: getProductionAvailabilityFarmers) · nama → Per Lembaga ?lembaga=
    │   │   ├── Baris petani — ▸ buka lahan (lazy: getProductionAvailabilityParcels) · nama → Detail Petani
    │   │   │   ├── Baris lahan — kode → Detail Lahan · badge PSR / "lain" · sel kg → Master Data Produksi (?farmerGroupId&period&search)
    │   │   │   └── Baris semu "Tanpa persil" — record tanpa ID Lahan petani itu
    │   │   └── Baris status: Memuat… / error (klik lagi = muat ulang) / kosong
    │   └── Sel Lembaga/petani (CoverageCell): HeatCell % + penanda pojok E · 0 · TP; kosong bergaris = tanpa record; abu "n rec" = tanpa lahan non-PSR
    └── Legenda: HeatLegend "% lahan non-PSR melapor" + swatch tanpa record · penanda · jeda merah
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Menu key | `data-analyst-availability-production` |
| Induk | `data-analyst-availability` (level 2, "Ketersediaan Data", `/admin/data-analyst/availability` → redirect ke Semua Lembaga) |
| URL | `/admin/data-analyst/availability/production` |
| Icon | `CalendarRange` |
| Izin (seed) | SUPERADMIN · ADMIN · MANAGEMENT · OPERATOR: VIEW · EXPORT · PRINT (sama dengan Semua Lembaga; tanpa DONOR). Induk `data-analyst-availability` diberi izin yang sama — kaskade union ke tiga anak |
| Page guard | `requirePermission("data-analyst-availability-production")`; action `hasPermission(…, "VIEW")` |
| Scope | `getAccessContext()` → `farmerGroupAccessFilter` (Prisma) + `groupScopeSql("g", access)` (SQL mentah, helper bersama `access-scope-sql.ts`); Lembaga/petani di luar scope pada action anak → hasil kosong |
| Server actions | `src/server/actions/production-availability.ts`: `getProductionAvailabilityView` · `getProductionAvailabilityFarmers(groupId, year)` · `getProductionAvailabilityParcels(farmerId, year)` · `getProductionAvailabilityGroupParcels(groupId, year)` (Sheet 2 Excel) |
| Logika murni | `src/lib/production-availability.ts` (persen, ringkasan rentang, tahun, filter, urut) — test `src/test/production-availability.test.ts` |
| Tipe | `src/types/production-availability.ts` |
| Bantuan | `tutorial/p-18-ketersediaan-produksi.md`; konsep di `3-3-data-analyst.md`; rumus di `referensi/r-5-ketersediaan-data.md` §Kalender Produksi |

## Aturan angka (K3–K5, K8)

- **Sel Lembaga × bulan** = `COUNT(DISTINCT lahan aktif non-PSR yang ditunjuk record bulan itu) ÷ lahan aktif non-PSR Lembaga`, dibatasi 100 % (record boleh menunjuk lahan petani lain se-Lembaga). Penyebut 0 → persen `null`, sel abu "n rec". Tanpa record → sel kosong bergaris (bukan 0 % merah — K8).
- **Baris Distrik** (usulan owner 2026-10-11): sel = Σ lahan melapor ÷ Σ lahan non-PSR semua Lembaga di distrik itu (gabungan sel lewat `mergeCells`); ringkasan rentang dari sel gabungan; ikut kunci urut yang sama.
- **Baris petani**: rumus sama atas lahan aktif non-PSR miliknya. **Baris lahan**: Σ kg bulan itu; 0 kg merah; PSR dibisukan.
- **Populasi record** satu definisi untuk semua tingkat dan Sheet 2 (review #416): record aktif **atas nama petani** (`farmer_id`). Lembaga = petani-petaninya; petani = record-nya; lahan = record petani itu per `parcel_id` — lahan yang ditunjuk tetapi bukan lahan aktifnya tampil sebagai baris "lain" (di Sheet 2: baris tambahan `isOwn=false`, lahan nonaktif diberi tanda). Induk dan anak selalu berjumlah sama; tautan sel lahan → Master Data Produksi (filter Lembaga + periode + kode petani) selalu berisi.
- **Lahan melapor** hanya menghitung lahan **aktif** (`LEFT JOIN tbl_land_parcel … is_active`); record ke lahan revisi lama/hilang tetap masuk `records`/`kg`.
- **Bulan ber-data** (kolom Bulan, urut "months") = `dataMonthsPerYear` dari `productivity-annualize.ts` — satu definisi dengan pembagi penyetahunan Peta BMP / Detail Lembaga / Profil Lahan. Input `linked` = record ber-persil.
- **Jeda** = `max(0, monthsBetween(lastPeriod, currentPeriod()))`; basi bila `≥ PRODUCTION_STALE_MONTHS` (3, DA-02). Periode terakhir di masa depan (salah ketik tahun) → jeda 0 bertanda `!` kuning + tooltip (`futureLast`).
- **Estimasi** = `notes ILIKE '%estimasi%'` (= `loadEstimateRecordIds`). **TP** = `parcel_id IS NULL`.
- Warna sel: `heatStyle` (skala kontinu berjangkar ambang band 50/80/100 — sama dengan heatmap Semua Lembaga).

## Kueri & performa

Tiga kueri paralel saat halaman dibuka: daftar Lembaga (Prisma) + penyebut per Lembaga (SQL: petani aktif, lahan aktif, lahan non-PSR) + agregat **Lembaga × periode** rentang penuh (SQL `GROUP BY g.id, pr.period` dengan `COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_psr = false)` dan tiga `COUNT(*) FILTER`). Ukuran hasil ≈ Lembaga × periode (puluhan × puluhan) — tidak tumbuh dengan jumlah record; biaya kueri tumbuh linear dengan `tbl_production_record` (scan seluruh record aktif dalam scope). Anak dimuat per klik dengan filter `period >= 'Y-01' AND period <= 'Y-12'` (indeks `period`). Terukur lokal 2026-10-11 (snapshot prod, 36.653 record aktif, scope ALL): kueri agregat Lembaga × periode **122 ms** (`EXPLAIN ANALYZE`: hash join → sort → GroupAggregate 106 baris). Review #416 menandai bahwa kueri ini memindai seluruh record aktif tiap kali halaman dibuka (tanpa batas periode, tanpa cache) dan akan tumbuh linear dengan proyeksi ~85×; diterima untuk v1.7.0 (< 500 ms), dicatat sebagai tindak lanjut: batasi sel ke tahun terpilih + kueri ringan MIN/MAX per Lembaga, atau `unstable_cache` berkunci scope, bila waktu di prod mendekati 500 ms. Angka prod dicatat di `docs/database/performance.md` saat QA v1.7.0.

## Ekspor Excel (K6)

`exportMultiSheetToExcel` (client, `exceljs` dinamis). **Sheet 1** `Lembaga <tahun>`: identitas, petani, lahan aktif, lahan non-PSR, 12 kolom % (atau "n rec" / kosong), bulan ber-data, periode pertama/terakhir, jeda, record, Estimasi, 0 kg, tanpa persil — mengikuti filter & urutan layar. **Sheet 2** `Lahan <abrv>`: lahan × bulan (kg) + pemilik untuk Lembaga yang difilter (`getProductionAvailabilityGroupParcels`); tanpa filter Lembaga → satu baris petunjuk. Nama berkas `ketersediaan-produksi-<tahun>[-<abrv>]-<yyyymmdd>.xlsx`.

## Tindak lanjut (epic #415)

B — kalender **Pelatihan** (issue menyusul setelah bentuk Produksi disetujui); C/D — Pekerja, Perawatan menunggu modulnya. Pertanyaan terbuka: entitas tak berperiode bulanan cukup lewat "Cakupan modul" di Semua Lembaga.
