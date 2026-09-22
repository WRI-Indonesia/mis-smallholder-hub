# Page: Detail Petani

[← Petani](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Detail Petani (/admin/master-data/farmers/[id])
├── Header
│   ├── BreadcrumbOverride
│   ├── Tombol kembali, avatar inisial, nama, ID petani
│   ├── Badge: L/P, Lembaga, Kelompok Tani, Aktif/Nonaktif, kategori Monev BMP terbaru (#344)
│   └── Tombol: Profil Petani (PDF) (#343, izin PRINT), Edit
├── Kartu ringkasan
│   ├── Lahan
│   ├── Produksi
│   ├── Pelatihan
│   ├── Kelengkapan Profil
│   └── Produktivitas Terakhir
├── Tabs
│   ├── Ringkasan
│   │   └── Kartu profil
│   ├── Lahan
│   │   ├── Tabel: Daftar Lahan (n) + kolom Surat & STDB (#296) + Jumlah Pohon (#238) + tombol PDF per baris
│   │   └── Peta: Sebaran Lahan (ParcelsDistributionMap + titik pohon kuning, #238)
│   ├── Pelatihan
│   │   ├── Checklist: Paket Wajib
│   │   └── Tabel: Riwayat Partisipasi (n)
│   ├── Produksi
│   │   ├── Tombol filter: Semua Lahan / Exclude + switch Tahun › Lahan / Lahan › Tahun
│   │   ├── Matriks: Produksi Bulanan (Kg) — collapsible, expandable per lahan (#239)
│   │   ├── Matriks: Ketersediaan Data Bulanan — collapsible, expandable per lahan (#239)
│   │   └── Kartu: Ketersediaan Data Produksi per Lahan
│   └── Monev BMP (#344/#346, tampil bila punya izin VIEW `master-data-bmp-monev`)
│       ├── Tombol: Tambah Penilaian (BmpAssessmentFormModal fixedFarmer)
│       └── Tabel: skor per tahun (skor · kategori · tanggal · lahan · penilai) — klik tahun → rincian ringkas (BmpAssessmentInlineDetail, lazy) + tombol Ubah
└── Dialog
    ├── FarmerFormModal (Edit Petani)
    └── Cetak Profil Petani — Lengkap / Ringkasan saja (#343, hanya bila lahan > 10)
```

| Atribut | Nilai |
|---|---|
| File | `farmers/[id]/page.tsx` + `farmers/[id]/farmer-detail-client.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-farmers")`; `hasPermission(...,"EDIT")` untuk tombol Edit; `hasPermission(...,"PRINT")` → prop `canPrint` (tombol Profil Petani + PDF per baris lahan); `hasPermission("master-data-parcels", "VIEW"/"EDIT")` → prop `canViewParcel`/`canEditParcel` (gate aksi popup peta); `notFound()` bila kosong |
| Server action / data | `getFarmerDetail(id)` → `{ farmer, detail, parcels, mapParcels }`, `getFarmerTreePoints(id)` (`src/server/actions/tree.ts`, #238; jumlah pohon per lahan diturunkan di page dari titik ini — action `getFarmerTreeSummary` dihapus #241), `getFarmerGroupOptions` (bila boleh edit), `getFarmerParcelPassport(parcelId)` untuk PDF per lahan, `getFarmerProfilePassport(farmerId, { includeParcels })` untuk PDF Profil Petani (#343) |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `BreadcrumbOverride` | Navigasi | Menampilkan ID Petani, bukan CUID |
| Header | Heading | Tombol kembali, avatar inisial (placeholder, TD-017), nama, ID petani, badge L/P + Lembaga (link) + Kelompok Tani + `Aktif`/`Nonaktif` |
| Tombol `Profil Petani (PDF)` | Tombol | PRINT (#343) — hook bersama `useFarmerProfilePrint` (`farmers/farmer-profile-print.tsx`): toast progres *"Menyiapkan Profil Petani — M lahan…"*, ikon berputar, lalu `getFarmerProfilePassport` → `generateFarmerProfilePdf` (`src/lib/farmer-profile-pdf.ts`, dynamic import). Lahan **> 10** → dialog **Cetak Profil Petani** *"Dokumen … akan berisi ±N halaman (M lahan). Cetak lengkap … atau ringkasan saja?"* dengan tombol `Ringkasan saja` (Bagian A saja, `includeParcels:false` — kueri lahan berat tak disentuh) / `Lengkap` (bawaan). Nama berkas `Profil_Petani_<Lembaga>_<Nama>_<ID Petani>.pdf` |
| Tombol `Edit` | Tombol | EDIT — buka `FarmerFormModal` |
| Kartu ringkasan (5) | Kartu | `Lahan` (persil + Ha), `Produksi` (Ton), `Pelatihan` (n/n paket), `Kelengkapan Profil` (n/n + field yang belum), `Produktivitas Terakhir` (Ton/Ha) |
| Tabs | Tab | `Ringkasan`, `Lahan`, `Pelatihan`, `Produksi`, `Monev BMP` (#344 — gate izin VIEW `master-data-bmp-monev`, data `getFarmerBmpAssessments`) |
| Tab Ringkasan | Kartu | Field: `Lembaga Petani` (link), `Distrik`, `Jenis Kelamin`, `NIK` (disensor), `Tempat, Tanggal Lahir` (+ umur), `Tahun Bergabung`, `Alamat`, `Dibuat`, `Terakhir Diubah` |
| Tab Lahan — `Daftar Lahan (n)` | Tabel | `Kode Lahan` (link detail lahan **tab baru** — pola #224, gate `canViewParcel`), `Kelompok Tani`, `Blok`, `Surat` (ringkasan `JENIS nomor` dokumen aktif, #296), `STDB` (nomor, #296), `NKT` (badge merah bila termasuk/terdampak, "Tidak" bila dinilai bersih, "—" belum dinilai, #330), `Luas (Ha)`, `Tahun Tanam`, `Jumlah Pohon` (dihitung di page dari `getFarmerTreePoints`, "—" bila belum ada, #238/#241), `Revisi`, `Profil Lahan`; empty state `Petani ini belum memiliki lahan.` |
| Tombol `PDF` per baris lahan | Tombol | Unduh Farm Passport via `getFarmerParcelPassport` + `generateFarmPassportPdf` — digate izin `PRINT` (#245) |
| Tab Lahan — `Sebaran Lahan` | Peta | `ParcelsDistributionMap` (dynamic, ssr:false; sejak #330 tepi merah lahan NKT + baris legenda "Lahan NKT" ber-checkbox + baris NKT di popup; sejak #331 layer patok kuning/merah NKT dari `fetchFarmerMarkerPoints`, default mati) + titik pohon kuning non-interaktif via prop `treePoints` (`getFarmerTreePoints`, counter "N titik pohon" di badge kiri-bawah, #238); popup lahan memakai primitif standar `src/components/shared/map-popup.tsx` (TD-028), termasuk pegangan geser popup (`useMapPopupDrag`/`MapPopupDragHandle`, #314) + footer aksi `ParcelPopupActions` ("Lihat Detail" gate `canViewParcel`, "Edit Lahan" gate `canEditParcel`) + modal `ParcelEditModalHost`; setelah simpan poligon disegarkan via `router.refresh()` (server props) |
| Tab Pelatihan — `Paket Wajib` | Checklist | Per paket: ikon ✓/✗, label, jumlah partisipasi (`n×`) atau `Belum` |
| Tab Pelatihan — `Riwayat Partisipasi (n)` | Tabel | `Tanggal`, `Paket`, `Lokasi`, `Pre → Post Test`; empty state `Belum pernah mengikuti pelatihan.` |
| Tab Produksi | Matriks + kartu | Pola detail Lembaga (`ProductionMonthlyMatrix` #239) dengan perbedaan Petani: satuan sel bulanan & Total = **Kg**; kolom `Luas (Ha)` + `Umur/PSR` di kanan kolom pertama matriks produksi; prop `parcelBreakdown` (`buildParcelYearBreakdown` — per lahan per tahun, record tanpa lahan = baris "Tanpa Lahan") mengaktifkan **switch grouping** `Tahun › Lahan` (baris tahun → expand sub-baris per lahan) / `Lahan › Tahun` (baris lahan → expand per tahun; Produktivitas baris lahan = rata-rata tahunan Σproduksi ÷ luas ÷ tahun ber-data); empty state `Belum ada data produksi untuk petani ini.` |

| Tab Monev BMP | Tabel expandable | Satu baris per tahun survei (skor `formatScore`, badge kategori, tanggal UTC, lahan dikunjungi, penilai); klik baris → `BmpAssessmentInlineDetail` (raport kegiatan + indikator, dimuat malas lewat `getBmpAssessmentDetailView`) + tautan ke halaman detail; tombol `Tambah Penilaian` (CREATE) membuka `BmpAssessmentFormModal` dengan petani terkunci (`fixedFarmer`, modal di-remount per buka). Header ikut menampilkan badge kategori tahun terbaru |

Dialog `FarmerFormModal` (field lengkap) didokumentasikan di [daftar.md](./daftar.md#dialog-farmerformmodal-farmersfarmer-form-modaltsx).

## PDF Profil Petani (#343)

A4 portrait (jsPDF, gaya & helper bersama `src/lib/farm-passport.ts`), data dari `getFarmerProfilePassport` (`src/server/actions/farmer.ts`; tipe `FarmerProfilePassport` di `src/types/farmer-profile.ts`). **Angka Bagian A = angka Detail Petani** karena sama-sama lewat `buildFarmerDetail`.

| Bagian | Isi |
|---|---|
| A — Ringkasan Petani | Header (nama, ID Petani, badge L/P · Lembaga · Aktif/Nonaktif, "Dicetak"); **Identitas** dua kolom (Lembaga + kode, Kelompok Tani distinct dari lahan, Distrik, Provinsi, Jenis Kelamin, Tahun Bergabung · **NIK & tanggal lahir penuh** — dokumen resmi, standar ui-ux §Masking — tempat lahir + umur, Alamat, Dibuat, Terakhir Diubah); **5 kartu** sama dengan layar; **Daftar Lahan** (No · Kode Lahan · Kelompok Tani · Blok · Surat · STDB · NKT · Luas · Tahun Tanam · Pohon · Patok · Rev. + baris total) — **No = nomor penanda di peta = nomor lampiran**, lahan tanpa poligon tercantum dengan catatan *belum dipetakan* tanpa nomor; **Peta Sebaran Lahan** (tinggi adaptif 55–80 mm, fit-bounds semua lahan ber-geometri, poligon di bawah, **lingkaran bernomor di centroid** — merah bila NKT; keterangan "Merah = lahan NKT" hanya bila ada (owner 2026-09-22) — graticule, skala batang sampai km, panah utara; dilewati bila tak ada geometri); **Pelatihan** — **satu tabel** `Paket · Tanggal · Pre / Post Test` (owner 2026-09-22, menggantikan checklist + riwayat terpisah): tiap partisipasi satu baris urut paket wajib, paket wajib yang belum diikuti tetap satu baris *Belum* (miring abu), paket lain (OTHER) menyusul; Lokasi tidak dicetak; **Produksi** (matriks gabungan semua lahan Tahun × Luas Terdata × 12 bulan × Total × Ton/Ha — Ton/Ha = produksi ÷ luas terdata, sama dengan layar; lalu **Rekap per Lahan per Tahun** berbentuk **kelompok per lahan** (owner 2026-09-22 — pivot ke samping ditolak: "tidak bagus kalau nanti punya data 10 tahun"): baris kepala lahan (abu, tebal) `ID · Luas · Umur/PSR · Σ produksi · rata-rata Ton/Ha tahunan · n thn` lalu baris tahun di bawahnya `tahun · kg · Ton/Ha · Bulan n/12` (terbaru dulu) — cermin mode *Lahan › Tahun* di layar (`ParcelAgg.avgTonHa`); tinggi tumbuh ke bawah, lebar tetap berapa pun tahunnya; baris Total). **Monev BMP** (owner 2026-09-22; **hanya bila pengguna punya VIEW `master-data-bmp-monev`** — aturan tab di layar; tanpa izin section & badge tidak dicetak, `bmp: null`): badge kategori terbaru di header (warna `BMP_ASSESSMENT_CATEGORIES`), tabel per tahun `Tahun · Tgl Survei · Skor · Kategori · Lahan Dikunjungi · Penilai · 5 kolom skor kegiatan` (nama pendek `bmpActivityShortName` di `lib/bmp-assessment.ts` — satu sumber dengan sumbu radar layar) + legenda rentang kategori, lalu **radar vektor** tahun terbaru ber-rincian (`drawBmpRadar`: pita 4 kategori, nilai setara 0–3) + daftar kegiatan `kode nama · n/m terisi · skor / max` + "Indikator Lembaga terisi n/m" — angka dari `getBmpAssessmentDetailView` per penilaian (sama dengan rincian inline tab #346). Empty state: *Petani ini belum memiliki lahan.* / *Belum pernah mengikuti pelatihan.* / *Belum ada data produksi untuk petani ini.* / *Belum ada penilaian Monev BMP untuk petani ini.* |
| B — Lampiran | Satu **Profil Lahan penuh** per lahan ber-geometri, urut nomor tabel, mulai halaman baru, baris kecil *"Lampiran n dari N"* kanan-atas; isi sama dengan PDF Profil Lahan berdiri sendiri (`drawFarmPassport` — `buildFarmPassportDoc` kini pembungkusnya) **kecuali section Pelatihan yang dilewati** (owner 2026-09-22: sudah terwakili tabel pelatihan Bagian A). Dilewati seluruhnya bila pengguna memilih *Ringkasan saja*. |
| Footer & metadata | `Hal. n/N` **menerus** seluruh dokumen (satu pass di akhir), catatan hukum & brand sama dengan Profil Lahan; `setProperties` title/subject/author (juga ditambahkan ke Profil Lahan) |

Jumlah pohon & patok per lahan dihitung `groupBy` (`tree`, `landParcelMarker`) — bukan memuat titik (pola #335). Lampiran: `computeFarmerTrainingItems` + akses dihitung **sekali** lalu dioper ke `fetchParcelPassport(id, true, { access, training })`, dijalankan per **chunk 5 paralel** (pool pg 10). Petani nonaktif hanya bisa dicetak SUPERADMIN (sama dengan siapa yang bisa membuka detailnya). Unit test: `src/test/farmer-profile-pdf.test.ts`, `farmer-profile-passport-guard.test.ts`, `parcel-passport-shared.test.ts`.
