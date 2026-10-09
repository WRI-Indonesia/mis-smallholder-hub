# Dashboard Rantai Pasok (prototipe)

[← Menu Dashboard](README.md) · [← Katalog halaman](../README.md)

> **Prototipe #379** untuk bahan diskusi. Datanya **bukan dari DB**, melainkan tabel CSV hasil konversi form survei rantai pasok 2025 (`scripts/local/seed/data-supply-chain/build-tables.mjs`, gitignored karena berisi nama orang). Tabel dibaca dari folder lokal atau dari S3 privat `<bucket>/prototype/supply-chain/` (unggah: `scripts/seed/upload-supply-chain-tables.mjs`). K2/K3 versi prototipe (rantai Agen → RAMP direkam; nama PT → PKS UML = pasti) **tidak** mengubah keputusan epic untuk #380.

## Diagram objek

```text
Halaman: Dashboard Rantai Pasok (/admin/dashboard/supply-chain)
├── Header: judul + badge Prototipe + HelpHint · tombol "Lihat di Peta" (membawa filter)
├── Bar filter (dipakai bersama Peta; tersimpan di URL)
│   ├── Lingkup: Distrik · Kategori (Swadaya/Ex-Plasma) · UL & Non-UL · Tahun
│   └── Rantai: Lembaga › Agen·KT/Koperasi › RAMP › Mill (pilihan faset) · Reset
├── Kartu KPI: TBS · Ke Mill Pemasok UL · Sampai PKS Pasti · Offtaker
├── Kartu lipat* "Jalur TBS dari petani" — batang komposisi (= legenda warna)
├── Banner "Catatan data" (bisa dilipat)
├── Kartu lipat* "Aliran TBS": Lembaga/Distrik → Offtaker (Agen · RAMP · KT/Koperasi · rantai Agen → RAMP satu node) → Mill/UL-Non-UL
│   ├── Tab (diingat*): Sankey · Diagram Alur (React Flow, garis beranimasi) · Jalur (baris per jalur) · Tabel Pohon (Arah Hulu→Hilir | Hilir→Hulu)
│   ├── Toolbar berlabel: Dari Lembaga|Distrik · Ke Mill|UL/Non-UL · Offtaker Per jenis|Satu per satu (+ N teratas) · Angka Ton|% · Tampilan bawaan
│   ├── Kalimat "Menampilkan …" + chip filter aktif (✕ per chip · Hapus semua)
│   └── Hover/klik = sorot jalur penuh · klik node/ikon corong = filter / turun ke rincian
└── Kartu lipat* "Volume per Mill" (batang tonase + porsi UL, top 10 + tampilkan semua)

* posisi lipat & tab terakhir disimpan di localStorage browser (`sc-dashboard:*`), bukan URL
```

## Data & akses

| Aspek | Nilai |
|---|---|
| Menu key / izin | `dashboard-supply-chain` · VIEW (izin peran = Monev BMP) |
| Server Action | `getSupplyChainDashboardView` (`src/server/actions/supply-chain-prototype.ts`) — `hasPermission` VIEW, scope `getAccessContext` per kode Lembaga, Lembaga `isActive` |
| Sumber data | `src/lib/supply-chain-tables.ts` (CSV lokal → S3) · agregasi murni `src/lib/supply-chain-flow.ts` · tab Jalur & Tabel Pohon `src/lib/supply-chain-views.ts` (dari graf Sankey yang sama) |
| Bantuan | `src/content/help/tutorial/p-16-dashboard-rantai-pasok.md` |
