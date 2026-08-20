# Risk Management — Fire Alert

[← Menu Dashboard](./README.md) · [← Katalog halaman](../README.md)

Sub menu level-3 `dashboard` → `dashboard-risk` (Risk Management) → `dashboard-risk-fire`, satu halaman: `/admin/dashboard/risk/fire` (#266, DASH-07). Grup menu level-3 **pertama** di aplikasi.

## Diagram objek

```text
Halaman: Fire Alert (/admin/dashboard/risk/fire)
├── Peta MapLibre (¾ lebar, full-bleed)
│   ├── Layer batas administrasi kabupaten (garis putus abu + label; BIG, selalu tampil)
│   ├── Layer boundary lembaga (poligon Antique Violet #660099 + label; terpilih = fill pekat + outline tebal)
│   ├── Layer titik api — dalam boundary: ikon api; luar: lingkaran kecil (warna = confidence)
│   ├── Popup titik api (waktu WIB, confidence, satelit, FRP, lembaga)
│   ├── Popup boundary (nama, distrik, jumlah titik)
│   ├── Legenda kiri-bawah (confidence, bentuk dalam/luar, boundary, batas kabupaten)
│   └── Kontrol kanan-bawah: ⛶ Zoom ke satu Riau (+ clear selection) · basemap Light/Dark/Hybrid
└── Panel kanan (¼ lebar)
    ├── Toggle rentang: 24 jam / 5 hari terakhir (default 5; cap FIRMS)
    ├── Kartu ringkasan (4, ber-tooltip rincian)
    │   ├── Dalam Boundary → tooltip per distrik program
    │   ├── Lembaga Terdampak → tooltip daftar lembaga ber-titik api
    │   ├── Luar Boundary → tooltip per kabupaten program + "Kab. Lainnya"
    │   └── Total se-Riau → tooltip per kabupaten program + "Kab. Lainnya"
    ├── Breakdown confidence (dalam boundary)
    ├── Tabel Titik api per lembaga (hanya ber-titik; klik baris = zoom + highlight, klik ulang = batal)
    └── Print Map: scope Full Riau / per Distrik → tombol Cetak Peta (PDF)
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Menu key | `dashboard-risk-fire` (induk `dashboard-risk`, level-3) |
| Route | `/admin/dashboard/risk/fire` |
| File | `src/app/(admin)/admin/dashboard/risk/fire/page.tsx` (+ `fire-alert-client.tsx`, `fire-alert-panel.tsx`, `fire-map-canvas.tsx`, `loading.tsx`) |
| Tipe | Server Component page → Client Components (peta & panel) |
| Guard | `requirePermission("dashboard-risk-fire")` + `hasPermission(..., "PRINT")` untuk seksi Print |
| Server action / data | `getFireBoundaries()` (access-context via `farmerGroupAccessFilter`), `getAdminBoundaries()` (sengaja tanpa scope — garis referensi publik), fetch klien `GET /api/map-hotspot` (guard `map-parcel` **atau** `dashboard-risk-fire` VIEW) |
| Role dengan VIEW+PRINT (seed) | SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT, DONOR |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Deteksi dalam/luar boundary | Logika klien | Point-in-polygon (`src/lib/fire-alert.ts`, ray casting + pra-cek bbox); **boundary ICS sudah termasuk buffer 1,5 km** (fakta owner) |
| Saringan se-Riau | Logika klien | Hotspot bbox FIRMS dipangkas ke gabungan 12 poligon kabupaten BIG (`filterPointsWithinAreas`) — bbox persegi ikut memuat Malaysia/Sumbar/Jambi |
| Cetak PDF | jsPDF | "Laporan Titik Api (Hotspot)" A4 portrait (`src/lib/fire-map-print.ts`): header letterhead ber-logo WRI, 4 kartu, peta sebaran, tabel detail per titik, lampiran peta per lembaga ber-titik api (mode fokus — lembaga lain dipudarkan), catatan metodologi; font **Acumin Pro** ter-embed (`public/fonts/*.ttf`, fallback helvetica) |
| Sumber data titik api | API eksternal | NASA FIRMS VIIRS SNPP NRT via proxy `/api/map-hotspot`; live, maks 5 hari, tanpa riwayat DB |
| Sumber boundary | DB | `FarmerGroupBoundary` (seed `scripts/seed/seed-boundary-lembaga.ts`) & `AdministrativeBoundary` (seed `seed-batas-administrasi.ts`; cache geojson tersimplifikasi 0,001°) |

## Catatan

- Metode deteksi **berbeda** dari hotspot Peta Lahan (jarak haversine ≤15 km ke titik kantor lembaga) — di sini titik diuji jatuh di dalam poligon wilayah ICS.
- Tutorial Bantuan: `p-11-fire-alert` (bab Memantau & Menindaklanjuti); konsep: `3-1-dashboard`.
