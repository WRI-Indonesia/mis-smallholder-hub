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

## Tersedia (opsional, belum di-`@font-face`) — Acumin Pro (lebar normal)

| File | Weight | Format |
|------|--------|--------|
| `acumin-pro-regular.woff2` | 400 | woff2 |
| `acumin-pro-regular.woff`  | 400 | woff 1.0 |
| `acumin-pro-bold.woff`     | 700 | woff 1.0 |
| `acumin-pro-italic.woff`   | 400 italic | woff 1.0 |
| `acumin-pro-bold-italic.woff` | 700 italic | woff 1.0 |

Varian **lebar normal** (bukan condensed) — WRI memakainya untuk header/H1.
Belum dirujuk CSS; tambahkan blok `@font-face` family "Acumin Pro" bila ingin
dipakai untuk heading, dengan woff2 lebih dulu lalu woff sebagai fallback:

```css
src: url("/fonts/acumin-pro-regular.woff2") format("woff2"),
     url("/fonts/acumin-pro-regular.woff") format("woff");
```

> Nama berkas **wajib kebab-case tanpa spasi**. Berkas yang mengandung spasi
> memaksa URL ter-encode (`/fonts/Acumin%20Pro.woff2`) — mudah salah ketik dan
> tidak konsisten dengan berkas lain.

> **Lisensi**: font Acumin milik Adobe/WRI. Jangan commit file berlisensi ke repo
> **publik** tanpa hak distribusi — bila repo publik, `gitignore` `public/fonts/*.woff*`
> dan distribusikan lewat jalur lain.
