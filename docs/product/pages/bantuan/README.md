# Menu: Bantuan

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `help` |
| URL | `/admin/help` |
| Icon | `HelpCircle` |
| Order | `9` (menu tunggal, tanpa sub menu di `menu.csv`) |
| Sumber metadata | `prisma/seeds/data/menu.csv` baris `help,,Bantuan,/admin/help,HelpCircle,9,TRUE,TRUE` |

Modul Bantuan berisi panduan penggunaan MIS. Semua halaman adalah Server Component; satu-satunya bagian `"use client"` adalah sidebar navigasi + pencarian (`help-sidebar.tsx`).

Sejak **HELP-02** materi dibagi **tiga lapis** lewat `section` pada `HelpChapter` — rute tetap sama, `section` hanya mengelompokkan:

| Lapis | Isi | Status |
|---|---|---|
| `tutorial` | Panduan **per tugas**, dua tingkat kedalaman (Ringkas/Detail) | 13 topik / 4 bab |
| `konsep` | Istilah & aturan main yang dirujuk tutorial | 11 topik / 6 bab |
| `referensi` | Arti kolom & tombol per halaman | kerangka siap, materi menyusul |

## Diagram objek

```text
Menu: Bantuan (/admin/help)
├── Indeks Bantuan (/admin/help)              → indeks-bantuan.md
│   ├── "Apa yang ingin Anda lakukan?" → kartu tugas (tutorial)
│   └── "Konsep & istilah" → kartu bab → "Buka bab"
├── Halaman Bab (/admin/help/[chapter])       → halaman-bab.md
│   └── Kartu topik → "Baca topik" + navigasi bab ←/→
├── Halaman Topik (/admin/help/[chapter]/[topic]) → halaman-topik.md
│   └── Breadcrumb · Materi (HelpBlocks) · navigasi topik ←/→
└── Komponen bersama
    ├── HelpLayout — kerangka 2 kolom + toggle lipat daftar isi (CSS, tanpa JS)
    └── HelpSidebar (client) — pencarian + tree bab→topik
```

## Sumber konten

| Aspek | Keterangan |
|---|---|
| Berkas materi | `src/content/help/<n>-<bab>/<n>-<m>-<topik>.md` — 6 folder bab, 11 file topik |
| Registrasi | `src/lib/help-content.ts` — konstanta `CHAPTER_SOURCES` (slug, judul, ringkasan, ikon bab) + satu baris `import` per file `.md` |
| Bundling | file `.md` dimuat sebagai string via webpack `asset/source` (`next.config.ts`), di-parse sekali saat modul dimuat → perubahan materi baru tampil setelah build ulang |
| Parser | `src/lib/markdown-lite.ts` (`parseMarkdown`, `parseBlocks`, `parseInline`, `blocksToPlainText`) — subset Markdown: frontmatter, heading `##`, paragraf, daftar `-`, baris definisi `**Istilah** — deskripsi`, inline `**tebal**` / `` `kode` `` / `[tautan](url)`, dan baris media `![caption](src)` |
| Frontmatter topik | `title` (wajib), `icon` (nama ikon lucide yang terdaftar di map `ICONS`; tak dikenal → `HelpCircle`), `intro` (opsional) |
| Render | `help-blocks.tsx` memetakan blok ke elemen React — **tanpa** `dangerouslySetInnerHTML` |
| Media lokal | `public/help/…` dirujuk `![...](/help/nama-file.png)`; `.mp4`/`.webm` → elemen `<video controls>`; URL YouTube/Vimeo → `<iframe>` `aspect-video` (judul frame: `Video panduan` bila caption kosong) |
| Media S3 | sintaks `s3://<key>`; `resolveHelpMedia()` (`src/lib/help-media.ts`) menukar `src` dengan **presigned URL** (`getPresignedUrl`, `src/lib/s3.ts`) pada tiap render halaman topik. Bila presign gagal, blok media dibuang (log `[help] gagal presign media S3 "<key>"`) dan sisa materi tetap tampil |
| Panduan penulis | `src/content/help/README.md` dan `public/help/README.md` |

