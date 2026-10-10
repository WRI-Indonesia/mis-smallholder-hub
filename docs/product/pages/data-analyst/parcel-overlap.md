# Tumpang Tindih Lahan

[← Menu Data Analyst](README.md) · [← Katalog halaman](../README.md)

> #317 Fase 2 — tab **Tumpang Tindih** (keputusan UI owner 2026-09-23, [komentar #317](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/317#issuecomment-5798429923)) + tab **Luar Boundary** & **Selisih Luas** (2026-10-07; tata letak Luar Boundary = ringkasan per Lembaga + split view, filter Sepenuhnya/Sebagian — keputusan owner). Guard upload (Fase 3) dan layer Peta Lahan (Fase 4) belum dikerjakan.

## Diagram objek

```text
Halaman: Tumpang Tindih Lahan (/admin/data-analyst/parcel-overlap)
├── Header — judul + HelpHint + deskripsi
├── Tab (`?tab=`; bawaan tumpang-tindih tanpa query): Tumpang Tindih N · Luar Boundary N (sepenuhnya) · Selisih Luas N
│   — pindah tab menulis URL berisi `tab` saja (filter tiap tab berbeda); isi tab hanya dirender untuk tab aktif
│
│ ── Tab Tumpang Tindih ──
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
│       │   Fokus di baris ikut ke baris baru, juga saat ia di halaman tabel lain (`DataTable` `selectedRowKey`; wrap-up 2026-09-29 — dulu fokus jatuh ke <body> tiap 25 baris)
│       ├── Peta: lahan A biru, lahan B oranye (garis putus), irisan merah (isi + garis); Zoom ke Lahan; basemap; legenda;
│       │   saat pasangan berikutnya dimuat, peta sebelumnya tetap tampil berlapis spinner (basemap terpilih bertahan)
│       └── Kartu A & B: petani (kode), Kelompok Tani, Lembaga, Distrik, luas poligon, % tertumpang, "+N lahan lain",
│           Buka Detail Lahan (tab baru) / "Di luar akses Anda"
└── Catatan kaki: definisi %, Duplikat/Tercakup, ambang buang, arti +N

── Tab Luar Boundary (?tab=luar-boundary &luar=PARTIAL &distrik= &lembaga=) ──
├── Kotak kuning: peringatan (≥ 50% di 3 Lembaga → "boundary-nya yang perlu diperbarui") + jumlah per Lembaga
│   (8 teratas, batang; klik = filter Lembaga, klik ulang = lepas; mengikuti jenis & distrik, bukan filter Lembaga)
├── Chip Sepenuhnya di luar (bawaan) / Sebagian di luar · Distrik · Lembaga · "N lahan"
├── Split view (ParcelFindingSplitView): tabel Lahan · Di luar (ha, % dari luas) · Jarak ke boundary
│   └── Preview: peta lahan biru + boundary ICS oranye putus-putus, titik pusat lahan (≤ zoom 14);
│       Zoom ke Lahan · Lahan + boundary; ringkasan + Buka Detail Lahan (tab baru)
└── Catatan kaki: buffer 1,5 km, Lembaga tanpa boundary tak dicek, kesetaraan dengan check DA-02

── Tab Selisih Luas (?tab=selisih-luas &arah=lebih-besar|lebih-kecil &distrik= &lembaga=) ──
├── Chip Semua / Kolom > poligon / Kolom < poligon · Distrik · Lembaga
├── Split view: tabel Lahan · Kolom · Poligon (ha) · Selisih (%, arah) — urut selisih terbesar
│   └── Preview: peta lahan; ringkasan luas tercatat vs poligon
└── Catatan kaki: rumus selisih (= check DA-02)
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Sub menu | Tumpang Tindih Lahan (`data-analyst-parcel-overlap`, ikon `Layers`, order 7) |
| Route | `/admin/data-analyst/parcel-overlap` |
| File | `page.tsx` (Server Component, memuat ketiga daftar temuan) + `parcel-topology-tabs.tsx` + `parcel-overlap-client.tsx` + `overlap-preview-map.tsx` + `outside-boundary-tab.tsx` + `area-mismatch-tab.tsx` + `parcel-finding-split-view.tsx` + `parcel-finding-map.tsx` + `loading.tsx` |
| Guard | `requirePermission("data-analyst-parcel-overlap")` |
| Server action | `getParcelOverlaps()` (VIEW) · `getParcelOverlapGeometries(keys, "preview" \| "export")` (VIEW untuk 1 pasangan, EXPORT untuk ekspor) — `src/server/actions/parcel-overlap.ts` |
| Server action (tab baru) | `getParcelOutsideBoundary()` · `getParcelAreaMismatch()` (VIEW) · `getParcelFindingGeometries(ids, "preview" \| "export", withBoundary)` (VIEW 1 lahan, EXPORT) — `src/server/actions/parcel-boundary-area.ts`; scope **normal** (tanpa pengecualian sisi lawan) |
| Helper murni | `src/lib/parcel-overlap.ts` (ambang, persen, jenis, label, filter) · `src/lib/parcel-boundary-area.ts` (Sepenuhnya/Sebagian, selisih luas = konstanta DA-02, ringkasan per Lembaga, tab) |
| Izin seed | VIEW + EXPORT untuk SUPERADMIN, ADMIN, MANAGEMENT, OPERATOR (dikunci `menu-access.test.ts`); DONOR tidak |

## Aturan perhitungan

| Hal | Aturan |
|---|---|
| Pasangan | Self-join `ST_Intersects` atas `LandParcel.geom` (GiST), `NOT ST_Touches` — bersinggungan di tepi bukan temuan; kedua lahan aktif & petani terdaftar |
| Luas | `ST_Area(::geography)` dari poligon (bukan kolom `area`) |
| % utama | irisan ÷ lahan yang **lebih kecil**; % terhadap masing-masing lahan ikut tampil |
| Ambang buang | irisan < 100 m² **dan** < 1% lahan terkecil (keputusan #317) |
| Filter % | ketat `>` (> 50% tidak memuat pasangan tepat 50,0%) |
| Label (chip = filter) | **Duplikat**: > 90% dari kedua lahan · **Tercakup**: lahan kecil > 90% tetapi < 90% dari lahan besar · **Sebagian**: sisanya |
| Scope | minimal satu sisi dalam scope; sisi lawan tampil lengkap — [access-context.md](../../access-context.md). Geometri hanya untuk pasangan yang benar-benar beririsan (kunci dari client tidak dipercaya) |
| Soft delete | lahan, petani, **dan Lembaga** aktif saja |

### Tab Luar Boundary & Selisih Luas

| Hal | Aturan |
|---|---|
| Sepenuhnya di luar | poligon tidak `ST_Intersects` union boundary ICS aktif Lembaganya — **= check DA-02 `persil-di-luar-boundary`** |
| Sebagian di luar | beririsan, bagian luar (`ST_Difference`) ≥ 100 m² **atau** ≥ 1% luas lahan (kebalikan ambang buang irisan) |
| Jarak | `ST_Distance(::geography)` lahan → boundary, hanya Sepenuhnya |
| Selisih luas | \|kolom − poligon\| ÷ yang lebih besar > `PARCEL_AREA_MISMATCH_RATIO` (20%) — **= check DA-02 `luas-beda-geometri`**; desain awal #317 menyebut 25% (selisih 4 lahan), disamakan ke DA-02 |
| Kinerja | boundary di-union **sekali** per Lembaga (CTE), hanya lahan yang tidak `ST_CoveredBy` dihitung — 120 ms (dulu 1,4 dtk bila union per lahan) |
| Scope | normal — hanya lahan Lembaga di wilayah akses user; Lembaga tanpa boundary ber-`geom` tidak dicek |

Terukur 2026-10-07 di `mis-dev` (snapshot prod 2026-10-05): Sepenuhnya di luar **130** (APKASDU 56 · KSJ 34 · KBJ 18 = 83%), Sebagian **24**, Selisih Luas **98**; kueri 120 ms / 58 ms.

Terukur 2026-09-23 di `mis-dev` (snapshot prod, 14.174 lahan): 137 pasangan lolos ambang buang; > 10% = 82, > 25% = 74, > 50% = 72, > 75% = 71, > 90% = 70, di antaranya 25 Duplikat dan 45 Tercakup; kueri 256 ms.

## Ekspor

Nama berkas: `tumpang-tindih-lahan_<Lembaga|Distrik>-lebih-<N>persen-<Label>_<YYYYMMDD-HHmm>` (bagian yang tidak difilter dilewati; tanpa filter apa pun = `…_semua_…`).

| Tombol | Isi |
|---|---|
| Excel | Satu sheet "Tumpang Tindih", mengikuti filter, pencarian & urutan tabel: Label, Jenis, % thd Lahan Terkecil, Luas Irisan, lalu per sisi A/B: ID Lahan, ID Petani, Nama Petani, Kelompok Tani, Lembaga, Distrik, Luas Poligon, % |
| Excel/Spasial tab Luar Boundary | `lahan-luar-boundary_<Lembaga\|Distrik>-<sepenuhnya\|sebagian>_…`; sheet "Luar Boundary"; SHP layer `luar_boundary` = poligon lahan utuh, atribut `jenis, lahan, petani, lembaga, luas_ha, luar_ha, luar_pct, jarak_m` |
| Excel/Spasial tab Selisih Luas | `lahan-selisih-luas_<Lembaga\|Distrik>-<arah>_…`; sheet "Selisih Luas"; SHP layer `selisih_luas`, atribut `lahan, petani, lembaga, luas_kolom, luas_poli, selisih` |
| Spasial | Mengikuti filter, pencarian & urutan tabel; action ekspor hanya mengirim irisan (bukan poligon utuh A/B), dipecah per 2.000 pasangan. Poligon **irisan** (satu layer `irisan`), atribut `label, jenis, pct_min, irisan_ha, lahan_a, petani_a, lembaga_a, pct_a, lahan_b, petani_b, lembaga_b, pct_b` |
