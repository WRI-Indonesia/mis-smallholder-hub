# 0006 · UL Parcel Code boleh dipakai lebih dari satu lahan

- **Status:** Berlaku
- **Tanggal:** 2026-09-23 · **Issue:** #373 · **Diputuskan:** owner

## Konteks
Kode vendor (UL Parcel Code) dari import Detail Lahan ternyata diklaim ganda oleh lebih dari satu lahan. UNIQUE `(source, code)` menolak baris-baris itu sehingga 142 lahan tertinggal tanpa kode.

## Keputusan
Simpan dulu, cek silang belakangan: UNIQUE diganti `(parcelUid, source, code)` — yang dijaga hanya duplikat di lahan yang sama. Tab Legalitas menandai "Juga dipakai …" untuk kode yang dipakai lahan lain.

## Alternatif yang ditolak
- Menolak kode ganda saat import — data vendor hilang tanpa jejak.

## Konsekuensi
Ada 82 kode ganda di produksi yang perlu dicek silang (daftar kerja data, bukan bug). Migrasi `20260923120000_external_id_shared_code`.

## Rujukan
[../database/constraints.md](../database/constraints.md) · [../database/migrations.md](../database/migrations.md)
