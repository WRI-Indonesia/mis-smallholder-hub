# Brand fonts (WRI — Acumin Pro Condensed)

Taruh file font berlisensi WRI di folder ini. Sumber resmi: Adobe Fonts
(Creative Cloud) atau <https://brand.wri.org/fonts/>. Referensi tipografi:
<https://vizzuality.github.io/wri-guidelines/how_to_represent_affiliated_brands/typography/>.

`@font-face` didefinisikan di `src/app/globals.css`. Nama file yang diharapkan
(format **woff2**):

| File | Weight | Dipakai untuk |
|------|--------|----------------|
| `acumin-pro-condensed-regular.woff2` | 400 | Teks UI umum |
| `acumin-pro-condensed-bold.woff2`    | 700 | Teks tebal / heading |

Selama file belum ada, UI otomatis jatuh ke fallback sistem
**Arial → Helvetica → sans-serif** (sesuai rekomendasi WRI), bukan font generik
acak. Jika butuh weight lain (mis. Acumin Pro Light 300), tambahkan file +
blok `@font-face` baru di `globals.css`.

> Catatan lisensi: font Acumin adalah milik Adobe/WRI — jangan commit file
> berlisensi ke repo publik tanpa hak distribusi.
