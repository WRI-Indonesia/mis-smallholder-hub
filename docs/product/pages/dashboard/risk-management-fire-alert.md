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
│   ├── Popup titik api (waktu WIB, confidence, satelit, FRP, lembaga) — bisa digeser (`useMapPopupDrag`, offset dasar 12)
│   ├── Popup boundary (nama, distrik, jumlah titik)
│   ├── Legenda kiri-bawah (confidence, bentuk dalam/luar, boundary, batas kabupaten)
│   └── Kontrol kanan-bawah: ⛶ Zoom ke satu Riau (+ clear selection) · basemap StreetMap/Light/Dark/Satellite/Hybrid (Light & Dark = vector OpenFreeMap sejak 2026-08-29; default ikut tema)
└── Panel kanan (¼ lebar)
    ├── Toggle rentang: 24 jam / 5 / 10 / 30 hari terakhir (default 5; >5 hari = gabungan jendela 5 hari ber-DATE, #284)
    │   └── + "Bulan tertentu (laporan bulanan)" (#365) → Select Bulan + Tahun (Jan 2020 … bulan berjalan; masuk = bulan lalu)
    │       + keterangan cakupan: parsial (bulan berjalan) · sumber FIRMS (arsip SP / NRT) · tanggal belum tersedia (amber)
    ├── Kartu ringkasan (4, ber-tooltip rincian)
    │   ├── Dalam Boundary → tooltip per distrik program
    │   ├── Lembaga Terdampak → tooltip daftar lembaga ber-titik api
    │   ├── Luar Boundary → tooltip per kabupaten program + "Kab. Lainnya"
    │   └── Total se-Riau → tooltip per kabupaten program + "Kab. Lainnya"
    ├── Keyakinan deteksi (dalam boundary) — 1 baris per tingkat + bar porsi, nilai 0 diredupkan, baris Total
    ├── Tabel Titik api per lembaga — judul mengikuti periode ("5 hari terakhir" / "Januari 2025") (hanya ber-titik; klik baris = zoom + highlight, klik ulang = batal)
    └── Print Map: scope Full Riau / per Distrik → Cetak Peta (PDF) [mode bulan: Cetak Laporan Bulanan (PDF)] berprogres ("Peta lembaga n dari N…") + tombol Batalkan
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Menu key | `dashboard-risk-fire` (induk `dashboard-risk`, level-3) |
| Route | `/admin/dashboard/risk/fire` |
| File | `src/app/(admin)/admin/dashboard/risk/fire/page.tsx` (+ `fire-alert-client.tsx`, `fire-alert-panel.tsx`, `fire-map-canvas.tsx`, `loading.tsx`) |
| Tipe | Server Component page → Client Components (peta & panel) |
| Guard | `requirePermission("dashboard-risk-fire")` + `hasPermission(..., "PRINT")` untuk seksi Print |
| Server action / data | `getFireBoundaries()` (access-context via `farmerGroupAccessFilter`), `getAdminBoundaries()` (sengaja tanpa scope — garis referensi publik), fetch klien `GET /api/map-hotspot` (guard `map-parcel` **atau** `dashboard-risk-fire` VIEW) — `?dayRange=` (live) **atau** `?month=YYYY-MM` (#365, eksklusif; keduanya → 400) |
| Role dengan VIEW+PRINT (seed) | SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT, DONOR |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Deteksi dalam/luar boundary | Logika klien | Point-in-polygon (`src/lib/fire-alert.ts`, ray casting + pra-cek bbox); **boundary ICS sudah termasuk buffer 1,5 km** (fakta owner) |
| Saringan se-Riau | Logika klien | Hotspot bbox FIRMS dipangkas ke gabungan 12 poligon kabupaten BIG (`filterPointsWithinAreas`) — bbox persegi ikut memuat Malaysia/Sumbar/Jambi |
| Cetak PDF | jsPDF | Lampiran di-capture **berurutan** satu peta per lembaga (tiap capture menunggu `idle`, timeout 8 dtk) — tombol menghitung kemajuan dan bisa **dibatalkan** (`AbortController` dicek tiap iterasi; batal = **tidak ada PDF**, bukan lampiran separuh) (#276). "Laporan Titik Api (Hotspot)" A4 portrait (`src/lib/fire-map-print.ts`): header letterhead ber-logo WRI, 4 kartu, peta sebaran, tabel detail per titik, lampiran peta per lembaga ber-titik api (mode fokus — lembaga lain dipudarkan), catatan metodologi; font **Acumin Pro** ter-embed (`public/fonts/*.ttf`, fallback helvetica); dokumen dibuat `compress: true` dan capture peta di-encode **JPEG** ter-downscale ke 1500 px sisi terpanjang (`src/lib/map-capture.ts`) demi ukuran berkas. **Mode bulan (#365, `opts.monthly`):** judul "Laporan **Bulanan** Titik Api (Hotspot)", meta "Periode: Januari 2025 (1–31 Jan 2025)" / "(parsial, …)", setelah kartu: **Tren Harian** (tanggal UTC × dalam/luar/total + bar porsi, hari puncak merah tebal, tanggal kosong "tidak tersedia di FIRMS"), **Rekap per Kabupaten** (+ baris Total; per Distrik = 1 baris, dan kolom "Dalam Boundary"-nya **mengambil angka kartu ringkasan**, bukan hitungan per poligon — buffer 1,5 km bisa melewati batas kabupaten sehingga dua definisi itu berbeda dua arah dan akan saling bertentangan di PDF yang sama), **Rekap per Lembaga (ber-titik api)** (titik · keyakinan tinggi · tumpang-tindih); catatan metodologi menyebut sumber yang dipakai (`describeHotspotSources`) + tanggal kosong; tabel detail tetap lengkap (#287); nama berkas `laporan-titik-api-<scope>-<YYYY-MM>.pdf` |
| Sumber data titik api | API eksternal | NASA FIRMS VIIRS SNPP via proxy `/api/map-hotspot`. **Live:** `VIIRS_SNPP_NRT`, rentang 24 jam/5/10/30 hari (cap 5 hari per request FIRMS diatasi dengan beberapa jendela ber-`DATE` yang digabung di proxy, #284), tanpa riwayat DB. **Bulan (#365):** `month=YYYY-MM` → `monthWindows` memetakan tiap hari ke sumber (arsip `VIIRS_SNPP_SP` diutamakan bila tanggal ∈ [min,max] SP; sisanya NRT bila ≥ min NRT — NRT dianggap terbuka s.d. hari ini) lalu mengelompokkan 5 hari dari tanggal 1 (±7 request/bulan); batas SP/NRT dibaca dari `data_availability/csv/KEY/ALL` (cache 6 jam) — **tidak di-hard-code** karena FIRMS memangkas jendela di luar ketersediaan **tanpa galat** (diverifikasi 2026-09-22); hari tanpa sumber → `coverage.missingDates` (foreign member GeoJSON `coverage {month, from, to, sources, missingDates}`). Cache: bulan lampau `revalidate` 30 hari + `max-age` 1 hari; bulan berjalan seperti live. Ketersediaan gagal / teks error → 502 (tidak menebak sumber). Batas bawah `HOTSPOT_MONTH_MIN` = 2020-01. Angka kartu/rincian keyakinan/tabel ber-pemisah ribuan (`formatNumber`). Keputusan owner 2026-08-24 (#287): cetak PDF Full Riau pada 30 hari **tidak dibatasi** — mengandalkan progres + Batalkan (#276); berlaku juga untuk bulan |
| Sumber boundary | DB | `FarmerGroupBoundary` (seed `scripts/seed/seed-boundary-lembaga.ts`) & `AdministrativeBoundary` (seed `seed-batas-administrasi.ts`; cache geojson tersimplifikasi 0,001°) |

## Catatan

- Metode deteksi **berbeda** dari hotspot Peta Lahan (jarak haversine ≤15 km ke titik kantor lembaga) — di sini titik diuji jatuh di dalam poligon wilayah ICS.
- Tren harian mengelompokkan per **tanggal UTC** (`acq_date` FIRMS), bukan WIB — deteksi malam ±01.30 WIB tercatat di hari UTC sebelumnya; pengelompokan WIB akan memunculkan baris tanggal 1 bulan berikutnya di laporan bulan ini. Rekap per kabupaten berbasis poligon BIG (konsisten dengan kartu Total/Luar), rekap lembaga = `countHotspotsByGroup` (+ `high`).
- Tutorial Bantuan: `p-11-fire-alert` (bab Memantau & Menindaklanjuti); konsep: `3-1-dashboard`.
