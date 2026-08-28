# Standar — Code Standards

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [principles.md](./principles.md) · [workflow.md](./workflow.md) · [rbac.md](./rbac.md) · [ui-ux.md](./ui-ux.md) · [architecture.md](./architecture.md)

## Code Standards

| Rule | Detail |
|------|--------|
| File naming | `kebab-case` |
| Variable naming | Bahasa Inggris — **kecuali istilah domain resmi** (lihat di bawah) |
| Import | Langsung dari sub-module, bukan barrel index. **Pengecualian resmi:** barrel `@/components/shared` (entry point DataTable/TableActions/TableSkeleton/DeleteDialog) |
| Default | Server Component, `"use client"` hanya jika perlu |
| Data layer | CSV = static, Prisma = dynamic |
| Validation | Zod di `src/validations/` |
| Server Actions | Di `src/server/actions/` |
| Formatter angka id-ID | **Wajib impor dari `src/lib/format.ts`** (`formatNumber`, `formatPct`, `formatArea` desimal-2, `MONTH_NAMES_ID`) — **dilarang** membuat instance `Intl.NumberFormat("id-ID")` / array nama bulan lokal baru (#233/#241). Varian sufiks (" ha") / null-handling boleh wrapper lokal tipis yang mendelegasi ke formatter bersama |
| Database Schema | Lihat [database-schema.md](../database/erd.md) untuk ERD, indexes, constraints, migrations, security |

#### Istilah domain resmi (pengecualian naming — keputusan #130 / TD-012)

Identifier **wajib Bahasa Inggris**, dengan **pengecualian resmi** untuk kosakata domain berikut yang boleh dipakai apa adanya pada nama variabel/fungsi/field/tipe (bukan asal Bahasa Indonesia):

| Istilah domain | Makna | Contoh identifier yang sah |
|----------------|-------|-----------------------------|
| `petani` | farmer | `computePetaniDomain`, `totalPetani`, `totalPetaniLaki/Perempuan` |
| `lahan` | land parcel | `computeLahanDomain`, `totalLuasLahan`, `avgLuasLahan` |
| `pelatihan` | training | `computePelatihanDomain` |
| `produksi` | production | `computeProduksiDomain` |
| `lembaga petani` (entitas `FarmerGroup`) | farmer institution — level teratas hierarki | `FarmerGroup`, `farmerGroupId`, `kelompokTani`* |
| `kelompok tani` (sub-level) | sub-kelompok — interim di `LandParcel` | `subGroupLv2` (Kelompok Tani) |
| `persil` | parcel (unit lahan) | `totalPersil`, `totalPersilLahan` |
| `paket` | training package | `pctPaket1`, prefix enum `PAKET_1_*` |

Alasan: istilah ini adalah **kosakata domain proyek** (WRI Indonesia — data sawit rakyat) yang lebih jelas & konsisten dengan UI copy Bahasa Indonesia daripada terjemahan Inggris paksa. Rename massal ditolak karena melanggar prinsip **Surgical Changes** dan berisiko regresi lintas modul (dashboard/map/report). Nilai **enum DB** (`PAKET_1_*`, dll.) adalah **data**, bukan identifier — di luar aturan ini. Selain istilah di tabel, tetap gunakan Bahasa Inggris.

> ⚠️ **Catatan hierarki (`*`):** hierarki domain (final #189) = **Petani → Kelompok Tani → Lembaga Petani** (3 level; Gapoktan/KUD dihapus). Identifier `FarmerGroup`/`kelompokTani` secara **semantik = Lembaga Petani** (level teratas); label UI lama "Kelompok Tani" adalah **mislabel** yang di-relabel ke "Lembaga Petani" (TD-013 / #147), sedangkan **identifier tetap** (rename massal ditolak). Sub-level **Kelompok Tani** disimpan interim sebagai field denormalisasi di `LandParcel.subGroupLv2` (#146, **per-lahan**; `subGroupLv1`/Gapoktan di-drop #189); pemodelan tabel penuh = TD-014.

### Penamaan tabel & model (Prisma)

Nama tabel fisik selalu lewat `@@map`, `snake_case`, dengan **prefix menurut jenis data**. Nama model Prisma `PascalCase` tanpa prefix. Kolom `snake_case` via `@map`.

| Prefix | Jenis data | Contoh |
|--------|-----------|--------|
| `tbl_` | Entitas domain / transaksional | `tbl_farmer`, `tbl_land_parcel`, `tbl_tree` |
| `tbl_snapshot_<dashboard>` | Materialisasi dashboard (lihat [ui-ux.md](./ui-ux.md)) | `tbl_snapshot_main_dashboard` |
| `ref_` | Master/referensi yang dikelola admin lewat UI | `ref_training_package` |
| `reg_` | Wilayah administratif | `reg_province` … `reg_village` |
| `rbac_` | Akses & hak user | `rbac_user_district`, `rbac_role_permission` |

**Tabel satelit** (atribut yang punya siklus hidup sendiri, bisa >1 per induk, atau keikutsertaan program — bukan sifat intrinsik induk) dinamai **`tbl_<induk>_<aspek>`** dengan nama induk **lengkap** persis seperti tabel intinya, model `<Induk><Aspek>`. Preseden: `tbl_farmer_group_boundary`, `tbl_training_participant`. Contoh rencana untuk lahan (Decision Log 2026-08-27): `tbl_land_parcel_document` (SHM/SKT/SKGR dkk., 1:N), `tbl_land_parcel_external_id` (UL Parcel Code + poligon mentah opsional, 1:N), `tbl_land_parcel_program` (demplot/PBU).

- **Tabel penghubung M:N**: gabungan dua nama induk tanpa aspek (`rbac_user_farmer_group` = User × FarmerGroup). Bila dokumen/entitas satelit menutup >1 induk, entitasnya berdiri sendiri dan penghubungnya gabungan nama — contoh: STDB adalah dokumen per petani yang menutup beberapa lahan → `tbl_land_stdb` + penghubung `tbl_land_parcel_stdb`.
- **Daftar pilihan tetap** (jenis sertifikat, jenis program) → Prisma `enum`; naik ke `ref_` hanya bila admin memang perlu mengelola daftarnya (konsekuensi: CRUD + menu + permission).
- ⚠️ **Jangan pakai `parcel_` sebagai nama induk** (`tbl_parcel_*`). Di kode `parcelId` = ID internal lahan per petani (string bebas), sedangkan `landParcelId` = FK ke `tbl_land_parcel.id` — ambiguitas ini sudah tercatat di `tree.prisma`; jangan ditambah.

### Data Access & Soft Delete

- **Soft delete** — Semua tabel punya `isActive Boolean @default(true)`. Tidak pernah hard delete dari app.
- **Data filtering** — Setiap query di server actions wajib filter berdasarkan context user:
  - Region sesuai assignment user (Province → District → Lembaga Petani)
  - Lembaga Petani sesuai assignment user
  - Role & Permission menentukan level akses (view/edit/delete)
- **Pattern** — Gunakan helper function untuk inject where clause RBAC, jangan copy-paste manual di setiap action.
- **Backend Permission Validation** — Setiap Server Action (terutama mutasi data) wajib divalidasi ulang di level server menggunakan helper `hasPermission(menuCode, permission)` sebelum melakukan query/mutasi database, untuk mencegah eksekusi request langsung yang tidak sah (bypass UI). **Termasuk** read/mutasi **by-id** dan helper "for select" (pelajaran audit #125/#127).
- **Helper "for select" juga wajib access-scoped** — guard permission saja tidak cukup: daftar opsi dropdown harus difilter `getAccessContext()`/`getAccessibleDistrictIds` agar user scoped tidak melihat entitas di luar wilayah kerjanya, **termasuk saat helper yang sama dipakai form create/edit** (pelajaran #211 — `getDistrictsForSelect` lolos guard tapi bocor scope; efeknya ke form Lembaga Petani dipertahankan by design, lihat Decision Log 2026-08-04).

#### Access-filter helpers (`src/lib/access-context.ts`)

Terjemahkan `AccessContext` (dari `getAccessContext()`) ke Prisma `where` fragment lewat helper — **jangan tulis ulang ternary di tiap action** (#127):

| Helper | Untuk query pada model | Hasil BY_FARMER_GROUP | Hasil BY_DISTRICT |
|--------|------------------------|-----------------------|-------------------|
| `farmerGroupAccessFilter` | `FarmerGroup` (punya `id`/`districtId`) | `{ id: { in } }` | `{ districtId: { in } }` |
| `farmerAccessFilter` | `Farmer`, `TrainingActivity` (punya `farmerGroupId`) | `{ farmerGroupId: { in } }` | `{ farmerGroup: { districtId: { in } } }` |
| `farmerRelationAccessFilter` | `LandParcel`, `ProductionRecord` (punya relasi `farmer`) | `{ farmer: { farmerGroupId: { in } } }` | `{ farmer: { farmerGroup: { districtId: { in } } } }` |

Mode `ALL` → `{}` (tanpa batasan).

> ⚠️ **Pitfall key-collision** — `farmerGroupAccessFilter` mengembalikan `{ id: { in } }`. Saat digabung dengan literal `id` (mis. cek by-id `getFarmerGroupById`, atau validasi KT target `createFarmer`), **jangan** spread (`{ id, ...filter }`) karena `id` tertimpa dan scope bocor. Gunakan `AND`: `{ id, AND: farmerGroupAccessFilter(access) }`.

#### Soft-delete: pola tampil & restore record nonaktif (keputusan #127)

Pola tunggal untuk **semua list master data** (Petani, Lembaga Petani, Pelatihan, Lahan, Produksi). **Akses record nonaktif dibatasi ke SUPERADMIN** (helper `isSuperAdmin()` di `rbac.ts`); user lain hanya boleh mengakses record aktif:

- **Server action list & read by-id** — untuk **SUPERADMIN** mengembalikan record aktif & nonaktif dalam scope; untuk **user lain** dipaksa `isActive: true`. Pola: `...((await isSuperAdmin()) ? {} : { isActive: true })`.
- **Client list** — kolom **badge Status** + **filter Status** (`Semua`/`Aktif`/`Nonaktif`, default **`Aktif`**) **hanya dirender untuk SUPERADMIN** (prop `isSuperAdmin` dari page). User lain: kolom & filter di-hide, data sudah aktif-only dari server.
- **Aksi baris** memakai `toggleXActive` (bukan delete-only) sehingga baris nonaktif menampilkan tombol **"Aktifkan kembali"** (`<TableActions>` otomatis via prop `isActive`). Restore = toggle `isActive` (tetap soft-delete, tidak pernah hard delete).
- **Mutasi** (update) tetap mensyaratkan `isActive: true` — restore dulu sebelum edit.
- Query lain di luar list (dropdown "for select", dashboard, report) **tetap** memfilter `isActive: true` untuk semua role.

### Revision Tracking Pattern

Untuk data yang memerlukan tracking perubahan historical (contoh: Land Parcel update):
- **Field `revision`**: Tambahkan field `revision Int @default(0)` di model (lihat `LandParcel`)
- **Auto-increment on update**: Setiap update record, increment revision number
- **Soft delete old version**: Saat update dengan parcel ID sama, set old record `isActive = false` dan create new record dengan `revision += 1`
- **History tracking**: User bisa melihat historical changes melalui filter `isActive = false` dengan order by revision
- **Duplicate detection**: 
  - Check uniqueness constraint (misalnya: `parcelId` per `farmerId`)
  - Jika duplicate found dengan `isActive = true` → reject
  - Jika duplicate found dengan `isActive = false` → allow update (increment revision)
- **Bulk upload handling**: 
  - Detect duplicate parcel dalam file dan database
  - Auto-increment revision untuk update existing parcel
  - Preserve audit trail dengan `modified_by` dan `modified_at`
- **Implementasi Reference**: Lihat `LandParcel` model dan `bulk-upload-parcel.ts` (issue #88)
