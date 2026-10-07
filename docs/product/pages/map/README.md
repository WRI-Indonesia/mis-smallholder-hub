# Menu: Map

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

## Diagram objek

```text
Menu: Map (/admin/map → redirect /admin/map/parcel)
├── Sub Menu: Peta Lahan (map-parcel)
│   └── Page: Peta Lahan (/admin/map/parcel)
├── Sub Menu: Peta BMP (map-bmp)
│   └── Page: Peta BMP (/admin/map/bmp)
└── Sub Menu: Peta Rantai Pasok (map-supply-chain) — prototipe #379
    └── Page: Peta Rantai Pasok (/admin/map/supply-chain)
```

## Atribut menu

| Atribut | Nilai |
|---|---|
| Menu key | `map` |
| URL | `/admin/map` |
| Icon | `Map` |
| Sub menu | 3 — Peta Lahan (`map-parcel`), Peta BMP (`map-bmp`), Peta Rantai Pasok (`map-supply-chain`, prototipe #379) |
| Order | 2 |
| Catatan | `src/app/(admin)/admin/map/page.tsx` hanya `redirect("/admin/map/parcel")` — tidak ada halaman induk. |

Sumber metadata menu: `prisma/seeds/data/menu.csv`. Semua halaman berada di bawah guard NextAuth (`middleware.ts`) dan tiga lapis keamanan (menu permission, access context, soft delete).

## Teknologi peta (dipakai ketiga sub menu)

| Aspek | Nilai |
|---|---|
| Library | MapLibre GL via `react-map-gl/maplibre` (`Map`, `Source`, `Layer`, `Popup`); komponen canvas di-`dynamic()` dengan `ssr: false` |
| Basemap | 5 pilihan dari `MAP_STYLES` (`src/lib/map-style.ts`; urutan kunci = urutan tombol `MAP_STYLE_KEYS`), label tombol `MAP_STYLE_LABELS`: **STREET** (`streetmap` — OpenStreetMap standar raster, tanpa API key), **LIGHT** (`light` — vector OpenFreeMap `positron`), **DARK** (`dark` — vector OpenFreeMap `dark`), **SAT** (`satellite` — Google `mt1.google.com/vt/lyrs=s`, citra tanpa label), **HYBRID** (`hybrid` — Google `lyrs=y`, citra + label); default kedua halaman Map mengikuti tema aplikasi (`light`/`dark`) sampai user memilih manual. Basemap citra (SAT/HYBRID) men-taint canvas sehingga capture cetak PDF gagal |
| Glyphs label | Style raster (STREET/SAT/HYBRID): `https://fonts.openmaptiles.org/{fontstack}/{range}.pbf`, font `Open Sans Regular` (`OPENMAPTILES_FONT`); style vector OpenFreeMap (LIGHT/DARK) memakai glyphs-nya sendiri, font `Noto Sans Regular` (`OPENFREEMAP_FONT`) — layer label MIS berganti font otomatis via `useVectorBasemap` (`src/hooks/use-vector-basemap.ts`) |
| View awal | `longitude: 101.8, latitude: 0.6, zoom: 9` (Riau), lalu auto `fitBounds` ke data yang dimuat |
| Kontrol zoom | Tidak ada `NavigationControl` bawaan — zoom via scroll/pinch/double-click + tombol "Zoom ke semua data". Peta Lahan menambah Terrain 3D, kompas, putar & miring (lihat [parcel.md](./parcel.md)) |
| Popup standar (TD-028) | Primitif bersama `src/components/shared/map-popup.tsx` (`MapPopupHeader`, `MapPopupHighlight`, `MapPopupSection`, `MapPopupRows`) + props `<Popup>` baku `MAP_POPUP_PROPS`; footer aksi `ParcelPopupActions` + modal `ParcelEditModalHost` (`master-data/parcels/components/`). Rule: `docs/standards/ui-ux-map.md` — butir "Popup lahan (STANDAR — #188)" |
| Layout | Peta full-bleed `-m-6 h-[calc(100vh-3.5rem)]`, panel mengambang di atas canvas |

## Daftar sub menu

| # | Sub menu | Key | URL | Icon | Order | Dokumen |
|---|---|---|---|---|---|---|
| 1 | Peta Lahan | `map-parcel` | `/admin/map/parcel` | `MapPin` | 1 | [parcel.md](parcel.md) |
| 2 | Peta BMP | `map-bmp` | `/admin/map/bmp` | `Sprout` | 2 | [bmp.md](bmp.md) |
| 3 | Peta Rantai Pasok (prototipe) | `map-supply-chain` | `/admin/map/supply-chain` | `Navigation` | 3 | [supply-chain.md](supply-chain.md) |
