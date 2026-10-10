# Dashboard Rantai Pasok (prototipe)

[← Menu Dashboard](README.md) · [← Katalog halaman](../README.md)

> **Prototipe #379** untuk bahan diskusi. Datanya **bukan dari DB**, melainkan tabel CSV hasil konversi form survei rantai pasok 2025 (`scripts/local/seed/data-supply-chain/build-tables.mjs`, gitignored karena berisi nama orang). Tabel dibaca dari folder lokal atau dari S3 privat `<bucket>/prototype/supply-chain/` (unggah: `scripts/seed/upload-supply-chain-tables.mjs`). K2/K3 versi prototipe (rantai Agen → RAMP direkam; nama PT → PKS UML = pasti) **tidak** mengubah keputusan epic untuk #380.

## Diagram objek

```text
Halaman: Dashboard Rantai Pasok (/admin/dashboard/supply-chain)
├── Header: judul + badge Prototipe + HelpHint · tombol "Unduh Excel" (izin EXPORT; 3 sheet Jalur · Mill · Lembaga, filter aktif) · "Lihat di Peta" (membawa filter)
├── Bar filter (dipakai bersama Peta; tersimpan di URL) + chip filter aktif GLOBAL di bawahnya (✕ per chip · Hapus semua)
│   ├── Lingkup: Distrik · Kategori (Swadaya/Ex-Plasma) · UL & Non-UL · Tahun
│   └── Rantai: Lembaga › Agen·KT/Koperasi › RAMP › Mill (pilihan faset) — Reset hanya di panel Peta (vertikal)
├── Kartu KPI: TBS · Ke Mill Pemasok UL · Sampai PKS Pasti (sub: % disebut langsung) · Offtaker
├── Kartu lipat* "Sorotan" — 4 ubin dari filter aktif (`supplyChainInsights`): Konsentrasi ke Mill (Mill bernama saja; dilewati bila tak ada) · Ketergantungan offtaker (≥ 80%, koperasi Lembaga sendiri dikecualikan) · Mill belum pasti (Lembaga ≥ 50% tak pasti) · Jarak garis lurus (K8) — nama = tombol filter, "+N lagi" = buka kartu Lembaga (walau terlipat) + tampilkan semua + gulir, terurut
├── Kartu lipat* "Jalur TBS & Kepastian Mill" — dua batang 100%: Jalur (= legenda warna) · Kepastian Mill (disebut · dipetakan · belum pasti · tak diketahui → klik = filter)
├── Kartu lipat* "Aliran TBS": Lembaga/Distrik → Offtaker (Agen · RAMP · KT/Koperasi · rantai Agen → RAMP satu node) → Mill/UL-Non-UL
│   ├── Tab (diingat*): Sankey · Diagram Alur (React Flow, garis beranimasi) · Jalur (baris per jalur) · Tabel Pohon (Arah Hulu→Hilir | Hilir→Hulu)
│   ├── Toolbar lepasan berlabel (bawaan = pilihan kiri): Arah Hulu→Hilir|Hilir→Hulu (Pohon) · Dari Distrik|Lembaga · Ke UL/Non-UL|Mill · Offtaker Per jenis|Satu per satu (+ N teratas) · Angka Ton|% · tombol Tampilan bawaan (hanya bila ada yang diubah)
│   ├── Kalimat "Menampilkan …"
│   └── Hover/klik = sorot jalur penuh · klik node/ikon corong = filter (toast singkat) / turun ke rincian
├── Kartu lipat* "Volume per Mill" — kolom bisa diurut, baris Mill terfilter disorot, kolom Jarak (rata-rata garis lurus, tertimbang tonase), ikon peta per baris (hover), top 10 + tampilkan semua
├── Kartu lipat* "Volume per Lembaga" (`groupVolumes`) — Tonase (porsi UL) · % ke UL · % PKS pasti (amber < 50%) · Offtaker utama + % (⚠ ≥ 80% offtaker luar; `isSelf` diurut paling bawah) · Mill utama + % · Jarak; urut, lipat & tampilkan-semua dikendalikan Dashboard (Sorotan), klik baris = filter, ikon peta
└── Banner "Catatan data" (bisa dilipat) — dipindah ke bawah agar tidak memotong alur baca

* posisi lipat & tab terakhir disimpan di localStorage browser (`sc-dashboard:*`), bukan URL
```

## Data & akses

| Aspek | Nilai |
|---|---|
| Menu key / izin | `dashboard-supply-chain` · VIEW (izin peran = Monev BMP) |
| Server Action | `getSupplyChainDashboardView` (`src/server/actions/supply-chain-prototype.ts`) — `hasPermission` VIEW, scope `getAccessContext` per kode Lembaga, Lembaga `isActive` |
| Sumber data | `src/lib/supply-chain-tables.ts` (CSV lokal → S3) · agregasi murni `src/lib/supply-chain-flow.ts` · tab Jalur & Tabel Pohon `src/lib/supply-chain-views.ts` (dari graf Sankey yang sama) · jarak/Lembaga/Sorotan `src/lib/supply-chain-insights.ts` (haversine `lib/geo.ts`, koordinat dari CSV — tanpa DB; titik singgah = `recordWaypointOfftakers`, sama dengan garis Peta) · formatter `src/lib/supply-chain-format.ts` · Excel `src/lib/supply-chain-xlsx.ts` (`exportMultiSheetToExcel`, client-side, tombol hanya bila izin EXPORT) |
| Bantuan | `src/content/help/tutorial/p-16-dashboard-rantai-pasok.md` |
