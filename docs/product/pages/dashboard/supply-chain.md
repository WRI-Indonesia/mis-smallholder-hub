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
├── Kartu KPI: TBS Dideklarasikan · Ke Mill Pemasok UL · Sampai PKS Pasti · Offtaker
├── Batang komposisi "Jalur TBS dari petani" (= legenda warna)
├── Banner "Catatan data" (bisa dilipat)
├── Kartu Sankey: Lembaga/Distrik → Agen·KT/Koperasi → RAMP → Mill/UL-Non-UL
│   ├── Toggle: Lembaga|Distrik · Mill|UL/Non-UL · Ton|% · Ringkas|Detail · Reset
│   ├── Hover = sorot jalur penuh · klik node = filter / turun ke rincian
└── Tabel Volume per Mill (batang tonase + porsi UL, top 10 + tampilkan semua)
```

## Data & akses

| Aspek | Nilai |
|---|---|
| Menu key / izin | `dashboard-supply-chain` · VIEW (izin peran = Monev BMP) |
| Server Action | `getSupplyChainDashboardView` (`src/server/actions/supply-chain-prototype.ts`) — `hasPermission` VIEW, scope `getAccessContext` per kode Lembaga, Lembaga `isActive` |
| Sumber data | `src/lib/supply-chain-tables.ts` (CSV lokal → S3) · agregasi murni `src/lib/supply-chain-flow.ts` |
| Bantuan | `src/content/help/tutorial/p-16-dashboard-rantai-pasok.md` |
