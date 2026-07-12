# Brand fonts (WRI — Acumin Pro)

File font berlisensi WRI. Sumber resmi: Adobe Fonts (Creative Cloud) atau
<https://brand.wri.org/fonts/>. Referensi tipografi:
<https://vizzuality.github.io/wri-guidelines/how_to_represent_affiliated_brands/typography/>.

`@font-face` didefinisikan di `src/app/globals.css`.

## Dipakai — Acumin Pro Condensed (font UI utama, `--font-sans`)

| File | Weight | Format |
|------|--------|--------|
| `acumin-pro-condensed-regular.woff2` | 400 | woff2 |
| `acumin-pro-condensed-bold.woff2`    | 700 | woff2 |

Font UI utama (`body`) memakai family **"Acumin Pro Condensed"** dengan fallback
**Arial → Helvetica → sans-serif** (rekomendasi WRI). Bila file hilang, UI jatuh
ke fallback tsb, bukan font generik acak.

## Tersedia (opsional, belum di-`@font-face`) — Acumin Pro (lebar normal)

`acumin-pro-regular.woff` · `acumin-pro-bold.woff` · `acumin-pro-italic.woff` ·
`acumin-pro-bold-italic.woff` (format WOFF 1.0). Varian **lebar normal** (bukan
condensed) — WRI memakainya untuk header/H1. Belum dirujuk CSS; tambahkan blok
`@font-face` family "Acumin Pro" bila ingin dipakai untuk heading.

> **Lisensi**: font Acumin milik Adobe/WRI. Jangan commit file berlisensi ke repo
> **publik** tanpa hak distribusi — bila repo publik, `gitignore` `public/fonts/*.woff*`
> dan distribusikan lewat jalur lain.
