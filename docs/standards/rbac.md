# Standar — RBAC & Menu Access

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [principles.md](./principles.md) · [workflow.md](./workflow.md) · [code-standards.md](./code-standards.md) · [ui-ux.md](./ui-ux.md) · [architecture.md](./architecture.md)

### Inventaris Role

Aplikasi memiliki **5 role** (enum `Role` di `prisma/schema/_config.prisma`):

| Role | Deskripsi |
|------|-----------|
| **SUPERADMIN** | Akses penuh seluruh menu dan data (bypass RBAC). |
| **ADMIN** | Kelola data dalam cakupan wilayah yang ditugaskan. |
| **OPERATOR** | Petugas lapangan: input & ubah data lembaga/KT yang ditugaskan. |
| **MANAGEMENT** | Read-only: dashboard, laporan, dan analisa. |
| **DONOR** | Read-only untuk donor/funder: dashboard, laporan, peta, dan bantuan. |

**Sentralisasi:** daftar role di sisi aplikasi hanya hidup di `src/lib/roles.ts` (`ROLES`, `ROLE_BADGE_CLASS`, `ROLE_DESCRIPTION`) — dipakai validasi (`user.schema.ts`), form & daftar pengguna, dan matriks Role & Permission. Menambah role baru cukup: edit `src/lib/roles.ts` + tambah nilai di enum `Role` Prisma (migrasi) + seed permission-nya. Jangan hardcode daftar role di tempat lain.

### Inventaris Permission

