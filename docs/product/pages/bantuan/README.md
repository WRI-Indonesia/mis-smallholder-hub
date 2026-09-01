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
| `tutorial` | Panduan **per tugas**, dua tingkat kedalaman (Ringkas/Detail) | 35 topik / 5 bab |
| `konsep` | Istilah & aturan main yang dirujuk tutorial | 13 topik / 6 bab |
| `referensi` | Arti kolom & tombol per halaman | 4 topik / 1 bab (`r-1-daftar-petani` … `r-4-daftar-produksi`) |

## Diagram objek

```text
Menu: Bantuan (/admin/help)
├── Indeks Bantuan (/admin/help)              → indeks-bantuan.md
│   ├── "Apa yang ingin Anda lakukan?" → kartu tugas (tutorial)
│   ├── "Referensi halaman" → kartu topik referensi
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
| Berkas materi | `src/content/help/` — lapis tutorial di `tutorial/` (34 file), lapis referensi di `referensi/` (4 file), lapis konsep di 6 folder `<n>-<bab>/<n>-<m>-<topik>.md` (13 file); total 12 bab di `CHAPTER_SOURCES` (5 tutorial + 1 referensi + 6 konsep) |
| Registrasi | `src/lib/help-content.ts` — konstanta `CHAPTER_SOURCES` (slug, judul, ringkasan, ikon bab) + satu baris `import` per file `.md` |
| Bundling | file `.md` dimuat sebagai string via webpack `asset/source` (`next.config.ts`), di-parse sekali saat modul dimuat → perubahan materi baru tampil setelah build ulang |
| Parser | `src/lib/markdown-lite.ts` (`parseMarkdown`, `parseBlocks`, `parseInline`, `blocksToPlainText`) — subset Markdown: frontmatter, heading `##`, paragraf, daftar `-`, baris definisi `**Istilah** — deskripsi`, inline `**tebal**` / `` `kode` `` / `[tautan](url)`, dan baris media `![caption](src)` |
| Frontmatter topik | `title` (wajib), `icon` (nama ikon lucide yang terdaftar di map `ICONS`; tak dikenal → `HelpCircle`), `intro` (opsional) |
| Render | `help-blocks.tsx` memetakan blok ke elemen React — **tanpa** `dangerouslySetInnerHTML` |
| Media lokal | `public/help/…` dirujuk `![...](/help/nama-file.png)`; `.mp4`/`.webm` → elemen `<video controls>`; URL YouTube/Vimeo → `<iframe>` `aspect-video` (judul frame: `Video panduan` bila caption kosong) |
| Media S3 | sintaks `s3://<key>`; `resolveHelpMedia()` (`src/lib/help-media.ts`) menukar `src` dengan **presigned URL** (`getPresignedUrl`, `src/lib/s3.ts`) pada tiap render halaman topik. Bila presign gagal, blok media dibuang (log `[help] gagal presign media S3 "<key>"`) dan sisa materi tetap tampil |
| Panduan penulis | `src/content/help/README.md` dan `public/help/README.md` |

## Struktur bab & topik

