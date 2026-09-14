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
├── Tabs (#298): Informasi · Legalitas (badge jumlah) · Program · Produksi · Patok (badge jumlah, #329) — satu Card per tab
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
| Header `{parcelId}` | Heading | Judul = ID lahan (mono); subjudul pemilik ber-link; badge status/PSR/komoditas/KT + **badge NKT** (#328: merah "Termasuk NKT" / amber "Terdampak NKT" — status yang harus terlihat sebelum apa pun; tidak ada badge untuk tidak terdampak/belum dinilai); `BreadcrumbOverride` menampilkan parcelId |
| Tombol `Profil Lahan (PDF)` | Tombol | PRINT (sebelumnya VIEW, #245) — Farm Passport via `getLandParcelPassport` (guard menu Lahan); sejak #298 memuat section **Legalitas & Dokumen** (surat, STDB, UL Parcel Code, program) + blok/KT/species/PSR/jumlah pohon, multi-halaman dengan footer per halaman; sejak **#326** blok **Sepadan** di kolom kanan di bawah Pemilik — empat baris label+nilai (nilai dipangkas 2 baris), kosong → satu baris "Belum diisi"; **selalu** dicetak (pembaca perlu tahu sepadan belum didata, bukan luput cetak); sejak **#328** badge NKT berwarna di header + baris "NKT" di Informasi Lahan (`summarizeNkt`, belum dinilai → "Belum dinilai"); sejak **#327** section **mengalir** — Pelatihan tidak lagi dipaksa mulai halaman 2 (#298), pindah halaman hanya bila sisa < 40 mm, sehingga lahan berlegalitas penuh + tetangga tetap 2 halaman; sejak **#329** persegi patok bernomor di peta (kuning / merah NKT) + section **Patok Batas** (tabel No · Lintang · Bujur · Kondisi · Jenis · Dipasang · NKT · Juga patok lahan) hanya bila lahan punya patok; disabled bila lahan tanpa geometri |
| Tombol `Edit` | Tombol | EDIT — buka `ParcelFormModal` |
| Tombol `Nonaktifkan` | Tombol | DELETE — `deleteLandParcel` dengan konfirmasi `Apakah Anda yakin ingin menonaktifkan lahan ini?` |
| Kartu ringkasan | Kartu ×5 | `Luas` (sub: blok · jumlah pohon + kerapatan/ha, #238), **`Legalitas`** (#298: nilai = jenis surat unik + "STDB", mis. "SHM + STDB"; sub = hitungan surat/STDB/UL Parcel Code/program), `Umur Tanaman`, `Produksi`, `Kelengkapan Data` (**9** atribut: Blok, Luas, Status Kepemilikan, Komoditas, Species, Tahun Tanam, Kelompok Tani, Geometri, **Surat kepemilikan**) |
| Tab `Informasi` | Tab (#298) — atribut **hanya yang terisi**; yang kosong dirangkum satu baris "Belum diisi: …" + tombol **Lengkapi** (EDIT) membuka modal edit; label sentence-case (bukan uppercase); Pemilik dalam kotak berbingkai | Peta 60% + keterangan 40%; sub-bagian Pemilik + tabel lahan lain milik petani (Kode ber-link · Luas · Tahun Tanam · Jumlah Pohon — `getFarmerSiblingParcels` kini menyertakan agregat pohon) |
| Kotak `Sepadan` | Kotak berbingkai di kolom kanan (#326) | Dengan siapa/apa lahan berbatasan di tiap sisi (`LandParcelBorder`, satelit 1:1 ke identitas — utuh saat poligon direvisi). Hanya sisi **terisi** yang tampil (pola #298), urutan Utara · Timur · Selatan · Barat + Catatan; kosong = satu kalimat "Sepadan belum diisi …". Tombol **Isi/Ubah** (EDIT) → `ParcelSatelliteFormModal` jenis `border` (4 input teks bebas ≤ 200 + catatan; **kosongkan semua = hapus** — server meng-NULL-kan kolom, baris tetap). **Sengaja tidak** ikut hitungan Kelengkapan Data (kalau ikut, skor semua lahan turun seketika). Berbeda dari lahan tetangga terdeteksi geometri (#327) |
| Peta `ParcelMapView` | Peta | MapLibre; poligon hijau = lahan ini, biru = lahan lain milik petani (`siblingGeometries`), titik kuning = pohon sawit bila tersedia (`treePoints`, #238 — data `getParcelTrees`); **putus-putus abu bernomor = lahan tetangga ≤ 25 m** (#327, prop `neighbors` dari `getLandParcelNeighbors` → `fetchParcelNeighbors`, `ST_DWithin` pada `LandParcel.geom` + GiST; nomor = urutan jarak-lalu-ID, **sama dengan legenda PDF**; klik → popup Pemilik · ID Petani · Lembaga · Jarak/"Bersinggungan"/"Tumpang tindih ⚠" — identitas selalu lengkap apa pun scope (alat verifikasi lapangan); tautan detail hanya bila dalam scope, selain itu keterangan "di luar akses Anda — halaman detailnya tidak bisa dibuka"; tetangga milik petani yang sama tetap bernomor tapi kliknya jatuh ke layer sibling biru); zoom awal & `Zoom ke Lahan` = `fitBounds` lahan + sibling (**bukan** tetangga — yang ≤ 25 m otomatis terlihat); link koordinat titik pusat → Google Maps |
| Kotak `NKT (Nilai Konservasi Tinggi)` | Kotak berbingkai di kolom kanan di bawah Sepadan (#328) | Status (merah/amber bila termasuk/terdampak), chip kategori NKT 1–6 (tooltip keterangan), luas & panjang area NKT, tanggal asesmen · asesor, sumber, catatan; kosong = "Belum dinilai …". Tombol **Isi/Ubah** (EDIT) → `ParcelSatelliteFormModal` jenis `nkt` (select status dengan penjelasan Termasuk/Terdampak/Tidak, checkbox kategori — wajib ≥ 1 kecuali Tidak terdampak, luas/panjang, tanggal ≤ hari ini, asesor, sumber, catatan; `upsertLandParcelNkt`); ikon hapus (DELETE) → `deleteLandParcelNkt` dengan `confirm` — **hapus baris**, lahan kembali "belum dinilai". Tidak ikut Kelengkapan Data |
| Kotak `Lahan Tetangga (≤ 25 m)` | Kotak berbingkai **di bawah peta** (kolom kiri, selebar peta — #327; sempat di kolom kanan, dipindah karena membuat kolom kanan jauh lebih tinggi dari peta dan legenda memang milik peta, sejalan tata letak PDF) | Legenda nomor peta: tabel No · Pemilik · ID Lahan (ber-link bila dalam scope) · Lembaga · Jarak; nama pemilik selalu tampil, penanda "(di luar akses)" hanya berarti tautan detail tidak tersedia; cap 50 di layar + "+N lahan lain"; kosong = "Tidak ada lahan lain yang terdaftar di MIS dalam 25 m". Hanya lahan terdaftar di MIS — jalan/sungai/lahan belum dipetakan tidak muncul (untuk itu ada Sepadan) |
| Empty state peta | Teks | `Tidak ada data spasial (geometri) untuk lahan ini` |
| Tab `Legalitas` | Tab (#296/#298) | **Tiga** kartu grup sejak 2026-08-28 (Program pindah ke tabnya sendiri — keikutsertaan program bukan dokumen legal): Surat kepemilikan (selisih luas tertera vs poligon dihitung di klien, ≥0,5 Ha amber), STDB (+ lahan lain dalam STDB yang sama, ber-link; sejak **#306** tiap baris membawa **badge tahap** — `TERBIT` netral tanpa badge karena itu keadaan normal, `REVISI` amber, `DITOLAK` abu-dicoret — dan baris tanpa nomor tampil sebagai "<Tahap> — belum bernomor", bukan sel kosong yang terbaca seperti data rusak), **UL Parcel Code** (`lg:col-span-2` — isinya satu baris pendek; kode mono + chip `Pemeta: <short>` ber-tooltip label panjang). Data masuk lewat Bulk Upload → Lahan → tab Detail Lahan **atau CRUD manual** (3c): tombol **Tambah** per grup (CREATE), ikon pensil (EDIT) → `ParcelSatelliteFormModal` (satu modal, 4 jenis, form uncontrolled + error Zod per field; form STDB sejak #306 diawali selektor **Tahap** yang mengatur sisanya — nomor & tanggal/tahun terbit hanya muncul pada `TERBIT` — tetapi nomor yang **sudah tercatat tetap dikirim ulang** saat tahap dipindah dari `TERBIT`, sehingga STDB terbit yang dikembalikan untuk diperbaiki tidak kehilangan nomornya, catatan tahap wajib pada `REVISI`/`DITOLAK`, dan aturan **Revisi = masih berjalan / Ditolak = berhenti** tercetak di bawah selektor supaya keduanya tidak dipakai bergantian), ikon tempat sampah (DELETE) → `DeleteDialog` soft-delete; STDB memakai ikon **lepas tautan**. Grup kosong = satu kalimat empty state bergaris putus. Hitungan pill tab & KPI Legalitas = surat + STDB + UL Parcel Code (**tanpa** program) |
| Tab `Program` | Tab (2026-08-28) | Dipisah dari Legalitas atas koreksi owner. Berisi strip **PSR** (Peremajaan Sawit Rakyat — atribut `LandParcel.isPsr`, baca-saja di sini, diubah lewat Edit Lahan; secara konsep juga program, lihat `land-parcel-program.prisma`) + kartu grup **Program** (badge status, rentang tanggal, CRUD sama seperti grup legalitas). Satu komponen `ParcelLegalSection` dengan prop `variant="program"` agar modal & dialog tetap satu implementasi. Badge header **"Non-PSR" dihapus** — hanya PSR yang ditampilkan (sejalan PDF #298) |
| Tab `Produksi` | Tab | Konteks Luas/Tahun Tanam/Species; grafik bulanan kontinu (clip 6 bln/1 thn/2 thn/Semua + slide, sampai bulan berjalan); tabel pivot Tahun × Jan–Des + Total + Ton/Ha, baris s.d. tahun berjalan |
| Tab `Patok` | Tab (#329) | `ParcelMarkerSection`: peta (`ParcelMapView` + `markerPoints` — persegi bernomor **kuning** = patok lahan, **merah** = patok lahan NKT, yaitu lahan ini ATAU lahan lain pemakai patok itu termasuk/terdampak NKT — plus tetangga putus-putus #327 dan `ParcelNeighborList` di bawah peta, komponen yang sama dengan tab Informasi) + tabel No · Koordinat (6 desimal, sumber, jenis, tanggal, "Juga patok lahan …" ber-link bila dalam scope, foto, keterangan) · Kondisi (badge) · NKT · aksi. Tombol **Buat patok dari poligon** (CREATE; nonaktif tanpa geometri) → `previewMarkersFromPolygon` → dialog pratinjau: vertex ring luar yang disederhanakan ±1 m, dinomori searah jarum jam dari utara mengikuti jalan batas (ring), kolom Hasil "Patok baru" / "Tautkan ke patok lahan X (d m)" (≤ 5 m) / "Sudah ada di lahan ini" (dicoret, idempoten), checkbox untuk membuang vertex bukan patok → `createMarkersFromPolygon` (rencana dihitung ulang di server, klien hanya mengirim nomor yang dicentang); **Tambah patok** (CREATE) & pensil (EDIT) → `ParcelMarkerFormModal` (lat/long, kondisi, jenis, tanggal/oleh, keterangan; foto hanya saat ubah — tersimpan langsung ke S3 `land-marker/<id>/…`; peringatan bila patok dipakai lahan lain: perubahan berlaku untuk semuanya; koordinat > 100 m dari batas ditolak dengan petunjuk lat/long tertukar); panah ↑↓ (EDIT) → `renumberLandMarkers` (dua fase, partial unique); ikon lepas tautan (DELETE) → `DeleteDialog` → `unlinkLandMarker` (tautan nonaktif; patok tanpa pemakai ikut nonaktif, koordinat tetap); **Unduh koordinat** (EXPORT; Excel per lahan, `exportToExcel` di klien). Banner amber bila `polygonChangedSince` (ada tautan dari revisi poligon lebih lama). Nomor patok = urutan tabel = nomor di PDF |
| Sel bulan tabel produksi | Tombol sel | Klik (butuh CREATE/EDIT menu Produksi) → `ParcelProductionMonthModal`; sel bulan masa depan tidak bisa diklik |
| `ParcelProductionMonthModal` | Dialog | 4 slot panen (kg + tanggal, dibatasi bulan tsb) terbuka berurutan; total otomatis; slot dikosongkan = nonaktifkan record (konfirmasi); keunikan per (petani, lahan, periode, panen-ke) |

Dialog `ParcelFormModal` (field lengkap) didokumentasikan di [daftar.md](./daftar.md#dialog-parcelformmodal-parcelscomponentsparcel-form-modaltsx).
