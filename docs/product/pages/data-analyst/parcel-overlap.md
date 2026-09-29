# Tumpang Tindih Lahan

[← Menu Data Analyst](README.md) · [← Katalog halaman](../README.md)

> #317 Fase 2 — tab **Tumpang Tindih** (keputusan UI owner 2026-09-23, [komentar #317](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/317#issuecomment-5798429923)). Tab Luar Boundary, Selisih Luas, guard upload (Fase 3), dan layer Peta Lahan (Fase 4) belum dikerjakan.

## Diagram objek

```text
Halaman: Tumpang Tindih Lahan (/admin/data-analyst/parcel-overlap)
├── Header — judul + HelpHint + deskripsi
├── Toolbar filter satu baris (tersimpan di URL: ?persen= &jenis= &distrik= &lembaga= &label=)
│   ├── Tumpang tindih (select: Semua · > 10% · > 25% · > 50% · > 75% · > 90%, bawaan Semua)
│   ├── Jenis (select: Semua jenis · Petani sama · Beda petani, satu Lembaga · Lintas Lembaga)
│   ├── Distrik (combobox, opsi dari kedua sisi temuan)
│   └── Lembaga (combobox, opsi dari kedua sisi temuan)
├── Ringkasan: "N pasangan" · chip Semua / Duplikat / Tercakup / Sebagian (klik = filter `label`; Semua atau klik ulang = lepas;
│   angka chip dihitung tanpa filter label) · total irisan (ha)
├── Split view (lg: 50/50; di bawah lg ditumpuk, klik baris menggulir ke preview)
│   ├── Kiri: DataTable (klik / Enter / Spasi = pilih; baris terpilih disorot & halaman tabel mengikutinya)
│   │   ├── Kolom: Lahan A · Lahan B (ID lahan + badge "+N" bila lahan punya pasangan lain, nama petani;
│   │   │   Lembaga hanya untuk Lintas Lembaga, selebihnya di tooltip) · % · Irisan (% terkecil · ha, A/B) ·
│   │   │   Label (badge bertooltip arti + jenis ringkas; sortir Duplikat → Tercakup → Sebagian)
│   │   ├── Pencarian "Cari ID lahan / petani..." (ID lahan / nama / ID petani), paginasi bawaan 25;
│   │   │   kosong → "Tidak ada lahan tumpang tindih pada filter ini."
│   │   └── Toolbar (izin EXPORT): Excel · Spasial ▾ (Shapefile ZIP / GeoJSON — poligon irisan)
│   └── Kanan (sticky): preview — pasangan pertama terpilih otomatis
│       ├── Navigasi: ‹ Sebelumnya · "n / N · ↑/↓" · Berikutnya › (urutan = tampilan tabel); panah ↑/↓ hanya
│       │   saat fokus di tabel/preview (bukan kotak isian, combobox, kanvas peta) — di luar itu halaman tetap tergulir
│       ├── Peta: lahan A biru, lahan B oranye (garis putus), irisan merah (isi + garis); Zoom ke Lahan; basemap; legenda;
│       │   saat pasangan berikutnya dimuat, peta sebelumnya tetap tampil berlapis spinner (basemap terpilih bertahan)
│       └── Kartu A & B: petani (kode), Kelompok Tani, Lembaga, Distrik, luas poligon, % tertumpang, "+N lahan lain",
│           Buka Detail Lahan (tab baru) / "Di luar akses Anda"
└── Catatan kaki: definisi %, Duplikat/Tercakup, ambang buang, arti +N
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Sub menu | Tumpang Tindih Lahan (`data-analyst-parcel-overlap`, ikon `Layers`, order 7) |
| Route | `/admin/data-analyst/parcel-overlap` |
| File | `page.tsx` (Server Component, memuat semua temuan) + `parcel-overlap-client.tsx` + `overlap-preview-map.tsx` + `loading.tsx` |
| Guard | `requirePermission("data-analyst-parcel-overlap")` |
| Server action | `getParcelOverlaps()` (VIEW) · `getParcelOverlapGeometries(keys, "preview" \| "export")` (VIEW untuk 1 pasangan, EXPORT untuk ekspor) — `src/server/actions/parcel-overlap.ts` |
| Helper murni | `src/lib/parcel-overlap.ts` (ambang, persen, jenis, label, filter) |
| Izin seed | VIEW + EXPORT untuk SUPERADMIN, ADMIN, MANAGEMENT, OPERATOR (dikunci `menu-access.test.ts`); DONOR tidak |

## Aturan perhitungan

| Hal | Aturan |
|---|---|
| Pasangan | Self-join `ST_Intersects` atas `LandParcel.geom` (GiST), `NOT ST_Touches` — bersinggungan di tepi bukan temuan; kedua lahan & petani aktif |
| Luas | `ST_Area(::geography)` dari poligon (bukan kolom `area`) |
| % utama | irisan ÷ lahan yang **lebih kecil**; % terhadap masing-masing lahan ikut tampil |
| Ambang buang | irisan < 100 m² **dan** < 1% lahan terkecil (keputusan #317) |
| Filter % | ketat `>` (> 50% tidak memuat pasangan tepat 50,0%) |
| Label (chip = filter) | **Duplikat**: > 90% dari kedua lahan · **Tercakup**: lahan kecil > 90% tetapi < 90% dari lahan besar · **Sebagian**: sisanya |
| Scope | minimal satu sisi dalam scope; sisi lawan tampil lengkap — [access-context.md](../../access-context.md). Geometri hanya untuk pasangan yang benar-benar beririsan (kunci dari client tidak dipercaya) |
| Soft delete | lahan, petani, **dan Lembaga** aktif saja |

Terukur 2026-09-23 di `mis-dev` (snapshot prod, 14.174 lahan): 137 pasangan lolos ambang buang; > 10% = 82, > 25% = 74, > 50% = 72, > 75% = 71, > 90% = 70, di antaranya 25 Duplikat dan 45 Tercakup; kueri 256 ms.

## Ekspor

Nama berkas: `tumpang-tindih-lahan_<Lembaga|Distrik>-lebih-<N>persen-<Label>_<YYYYMMDD-HHmm>` (bagian yang tidak difilter dilewati; tanpa filter apa pun = `…_semua_…`).

| Tombol | Isi |
|---|---|
| Excel | Satu sheet "Tumpang Tindih", mengikuti filter, pencarian & urutan tabel: Label, Jenis, % thd Lahan Terkecil, Luas Irisan, lalu per sisi A/B: ID Lahan, ID Petani, Nama Petani, Kelompok Tani, Lembaga, Distrik, Luas Poligon, % |
| Spasial | Mengikuti filter, pencarian & urutan tabel; action ekspor hanya mengirim irisan (bukan poligon utuh A/B), dipecah per 2.000 pasangan. Poligon **irisan** (satu layer `irisan`), atribut `label, jenis, pct_min, irisan_ha, lahan_a, petani_a, lembaga_a, pct_a, lahan_b, petani_b, lembaga_b, pct_b` |
