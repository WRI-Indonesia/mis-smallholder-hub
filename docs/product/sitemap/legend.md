# Peta Fitur — Legenda & Konvensi

> Bagian dari dokumentasi **Produk** · Peta fitur untuk Miro. Indeks: [README.md](README.md) · Terkait: [overview.md](overview.md) · [../pages/README.md](../pages/README.md)

> **Ringkasan:** Konvensi bentuk, warna, dan penamaan node yang dipakai semua berkas `sitemap/*.md`. Baca sekali sebelum memindahkan diagram ke Miro agar box yang sama selalu berbentuk sama.

## Hierarki

Setiap menu dipetakan dalam lima tingkat, mengikuti pola site map lama (**PAGE → Section → Content**):

| Tingkat | Arti | Contoh |
|---|---|---|
| **Menu** | Entri top-level di sidebar (10 buah). Halaman induknya hanya mengalihkan ke sub menu pertama yang boleh diakses. | Tools |
| **Sub menu** | Entri level 2 (dan level 3) di sidebar; satu baris di `menu.csv`. | Dashboard Snapshot |
| **Page** | Halaman nyata dengan route sendiri: daftar, detail, formulir baru/ubah. | Daftar Snapshot · Detail Snapshot |
| **Section** | Blok besar di dalam halaman: header, kartu, filter, tabel, tab, panel peta, dialog. | Tabel: Daftar snapshot |
| **Content** | Isi blok: kolom tabel, field formulir, tombol/aksi, KPI, ekspor, pesan. Ditulis **satu box berisi beberapa baris**, bukan satu box per kolom. | Kolom: Aksi · Tanggal · Distrik |

## Bentuk node (Mermaid → Miro)

| Tingkat / jenis | Bentuk Mermaid | Tampilan di Miro | Class |
|---|---|---|---|
| Menu | `(["Nama"])` stadium | Pil, warna gelap | `menu` |
| Sub menu | `[["Nama"]]` subroutine | Kotak bergaris ganda (seperti kolom PAGE di site map lama) | `sub` |
| Page | `["Nama"]` persegi | Kotak biasa, tebal | `page` |
| Section | `("Nama")` sudut bulat | Kotak sudut bulat | `section` |
| Content | `["baris 1<br/>baris 2"]` persegi multi-baris | Kotak teks beberapa baris | `content` |
| Dialog / modal / sheet | `{{"Dialog: Nama"}}` heksagon | Heksagon | `dialog` |
| Keputusan / percabangan | `{"Pertanyaan?"}` belah ketupat | Belah ketupat | `decision` |
| Sumber data / berkas | `[("Nama")]` silinder | Silinder | `data` |
| Layanan luar (S3, GitHub, FIRMS, ArcGIS) | `[/"Nama"/]` jajar genjang | Jajar genjang | `external` |
| Belum tersedia (🔲 planned) | bentuk sesuai tingkatnya | Abu-abu, garis putus-putus | `planned` |
| Prototipe (🟠 partial) | bentuk sesuai tingkatnya | Garis putus-putus, warna tetap | `proto` |

## Garis

| Garis | Arti |
|---|---|
| `-->` | Hierarki: berisi / membuka (Menu → Sub menu → Page → Section → Content) |
| `-.->` | Navigasi antar halaman (tombol Lihat → Detail, tautan ke menu lain, redirect) |
| `==>` | Alur data berat: unggah berkas, generate snapshot, ekspor/unduh |
| Label pada garis | Pemicu: nama tombol atau kondisi (`-.->|Lihat| ...`) |

## Palet warna (classDef)

Satu blok `classDef` yang sama dipakai di semua diagram. Saat memindah ke Miro, cocokkan warna box dengan tabel ini.

| Class | Fill | Stroke | Teks | Catatan |
|---|---|---|---|---|
| `menu` | `#166534` | `#14532d` | putih | Hijau brand (sama dengan panel login) |
| `sub` | `#dcfce7` | `#166534` | `#14532d` | Hijau muda |
| `page` | `#dbeafe` | `#1d4ed8` | `#1e3a8a` | Biru |
| `section` | `#fef9c3` | `#ca8a04` | `#713f12` | Kuning |
| `content` | `#f8fafc` | `#94a3b8` | `#0f172a` | Putih keabu, teks rata kiri |
| `dialog` | `#fce7f3` | `#be185d` | `#831843` | Merah muda |
| `decision` | `#ffedd5` | `#ea580c` | `#7c2d12` | Oranye |
| `data` | `#ede9fe` | `#6d28d9` | `#4c1d95` | Ungu |
| `external` | `#e0f2fe` | `#0369a1` | `#0c4a6e` | Biru langit |
| `planned` | `#f1f5f9` | `#94a3b8` | `#64748b` | + `stroke-dasharray: 5 5` |
| `proto` | fill tingkatnya | stroke tingkatnya | — | + `stroke-dasharray: 5 5` |

