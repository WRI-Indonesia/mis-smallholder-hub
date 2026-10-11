# 00 · Lingkup rilis v1.7.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Sumber: `git log <tag>..HEAD`, `gh issue list --state closed`, `docs/project/changelog/YYYY-MM.md`.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #409 | Distrik tujuan Lembaga wajib dalam scope | Master Data › Lembaga Petani | — | — | t-0 | `TC-409-01..02` |
| 2 | #386 | Anti-eskalasi Settings › Users & Role & Permission | Settings › User Management · Role & Permission | — | — | a-2, a-3 | `TC-386-01..02` |
| 3 | #384 | Filter Peta BMP menerima `map-bmp` | Map › Peta BMP · Peta Lahan | — | — | — | `TC-384-01` |
| 4 | #387 | Temuan kecil audit test | Master Data › Pelatihan · Lahan (riwayat revisi) | — | — | t-3 | `TC-387-01` |
| 5 | #416 | Ketersediaan Data › Produksi + induk menu | Data Analyst › Ketersediaan Data › Semua Lembaga · Per Lembaga · **Produksi** | — | `data-analyst-availability` · `data-analyst-availability-production` (+ 2 menu lama pindah induk) | p-18 (baru), p-6, a-1, l-6, 3-3, r-5 | `TC-416-01..03` |
| 6 | #417 | Semua Lembaga: tata letak ringkas & satu tempat | Data Analyst › Ketersediaan Data › Semua Lembaga (+ sub-nav di Per Lembaga & Produksi) | — | — | p-6, 3-3, r-5, a-1 | `TC-417-01..03` |
| 7 | #419 | Template file di semua fitur Upload Massal (+ tajuk template Produksi terpetakan otomatis) — ditambahkan owner 2026-10-11 di tengah QA staging | Bulk Upload › Petani · Produksi · Lahan (Poligon) · Pohon | — | — | u-1, u-2, u-3, u-4 | `TC-419-01..02`, SM-24 |
| 8 | #420 | Pemetaan kolom Upload Massal berkelompok + Dashboard Main 5 kartu tematik + form Lahan berseksi — ditambahkan owner 2026-10-11 | Bulk Upload (5 halaman pemetaan) · Dashboard › Main · Tools › Snapshot Detail · Master Data › Lahan (form) | — | — | u-1, u-2, u-3, u-5, u-6, p-1 | `TC-420-01..03`, SM-02, SM-24 |
| 9 | #412 | Batch 10 TD cepat (indeks induk ke anak pertama yang boleh, Excel auto-fit, angka form, a11y matriks, …) | Semua halaman induk menu (redirect) · ekspor Excel · form ber-angka | — | — | — | SM (navigasi induk & unduhan Excel), baseline test dev |
| 10 | #418 | Dropdown menu crash Base UI #31 (temuan #1 QA) | Report › Lahan (filter Jenis Surat) · Settings › Role & Permission (Preset) | — | — | — | SM-07, SM-26 (uji ulang) |
| 11 | temuan #2 (#305) | Glyph `≥`/`→` rusak di PDF Laporan Lahan | Report › Lahan (PDF) | — | — | — | TC-REV-06 (uji ulang) |
| 12 | #421 | Metrik Rilis: ringkasan dulu (Rilis terakhir + Rilis berjalan), strip kesehatan, grafik bertab; Payload peta dihapus | Platform Developer › Metrik Rilis | — | — | p-8 | `TC-421-01` |

## Di luar lingkup pengujian (sengaja)

- **Prod**: run P0 di prod dilakukan sesudah rilis (lembar run terpisah).
- **Simpan Edit Lahan** (TC-420-03 langkah Edit) — `updateLandParcel` menaikkan revisi; field & aksi tak berubah (#420 hanya tata letak).
- **Peran MANAGEMENT** (SM-33) — belum ada akun uji di staging.
- Generator PDF selain Laporan Lahan untuk glyph WinAnsi — dicatat TD-061.

## Akun uji (staging) — **tanpa password di sini**; password di berkas lokal tester

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | | semua | migrasi/izin, Settings, halaman admin |
| OPERATOR ter-scope | | 1 Distrik | **seluruh** kasus uji fungsional (bug scope hanya terlihat dari sini) |
| DONOR | | — | smoke read-only, menu yang tidak boleh tampil |

## Persiapan data uji (`TC-PREP-*`, dijalankan sebelum run pertama)

Tabel baru kosong pasca-migrasi; kasus uji membutuhkan data yang **dibuat lewat aplikasi** agar jalur tulisnya ikut teruji. Berkas masukan disimpan di `scripts/local/QA-QC/v1.7.0/evidence/input/`.

### TC-PREP-01 · … [P0] (5 mnt)
Prasyarat: …
Langkah:
1. …
Harapan:
- …
