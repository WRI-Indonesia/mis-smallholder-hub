# Catatan Keputusan (Decision Records)

> Bagian dari dokumentasi. Indeks: [../README.md](../README.md) · Terkait: [../project/changelog.md](../project/changelog.md) · [../standards/workflow.md](../standards/workflow.md)

Satu berkas per **keputusan besar** yang berlaku lintas modul: arsitektur, kebijakan data/akses, aturan proses. Changelog bulanan tetap mencatat *apa yang berubah dan kapan*; berkas di sini menjelaskan *mengapa* dan *apa konsekuensinya*, sehingga keputusan tidak tenggelam di ratusan baris log.

## Kapan menulis

- Keputusan owner yang **membatasi pilihan di masa depan** (mis. soft delete, hierarki data, alur rilis).
- Keputusan yang **membalik** keputusan sebelumnya — tulis berkas baru, tandai yang lama `Digantikan oleh NNNN`.
- Bukan untuk: detail implementasi satu issue, bug fix, atau pilihan UI kecil (cukup Decision Log bulanan).

## Format

Nama berkas `NNNN-slug.md` (nomor urut 4 digit, slug kebab-case). Isi:

```markdown
# NNNN · Judul keputusan

- **Status:** Berlaku | Digantikan oleh NNNN | Dicabut
- **Tanggal:** YYYY-MM-DD · **Issue:** #nnn · **Diputuskan:** owner

## Konteks
## Keputusan
## Alternatif yang ditolak
## Konsekuensi
## Rujukan
```

## Daftar

| No | Keputusan | Status | Tanggal |
|---|---|---|---|
| [0001](./0001-soft-delete-dan-pengecualian.md) | Soft delete di semua tabel, dengan pengecualian satelit 1:1 | Berlaku | 2026-09-14 |
| [0002](./0002-hierarki-tiga-level.md) | Hierarki data 3 level; `FarmerGroup` = Lembaga Petani | Berlaku | 2026-07-22 |
| [0003](./0003-alur-rilis-staging.md) | Alur rilis `mvp` → `staging` → `main` | Berlaku | 2026-08-28 |
| [0004](./0004-gate-lokal-bukan-ci.md) | Gate lint/build/typecheck/test dijalankan lokal, bukan CI | Berlaku | 2026-07-14 |
| [0005](./0005-produksi-acuan-menu-izin.md) | Produksi sebagai acuan menu & izin; akses DONOR | Berlaku | 2026-09-29 |
| [0006](./0006-kode-ul-parcel-ganda.md) | UL Parcel Code boleh dipakai lebih dari satu lahan | Berlaku | 2026-09-23 |
| [0007](./0007-struktur-docs.md) | Struktur `docs/`: slug route, changelog per bulan, dokumen turunan kode | Berlaku | 2026-09-29 |
