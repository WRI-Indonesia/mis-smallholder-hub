# Page: Detail Lahan

[← Lahan](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Detail Lahan (/admin/master-data/parcels/[id])
├── Header
│   ├── Tombol kembali + ikon lahan
│   ├── Judul: {parcelId} (mono) — breadcrumb menampilkan parcelId, bukan CUID
│   ├── Subjudul: Milik {nama petani} (link) · {Lembaga} · {Distrik}
│   ├── Badge: Aktif/Nonaktif · PSR (Replanting)/Non-PSR · Komoditas · Kelompok Tani
│   ├── Tombol: Profil Lahan (PDF) — disabled tanpa geometri
│   ├── Tombol: Edit
│   └── Tombol: Nonaktifkan
├── Kartu ringkasan (5)
│   ├── Luas (Ha, sub: Blok · jumlah pohon + kerapatan/ha — #238)
│   ├── Legalitas (jenis surat unik + "STDB", sub: n surat · n STDB · n UL Parcel Code · n program — #298)
│   ├── Umur Tanaman (sub: Tahun tanam)
│   ├── Produksi (Ton total, sub: jumlah record + rentang tahun; catatan PSR)
│   └── Kelengkapan Data (n/9 atribut termasuk Surat kepemilikan — #298, sub: daftar yang belum diisi)
├── Tab Informasi (#298) — peta 60% kiri, keterangan 40% kanan
│   ├── Peta ParcelMapView (h-560px)
│   │   ├── Poligon hijau = lahan ini; poligon biru = lahan lain milik petani
│   │   ├── Titik kuning = pohon sawit bila tersedia (prop treePoints, #238)
│   │   ├── Tombol Zoom ke Lahan + zoom awal: fitBounds SEMUA lahan
│   │   └── Pemilih basemap: streetmap / light / dark / satellite / hybrid (satu set dengan halaman peta lain; default hybrid)
│   ├── Label singkat di tiap poligon (#298): segmen huruf ID lahan ("A"/"B"/"C") — hijau lahan ini,
│   │   biru lahan lain (Marker HTML, klik tembus); klik poligon biru → popup (ID, luas, tahun
│   │   tanam, "Buka detail lahan"), auto-pan agar tak terpotong; lahan ini tanpa popup
│   ├── Legenda warna (+ titik kuning bila ada pohon) + link koordinat titik pusat → Google Maps
│   ├── Kolom kanan: hanya atribut terisi (ID Lahan, Blok, Kelompok Tani, Status Kepemilikan,
│   │   Tahun Tanam (+umur), Komoditas, Species, Catatan); yang kosong → satu baris
│   │   "Belum diisi: …" + tombol Lengkapi (EDIT)
│   ├── Meta: Revisi ke-N · Dibuat · Diubah
│   └── Sub-bagian Pemilik: Nama (link), ID Petani, Lembaga (link), Distrik,
│       tabel Lahan Lain Milik Petani (Kode ber-link antar-detail · Luas ·
│       Tahun Tanam · Jumlah Pohon)
├── Tabs (#298): Informasi · Legalitas (badge jumlah) · Produksi — satu Card per tab
├── Tab Legalitas (#296/#298) — 4 kartu grup (ikon + judul + pill jumlah + Tambah) dalam grid 2 kolom;
│   tiap item = blok bernuansa (judul + chip meta), kolom kosong tak dirender; empty state bergaris putus
│   ├── Surat kepemilikan: badge jenis (akronim; "Jenis belum diisi" bila OTHER tanpa
│   │   typeRaw) · nomor mono · a.n. nama; chip: luas tertera · selisih vs poligon
│   │   (≥0,5 Ha chip amber) · terbit · catatan penguasaan; aksi pensil/hapus
│   ├── STDB: nomor mono (atau "<Tahap> — belum bernomor") · badge tahap (#306) · badge tahun · a.n.; meta: catatan tahap · dinas penerima · luas tertera · "Juga mencakup:" kode
│   │   ber-link / "Hanya lahan ini"; aksi pensil/lepas tautan
│   ├── UL Parcel Code: kode mono + pemeta (label `parcelMapperLabel`); meta tanggal pemetaan
│   └── Program: jenis + badge status; meta rentang tanggal
├── Tab Produksi
│   ├── Konteks: Luas · Tahun Tanam · Species
│   ├── Grafik batang bulanan kontinu (ParcelProductionChart)
│   │   ├── Tombol periode: 6 Bulan / 1 Tahun / 2 Tahun / Semua (viewport clip)
│   │   ├── Scroll horizontal (slide), auto ke bulan terbaru; tooltip per batang
│   │   └── Deret sampai bulan berjalan walau kosong
│   └── Tabel pivot: Tahun | Jan…Des | Total (kg) | Ton/Ha
│       ├── Baris tahun kontinu s.d. tahun berjalan walau kosong
│       └── Sel bulan klik → modal input/edit (gate permission menu Produksi)
└── Dialog
    ├── ParcelFormModal (Edit Lahan)
    └── ParcelProductionMonthModal — 4 slot panen (kg + tanggal) terbuka
        berurutan, total otomatis; simpan = diff create/update/nonaktifkan
        per slot via action menu Data Produksi
```

| Atribut | Nilai |
|---|---|
| File | `parcels/[id]/page.tsx` + `parcel-detail-client.tsx` (+ `components/parcel-map-view.tsx`, `parcel-production-chart.tsx`, `parcel-production-month-modal.tsx`, `parcel-legal-section.tsx` + `parcel-satellite-form-modal.tsx` #296) |
| Tipe | Server Component + client component; **tabs** Informasi · Legalitas · Produksi (#298, konsisten dengan Detail Petani) |
| Guard | `requirePermission("master-data-parcels")` + `getUserPermissionsForMenu` (menu Lahan **dan** menu Produksi); `notFound()` bila kosong |
| Server action / data | `getLandParcelById(id)`, `getLandParcelProduction(id)`, `getParcelTrees(id)` (`src/server/actions/tree.ts`), `getLandParcelSatellites(id)` (#296 — scope pada baris lahan, satelit dibaca via `parcelUid`); CRUD satelit `src/server/actions/land-parcel-satellite.ts` (`create/update{LandParcelDocument,LandStdb,LandParcelExternalId,LandParcelProgram}`, `unlinkLandStdb`, `deactivateLandParcelSatellite` — izin menu Lahan CREATE/EDIT/DELETE, scope via `parcel.farmer`), `getFarmerSiblingParcels`, `getFarmerOptions`; PDF `getLandParcelPassport`; produksi per bulan `getParcelPeriodRecords` + `create/update/deleteProductionRecord`; mutasi `deleteLandParcel` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Header `{parcelId}` | Heading | Judul = ID lahan (mono); subjudul pemilik ber-link; badge status/PSR/komoditas/KT; `BreadcrumbOverride` menampilkan parcelId |
| Tombol `Profil Lahan (PDF)` | Tombol | PRINT (sebelumnya VIEW, #245) — Farm Passport via `getLandParcelPassport` (guard menu Lahan); sejak #298 memuat section **Legalitas & Dokumen** (surat, STDB, UL Parcel Code, program) + blok/KT/species/PSR/jumlah pohon, multi-halaman dengan footer per halaman; disabled bila lahan tanpa geometri |
| Tombol `Edit` | Tombol | EDIT — buka `ParcelFormModal` |
| Tombol `Nonaktifkan` | Tombol | DELETE — `deleteLandParcel` dengan konfirmasi `Apakah Anda yakin ingin menonaktifkan lahan ini?` |
| Kartu ringkasan | Kartu ×5 | `Luas` (sub: blok · jumlah pohon + kerapatan/ha, #238), **`Legalitas`** (#298: nilai = jenis surat unik + "STDB", mis. "SHM + STDB"; sub = hitungan surat/STDB/UL Parcel Code/program), `Umur Tanaman`, `Produksi`, `Kelengkapan Data` (**9** atribut: Blok, Luas, Status Kepemilikan, Komoditas, Species, Tahun Tanam, Kelompok Tani, Geometri, **Surat kepemilikan**) |
| Tab `Informasi` | Tab (#298) — atribut **hanya yang terisi**; yang kosong dirangkum satu baris "Belum diisi: …" + tombol **Lengkapi** (EDIT) membuka modal edit; label sentence-case (bukan uppercase); Pemilik dalam kotak berbingkai | Peta 60% + keterangan 40%; sub-bagian Pemilik + tabel lahan lain milik petani (Kode ber-link · Luas · Tahun Tanam · Jumlah Pohon — `getFarmerSiblingParcels` kini menyertakan agregat pohon) |
| Peta `ParcelMapView` | Peta | MapLibre; poligon hijau = lahan ini, biru = lahan lain milik petani (`siblingGeometries`), titik kuning = pohon sawit bila tersedia (`treePoints`, #238 — data `getParcelTrees`); zoom awal & `Zoom ke Lahan` = `fitBounds` semua lahan; link koordinat titik pusat → Google Maps |
| Empty state peta | Teks | `Tidak ada data spasial (geometri) untuk lahan ini` |
| Tab `Legalitas` | Tab (#296/#298) | **Tiga** kartu grup sejak 2026-08-28 (Program pindah ke tabnya sendiri — keikutsertaan program bukan dokumen legal): Surat kepemilikan (selisih luas tertera vs poligon dihitung di klien, ≥0,5 Ha amber), STDB (+ lahan lain dalam STDB yang sama, ber-link; sejak **#306** tiap baris membawa **badge tahap** — `TERBIT` netral tanpa badge karena itu keadaan normal, `REVISI` amber, `DITOLAK` abu-dicoret — dan baris tanpa nomor tampil sebagai "<Tahap> — belum bernomor", bukan sel kosong yang terbaca seperti data rusak), **UL Parcel Code** (`lg:col-span-2` — isinya satu baris pendek; kode mono + chip `Pemeta: <short>` ber-tooltip label panjang). Data masuk lewat Bulk Upload → Lahan → tab Detail Lahan **atau CRUD manual** (3c): tombol **Tambah** per grup (CREATE), ikon pensil (EDIT) → `ParcelSatelliteFormModal` (satu modal, 4 jenis, form uncontrolled + error Zod per field; form STDB sejak #306 diawali selektor **Tahap** yang mengatur sisanya — nomor & tanggal/tahun terbit hanya muncul pada `TERBIT` — tetapi nomor yang **sudah tercatat tetap dikirim ulang** saat tahap dipindah dari `TERBIT`, sehingga STDB terbit yang dikembalikan untuk diperbaiki tidak kehilangan nomornya, catatan tahap wajib pada `REVISI`/`DITOLAK`, dan aturan **Revisi = masih berjalan / Ditolak = berhenti** tercetak di bawah selektor supaya keduanya tidak dipakai bergantian), ikon tempat sampah (DELETE) → `DeleteDialog` soft-delete; STDB memakai ikon **lepas tautan**. Grup kosong = satu kalimat empty state bergaris putus. Hitungan pill tab & KPI Legalitas = surat + STDB + UL Parcel Code (**tanpa** program) |
| Tab `Program` | Tab (2026-08-28) | Dipisah dari Legalitas atas koreksi owner. Berisi strip **PSR** (Peremajaan Sawit Rakyat — atribut `LandParcel.isPsr`, baca-saja di sini, diubah lewat Edit Lahan; secara konsep juga program, lihat `land-parcel-program.prisma`) + kartu grup **Program** (badge status, rentang tanggal, CRUD sama seperti grup legalitas). Satu komponen `ParcelLegalSection` dengan prop `variant="program"` agar modal & dialog tetap satu implementasi. Badge header **"Non-PSR" dihapus** — hanya PSR yang ditampilkan (sejalan PDF #298) |
| Tab `Produksi` | Tab | Konteks Luas/Tahun Tanam/Species; grafik bulanan kontinu (clip 6 bln/1 thn/2 thn/Semua + slide, sampai bulan berjalan); tabel pivot Tahun × Jan–Des + Total + Ton/Ha, baris s.d. tahun berjalan |
| Sel bulan tabel produksi | Tombol sel | Klik (butuh CREATE/EDIT menu Produksi) → `ParcelProductionMonthModal`; sel bulan masa depan tidak bisa diklik |
| `ParcelProductionMonthModal` | Dialog | 4 slot panen (kg + tanggal, dibatasi bulan tsb) terbuka berurutan; total otomatis; slot dikosongkan = nonaktifkan record (konfirmasi); keunikan per (petani, lahan, periode, panen-ke) |

Dialog `ParcelFormModal` (field lengkap) didokumentasikan di [daftar.md](./daftar.md#dialog-parcelformmodal-parcelscomponentsparcel-form-modaltsx).
