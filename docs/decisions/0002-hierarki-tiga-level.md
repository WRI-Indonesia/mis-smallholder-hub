# 0002 · Hierarki data 3 level; `FarmerGroup` = Lembaga Petani

> Bagian dari dokumentasi **Keputusan**. Indeks: [README.md](./README.md)

- **Status:** Berlaku
- **Tanggal:** 2026-07-22 · **Issue:** #146, #147, #155, #189 · **Diputuskan:** owner / manajemen

## Konteks
Model awal menamai `FarmerGroup` "Kelompok Tani", padahal entitasnya adalah lembaga (koperasi/asosiasi) di atas kelompok tani. Sempat ada level Gapoktan/KUD di antaranya.

## Keputusan
- Hierarki final **Petani → Kelompok Tani → Lembaga Petani** (3 level). Level Gapoktan/KUD dihapus (#189, `DROP COLUMN sub_group_lv1`).
- `FarmerGroup` = **Lembaga Petani** (label UI "Lembaga Petani", #147 → #155); identifier kode tetap `FarmerGroup`.
- Kelompok Tani disimpan **per lahan** (`LandParcel.subGroupLv2`) sebagai interim, karena satu petani bisa punya lahan di KT berbeda.

## Alternatif yang ditolak
- 4 level dengan Gapoktan/KUD — tidak dipakai di lapangan.
- Rename `FarmerGroup` di kode — mahal, tanpa manfaat bagi pengguna.

## Konsekuensi
KT belum menjadi tabel (TD-014, Jalur B menunggu data KT lengkap). Laporan/dashboard menurunkan KT dari lahan aktif.

## Rujukan
[../project/tech-debt.md](../project/tech-debt.md) (TD-013, TD-014) · [../database/models.md](../database/models.md)
