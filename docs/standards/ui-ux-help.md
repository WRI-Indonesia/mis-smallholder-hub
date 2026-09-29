# Standar — UI/UX: Konten Bantuan

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Induk: [ui-ux.md](./ui-ux.md) · Terkait: [ui-ux-tables.md](./ui-ux-tables.md) · [ui-ux-map.md](./ui-ux-map.md) · [ui-ux-bulk-upload.md](./ui-ux-bulk-upload.md) · [ui-ux-help.md](./ui-ux-help.md)

## Pola Konten Bantuan (HELP-02)

Materi Bantuan dibagi **tiga lapis** — jangan campur, karena tugasnya berbeda:

| Lapis | Menjawab | Contoh |
|---|---|---|
| **tutorial** | "bagaimana caranya" | Mendaftarkan petani baru |
| **konsep** | "apa itu / aturan mainnya" | Istilah domain, hak akses, soft delete |
| **referensi** | "apa arti kolom ini" | Arti tiap kolom & tombol per halaman |

Aturan penulisan tutorial (`src/content/help/tutorial/*.md`):

- **Dua tingkat kedalaman dari SATU sumber.** Baris `1.` = Ringkas; baris `+` di
  bawahnya = Detail, ditampilkan lewat toggle. **Jangan** membuat dua berkas
  terpisah — keduanya akan cepat tidak sinkron.
- Langkah utama **satu kalimat**; seluruh "kenapa" & "apa yang terlihat" ke `+`.
- Bagian **`## Kalau bermasalah` wajib ada**, inline di tiap tutorial (keputusan
  owner) — bukan dikumpulkan ke halaman troubleshooting terpisah.
- **Tanpa tangkapan layar.** Kutip label tombol/kolom **persis** dari
  `docs/product/pages/`; gambar cepat basi dan tidak ikut ter-review saat kode berubah.
- `docs/product/pages/` adalah **sumber akurasi, bukan bahan salin** — katalog itu
  ditulis untuk developer (path file, nama action, seluruh kolom tabel).
- Frontmatter wajib: `title`, `icon`, `menuKey`, `permission`, `goal`, `href`,
  `duration`. Kelengkapannya dijaga `src/test/help-content.test.ts`.
- Tutorial di luar hak akses pembaca **ditandai, bukan disembunyikan** — panduan
  tetap berguna saat pelatihan lintas peran.

Interaksi (toggle kedalaman, lipat daftar isi) memakai **checkbox + CSS tanpa
JavaScript**, konsisten sifat statis halaman Bantuan (#182/#183).
