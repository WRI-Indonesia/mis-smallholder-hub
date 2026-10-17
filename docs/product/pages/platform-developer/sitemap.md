# Peta Fitur

[← Menu Platform Developer](README.md) · [← Katalog halaman](../README.md)

Sub menu `platform-developer-sitemap`, satu halaman: `/admin/platform-developer/sitemap` (owner 2026-10-17). Menampilkan peta fitur aplikasi — flowchart **Menu → Sub menu → Halaman → Bagian → Isi** — yang sumbernya berkas [`docs/product/sitemap/`](../../sitemap/README.md) (bahan board Miro & naskah video tutorial). Tentang aplikasinya sendiri, bukan data petani. Akses: **SUPERADMIN, ADMIN, dan MANAGEMENT** (VIEW), sama dengan saudaranya. Dijaga `src/test/menu-access.test.ts`.

## Keputusan owner (2026-10-17)

- Sitemap ditulis dulu sebagai MD atomik di `docs/product/sitemap/` (lihat [README](../../sitemap/README.md) §Keputusan desain), lalu owner meminta halaman aplikasi **dengan dua tab tampilan atas sumber yang sama**: **Mermaid** (pustaka `mermaid`, identik dengan GitHub/Miro) dan **React Flow** (kanvas `@xyflow/react` seperti Peta Data & Skema).
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
├── Tabs tampilan (?view=; bawaan Mermaid) — Mermaid · React Flow
├── Legenda warna — Menu · Sub menu · Halaman · Bagian · Isi · Dialog · Percabangan · Data/berkas · Layanan luar · putus-putus = prototipe/direncanakan
├── Ringkasan berkas (baris `> **Ringkasan:**`)
├── Daftar isi (≥ xl, sticky) — satu tautan per bagian ber-diagram
└── Kartu per bagian ## (satu diagram per kartu)
    ├── Mermaid: SVG dirender di klien (`mermaid.render`, securityLevel strict, tema ikut gelap/terang) · galat → pesan + sumber blok
    ├── React Flow: node dari parser, tata letak dagre kiri → kanan, bentuk & warna palet legend.md, edge putus-putus/animasi tebal, Controls + MiniMap (> 14 node)
    ├── Tabel route (Halaman · Route · Katalog) bila ada
    └── Catatan (paragraf & urutan demo)
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/platform-developer/sitemap/page.tsx` |
| Client | `sitemap-view-client.tsx` (pemilih, tab, daftar isi, kartu) · `mermaid-diagram.tsx` (render Mermaid, `import("mermaid")` dinamis) · `sitemap-flow.tsx` (kanvas React Flow + dagre, dimuat dinamis tanpa SSR) |
| Tipe | Server Component (guard + data statis dari bundel) → Client Components |
| Guard | `requirePermission("platform-developer-sitemap")` |
| Server action / data | Tidak ada — `SITEMAP_DOCS` dari `src/lib/sitemap-data.ts` |
| Dependensi | `mermaid` (baru, hanya halaman ini), `@dagrejs/dagre` (baru, tata letak React Flow), `@xyflow/react` (sudah ada) |
| Loading | `loading.tsx` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Panduan` | Tautan | `HelpHint` → tutorial `p-20-peta-fitur` |
| Peta Fitur | Heading | `h1` + deskripsi |
| Pemilih berkas | Tombol | 11 tombol (`default` = aktif, `outline` = lainnya); label = judul H1 berkas; URL `?menu=<key>` (Ikhtisar = tanpa parameter) |
| Mermaid · React Flow | Tabs | URL `?view=flow` (Mermaid = tanpa parameter) |
| Legenda warna | Konten | Kotak warna per class dari `SITEMAP_CLASS_STYLE` |
| Daftar isi | Nav | Anchor `#<slug>` ke kartu; hanya layar ≥ xl |
| Kartu bagian | Card | Judul = heading `##`; isi diagram + tabel + catatan |
| Diagram Mermaid | Konten | `dangerouslySetInnerHTML` atas SVG keluaran pustaka `mermaid` dari teks repo sendiri (bukan input pengguna); saat memuat "Merender diagram…" |
| Kanvas React Flow | Konten | Tinggi 320–820 px mengikuti jumlah node; node bisa digeser, tidak bisa dihubungkan; `colorMode` ikut tema |
| Pesan parser | Konten | "Diagram ini belum bisa dibaca parser React Flow — lihat tab Mermaid." (tidak seharusnya tampil — dijaga test) |

## Uji terkait

| Berkas | Cakupan |
|---|---|
| `src/test/sitemap-mermaid.test.ts` | Parser subset (bentuk, class, edge, galat), semua blok `docs/product/sitemap/*.md` lolos, daftar berkas = `SITEMAP_FILES`, id lintas berkas konsisten, tabel route terbaca |
| `src/test/menu-access.test.ts` | Akses VIEW SUPERADMIN · ADMIN · MANAGEMENT |
