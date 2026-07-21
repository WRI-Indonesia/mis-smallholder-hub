# Halaman Bab

[← Menu: Bantuan](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Halaman Bab (/admin/help/[chapter])
├── Sidebar / Nav
│   └── HelpSidebar activeChapter={slug} (bab aktif warna primary)
├── Konten
│   ├── "← Bantuan" → /admin/help
│   ├── h1 "Bab {n} — {judul}" + ikon bab
│   ├── Ringkasan bab (summary)
│   └── Grid kartu topik (2 kolom ≥sm)
│       ├── Ikon topik
│       ├── "{n.m} {judul}"
│       └── intro topik (maks 3 baris)
└── Tombol / Form
    ├── "Baca topik" → /admin/help/{chapter}/{topic}
    └── Navigasi bab: ← Bab {n-1} · Bab {n+1} →
```

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/help/[chapter]/page.tsx` |
| Tipe | Server Component (ikhtisar satu bab); `generateStaticParams()` mengembalikan seluruh slug bab |
| Guard | `requirePermission("help")`; slug tak dikenal → `notFound()` |
| Server action / data | `getHelpChapter(slug)`, `HELP_CHAPTERS`, `buildHelpNav()`, `buildHelpSearchIndex()`, `topicNumber()` |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| Sidebar Bantuan | Nav | `<HelpSidebar activeChapter={slug}>` — bab aktif ditandai warna `primary` |
| Tombol lipat daftar isi | Label | `Sembunyikan daftar isi` / `Tampilkan daftar isi` (≥lg) — checkbox `#help-nav` + CSS, tanpa JS |
| `← Bantuan` | Nav | Tautan balik ke `/admin/help` |
| `Bab {n} — {judul}` | Heading | `h1` beserta ikon bab |
| Ringkasan bab | Konten | Teks `summary` bab |
| Kartu topik | Kartu | Grid 2 kolom (≥sm); ikon topik, judul `{n.m} {judul}`, `intro` topik (maks 3 baris) |
| `Baca topik` | Tombol | Tautan tiap kartu ke `/admin/help/{chapter}/{topic}` |
| Navigasi bab | Nav | Tombol `Bab {n-1} — {judul}` (kiri, `ChevronLeft`) dan `Bab {n+1} — {judul}` (kanan, `ChevronRight`); disembunyikan pada bab pertama/terakhir |
