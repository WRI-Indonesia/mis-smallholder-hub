# Peta Rantai Pasok (prototipe)

[← Menu Map](README.md) · [← Katalog halaman](../README.md)

> **Prototipe #379**: sumber data sama dengan [Dashboard Rantai Pasok](../dashboard/supply-chain.md) (tabel CSV lokal / S3 privat, bukan DB). Garis = garis lurus menurut data pengakuan, bukan rute angkut.

## Diagram objek

```text
Halaman: Peta Rantai Pasok (/admin/map/supply-chain)
├── Panel kiri (bisa dilipat)
│   ├── Judul + badge Prototipe + HelpHint · tautan Dashboard (membawa filter)
│   ├── Toggle Ringkas (Lembaga → Mill) | Detail (singgah agen/RAMP bertitik + titik lahan) · Paskan
│   └── Tab: Filter (bar filter bersama, vertikal) · Legenda (+ lapisan Detail) · Ringkasan (tergambar / tidak tergambar)
├── Peta
│   ├── Garis alir (warna = jalur, tebal ∝ tonase) + panah arah
│   ├── Titik: Lembaga · offtaker bertitik · ikon pabrik Mill (biru = pemasok UL, ukuran ∝ tonase) · titik lahan (Detail)
│   ├── Klik node = sorot jaringannya, sisanya diredupkan
│   └── Popup (auto-pan di kanan panel, bisa digeser): Mill (badge UL, UML ID, Distrik, Program buyer, RSPO, Lembaga teratas) · Lembaga/offtaker (TBS + Mill tujuan ber-badge UL) · lahan · garis
└── Basemap: STREET / LIGHT / DARK / SAT / HYBRID
```

## Data & akses

| Aspek | Nilai |
|---|---|
| Menu key / izin | `map-supply-chain` · VIEW (izin peran = Monev BMP) |
| Server Action | `getSupplyChainMapView` — sama dengan dashboard + titik lahan `ST_PointOnSurface(lp.geom)` (K8) dengan kunci Lembaga + Farmer ID + Parcel ID; cadangan koordinat survei |
| Bantuan | `src/content/help/tutorial/p-17-peta-rantai-pasok.md` |
