# Menu: Map

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

## Diagram objek

```text
Menu: Map (/admin/map → redirect /admin/map/parcel)
├── Sub Menu: Peta Lahan (map-parcel)
│   └── Page: Peta Lahan (/admin/map/parcel)
└── Sub Menu: Peta BMP (map-bmp)
    └── Page: Peta BMP (/admin/map/bmp)
```

## Atribut menu

| Atribut | Nilai |
|---|---|
| Menu key | `map` |
| URL | `/admin/map` |
| Icon | `Map` |
| Sub menu | 2 — Peta Lahan (`map-parcel`), Peta BMP (`map-bmp`) |
| Order | 7 |
| Catatan | `src/app/(admin)/admin/map/page.tsx` hanya `redirect("/admin/map/parcel")` — tidak ada halaman induk. |

Sumber metadata menu: `prisma/seeds/data/menu.csv`. Semua halaman berada di bawah guard NextAuth (`middleware.ts`) dan tiga lapis keamanan (menu permission, access context, soft delete).

## Teknologi peta (dipakai kedua sub menu)

| Aspek | Nilai |
|---|---|
| Library | MapLibre GL via `react-map-gl/maplibre` (`Map`, `Source`, `Layer`, `Popup`); komponen canvas di-`dynamic()` dengan `ssr: false` |
| Basemap | 3 pilihan: `light` (CARTO light_all), `dark` (CARTO dark_all), `hybrid` (Google `mt1.google.com/vt/lyrs=y`); default mengikuti tema aplikasi sampai user memilih manual |
| Glyphs label | `https://fonts.openmaptiles.org/{fontstack}/{range}.pbf`, font `Open Sans Regular` |
| View awal | `longitude: 101.8, latitude: 0.6, zoom: 9` (Riau), lalu auto `fitBounds` ke data yang dimuat |
| Kontrol zoom | Tidak ada `NavigationControl` bawaan — zoom via scroll/pinch/double-click + tombol "Zoom ke semua data" |
| Layout | Peta full-bleed `-m-6 h-[calc(100vh-3.5rem)]`, panel mengambang di atas canvas |

## Daftar sub menu

| # | Sub menu | Key | URL | Icon | Order | Dokumen |
|---|---|---|---|---|---|---|
| 1 | Peta Lahan | `map-parcel` | `/admin/map/parcel` | `MapPinned` | 1 | [peta-lahan.md](./peta-lahan.md) |
| 2 | Peta BMP | `map-bmp` | `/admin/map/bmp` | `Sprout` | 2 | [peta-bmp.md](./peta-bmp.md) |
