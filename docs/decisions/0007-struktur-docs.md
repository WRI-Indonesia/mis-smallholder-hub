# 0007 · Struktur `docs/`: slug route, changelog per bulan, dokumen turunan kode

> Bagian dari dokumentasi **Keputusan**. Indeks: [README.md](./README.md)

- **Status:** Berlaku
- **Tanggal:** 2026-09-29 · **Diputuskan:** owner (audit docs menyeluruh)

## Konteks
Audit docs 2026-09-29 menemukan fakta yang sama disalin di banyak berkas dan sudah saling melenceng (5 angka jumlah test berbeda, riwayat migrasi tulis tangan di 3 tempat), berkas raksasa (changelog 527 KB), dan nama berkas katalog yang mengikuti judul menu yang bisa berganti.

## Keputusan
1. Katalog `product/pages/` dinamai menurut **segmen route** (`master-data/parcels/list.md`), bukan judul menu.
2. Changelog dipecah **per bulan** (`project/changelog/YYYY-MM.md`); keputusan besar ditulis di `decisions/`.
3. Cerminan yang tak perlu dihapus (`product/module-status.md`); satu fakta satu tempat.
4. Dokumen yang bisa diturunkan dari kode (tabel menu, referensi skema, riwayat migrasi, angka ringkasan) **di-generate** oleh skrip + test kesegaran.
5. Nama berkas berbahasa Inggris, **heading berbahasa Indonesia**; kunci yang diparse build (`Phase Status (Indeks)`, `Sprint Focus`, `Debt Register`, …) tidak diubah.
6. Emoji status: 🟠 sebagian · 🟡 sedang dikerjakan (legenda di `docs/README.md`).
7. QA: tiga rilis terakhir di `qa/`, sisanya `qa/archive/`.
8. Tautan docs di aplikasi menunjuk `main` (versi produksi).

## Konsekuensi
`sprint.md`, `roadmap.md`, `metrics.md`, `tech-debt.md` tetap di tempatnya (diimpor build). Setiap perubahan struktur harus di-commit bersama kode/test yang merujuknya.

## Rujukan
[../README.md](../README.md) · [../project/contributing.md](../project/contributing.md)
