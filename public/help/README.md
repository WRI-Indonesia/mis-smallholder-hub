# Aset Bantuan (gambar & video)

Letakkan tangkapan layar atau video panduan di folder ini, lalu rujuk dari file
Markdown di `src/content/help/` dengan sintaks:

```markdown
![Formulir tambah petani](/help/tambah-petani.png)
![Cara unggah Shapefile](/help/unggah-shapefile.mp4)
![Video pengenalan](https://youtu.be/XXXXXXXXXXX)
```

- **Gambar**: `.png` / `.jpg` / `.webp` — lebar ±1200px agar tajam tanpa file besar.
- **Video**: `.mp4` (H.264) atau `.webm`; usahakan di bawah 10 MB per file. Video panjang sebaiknya diunggah ke YouTube lalu rujuk tautannya (otomatis jadi pemutar sematan).
- Nama file memakai huruf kecil dan tanda hubung, mis. `bulk-upload-mapping.png`.
- Isi keterangan di dalam `[ ... ]` — dipakai sebagai teks alternatif (aksesibilitas) sekaligus caption.

## Aset besar: pakai S3, bukan folder ini

Video tutorial sebaiknya **tidak** disimpan di repo. Unggah ke bucket S3 proyek (mis. dengan prefix `help/`), lalu rujuk dengan *key*-nya:

```markdown
![Cara unggah Shapefile](s3://help/unggah-shapefile.mp4)
```

Bucket bersifat privat — aplikasi otomatis membuat tautan bertanda tangan setiap halaman dibuka, jadi cukup tulis `s3://<key>` dan jangan menempel URL bertanda tangan (akan kedaluwarsa). Mengganti isi video cukup menimpa objek di bucket, tanpa deploy ulang.
