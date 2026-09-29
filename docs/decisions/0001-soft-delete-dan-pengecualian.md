# 0001 · Soft delete di semua tabel, dengan pengecualian satelit 1:1

> Bagian dari dokumentasi **Keputusan**. Indeks: [README.md](./README.md)

- **Status:** Berlaku
- **Tanggal:** 2026-09-14 (pengecualian; aturan dasar sejak awal proyek) · **Issue:** #306, #326, #328, #331 · **Diputuskan:** owner

## Konteks
Data petani dan lahan adalah jejak audit program: menghapus permanen memutus riwayat pelatihan, produksi, dan revisi lahan. Namun satelit 1:1 yang dikunci `parcel_uid` UNIQUE (sepadan, status NKT) tidak bisa diisi ulang bila baris lamanya hanya dinonaktifkan — slot unik tetap terpakai (pelajaran #306).

## Keputusan
- Semua tabel punya `isActive`; "hapus" di aplikasi = `isActive = false`, semua baca memfilter `isActive: true`.
- Pengecualian: `LandParcelNkt` dihapus barisnya; `LandParcelBorder` dikosongkan kolomnya; `LandMarkerCounter` adalah penghitung murni tanpa `isActive`/audit; tabel penugasan `UserProvince`/`UserDistrict`/`UserFarmerGroup` tanpa `isActive`.
- Unik "hanya baris aktif" ditegakkan dengan partial unique index tulis tangan (`WHERE is_active`) — Prisma akan mengusulkan DROP-nya, jangan diterima.

## Alternatif yang ditolak
- Hard delete umum — kehilangan audit trail.
- Soft delete juga untuk satelit 1:1 — memblokir pengisian ulang.

## Konsekuensi
Setiap query wajib memfilter `isActive`. UNIQUE biasa tidak mengenal soft delete, jadi baris nonaktif memegang slotnya (disengaja untuk `Farmer (farmerGroupId, farmerId)`).

## Rujukan
[../database/constraints.md](../database/constraints.md#pola-soft-delete) · [../standards/code-standards.md](../standards/code-standards.md) · [../database/models.md](../database/models.md)
