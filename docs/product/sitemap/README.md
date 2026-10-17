# Peta Fitur untuk Miro (Site Map)

> Bagian dari dokumentasi **Produk**. Indeks: [../../README.md](../../README.md) · Terkait: [../navigation.md](../navigation.md) · [../pages/README.md](../pages/README.md) · [../role-flows.md](../role-flows.md)

> **Ringkasan:** Seluruh fitur aplikasi dipetakan sebagai flowchart **Menu → Sub menu → Page → Section → Content** dalam Mermaid, satu berkas per menu top-level, untuk dipindahkan ke board Miro dan dijadikan naskah video tutorial. Bukan sumber kebenaran: isi diturunkan dari katalog [../pages/](../pages/README.md).

## Untuk apa

- **Board Miro** — tiap blok Mermaid = satu frame; bentuk & warna box mengikuti [legend.md](legend.md), sehingga semua frame konsisten tanpa harus membaca katalog.
- **Video tutorial** — satu berkas ≈ satu episode; bagian *Urutan demo yang disarankan* di tiap berkas adalah kerangka naskahnya.
- **Orientasi cepat** — melihat seluruh halaman dan isinya tanpa membuka 80-an berkas katalog.
- **Halaman aplikasi** — menu **Platform Developer → Peta Fitur** menampilkan berkas-berkas ini langsung di aplikasi dengan dua tab (Mermaid · React Flow); berkas di-bundle saat build, jadi perubahan tampil setelah rilis. Katalog: [../pages/platform-developer/sitemap.md](../pages/platform-developer/sitemap.md).

## Berkas

Urutan di bawah = urutan episode yang disarankan: gambaran besar dulu, lalu alur memasukkan data, lalu alur membaca data, terakhir administrasi.

| # | Berkas | Isi | Diagram |
|---|---|---|---|
| — | [legend.md](legend.md) | Konvensi bentuk, warna, penamaan, cara impor ke Miro | — |
| 1 | [overview.md](overview.md) | Publik vs admin, alur masuk, layout bersama, 10 menu, relasi entitas | 5 |
| 2 | [master-data.md](master-data.md) | Lembaga Petani · Petani · Pelatihan · Lahan · Produksi · Monev BMP · Target Program | per halaman |
| 3 | [bulk-upload.md](bulk-upload.md) | Unggah Petani · Produksi · Lahan (poligon, detail, patok) · Pohon Sawit | per halaman |
| 4 | [dashboard.md](dashboard.md) | Main · Pelatihan · BMP (Produksi) · Monev BMP · Fire Alert · Rantai Pasok 🟠 | per halaman |
| 5 | [map.md](map.md) | Peta Lahan · Peta BMP · Peta Rantai Pasok 🟠 | per halaman |
| 6 | [report.md](report.md) | Petani · Lahan · Pelatihan · Produksi · Kelompok Tani (Summary/Detail) · Patok | per halaman |
| 7 | [data-analyst.md](data-analyst.md) | Ringkasan Petani · Ketersediaan Data (Semua Lembaga, Per Lembaga, Produksi) · Komparasi Data Acuan · Tumpang Tindih Lahan 🟠 | per halaman |
| 8 | [tools.md](tools.md) | Dashboard Snapshot · Dashboard Snapshot BMP | 6 |
| 9 | [settings.md](settings.md) | User Management · Menu Management · Role & Permission · Regions | per halaman |
| 10 | [platform-developer.md](platform-developer.md) | Metrik Rilis · Peta Data & Skema · Rencana Pengembangan · Daftar Issue · Peta Fitur | per halaman |
| 11 | [help.md](help.md) | Indeks · Bab · Topik Bantuan | per halaman |

## Struktur tiap berkas menu

1. **Ringkasan** — untuk apa menu ini, berapa sub menu/halaman.
2. **Pohon navigasi** — Menu → Sub menu → Page + tabel route & tautan katalog.
3. **Satu diagram per halaman** — Page → Section → Content; dialog sebagai heksagon; navigasi antar halaman garis putus-putus.
4. **Alur lintas menu** — hubungan ke menu lain (data yang dibaca/ditulis, tombol yang berpindah menu).
5. **Urutan demo yang disarankan** — kerangka naskah video.

## Keputusan desain (owner, 2026-10-17)

| Pertanyaan | Keputusan |
|---|---|
| Lokasi | `docs/product/sitemap/`, sejajar katalog `pages/` |
| Kedalaman | Page → Section → Content (seperti site map lama) |
| Pembagian | Satu berkas per menu top-level + ikhtisar + legenda |
| Notasi | Mermaid flowchart (Miro mendukung impor Mermaid; ter-render di GitHub) |
| Hak akses | **Tanpa** overlay role; rujuk [../role-flows.md](../role-flows.md) |
| Bahasa label | Bahasa Indonesia sesuai UI; nama menu top-level mengikuti sidebar |
| Cakupan non-menu | Login & Profil, halaman publik, layout bersama — semua di [overview.md](overview.md) |
| Board Miro | Dibuat setelah MD direview |
| Halaman aplikasi | Sub menu Platform Developer › Peta Fitur, **dua tab** Mermaid & React Flow atas sumber yang sama (owner, 2026-10-17) |

## Merawat

- **Sumber kebenaran isi halaman** tetap `docs/product/pages/<menu>/…` (bagian *Diagram objek*). Saat fitur berubah: perbarui `pages/` dulu, lalu diagram terkait di sini.
- **Validasi sintaks**: `src/test/sitemap-mermaid.test.ts` memparse semua blok dengan parser subset halaman aplikasi (bentuk, class, edge, id lintas berkas) — sintaks di luar subset membuat `npm test` merah. Untuk melihat hasil render persis, render lokal dengan `mmdc` (`@mermaid-js/mermaid-cli`) per blok, atau tempel ke [mermaid.live](https://mermaid.live). Aturan sintaks yang sering gagal ada di [legend.md](legend.md) §Penamaan.
- **Id node** unik lintas berkas (awalan kode menu) agar beberapa diagram bisa digabung dalam satu board tanpa bentrok.
