# Peta Fitur

[← Menu Platform Developer](README.md) · [← Katalog halaman](../README.md)

Sub menu `platform-developer-sitemap`, satu halaman: `/admin/platform-developer/sitemap` (owner 2026-10-17). Menampilkan peta fitur aplikasi — flowchart **Menu → Sub menu → Halaman → Bagian → Isi** — yang sumbernya berkas [`docs/product/sitemap/`](../../sitemap/README.md) (bahan board Miro & naskah video tutorial). Tentang aplikasinya sendiri, bukan data petani. Akses: **SUPERADMIN, ADMIN, dan MANAGEMENT** (VIEW), sama dengan saudaranya. Dijaga `src/test/menu-access.test.ts`.

## Keputusan owner (2026-10-17)

- Sitemap ditulis dulu sebagai MD atomik di `docs/product/sitemap/` (lihat [README](../../sitemap/README.md) §Keputusan desain), lalu owner meminta halaman aplikasi **dengan dua tab tampilan atas sumber yang sama**: **Mermaid** (pustaka `mermaid`, identik dengan GitHub/Miro) dan **React Flow** (kanvas `@xyflow/react` seperti Peta Data & Skema).
- **Dua belas tampilan** (owner 2026-10-17, review React Flow: garis fan-out menumpuk di satu batang, edge lintas-rank menembus node, label menimpa garis — audit 98 diagram: 110 edge tembus, 148 titik fan-out). Owner memilih **semua 10 tab tambahan** dan **memperbaiki** React Flow dagre (bukan mengganti): pemilih **tab berkelompok** Teks · Interaktif · Hierarki, bawaan tetap Mermaid. Pustaka boleh ditambah; yang dipakai sebagian besar sudah ada sebagai dependensi turunan mermaid.
- Sumber tunggal: berkas MD di-bundle saat build (pola Rencana Pengembangan), tidak ada salinan JSON. Perubahan berkas tampil setelah build ulang.

## Sumber data

