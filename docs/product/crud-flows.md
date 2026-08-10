# Produk — CRUD & Bulk Upload Flows

> Bagian dari dokumentasi **Produk**. Indeks: [../README.md](../README.md) · Terkait: [architecture.md](./architecture.md) · [access-context.md](./access-context.md) · [role-flows.md](./role-flows.md) · [module-status.md](./module-status.md)

<details>
<summary><strong>Master Data CRUD Flow (Standard Pattern)</strong></summary>

## Farmer CRUD Example (Applies to All Master Data)

```
User Access Module
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ List Page                                                            │
│  - Search + Filter (KT, Status, District)                           │
│  - DataTable (Pagination, Sort, Column Visibility)                  │
│  - Actions: View | Edit | Delete (based on permissions)             │
│  - Button: + Tambah (if has CREATE permission)                      │
└──────────┬──────────────────────────────────────────────────────────┘
           │
           ├─ View → Detail Page (Read-only)
           │
           ├─ Edit → Modal Form
           │   │
           │   ├─ Zod Validation (client-side)
           │   ├─ Server Action (backend permission check)
           │   ├─ Execute Query (with RBAC filter)
           │   ├─ Add Audit Trail (modified_by, modified_at)
           │   └─ Success Toast + Refresh
           │
           ├─ Delete → Soft Delete Modal
           │   │
           │   ├─ Confirmation Dialog
           │   ├─ Update isActive = false
           │   ├─ Audit Trail
           │   └─ Refresh List
           │
           └─ Create → Modal Form
               │
               ├─ Zod Validation
               ├─ Server Action (hasPermission check)
               ├─ Insert with isActive = true
               ├─ Add Audit Trail (created_by, created_at)
               └─ Success Toast + Redirect/Refresh
```

### Key Patterns