## Struktur bab & topik

| No | Bab (slug) | Ringkasan (`summary`) | Topik |
|---|---|---|---|
| 1 | Memulai (`memulai`) | Kenali istilah yang dipakai sistem, cara masuk, dan mengapa tampilan tiap pengguna berbeda. | 1.1 Sekilas & Istilah Penting (`istilah`) · 1.2 Masuk & Akun (`masuk-akun`) · 1.3 Hak Akses & Cakupan Data (`hak-akses`) |
| 2 | Mengelola Data (`mengelola-data`) | Input harian lewat Master Data, atau unggah massal lewat Bulk Upload. | 2.1 Master Data (`master-data`) · 2.2 Bulk Upload (Unggah Massal) (`bulk-upload`) |
| 3 | Memantau & Menganalisa (`memantau`) | Ringkasan program lewat dashboard, sebaran spasial lewat peta, dan kualitas data lewat analisa. | 3.1 Dashboard (`dashboard`) · 3.2 Peta (`peta`) · 3.3 Data Analyst (`data-analyst`) |
| 4 | Laporan & Cetak (`laporan`) | Enam laporan siap unduh (Excel & PDF), termasuk Laporan Lahan yang menyertakan peta. | 4.1 Report (Laporan) (`report`) |
| 5 | Administrasi (`administrasi`) | Perawatan berkala agar angka dashboard mengikuti data terbaru. | 5.1 Tools (`tools`) |
| 6 | Bantuan Lanjutan (`bantuan-lanjutan`) | Kendala yang paling sering ditemui beserta langkah pemeriksaannya. | 6.1 Pertanyaan Umum & Kendala (`kendala`) |

Penomoran `bab.topik` (1-based) dihasilkan `topicNumber(chapterIndex, topicIndex)`.

## Daftar halaman

| Halaman | Route | Berkas dokumentasi |
|---|---|---|
| Indeks Bantuan | `/admin/help` | [indeks-bantuan.md](./indeks-bantuan.md) |
| Halaman Bab | `/admin/help/[chapter]` | [halaman-bab.md](./halaman-bab.md) |
| Halaman Topik | `/admin/help/[chapter]/[topic]` | [halaman-topik.md](./halaman-topik.md) |

## Komponen: `HelpSidebar` (tree + pencarian)

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/help/help-sidebar.tsx` |
| Tipe | Client Component (`"use client"`) |
| Props | `nav` (`buildHelpNav()`), `searchIndex` (`buildHelpSearchIndex()`), `activeChapter`, `activeTopic` |
| Data pencarian | Indeks ringan & serializable: `chapterSlug`, `chapterTitle`, `topicId`, `topicTitle`, `number`, `haystack` (judul bab + judul topik + intro + teks polos materi, huruf kecil) |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| `Cari topik bantuan...` | Form | Input pencarian (ikon `Search`), `aria-label="Cari topik bantuan"` |
| `Hapus pencarian` | Tombol | Ikon `X`, tampil saat query terisi, mengosongkan kotak cari |
| Hasil pencarian | Konten | Aktif bila query ≥ 2 karakter; query dipecah per spasi, entri lolos bila **semua** term ada di `haystack` (AND, substring, client-side) |
| `{n} topik cocok` | Konten | Jumlah hasil; bila kosong: `Tidak ada topik yang cocok.` |
| Item hasil | Nav | `{n.m} {judul topik}` + nama bab, menautkan ke halaman topik |
| Tree bab → topik | Nav | `<details>` per bab (`aria-label="Daftar bab bantuan"`); terbuka bila bab aktif atau saat di indeks; judul bab `{n}. {judul}` menautkan ke halaman bab, tiap anak `{n.m} {judul topik}` ke halaman topik |

## Uji terkait

| Berkas | Cakupan |
|---|---|
| `src/test/help-content.test.ts` | Struktur bab/topik, parsing frontmatter & blok, indeks pencarian |
| `src/test/help-media.test.ts` | Resolusi media `s3://` (presign, fallback, blok gagal dibuang) |
