# Peta Rantai Pasok (prototipe)

[← Menu Map](README.md) · [← Katalog halaman](../README.md)

> **Prototipe #379**: sumber data sama dengan [Dashboard Rantai Pasok](../dashboard/supply-chain.md) (tabel CSV lokal / S3 privat, bukan DB). Garis = garis lurus menurut data pengakuan, bukan rute angkut.

## Diagram objek

```text
Halaman: Peta Rantai Pasok (/admin/map/supply-chain)
├── Panel kiri setinggi isinya (bisa dilipat); chip "Menyorot: …" (✕) di header saat jaringan disorot
│   ├── Judul + badge Prototipe + HelpHint · baris TBS · % tergambar · tautan Dashboard (membawa filter)
│   ├── Toggle Ringkas (Lembaga → Mill) | Detail (singgah agen/RAMP bertitik + titik lahan)
│   └── Satu gulir, bagian lipat (diingat per browser `sc-dashboard:map:*`; bawaan Filter terbuka, lainnya terlipat dengan ringkasan di judul):
│       Filter (bar filter bersama, vertikal + Reset) · Lapisan (garis alir · animasi arah · label · titik lahan · garis lahan → Mill)
│       · Legenda (warna jalur + contoh tebal 3 tonase + titik/ikon) · Ringkasan (tergambar / tidak tergambar + daftar NAMA Mill/Lembaga/offtaker tanpa titik)
├── Peta
│   ├── Garis alir melengkung (`arcCoordinates`, bezier ke kiri arah aliran), warna = jalur, tebal ∝ √tonase (`flowLineWidth`)
│   │   + lapisan dash putih yang diputar rAF (titik bergerak = arah; mati → panah) · hover = garis menyala (feature-state)
│   ├── Titik: Lembaga · offtaker bertitik · ikon pabrik Mill seragam (biru UL · abu · abu muda putus-putus = PKS belum pasti) di atas lingkaran halo ∝ tonase
│   ├── Label selektif: 8 terbesar per jenis selalu, sisanya zoom ≥ 10; bisa dimatikan
│   ├── Hover = tooltip nama + tonase; klik node = sorot jaringannya, sisanya diredupkan
│   └── Popup (auto-pan di kanan panel, bisa digeser): Mill (badge UL, UML ID, Distrik, porsi, status, RSPO, Lembaga·offtaker, jarak rata-rata, Lembaga teratas)
│       · Lembaga (porsi, % UL · % PKS pasti, offtaker utama, jarak, Mill tujuan) · offtaker (aksi hanya bila `offtakerFilterPatch` menangkap recordnya; pembeli kedua non-RAMP → keterangan) · lahan · garis — footer **Jadikan filter** · **Lihat di Dashboard**
├── Tumpukan kontrol kanan atas: zoom +/− · Paskan · Lapisan (popover saklar yang sama dengan panel) · Basemap (popover STREET / LIGHT / DARK / SAT / HYBRID)
└── Strip legenda mendatar bawah tengah (warna jalur · Lembaga · offtaker · 3 ikon Mill; ✕ sembunyikan ↔ chip Legenda; diingat per browser, digeser ke kanan selebar panel saat panel terbuka)
```

## Data & akses

| Aspek | Nilai |
|---|---|
| Menu key / izin | `map-supply-chain` · VIEW (izin peran = Monev BMP) |
| Server Action | `getSupplyChainMapView` — sama dengan dashboard + titik lahan `ST_PointOnSurface(lp.geom)` (K8) dengan kunci Lembaga + Farmer ID + Parcel ID; cadangan koordinat survei |
| Lib murni | `src/lib/supply-chain-map.ts` (lengkung garis, skala tebal, entitas tak tergambar bernama — bucket = `buildFlowSegments`, `offtakerFilterPatch`) · titik singgah bersama `recordWaypointOfftakers` (`supply-chain-flow.ts`) · `src/lib/supply-chain-insights.ts` (jarak, volume Lembaga untuk popup) |
| Bantuan | `src/content/help/tutorial/p-17-peta-rantai-pasok.md` |
