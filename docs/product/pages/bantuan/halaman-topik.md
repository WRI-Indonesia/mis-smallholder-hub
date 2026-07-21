# Halaman Topik

[← Menu: Bantuan](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Halaman Topik (/admin/help/[chapter]/[topic])
├── Sidebar / Nav
│   └── HelpSidebar activeChapter + activeTopic (aria-current="page")
├── Konten
│   ├── Breadcrumb: Bantuan / Bab {n} — {judul bab}
│   ├── h1 "{n.m} {judul topik}" + ikon topik
│   ├── Intro topik (frontmatter)
│   ├── <article> HelpBlocks
│   │   ├── heading h4 · paragraf · daftar berpoin
│   │   ├── baris definisi (grid istilah/penjelasan)
│   │   └── media: <img lazy> / <video controls> / <iframe> + figcaption
│   └── Catatan kaki
└── Tombol / Form
    └── Navigasi topik: ← {n.m} sebelumnya · {n.m} berikutnya →
```

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/help/[chapter]/[topic]/page.tsx` |
| Tipe | Server Component (materi satu topik); `generateStaticParams()` mengembalikan seluruh pasangan bab×topik |
| Guard | `requirePermission("help")`; kombinasi tak dikenal → `notFound()` |
| Server action / data | `getHelpTopic()`, `getAdjacentHelpTopics()`, `buildHelpNav()`, `buildHelpSearchIndex()`, `resolveHelpMedia(topic.blocks)` (presign S3 per-request); **+`auth()` & `getAccessibleMenuKeys()`** untuk penanda hak akses |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| Sidebar Bantuan | Nav | `<HelpSidebar activeChapter activeTopic>` — topik aktif `aria-current="page"` |
| Breadcrumb | Nav | `aria-label="Breadcrumb"`: `Bantuan` / `Bab {n} — {judul bab}` |
| `{n.m} {judul topik}` | Heading | `h1` beserta ikon topik |
| Intro topik | Konten | Teks `intro` frontmatter (bila ada) |
| Kartu tujuan | Kartu | Hanya bila frontmatter memuatnya: `Hasil akhir: {goal}`, tombol `{hrefLabel}` → `{href}` (**tab baru**), `± {duration} menit`, dan penanda `Menu ini di luar hak akses akun Anda` |
| Toggle kedalaman | Label | `Kedalaman:` + dua tombol `Ringkas` / `Detail` — checkbox `#help-depth` + CSS; hanya dirender bila topiknya punya materi tingkat Detail |
| Materi | Konten | `<article>` berisi `<HelpBlocks>` — heading `h4`, paragraf, daftar berpoin, baris definisi, **langkah bernomor** (nomor dari posisi), **callout** tip/penting/hati-hati, **detail** (`data-detail`, tampil pada mode Detail), dan media (`<img loading="lazy">` / `<video controls preload="metadata">` / `<iframe>` embed) dengan `figcaption` |
| Navigasi topik | Nav | Tombol topik sebelumnya/berikutnya `{n.m} {judul}` — menyeberang bab bila perlu (`getAdjacentHelpTopics`) |
| Catatan kaki | Konten | `Panduan ini bersifat umum; tampilan menu dapat berbeda mengikuti hak akses Anda.` |