- **Client-side validation**: Zod schemas in `src/validations/`
- **Backend permission validation**: `hasPermission(menuCode, permission)` in every action
- **RBAC filtering**: `AccessContext` discriminated union (ALL | BY_DISTRICT | BY_FARMER_GROUP)
- **Soft delete**: Update `isActive = false`, never hard delete. List menyembunyikan record nonaktif untuk semua role **kecuali SUPERADMIN** (pola `isSuperAdmin() ? {} : { isActive: true }` di `src/server/actions/farmer.ts`); SUPERADMIN juga mendapat filter **Status** + badge nonaktif + toggle **Aktifkan** (restore) di list master data (#127)
- **Audit trail**: Auto-set `created_by`, `modified_by`, `created_at`, `modified_at`
- **Role read-only** (MANAGEMENT/DONOR): melihat halaman list yang sama tanpa tombol aksi — Tambah/Edit/Hapus di-gate per permission CREATE/EDIT/DELETE

</details>

---

<details>
<summary><strong>Bulk Upload Flow (Farmer Pattern)</strong></summary>

## Bulk Upload Farmer (✅ Implemented)

```
User Access Bulk Upload
    │
    ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 1: Select Context                                            │
│  - Choose Farmer Group (Searchable Combobox)                     │
│  - File input disabled until KT selected                          │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 2: Upload Excel File                                         │
│  - Upload .xlsx file                                              │
│  - Parse columns automatically                                    │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 3: Dynamic Column Mapping                                    │
│  - Auto-match columns (fuzzy match by name)                       │
│  - Manual override via dropdown                                   │
│  - Show preview of mapped fields                                  │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 4: Smart Validation                                          │
│  - Normalize gender (L/P → M/F)                                   │
│  - Clean NIK format (16 digits only)                              │
│  - Parse dates (Excel serial / dd/mm/yyyy / yyyy-mm-dd)          │
│  - Validate joinedYear (1900-2100)                                │
│  - Check uniqueness (file-level + DB-level, per Lembaga)          │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 5: Preview & Filter (#197)                                   │
│  - Status per baris: Valid | Tidak Lengkap | Error                │
│    (Tidak Lengkap = lolos validasi, ≥1 field opsional kosong —    │
│     `farmerRowStatus`, src/lib/farmer-upload-status.ts)           │
│  - Filter: Semua | Valid | Tidak Lengkap | Error                  │
│  - Summary: X valid, Y tidak lengkap, Z errors                    │
│  - Action buttons:                                                │
│    • Download Semua (status VALID/TIDAK LENGKAP/ERROR)            │
│    • Download Data Tidak Lengkap ("Kosong: <field>")              │
│    • Download Data Error Saja                                     │
│    • Simpan Semua Layak (valid + tidak lengkap)                   │
│    • Simpan Hanya yang Valid (tampil bila ada baris tdk lengkap)  │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ├─ Download → Excel export (+ kolom Status & Keterangan)
            │
            └─ Simpan (salah satu tombol)
                │
                ├─ Langsung panggil `bulkCreateFarmers()` (tanpa dialog konfirmasi)
                ├─ Bulk Insert (Transaction-based)
                ├─ Success Toast (X records saved)
                └─ Redirect to Farmer List
```

### Validation Tiers

Semantik uniqueness ID Petani = **per Lembaga** (TD-024): constraint `@@unique([farmerGroupId, farmerId])` di `prisma/schema/farmer.prisma` (migrasi `20260721060000_farmer_id_unique_per_group`).

1. **File-level**: Check duplicates within uploaded file (dalam konteks Lembaga terpilih)
2. **DB-level**: `getExistingFarmerIds(farmerGroupId)` mengambil ID petani existing **lembaga itu saja** — sekaligus memverifikasi lembaga berada dalam scope data-access user
3. **Format validation**: Zod schemas + normalization logic

Penjaga tambahan:

- **Penjaga race** (fix `2a83b2d`): tombol Validasi disabled selama daftar ID existing dimuat (state `loadingExistingIds`), dan respons yang datang terlambat dari lembaga yang sudah tidak dipilih diabaikan (penjaga urutan permintaan `existingIdsRequest`) — mencegah validasi memakai daftar ID lembaga lain.
- **Penerjemahan error P2002**: bila insert tetap bentrok di constraint unik, `bulkCreateFarmers` (`src/server/actions/bulk-upload.ts`) menerjemahkan error Prisma `P2002` menjadi pesan Bahasa Indonesia yang bisa ditindaklanjuti ("Ada ID Petani yang sudah terdaftar di lembaga ini…"), bukan pesan internal Prisma.

</details>

---

<details>
<summary><strong>Bulk Upload Lain (ringkas)</strong></summary>

## Upload Produksi (Excel)

`src/server/actions/bulk-upload-production.ts` — pola sama dengan Upload Petani: pilih konteks → Excel + mapping kolom dinamis → validasi (periode/panen, duplikat periode+harvest) → preview + unduh error → simpan transaksional.

## Upload Lahan (Shapefile ZIP)

`src/server/actions/bulk-upload-parcel.ts` — ZIP Shapefile diparse langsung dari buffer (`shpjs`), mapping atribut `.dbf` (incl. Kelompok Tani & Blok #150), validasi geometri (`@turf/turf`) → preview → simpan. Mengikuti **revision tracking**: duplikat aktif ditolak; duplikat nonaktif diizinkan dengan `revision + 1`.

## Upload Pohon Sawit (Shapefile ZIP point, #238)

`src/server/actions/bulk-upload-tree.ts` + helper murni `src/lib/tree-upload.ts` — ZIP shapefile **point** diparse (`shpjs`), titik dikelompokkan per atribut `parcel_id` (satu ZIP boleh multi-lahan), dicocokkan ke lahan aktif dalam scope → preview per lahan (jumlah titik, kerapatan pohon/ha, status Baru/Revisi/Tidak ditemukan) → simpan transaksional. **Revisi per-set**: upload ulang menonaktifkan seluruh set pohon lama lahan tsb, set baru `revision + 1`; revisi lahan me-repoint semua pohon ke baris lahan baru (pola productionRecord).

</details>
