# 00 · Lingkup rilis v1.4.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Sumber: `git log v1.3.0..HEAD` (dari `chore(release): v1.3.0` di `mvp`), `/scope` 2026-10-07, `docs/project/changelog/2026-10.md`.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #402 | Kartu Training Benefit per year (Tabel · Grafis · vs Kontrak, Excel 2 sheet) | Dashboard › Pelatihan | — | — | `p-2` · `3-1` | `TC-402-01…03` |
| 2 | #403 | Target kontrak per paket + vs Kontrak | Master Data › Target Program · Dashboard › Pelatihan | `20261007125744_program_target` | `master-data-program-target` (+8 izin) | `t-9` · `p-2` | `TC-403-01…04` |
| 3 | #317 | Tumpang Tindih Lahan — tab Luar Boundary & Selisih Luas (Fase 2) | Data Analyst › Tumpang Tindih Lahan | — | — | `p-14` | `TC-317-01…02` |
| 4 | #400 | Tanggal teks DD/MM di upload Petani & Produksi | Bulk Upload › Petani · Produksi | — | — | `u-1` · `u-2` | `TC-400-01` |
| 5 | #205 (lanjutan) | Label angka bar Capaian Paket per Distrik | Dashboard › Pelatihan | — | — | — | (unit test) |
| 6 | — | Grup menu Platform Developer | Platform Developer › Metrik Rilis · Peta Data & Skema · Rencana Pengembangan | — | `platform-developer` (+1 izin) · 3 menu pindah induk | `3-4` · `p-8` · `p-10` · `p-15` | `TC-PD-01` |
| 7 | #379 · #381 | Prototipe Supply Chain (CSV, bukan DB) — semua peran (keputusan owner) | Dashboard › Rantai Pasok · Map › Peta Rantai Pasok | — | 2 menu (+32 izin) | `p-16` · `p-17` | `SM-35` |
| 8 | #354 · #366 | Perbaikan data prod (tanggal lahir · Detail Lahan Siak) — sudah diterapkan langsung ke prod | — (data) | — | — | — | (lembar data) |

## Di luar lingkup pengujian (sengaja)

- Digeser ke v1.5.0: #317 Fase 3 · #290 · #319 · #315 · #310; Supply Chain final (#380–#382) → v1.6.0.
- #366 sisa APKASDU (ditahan — butuh berkas ber-ID baru), #232/#390 (docs/keputusan).

## Akun uji (staging) — **tanpa password di sini**; password di berkas lokal tester

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | | semua | migrasi/izin, Target Program, Platform Developer |
| ADMIN | | semua | Target Program (isi), grup Platform Developer tanpa izin induk |
| OPERATOR ter-scope | | 1 Distrik | Training Benefit & vs Kontrak (catatan filter), Tumpang Tindih, upload |
| DONOR | | — | vs Kontrak terlihat, Target Program & Excel tidak |

## Persiapan data uji (`TC-PREP-*`)

### TC-PREP-01 · Isi target kontrak uji di staging [P0] (5 mnt)
Prasyarat: migrasi H1 applied, seed menu H5 ✓.
Langkah:
1. SUPERADMIN → Master Data › Target Program.
2. Isi angka **fiktif** (bukan angka kontrak sebenarnya) untuk 5 baris: Start s.d. 2025 + 2026–2028.
3. Simpan.
Harapan:
- Toast "N sel berubah"; data-qc H3 menampilkan 4 baris per indikator.
