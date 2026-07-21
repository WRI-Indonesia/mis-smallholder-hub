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

## Tutorial (lapis 1) — `tutorial/`

Tutorial berorganisasi **per tugas**, bukan per menu. Frontmatter tambahan:

```yaml
menuKey: master-data-farmers   # menandai tutorial di luar hak akses pembaca
permission: CREATE             # level izin yang dibutuhkan
duration: 4                    # perkiraan menit
href: /admin/master-data/farmers
hrefLabel: Buka halaman Petani # tombol; dibuka di tab baru
goal: Kalimat hasil akhir yang didapat pembaca.
```

Blok khusus tutorial:

```text
1. Langkah pertama.               ← nomor dari POSISI, angka yang ditulis diabaikan
+ Penjelasan tingkat Detail.      ← menempel pada langkah di atasnya

> [!tip] Saran yang mempercepat.
> [!penting] Hal yang perlu diketahui.
> [!hati-hati] Risiko bila keliru.
```

**Dua tingkat kedalaman dari satu sumber.** Baris `1.` adalah versi **Ringkas**;
baris `+` hanya tampil pada mode **Detail**. Pembaca memilih lewat toggle di
halaman topik. Versi terpisah sengaja dihindari agar keduanya tak saling
ketinggalan. Isi Detail tetap terindeks pencarian meski sedang disembunyikan.

Aturan isi (keputusan owner):
- Langkah utama **satu kalimat**; seluruh "kenapa" dan "apa yang terlihat" ke baris `+`.
- Bagian **`## Kalau bermasalah` wajib ada** di tiap tutorial — inline, bukan
  dikumpulkan ke halaman troubleshooting terpisah.
- **Tanpa tangkapan layar.** Kutip label tombol/kolom **persis** dari
  `docs/product/pages/`, supaya panduan tidak basi saat tata letak berubah.

`src/test/help-content.test.ts` menjaga kelengkapan frontmatter, keberadaan blok
langkah, dan bagian "Kalau bermasalah" untuk setiap berkas di folder ini.

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

Teks dalam kurung siku dipakai sebagai keterangan sekaligus teks alternatif. Bila ditulis di tengah kalimat, sintaks ini tetap jadi teks paragraf biasa — bukan media.

### Menyimpan berkas di mana?

| Sumber | Sintaks | Pakai untuk |
| ------ | ------- | ----------- |
| Folder `public/help/` | `![...](/help/nama-file.png)` | Gambar kecil/menengah yang jarang berubah (ikut repo & deploy) |
| **Bucket S3** | `![...](s3://help/nama-file.mp4)` | **Video tutorial atau aset besar** — tak membebani repo, bisa diganti tanpa deploy ulang |
| YouTube / Vimeo | `![...](https://youtu.be/XXXX)` | Video panjang yang memang publik |

Bucket proyek ini **privat**: tulis `s3://` diikuti *key* objek, dan aplikasi otomatis membuat tautan bertanda tangan (presigned) yang segar setiap halaman dibuka. Jangan menempel URL S3 bertanda tangan langsung ke Markdown — tautan seperti itu akan kedaluwarsa.

Bila key salah atau kredensial tak tersedia, media tersebut dilewati dan sisa materi tetap tampil (kesalahan dicatat di log server).