| No | Lapis | Bab (slug) | Ringkasan (`summary`) | Topik |
|---|---|---|---|---|
| 1 | tutorial | Mengelola Data Harian (`tutorial-data-harian`) | Langkah demi langkah pekerjaan yang paling sering dilakukan: mendaftarkan petani, lahan, pelatihan, dan produksi. | 1.1 Mendaftarkan Lembaga Petani (`menambah-lembaga`) · 1.2 Mendaftarkan petani baru (`menambah-petani`) · 1.3 Mendaftarkan lahan petani (`menambah-lahan`) · 1.4 Mencatat pelatihan & pesertanya (`mencatat-pelatihan`) · 1.5 Mencatat hasil panen (`mencatat-produksi`) · 1.6 Mencatat surat, STDB, dan program pada lahan (`mencatat-legalitas-lahan`, #296) |
| 2 | tutorial | Unggah Massal (`tutorial-unggah-massal`) | Memasukkan data dalam jumlah besar sekaligus — Excel untuk petani, produksi & detail lahan, shapefile untuk poligon lahan. | 2.1 Mengunggah data petani dari Excel (`unggah-petani`) · 2.2 Mengunggah data produksi dari Excel (`unggah-produksi`) · 2.3 Mengunggah lahan dari shapefile (`unggah-lahan`) · 2.4 Mengunggah detail lahan — surat, STDB, UL Parcel Code (`unggah-detail-lahan`, #296) · 2.5 Mengunggah titik pohon sawit (`unggah-pohon`, #238) |
| 3 | tutorial | Memantau & Menindaklanjuti (`tutorial-memantau`) | Membaca dashboard dan peta, lalu mengubah temuannya jadi daftar kerja yang bisa ditindaklanjuti. | 3.1 Membaca Main Dashboard (`membaca-dashboard`) · 3.2 Menindaklanjuti petani yang belum dilatih (`cakupan-pelatihan`) · 3.3 Membaca peta lahan & peta BMP (`membaca-peta`) · 3.4 Membaca BMP Dashboard (produksi) (`dashboard-bmp`) · 3.5 Menjelajah Peta Lahan (`peta-lahan`) · 3.6 Mengunduh data spasial lahan (`unduh-spasial-lahan`, #313) · 3.7 Memantau titik api (Fire Alert) (`fire-alert`, #266) · 3.8 Memeriksa ketersediaan data (`ketersediaan-data`) · 3.9 Membaca Ringkasan Petani (`ringkasan-petani`) · 3.10 Membandingkan data acuan (`komparasi-data-acuan`, #243) · 3.11 Membaca Metrik Rilis (`metrik-rilis`) · 3.12 Membaca Peta Data & Skema (`peta-data-skema`, #256) |
| 4 | tutorial | Laporan & Perawatan (`tutorial-laporan`) | Menyiapkan berkas untuk donor atau audit, dan menjaga angka dashboard tetap mutakhir. | 4.1 Menyiapkan laporan untuk dicetak (`membuat-laporan`) · 4.2 Mencetak Laporan Lahan ber-peta (`laporan-lahan`) · 4.3 Menyaring lahan yang belum punya surat atau STDB (`menyaring-legalitas-lahan`, #305) · 4.4 Mencetak Laporan Pelatihan (`laporan-pelatihan`) · 4.5 Mencetak Laporan Produksi (`laporan-produksi`) · 4.6 Mencetak Laporan Kelompok Tani (`laporan-kelompok-tani`) · 4.7 Memperbarui angka dashboard (`memperbarui-dashboard`) |
| 5 | tutorial | Analisa & Administrasi (`tutorial-administrasi`) | Memeriksa kelengkapan data sebelum dilaporkan, dan mengatur siapa boleh melihat apa. | 5.1 Memeriksa kelengkapan & kualitas data (`analisa-data`) · 5.2 Menambah pengguna & mengatur haknya (`mengelola-pengguna`) · 5.3 Mengatur izin peran per menu (`mengatur-izin-peran`) · 5.4 Menambah wilayah administratif (`menambah-wilayah`) · 5.5 Mengelola menu navigasi (`mengelola-menu`) |
| 6 | referensi | Referensi Halaman (`referensi-halaman`) | Arti tiap kolom, filter, dan tombol di halaman yang paling sering dipakai — untuk dirujuk saat bekerja, bukan dibaca berurutan. | 6.1 Halaman Petani — arti kolom & tombol (`daftar-petani`) · 6.2 Halaman Lahan — arti kolom & tombol (`daftar-lahan`) · 6.3 Halaman Pelatihan — arti kolom & tombol (`daftar-pelatihan`) · 6.4 Halaman Produksi — arti kolom & tombol (`daftar-produksi`) |
| 7 | konsep | Memulai (`memulai`) | Kenali istilah yang dipakai sistem, cara masuk, mengapa tampilan tiap pengguna berbeda, dan cara memakai Bantuan ini. | 7.1 Sekilas & Istilah Penting (`istilah`) · 7.2 Masuk & Akun (`masuk-akun`) · 7.3 Hak Akses & Cakupan Data (`hak-akses`) · 7.4 Cara Memakai Bantuan (`memakai-bantuan`) |
| 8 | konsep | Mengelola Data (`mengelola-data`) | Input harian lewat Master Data, atau unggah massal lewat Bulk Upload. | 8.1 Master Data (`master-data`) · 8.2 Bulk Upload (Unggah Massal) (`bulk-upload`) |
| 9 | konsep | Memantau & Menganalisa (`memantau`) | Ringkasan program lewat dashboard, sebaran spasial lewat peta, dan kualitas data lewat analisa. | 9.1 Dashboard (`dashboard`) · 9.2 Peta (`peta`) · 9.3 Data Analyst (`data-analyst`) |
| 10 | konsep | Laporan & Cetak (`laporan`) | Enam laporan siap unduh (Excel & PDF), termasuk Laporan Lahan yang menyertakan peta. | 10.1 Report (Laporan) (`report`) |
| 11 | konsep | Administrasi (`administrasi`) | Perawatan berkala agar angka dashboard mengikuti data terbaru. | 11.1 Tools (`tools`) |
| 12 | konsep | Bantuan Lanjutan (`bantuan-lanjutan`) | Kendala yang paling sering ditemui beserta langkah pemeriksaannya. | 12.1 Pertanyaan Umum & Kendala (`kendala`) |

Penomoran `bab.topik` (1-based) dihasilkan `topicNumber(chapterIndex, topicIndex)` — indeks bab mengikuti urutan `HELP_CHAPTERS` (tutorial → referensi → konsep).

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
