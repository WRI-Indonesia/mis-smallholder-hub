# Standar — RBAC & Menu Access

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [principles.md](./principles.md) · [workflow.md](./workflow.md) · [code-standards.md](./code-standards.md) · [ui-ux.md](./ui-ux.md) · [architecture.md](./architecture.md)

### RBAC Data Access Hierarchy

```
SUPERADMIN        → skip semua filter (akses ALL)
No assignment     → unrestricted (akses ALL)
UserFarmerGroup   → hanya KT spesifik (filter by FarmerGroup.id)
UserDistrict      → semua KT di district (filter by districtId)
UserProvince      → semua district di province → semua KT (filter by districtId)
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
> **Bug pattern lama** — Jangan filter hanya berdasarkan `districtId` tanpa handle case `BY_FARMER_GROUP`. Jika user hanya assign KT dan code menghasilkan `districtId: { in: [] }`, semua data KT akan hilang dari query.

### User Data Access Assignment UI

Untuk assign data access per user (Province/District/KT):
- **Server Actions** — di `src/server/actions/user-data-access.ts`: `getUserDataAccess`, `getRegionsForSelect`, `assignUserProvince/District/FarmerGroup`, `removeUserProvince/District/FarmerGroup`
- **Modal** — `UserDataAccessModal` (Tabs: Provinsi | Distrik | KT) dengan live-save checkbox per item
- **Table Summary** — Gunakan komponen `AccessSummaryCell` di kolom "Akses Data": badge per assignment, `—` jika kosong
- **Real-time refresh** — Pass `onDataChange` callback ke modal → panggil `startTransition(() => router.refresh())` setiap toggle berhasil

### User Menu Access Override UI

Untuk melakukan override permission menu per user (grant/revoke):
- **Server Actions** — di `src/server/actions/user-menu-access.ts`: `getUserMenuOverrides`, `getMenuItemsForSelect`, `getUserEffectivePermissions`, `setUserMenuOverride`, `removeUserMenuOverride`
- **Modal** — `UserMenuAccessModal` dengan matrix C | V | E | D per menu, visual code status (`role` | `granted` | `revoked`), dan interactive toggle saving.
- **Keamanan** — Pengecekan di server action wajib menolak override terhadap user berkole `SUPERADMIN`.
- **Soft Delete** — Penghapusan override menggunakan update `isActive: false` (bukan physical delete).
- **Optimasi Caching** — Fungsi pembacaan permission di `src/lib/rbac.ts` wajib dibungkus dengan React `cache` untuk mereduksi kueri ganda pada render lifecycle.

### Hierarchical Menu Management (3-Level Support)

Sistem menu mendukung hierarki sampai **3 level maksimal**:
- **Level 1:** Menu Besar (e.g., Master Data, Settings, Dashboard)
- **Level 2:** Sub Menu (e.g., Petani, Lembaga Tani, Pelatihan, User Management)
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
  - Level 3: `pl-8`, `text-xs`, `ChevronRight` icon atau bullet `•`
- **Menu Management table visual:**
  - Level 1: **Bold** text
  - Level 2: `— ` prefix + normal weight
  - Level 3: `—— ` prefix + `text-muted-foreground`

**Technical Implementation:**
- Helper function `buildMenuTree(items, parentKey, currentDepth, maxDepth)` di `src/lib/menu-utils.ts` untuk recursive tree building
- Validation: `validateMenuDepth()` reject jika depth > 3
- RBAC: `getEffectiveMenuPermissions()` dengan fallback ke parent/grandparent
- Server action: Validate depth sebelum create/update menu item
