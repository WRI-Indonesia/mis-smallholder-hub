# Konten Bantuan (`/admin/help`)

Materi panduan aplikasi disimpan sebagai file Markdown di folder ini — **bisa diedit tanpa menyentuh kode**. Setiap file = satu topik; setiap folder = satu bab.

## Cara mengubah materi

1. Buka file `.md` yang ingin diubah (mis. `2-mengelola-data/2-2-bulk-upload.md`).
2. Edit teksnya, simpan, buat commit/PR. Riwayat perubahan tercatat di git.
3. Urutan bab & topik mengikuti **awalan angka** pada nama folder/file (`2-1-…` tampil sebelum `2-2-…`).

Menambah topik baru: buat file `.md` baru **dan** daftarkan di `src/lib/help-content.ts` (satu baris import) — langkah ini masih perlu developer karena bundling dilakukan saat build.

## Format yang didukung

Parser sengaja dibatasi pada subset berikut (`src/lib/markdown-lite.ts`). Sintaks di luar daftar ini akan tampil apa adanya sebagai teks.

```markdown
---
title: Bulk Upload
icon: Upload
intro: Kalimat pembuka opsional yang tampil di bawah judul topik.
---

## Sub-judul

Paragraf biasa. Baris yang berdampingan digabung menjadi satu paragraf.

**Istilah** — penjelasan istilah tersebut. (baris definisi: istilah tebal, lalu — atau : )

- Item daftar berpoin
- Item berikutnya

Inline: **tebal**, `kode`, dan [tautan](https://contoh.id).
```

### Frontmatter

| Kunci   | Wajib | Keterangan                                                      |
| ------- | ----- | --------------------------------------------------------------- |
| `title` | ya    | Judul topik (tampil di tree, indeks, dan hasil pencarian)       |
| `icon`  | tidak | Nama ikon lucide yang terdaftar di `help-content.ts`            |
| `intro` | tidak | Kalimat pembuka di bawah judul topik                            |

## Catatan

- Nama bab, ringkasan bab, dan ikon bab diatur di `src/lib/help-content.ts`.
- Konten dibundel saat build (webpack `asset/source`), jadi perubahan file `.md` baru tampil setelah build ulang.
- Materi harus mengikuti perilaku aplikasi yang sebenarnya — perbarui bersama `docs/product/*` bila alur modul berubah.

## Gambar & video

Sintaks media ditulis **berdiri sendiri di satu baris**:

```markdown
![Formulir tambah petani](/help/tambah-petani.png)     → gambar
![Cara unggah Shapefile](/help/unggah-shapefile.mp4)   → pemutar video
![Video pengenalan](https://youtu.be/XXXXXXXXXXX)      → sematan YouTube/Vimeo
```

Simpan berkas gambar/video di `public/help/` (lihat `public/help/README.md`). Teks dalam kurung siku dipakai sebagai keterangan sekaligus teks alternatif. Bila ditulis di tengah kalimat, sintaks ini tetap jadi teks paragraf biasa — bukan media.
