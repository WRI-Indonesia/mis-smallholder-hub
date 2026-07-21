# Indeks Bantuan

[← Menu: Bantuan](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Indeks Bantuan (/admin/help)
├── Sidebar / Nav
│   └── HelpSidebar (280px, sticky ≥lg, semua bab terbuka)
│       ├── Cari topik bantuan...
│       └── Tree bab → topik
├── Konten
│   ├── h1 "Bantuan"
│   ├── Deskripsi (jumlah bab & topik)
│   └── Grid kartu bab (2 kolom ≥sm)
│       ├── Ikon bab
│       ├── "Bab {n} — {judul}"
│       ├── Ringkasan bab
│       └── Daftar topik "{n.m} {judul}"
└── Tombol / Form
    └── "Buka bab" → /admin/help/{slug}
```

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/help/page.tsx` |
| Tipe | Server Component (indeks bab) |
| Guard | `requirePermission("help")` |
| Server action / data | `HELP_CHAPTERS`, `buildHelpNav()`, `buildHelpSearchIndex()`, `helpChaptersBySection()`, `topicNumber()` dari `@/lib/help-content`; **+`auth()` & `getAccessibleMenuKeys()`** untuk menandai tutorial di luar hak akses (sejak HELP-02 halaman ini tidak lagi "nol query DB") |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| Sidebar Bantuan | Nav | `<HelpSidebar>` kolom kiri 280px, sticky di ≥lg; di indeks semua bab dalam keadaan terbuka (`activeChapter === null`) |
| `Bantuan` | Heading | `h1` halaman |
| Deskripsi | Konten | `Panduan penggunaan Smallholder HUB MIS. Mulai dari tugas yang ingin Anda kerjakan, atau gunakan pencarian di samping.` |
| Seksi `Apa yang ingin Anda lakukan?` | Seksi | Kartu **tugas** (lapis tutorial): ikon, judul, `goal`, `± {n} menit`, dan penanda `Di luar hak akses akun Anda` bila `menuKey` tak terjangkau |
| Seksi `Konsep & istilah` | Seksi | Kartu bab lapis konsep |
| Tombol lipat daftar isi | Label | `Sembunyikan daftar isi` / `Tampilkan daftar isi` (≥lg) — checkbox `#help-nav` + CSS |
| Kartu bab | Kartu | Grid 2 kolom (≥sm); tiap kartu: ikon bab, judul bab, ringkasan, daftar topik `{n.m} {judul topik}` |
| `Buka bab` | Tombol | Tautan pada tiap kartu ke `/admin/help/{slug}` dengan ikon `ChevronRight` |
