# Brand fonts (WRI — Acumin Pro)

File font berlisensi WRI. Sumber resmi: Adobe Fonts (Creative Cloud) atau
<https://brand.wri.org/fonts/>. Referensi tipografi:
<https://vizzuality.github.io/wri-guidelines/how_to_represent_affiliated_brands/typography/>.

`@font-face` didefinisikan di `src/app/globals.css`.

## Dipakai — Acumin Pro Condensed (font UI utama, `--font-sans`)

| File | Weight | Format |
|------|--------|--------|
| `acumin-pro-condensed-light.woff2`   | 300 | woff2 |
| `acumin-pro-condensed-regular.woff2` | 400 | woff2 |
| `acumin-pro-condensed-bold.woff2`    | 700 | woff2 |

Weight **300 (Light)** dipakai teks tingkat **Detail** di menu Bantuan. Dikonversi
dari `.otf` sumber ke woff2 (`npx ttf2woff2`) — 80 KB → 42 KB. Tanpa berkas ini
`font-light` tidak berefek: browser mensintesis huruf tebal, tetapi tidak pernah
mensintesis huruf yang lebih tipis.

Font UI utama (`body`) memakai family **"Acumin Pro Condensed"** dengan fallback
**Arial → Helvetica → sans-serif** (rekomendasi WRI). Bila file hilang, UI jatuh
ke fallback tsb, bukan font generik acak.

## Acumin Pro (lebar normal) — hanya TTF untuk embed PDF

Varian **lebar normal** (bukan condensed) hanya disimpan sebagai `.ttf` untuk
**embed jsPDF** (lihat "File turunan" di bawah). Lima berkas web-nya
(`acumin-pro-{regular.woff2,regular.woff,bold.woff,italic.woff,bold-italic.woff}`,
236 KB) **dihapus 2026-09-21 (#353)** — sejak ditambahkan tidak pernah dirujuk
`@font-face` mana pun, sementara repo ini publik (lisensi, lihat di bawah).
Bila kelak heading perlu family "Acumin Pro", ambil ulang dari
<https://brand.wri.org/fonts/> dan daftarkan `@font-face` di `globals.css`
(woff2 lebih dulu, nama berkas kebab-case).

> Nama berkas **wajib kebab-case tanpa spasi**. Berkas yang mengandung spasi
> memaksa URL ter-encode (`/fonts/Acumin%20Pro.woff2`) — mudah salah ketik dan
> tidak konsisten dengan berkas lain.

> **Lisensi**: font Acumin milik Adobe/WRI. Jangan commit file berlisensi ke repo
> **publik** tanpa hak distribusi — bila repo publik, `gitignore` `public/fonts/*.woff*`
> dan distribusikan lewat jalur lain.

File turunan:
- `acumin-pro-{regular,bold,italic}.ttf` — hasil konversi WOFF (outline CFF/OTTO) → TrueType via fonttools/cu2qu, khusus untuk **embed jsPDF** (laporan Fire Alert #266); jsPDF tidak membaca WOFF/OTF-CFF. Dimuat `fire-alert-client.tsx` → `fire-map-print.ts`; gagal fetch → fallback helvetica.
- `Acumin-*.otf` — **dihapus 2026-08-20 (#273)**. Salinan sumber desktop (CFF) yang tidak dirujuk kode
  sama sekali, sementara repo ini **publik** — lihat catatan lisensi di atas. Bila perlu konversi ulang,
  ambil `.otf` sumber dari Adobe Fonts / <https://brand.wri.org/fonts/>, jangan commit kembali ke repo.