Blok yang disalin ke setiap diagram:

```text
classDef menu fill:#166534,stroke:#14532d,color:#ffffff,font-weight:bold
classDef sub fill:#dcfce7,stroke:#166534,color:#14532d
classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
classDef decision fill:#ffedd5,stroke:#ea580c,color:#7c2d12
classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
classDef planned fill:#f1f5f9,stroke:#94a3b8,color:#64748b,stroke-dasharray:5 5
classDef proto stroke-dasharray:5 5
```

## Penamaan

- **Label box** = teks persis seperti di layar aplikasi (Bahasa Indonesia sesuai UI). Nama menu top-level mengikuti sidebar (`Dashboard`, `Report`, `Map`, …) walau berbahasa Inggris.
- **Route** tidak ditulis di dalam box; route ada di tabel halaman di bawah tiap diagram. Segmen dinamis ditulis `{id}`.
- **Awalan Content** menandai jenis isi: `Kolom:` kolom tabel · `Field:` input formulir · `Aksi:` tombol/aksi baris · `Tombol:` tombol halaman · `KPI:` kartu angka · `Filter:` kontrol saring · `Ekspor:` unduhan (Excel/PDF/GeoJSON) · `Tab:` tab · `Pesan:` toast/galat/empty state · `Layer:` lapisan peta.
- **Pemisah** antar butir dalam satu box: ` · ` (titik tengah). Baris baru: `<br/>`.
- **Id node** = `kode-menu_halaman_bagian_isi`, huruf kecil, pemisah `_`; kode menu: `db` Dashboard · `rp` Report · `mp` Map · `md` Master Data · `da` Data Analyst · `pd` Platform Developer · `tl` Tools · `hp` Bantuan · `bu` Bulk Upload · `st` Settings · `ov` ikhtisar. Id unik lintas berkas, sehingga semua diagram bisa digabung di satu board tanpa bentrok.
- **Label garis** (`-->|teks|`) hanya teks polos: tanpa tanda kurung `( )`, `|`, atau tanda kutip — Mermaid gagal parse (tanda kurung aman hanya di dalam label node). Pisahkan keterangan dengan ` — ` atau ` · `.
- **Status** halaman memakai legenda roadmap: ✅ tersedia · 🟠 prototipe/parsial · 🔲 direncanakan. Hanya 🟠 dan 🔲 yang ditulis di label (akhiran ` 🟠` / ` 🔲`).

## Aturan isi

- Satu diagram **Pohon navigasi** per menu (Menu → Sub menu → Page), lalu **satu diagram per halaman** (Page → Section → Content). Satu diagram = satu frame Miro.
- Content dirangkum, bukan disalin utuh: kolom tabel maksimal ±8 butir per baris; kolom ekspor-saja cukup disebut `Ekspor: +n kolom tambahan`.
- Yang **tidak** dipetakan: guard izin per role, nama komponen/aksi server, format angka, pesan validasi per field. Semua itu ada di `../pages/`.
- Sumber kebenaran isi halaman tetap `docs/product/pages/<menu>/…` (bagian *Diagram objek*). Bila berbeda, perbaiki `pages/` dulu, lalu sitemap.

## Memindahkan ke Miro

1. Di Miro buka **Apps → Diagramming (Mermaid)** atau tempel blok Mermaid lewat **Create → Diagram as code**.
2. Tempel satu diagram per frame; beri nama frame sesuai judul bagian (`Tools / Daftar Snapshot`).
3. Setelah terbentuk, atur tata letak kiri → kanan: kolom PAGE · Section · Content seperti site map lama; warna box sesuai tabel palet bila importer mengabaikan `classDef`.
4. Garis navigasi antar halaman (`-.->`) biasanya perlu dihubungkan ulang bila halamannya ada di frame lain.
