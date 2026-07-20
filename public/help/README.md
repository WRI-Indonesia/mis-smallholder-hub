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