Enum `PermissionLevel` (`prisma/schema/_config.prisma`) punya **6 aksi**, dua grup (#245):

| Grup | Aksi | Menggate |
|------|------|----------|
| Data | `CREATE` | Tombol/aksi tambah data |
| Data | `VIEW` | Menu tampil di sidebar + akses halaman/read |
| Data | `EDIT` | Tombol/aksi ubah data |
| Data | `DELETE` | Tombol/aksi nonaktifkan (soft delete) |
| Keluaran | `EXPORT` | Tombol unduh **Excel/SHP/data mentah** (termasuk tombol Excel bawaan `DataTable` via prop `canExport`) |
| Keluaran | `PRINT` | Tombol cetak/unduh **PDF** (laporan, farm passport, cetak peta) |

**Sentralisasi:** daftar + label + huruf singkat permission hanya hidup di `src/lib/permission-levels.ts` (`PERMISSION_LEVELS`, `ALL_PERMISSIONS`) — dipakai bypass SUPERADMIN (`rbac.ts`), matriks Role & Permission, dan modal Hak Akses Menu. Jangan hardcode daftar permission di tempat lain (pola sama dengan `src/lib/roles.ts`).

**Cakupan baris permission keluaran:** baris `EXPORT`/`PRINT` di-seed/backfill **hanya pada menu daun** — cascade bersifat union (induk → anak, tanpa pengurangan), sehingga baris di menu induk membuat revoke per sub-menu tidak efektif (migrasi koreksi `20260812130000`). Grant manual di induk tetap boleh bila memang ingin berlaku satu seksi penuh.

Konvensi gating keluaran (#245):
- Page server component menghitung `permissions.includes("EXPORT"/"PRINT")` (atau `hasPermission`) → kirim boolean `canExport`/`canPrint` ke client; tombol tidak dirender bila false.
- Export yang dibangun **client-side dari data yang sudah tampil** cukup digate di UI (datanya memang sudah di tangan user). Server action yang menyuplai data **khusus** export/print (mis. farm passport) wajib guard `hasPermission(menuKey, "PRINT"/"EXPORT")` juga.
- SUPERADMIN bypass mengembalikan keenam aksi (`src/lib/rbac.ts`).

> [!NOTE]
> **Istilah (hierarki final #189):** Petani → Kelompok Tani → Lembaga Petani. Model `FarmerGroup` = **Lembaga Petani**; "KT" (Kelompok Tani) kini merujuk level per-lahan (`subGroupLv2`), bukan `FarmerGroup`.

### RBAC Data Access Hierarchy

```
SUPERADMIN        → skip semua filter (akses ALL)
No assignment     → unrestricted (akses ALL)
UserFarmerGroup   → hanya Lembaga Petani spesifik (filter by FarmerGroup.id)
UserDistrict      → semua Lembaga Petani di district (filter by districtId)
UserProvince      → semua district di province → semua Lembaga Petani (filter by districtId)
```

Konvensi (urutan prioritas):
1. SUPERADMIN → `ALL`
2. Tidak ada assignment sama sekali → `ALL` (unrestricted)
3. **Hanya** `UserFarmerGroup` ada (tanpa Province/District) → filter `id IN [farmerGroupIds]`
4. `UserProvince` dan/atau `UserDistrict` ada → resolve ke district IDs → filter `districtId IN [...]`

> [!IMPORTANT]
> Jika user memiliki assignment campuran (Province + FarmerGroup), mode **BY_DISTRICT** yang berlaku — bukan BY_FARMER_GROUP. Rule #3 hanya aktif jika Province dan District **sama-sama kosong**.

**Implementation Pattern** — Gunakan discriminated union `AccessContext` di server action:

```ts
type AccessContext =
  | { mode: "ALL" }
  | { mode: "BY_FARMER_GROUP"; ids: string[] }
  | { mode: "BY_DISTRICT"; ids: string[] };

// Resolusi where clause:
const accessFilter =
  access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } :
  access.mode === "BY_DISTRICT"     ? { districtId: { in: access.ids } } :
  {};
```

> [!WARNING]
> **Bug pattern lama** — Jangan filter hanya berdasarkan `districtId` tanpa handle case `BY_FARMER_GROUP`. Jika user hanya assign Lembaga Petani dan code menghasilkan `districtId: { in: [] }`, semua data Lembaga Petani akan hilang dari query.

### User Data Access Assignment UI

Untuk assign data access per user (Province/District/Lembaga Petani):
- **Server Actions** — di `src/server/actions/user-data-access.ts`: `getUserDataAccess`, `getRegionsForSelect`, `assignUserProvince/District/FarmerGroup`, `removeUserProvince/District/FarmerGroup`
- **Modal** — `UserDataAccessModal` (Tabs: Provinsi | Distrik | Lembaga Petani) dengan live-save checkbox per item
- **Table Summary** — Gunakan komponen `AccessSummaryCell` di kolom "Akses Data": badge per assignment, `—` jika kosong
- **Real-time refresh** — Pass `onDataChange` callback ke modal → panggil `startTransition(() => router.refresh())` setiap toggle berhasil

### User Menu Access Override UI

Untuk melakukan override permission menu per user (grant/revoke):
- **Server Actions** — di `src/server/actions/user-menu-access.ts`: `getUserMenuOverrides`, `getMenuItemsForSelect`, `getUserEffectivePermissions`, `setUserMenuOverride`, `removeUserMenuOverride`
- **Modal** — `UserMenuAccessModal` dengan matrix C | V | E | D | X (Export) | P (Print) per menu (`PERMISSION_COLUMNS`), visual code status (`role` | `granted` | `revoked`), dan interactive toggle saving.
- **Keamanan** — Pengecekan di server action wajib menolak override terhadap user berkole `SUPERADMIN`.
- **Soft Delete** — Penghapusan override menggunakan update `isActive: false` (bukan physical delete).
- **Optimasi Caching** — Fungsi pembacaan permission di `src/lib/rbac.ts` wajib dibungkus dengan React `cache` untuk mereduksi kueri ganda pada render lifecycle.

### Role & Permission Matrix UI

Untuk mengelola permission per role (matriks role × menu × 6 izin di Settings — header ikon per izin, grup Data ┊ Keluaran, preset baris via dropdown `ListChecks`, toggle satu kolom via klik ikon header, hover highlight silang):
- **Server Actions** — di `src/server/actions/role-permission.ts`: `getRolePermissions`, `toggleRolePermission` (satu sel), dan `setRolePermissions(updates[])` — set banyak permission ke keadaan eksplisit dalam **satu transaksi** untuk aksi massal (toggle satu baris penuh, kaskade induk → anak).
- **SUPERADMIN dikecualikan dari matriks** (keputusan governance): kolom yang tampil/diedit hanya `EDITABLE_ROLES = ROLES.filter((r) => r !== "SUPERADMIN")` (`role-matrix-client.tsx`), dan `setRolePermissions` mengabaikan entri role SUPERADMIN — SUPERADMIN bypass RBAC sehingga permission-nya tidak perlu (dan tidak boleh) diatur dari UI.

### Hierarchical Menu Management (3-Level Support)

Sistem menu mendukung hierarki sampai **3 level maksimal**:
- **Level 1:** Menu Besar (e.g., Master Data, Settings, Dashboard)
- **Level 2:** Sub Menu (e.g., Petani, Lembaga Petani, Pelatihan, User Management)
- **Level 3:** Detail Sub Menu (e.g., Peserta Pelatihan, Bukti Pelatihan, Land Parcel, Training Record)

**RBAC Permission Inheritance:**
- Permission di **level 1** berlaku untuk semua level 2 dan level 3 di bawahnya (cascade)
- Permission di **level 2** berlaku untuk semua level 3 di bawahnya
- **Override eksplisit** di level lebih dalam meng-override inheritance (revoke atau grant)
- Contoh: User punya VIEW di "Pelatihan" (level 2) → otomatis VIEW di "Peserta Pelatihan" (level 3), kecuali ada explicit REVOKE

> [!WARNING]
> **Cascade = risiko over-grant.** Grant pada menu **induk** mewariskan permission ke **semua** anak (termasuk menu sensitif seperti User/Role/Menu Management). Untuk akses **granular**, grant di level **anak**, jangan induk. Sidebar (`filterMenuTreeByAccess` di `menu-utils.ts`) tetap menampilkan induk sebagai **container** selama salah satu anaknya ter-grant — jadi grant per-anak **tidak** memerlukan grant induk. Konsekuensi: jangan mensyaratkan induk ter-grant hanya agar anak tampil. (Audit lintas-role: `scripts/local/audit-cascade.ts` — local-only; folder `scripts/local/` gitignored, tidak tersedia di clone baru.)

**UI Guidelines:**
- **Max children:** Level 2 maksimal 5 children (level 3) — hindari clutter, pertimbangkan pagination/search jika > 5
- **Dynamic route:** Level 3 gunakan dynamic route jika context-specific: `/admin/master-data/training/[id]/participants`
- **Max depth:** Level 3 tidak boleh punya children (max depth = 3 level)
- **Sidebar visual:**
  - Level 2: `pl-4`, normal text size, collapsible jika punya children
  - Level 3: `pl-4 pr-2`, `text-xs`, bullet `•` (`nav-main.tsx`)
- **Menu Management table visual** (pasca #187B, `menu-list-client.tsx`):
  - Indentasi numerik pada kolom Menu: `paddingLeft: depth * 20`
  - Depth 0 (level 1): **bold** + baris `bg-muted/30`
  - Depth ≥ 1 (level 2–3): `text-muted-foreground`
  - Pohon **collapsible**: tombol chevron (`ChevronRight`/`ChevronDown`) per baris yang punya anak, dinonaktifkan saat mode pencarian aktif

**Technical Implementation:**
- **Dua helper pohon menu** dengan peruntukan berbeda — jangan disatukan:
  - `src/lib/menu-utils.ts` — `buildMenuTree(items, parentKey, currentDepth, maxDepth)` menghasilkan pohon nested `children`; untuk jalur **server & sidebar** (`src/server/actions/menu.ts`, `filterMenuTreeByAccess`)
  - `src/lib/menu-tree.ts` — `buildMenuTree(items)` (satu argumen) menghasilkan node `{ item, depth, children }`, plus `collapsibleKeys`, `descendantKeys`, `flattenTree`; untuk **UI Settings** (tabel collapsible Menu Management & Role & Permission)
- Validation: `validateMenuDepth()` reject jika depth > 3
- RBAC: `getEffectiveMenuPermissions()` dengan fallback ke parent/grandparent
- Server action: Validate depth sebelum create/update menu item
