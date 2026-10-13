# Ketersediaan Data — Produksi

[← Menu Data Analyst](README.md) · [← Katalog halaman](../README.md)

Sub menu `data-analyst-availability-production` (anak level 3 dari induk **Ketersediaan Data** `data-analyst-availability`), satu halaman: `/admin/data-analyst/availability/production` (DA-08, epic #415, sub-issue #416, owner 2026-10-11).

Kalender cakupan produksi: **bulan apa saja** yang sudah punya record produksi, per Lembaga Petani, turun ke petani dan lahan. Melengkapi dua halaman skor ([Semua Lembaga](data-availability.md), [Per Lembaga](data-completeness.md)) yang menjawab *seberapa lengkap*, bukan *bulan apa yang ada*. Keputusan terkunci K1–K9 ada di #415.

## Diagram objek

```text
Halaman: Ketersediaan Data — Produksi (/admin/data-analyst/availability/production)
├── Header: sub-nav `AvailabilityNav` (#417; `navSlot`) — h1 "Ketersediaan Data" + tab Semua Lembaga · Per Lembaga · **Produksi** + HelpHint; deskripsi (tanggal generate)
├── Toolbar (state di URL — useUrlFilters)
│   ├── Tahun (Select) — ?tahun= (bawaan tahun berjalan; pilihan = tahun ber-record + tahun berjalan)
│   ├── Kategori (Select) — ?kategori=
│   ├── Distrik (FilterCombobox) — ?distrik=
│   ├── Lembaga (FilterCombobox, cascade) — ?lembaga=
│   ├── ↺ Reset (`ResetFiltersButton`, #427; tampil bila ada filter/urutan/pencarian/tingkat non-bawaan) — hapus semua kunci URL + kosongkan Cari
│   └── Excel (gate EXPORT) — 2 sheet (K6)
└── Card kalender (ProductionCalendarTable)
    ├── Strip KPI (4 kartu): Tahun (n Distrik · n Lembaga) · Cakupan tahun (rata-rata 12 bulan, tertimbang lahan non-PSR; warna band) · Tanpa record tahun · Basi
    ├── Cari (client) · Urut (Select: cakupan | nama | bulan ber-data | periode terakhir) — ?urut= ?arah= · Per Distrik · Tutup semua (lipat Distrik+Lembaga+petani) · Buka Distrik (bawaan; "Buka semua" sengaja tidak ada: 30-an permintaan sekaligus) — `treeCommand {kind, seq}` ke tabel
    ├── Tabel pohon (table-fixed, border-spacing 2px, min-w 1280)
    │   ├── Kolom: Distrik/Lembaga (sticky kiri) · Lahan (non-PSR) · Jan…Des (bulan berjalan ditebalkan, bulan belum tiba diredupkan) · Bulan (x/12) · Rentang ("Jan 25 – Jul 26") · Jeda · Penanda (chip 0 n · TP n; chip E n% Estimasi dibuang v1.8.0)
    │   ├── Area gulir sendiri `max-h calc(100vh-380px)`, thead sticky, min-w 1120 (muat 1280 px tanpa terpotong)
    │   ├── Baris Distrik (bawaan nyala, tombol "Per Distrik" / ?tingkat=lembaga mematikan; bawaan terbuka; latar muted + pita primary; Lembaga di bawahnya hanya menampilkan kode, nama distrik tak diulang) — agregat `groupRowsByDistrict`/`mergeCells`: Σ lahan melapor ÷ Σ lahan non-PSR Lembaga-Lembaganya
    │   ├── Baris Lembaga (depth 1 di bawah Distrik) — ▸ buka petani (lazy: getProductionAvailabilityFarmers) · nama → Per Lembaga ?lembaga=
    │   │   ├── Baris petani — ▸ buka lahan (lazy: getProductionAvailabilityParcels) · nama → Detail Petani
    │   │   │   ├── Baris lahan — kode → Detail Lahan · badge PSR / "lain" · sel kg → Master Data Produksi (?farmerGroupId&period&search)
    │   │   │   └── Baris semu "Tanpa persil" — record tanpa ID Lahan petani itu
    │   │   └── Baris status: Memuat… / error (klik lagi = muat ulang) / kosong
    │   └── Sel Lembaga/petani (CoverageCell): HeatCell % + penanda pojok E · 0 · TP; abu polos = tanpa record; transparan = bulan belum tiba (> periode acuan); abu "n rec" = tanpa lahan non-PSR
    └── Legenda: HeatLegend "% lahan non-PSR melapor" + swatch tanpa record + belum tiba · penanda · jeda merah
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
- **TP** = `parcel_id IS NULL`. Penanda **Estimasi** (`notes ILIKE '%estimasi%'`) dibuang di v1.8.0 — label dilepas dari semua record prod 2026-10-12; penanda **Meragukan** terstruktur menyusul (#424, v1.9.0).
- Warna sel: `heatStyle` (skala kontinu berjangkar ambang band 50/80/100 — sama dengan heatmap Semua Lembaga).

## Kueri & performa

Tiga kueri paralel saat halaman dibuka: daftar Lembaga (Prisma) + penyebut per Lembaga (SQL: petani aktif, lahan aktif, lahan non-PSR) + agregat **Lembaga × periode** rentang penuh (SQL `GROUP BY g.id, pr.period` dengan `COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_psr = false)` dan tiga `COUNT(*) FILTER`). Ukuran hasil ≈ Lembaga × periode (puluhan × puluhan) — tidak tumbuh dengan jumlah record; biaya kueri tumbuh linear dengan `tbl_production_record` (scan seluruh record aktif dalam scope). Anak dimuat per klik dengan filter `period >= 'Y-01' AND period <= 'Y-12'` (indeks `period`). Terukur lokal 2026-10-11 (snapshot prod, 36.653 record aktif, scope ALL): kueri agregat Lembaga × periode **122 ms** (`EXPLAIN ANALYZE`: hash join → sort → GroupAggregate 106 baris). Review #416 menandai bahwa kueri ini memindai seluruh record aktif tiap kali halaman dibuka (tanpa batas periode, tanpa cache) dan akan tumbuh linear dengan proyeksi ~85×; diterima untuk v1.7.0 (< 500 ms), dicatat sebagai tindak lanjut: batasi sel ke tahun terpilih + kueri ringan MIN/MAX per Lembaga, atau `unstable_cache` berkunci scope, bila waktu di prod mendekati 500 ms. Angka prod dicatat di `docs/database/performance.md` saat QA v1.7.0.

## Ekspor Excel (K6)

`exportMultiSheetToExcel` (client, `exceljs` dinamis). **Sheet 1** `Lembaga <tahun>`: Distrik · Kategori · Lembaga · Kode (urutan owner 2026-10-11), petani, lahan aktif, lahan non-PSR, 12 kolom % (angka atau kosong — penyebut non-PSR 0 → kosong + kolom **Catatan**, bukan teks "n rec" di kolom angka), bulan ber-data, periode pertama/terakhir & jeda (rentang penuh), **Record/0 kg/tanpa persil `<tahun>`** (`summarizeYear` — per tahun terpilih, satu cakupan dengan Sheet 2; keputusan owner 2026-10-12, review pra-rilis), Catatan (`percentUnavailableNote`) — mengikuti filter & urutan layar. Sheet 2 lewat aksi ber-guard **EXPORT** di server. **Sheet 2** `Lahan <abrv>`: lahan × bulan (kg) + pemilik untuk Lembaga yang difilter (`getProductionAvailabilityGroupParcels`); tanpa filter Lembaga → satu baris petunjuk. Nama berkas `ketersediaan-produksi-<tahun>[-<abrv>]-<yyyymmdd>.xlsx`.

## Tindak lanjut (epic #415)

B — kalender **Pelatihan** (issue menyusul setelah bentuk Produksi disetujui); C/D — Pekerja, Perawatan menunggu modulnya. Pertanyaan terbuka: entitas tak berperiode bulanan cukup lewat "Cakupan modul" di Semua Lembaga.