- `src/lib/sitemap-data.ts` mengimpor 11 berkas `docs/product/sitemap/*.md` (webpack `asset/source`) dan memparsenya sekali saat modul dimuat.
- `src/lib/sitemap-mermaid.ts` (murni, teruji): `parseSitemapMarkdown()` memecah per bagian `##` (judul, blok ```mermaid, tabel route, catatan) dan `parseMermaidFlowchart()` memparse **subset** `flowchart LR` yang dipakai sitemap (8 bentuk node berlabel kutip ganda, `:::class`, pernyataan `class`, edge `-->` · `-.->` · `==>` berlabel `|…|`, `&`) menjadi graf untuk React Flow. Di luar subset → Error, dijaga `src/test/sitemap-mermaid.test.ts` (semua blok di docs lolos, id lintas berkas konsisten).
- Tanpa Server Action & tanpa DB; guard halaman `requirePermission("platform-developer-sitemap")`.

## Diagram objek

```text
Halaman: Peta Fitur (/admin/platform-developer/sitemap)
├── Header — judul + HelpHint (tutorial p-20) + deskripsi sumber
├── Pemilih berkas (?menu=) — 11 tombol: Ikhtisar Sistem · Master Data · Bulk Upload · Dashboard · Map · Report · Data Analyst · Tools · Settings · Platform Developer · Bantuan
├── Tab tampilan berkelompok (?view=; bawaan Mermaid) + satu kalimat ciri tampilan aktif
│   ├── Teks — Mermaid · Mermaid ELK (`layout: elk`) · Sketsa (`look: handDrawn`) · Graphviz (`@viz-js/viz`, DOT dari `toDot`)
│   ├── Interaktif — React Flow (dagre, rute dari titik dagre) · React Flow ELK (elkjs ortogonal) · Kolom (`columnLayout`, kolom tetap per jenis) · Jaringan (cytoscape fCoSE)
│   └── Hierarki — Pohon (d3 tidy tree, lipat) · Peta pikiran (markmap, lipat) · Sunburst (d3 partition) · Daftar (`<details>` + cari)
├── Legenda warna — Menu · Sub menu · Halaman · Bagian · Isi · Dialog · Percabangan · Data/berkas · Layanan luar · putus-putus = prototipe/direncanakan
├── Ringkasan berkas (baris `> **Ringkasan:**`)
├── Daftar isi (≥ xl, sticky) — satu tautan per bagian ber-diagram
└── Kartu per bagian ## (satu diagram per kartu)
    ├── Mermaid / Mermaid ELK / Sketsa: SVG dirender di klien (`mermaid.render`, securityLevel strict, tema ikut gelap/terang) · galat → pesan + sumber blok
    ├── Graphviz: SVG dari WASM `dot` atas DOT `toDot()` (bentuk & palet legend.md)
    ├── React Flow / React Flow ELK / Kolom: kanvas bersama `SitemapCanvas` (node bentuk & warna palet, edge kustom `SitemapFlowEdge` menggambar titik rute mesin tata letak — spline basis untuk dagre, siku membulat untuk ELK — label di posisi yang disisakan mesin; Controls + MiniMap > 14 node)
    ├── Jaringan: cytoscape + fcose, zoom lewat tombol (roda mouse menggulir halaman)
    ├── Pohon · Peta pikiran · Sunburst · Daftar: hutan rentang `buildSpanningForest()` (akar = node tanpa edge masuk, DFS garis penuh dulu; sisa edge = rujukan silang — digambar oranye di Pohon, baris → di Daftar, tidak digambar di Peta pikiran/Sunburst)
    ├── Tabel route (Halaman · Route · Katalog) bila ada
    └── Catatan (paragraf & urutan demo)
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/platform-developer/sitemap/page.tsx` |
| Client | `sitemap-view-client.tsx` (pemilih, 12 tab berkelompok, daftar isi, kartu) · `mermaid-diagram.tsx` (render Mermaid, varian `elk`/`sketch`, `import("mermaid")` dinamis) · `graphviz-diagram.tsx` · `sitemap-flow-shared.tsx` + `sitemap-canvas.tsx` (node/edge/kanvas bersama React Flow) · `sitemap-flow.tsx` (dagre) · `sitemap-flow-elk.tsx` (elkjs) · `sitemap-columns.tsx` · `sitemap-network.tsx` (cytoscape) · `sitemap-tree.tsx` (d3-hierarchy) · `sitemap-mindmap.tsx` (markmap) · `sitemap-sunburst.tsx` · `sitemap-outline.tsx` — semua selain Mermaid dimuat dinamis tanpa SSR |
| Tipe | Server Component (guard + data statis dari bundel) → Client Components |
| Guard | `requirePermission("platform-developer-sitemap")` |
| Server action / data | Tidak ada — `SITEMAP_DOCS` dari `src/lib/sitemap-data.ts`; helper tata letak murni `src/lib/sitemap-layout.ts` (`estimateNodeSize`, `buildSpanningForest`, `toDot`, `columnLayout`) |
| Dependensi | `mermaid` (hanya halaman ini; ELK & rough.js untuk varian ELK/Sketsa sudah dibundel di dalamnya), `@dagrejs/dagre`, `@xyflow/react` (sudah ada), `elkjs` (React Flow ELK; versi disamakan dengan yang dipakai mermaid), `@viz-js/viz` (Graphviz WASM ±3 MB, dimuat saat tab dibuka), `cytoscape` + `cytoscape-fcose` (Jaringan), `d3-hierarchy` + `d3-shape` (Pohon · Sunburst · kurva edge), `markmap-view` + `markmap-common` (Peta pikiran) — 2026-10-17 |
| Loading | `loading.tsx` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Panduan` | Tautan | `HelpHint` → tutorial `p-20-peta-fitur` |
| Peta Fitur | Heading | `h1` + deskripsi |
| Pemilih berkas | Tombol | 11 tombol (`default` = aktif, `outline` = lainnya); label = judul H1 berkas; URL `?menu=<key>` (Ikhtisar = tanpa parameter) |
| Tab tampilan | Tombol ber-`role=tab`, 3 kelompok | URL `?view=<key>`: `mermaid-elk` · `sketch` · `graphviz` · `flow` · `flow-elk` · `columns` · `network` · `tree` · `mindmap` · `sunburst` · `outline` (Mermaid = tanpa parameter); kalimat ciri tampilan aktif di bawahnya |
| Legenda warna | Konten | Kotak warna per class dari `SITEMAP_CLASS_STYLE` |
| Daftar isi | Nav | Anchor `#<slug>` ke kartu; hanya layar ≥ xl |
| Kartu bagian | Card | Judul = heading `##`; isi diagram + tabel + catatan |
| Diagram Mermaid | Konten | `dangerouslySetInnerHTML` atas SVG keluaran pustaka `mermaid` dari teks repo sendiri (bukan input pengguna); saat memuat "Merender diagram…" |
| Kanvas React Flow (dagre · ELK · Kolom) | Konten | Tinggi 320–820 px mengikuti jumlah node; node tidak bisa digeser/dihubungkan; `colorMode` ikut tema; ELK ditata asinkron ("Menata diagram (ELK)…") |
| Diagram Graphviz | Konten | `dangerouslySetInnerHTML` atas SVG keluaran WASM dari DOT teks repo sendiri; "Merender Graphviz…" saat memuat |
| Kanvas Jaringan | Konten | cytoscape; tombol + · − · muat seluruh |
| Pohon | Konten | SVG bergulir (maks 820 px); tombol −/+ per simpul berisi anak; catatan jumlah rujukan silang |
| Peta pikiran | Konten | markmap; dua tingkat pertama terbuka; zoom roda dimatikan (geser dengan menyeret) |
| Sunburst | Konten | SVG 460 px + panel teks: arahkan kursor → label & jumlah anak/daun |
| Daftar | Konten | `<details>` bertingkat (2 tingkat pertama terbuka), kotak **Cari di diagram ini…**, baris → untuk rujukan silang |
| Pesan parser | Konten | "Diagram ini belum bisa dibaca parser graf — lihat tab Mermaid." (tidak seharusnya tampil — dijaga test) |

## Uji terkait

| Berkas | Cakupan |
|---|---|
| `src/test/sitemap-mermaid.test.ts` | Parser subset (bentuk, class, edge, galat), semua blok `docs/product/sitemap/*.md` lolos, daftar berkas = `SITEMAP_FILES`, id lintas berkas konsisten, tabel route terbaca |
| `src/test/sitemap-layout.test.ts` | Hutan rentang (tiap node sekali, edge = cabang + silang, siklus), DOT (jumlah pernyataan, kutip ter-escape, bentuk/palet/dashed), tata letak kolom (semua node, kolom urut, tanpa tumpang tindih), taksiran ukuran node — atas seluruh diagram docs |
| `src/test/menu-access.test.ts` | Akses VIEW SUPERADMIN · ADMIN · MANAGEMENT |
