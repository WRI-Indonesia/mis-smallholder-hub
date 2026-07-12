# Standar — Code Standards

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [principles.md](./principles.md) · [workflow.md](./workflow.md) · [rbac.md](./rbac.md) · [ui-ux.md](./ui-ux.md) · [architecture.md](./architecture.md)

## Code Standards

| Rule | Detail |
|------|--------|
| File naming | `kebab-case` |
| Variable naming | Bahasa Inggris |
| Import | Langsung dari sub-module, bukan barrel index. **Pengecualian resmi:** barrel `@/components/shared` (entry point DataTable/TableActions/TableSkeleton/DeleteDialog) |
| Default | Server Component, `"use client"` hanya jika perlu |
| Data layer | CSV = static, Prisma = dynamic |
| Validation | Zod di `src/validations/` |
| Server Actions | Di `src/server/actions/` |
| Database Schema | Lihat [database-schema.md](../database/erd.md) untuk ERD, indexes, constraints, migrations, security |

### Data Access & Soft Delete

- **Soft delete** — Semua tabel punya `isActive Boolean @default(true)`. Tidak pernah hard delete dari app.
- **Data filtering** — Setiap query di server actions wajib filter berdasarkan context user:
  - Region sesuai assignment user (Province → District → KT)
  - Kelompok Tani sesuai assignment user
  - Role & Permission menentukan level akses (view/edit/delete)
- **Pattern** — Gunakan helper function untuk inject where clause RBAC, jangan copy-paste manual di setiap action.
- **Backend Permission Validation** — Setiap Server Action (terutama mutasi data) wajib divalidasi ulang di level server menggunakan helper `hasPermission(menuCode, permission)` sebelum melakukan query/mutasi database, untuk mencegah eksekusi request langsung yang tidak sah (bypass UI). **Termasuk** read/mutasi **by-id** dan helper "for select" (pelajaran audit #125/#127).

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

Pola tunggal untuk **semua list master data** (Petani, Kelompok Tani, Pelatihan, Lahan, Produksi). **Akses record nonaktif dibatasi ke SUPERADMIN** (helper `isSuperAdmin()` di `rbac.ts`); user lain hanya boleh mengakses record aktif:

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
