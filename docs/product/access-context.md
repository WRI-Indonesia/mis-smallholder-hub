# Produk — Access Context Resolution

> Bagian dari dokumentasi **Produk**. Indeks: [../README.md](../README.md) · Terkait: [architecture.md](./architecture.md) · [crud-flows.md](./crud-flows.md) · [role-flows.md](./role-flows.md) · [module-status.md](./module-status.md)

<details>
<summary><strong>RBAC & Data Access Pattern</strong></summary>

## Access Context Resolution

```
User Request
    │
    ▼
┌────────────────────────┐
│ Check Role & Assignment│
└───────┬────────────────┘
        │
        ├─ Sesi kosong / user tak ditemukan → Mode: BY_DISTRICT, ids: [] (⛔ tolak semua)
        │
        ├─ SUPERADMIN → Mode: ALL (✅ Full Access, no filters)
        │
        ├─ No Assignment → Mode: ALL (✅ Unrestricted access)
        │
        ├─ UserFarmerGroup saja (tanpa Province/District) → Mode: BY_FARMER_GROUP (🔍 Filter by specific groups)
        │
        └─ Ada UserProvince/UserDistrict → Mode: BY_DISTRICT
            (🔍 UserProvince di-expand ke semua district di provinsi + UserDistrict langsung)
            │
            ▼
    ┌──────────────────────┐
    │  Permission Check     │
    │  - Menu Access?       │
    │  - Required Perm?     │
    │  - Override?          │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │  Execute Query        │
    │  + isActive filter    │
    │  + RBAC data filter   │
    │  + Audit trail        │
    └──────────────────────┘
```

> Catatan: `getAccessContext()` (`src/lib/access-context.ts`) **role-agnostik** kecuali cabang SUPERADMIN — semua role lain (ADMIN, OPERATOR, MANAGEMENT, DONOR) mengikuti aturan assignment yang sama. Urutan evaluasi: farmer-group-only lebih dulu, baru province/district; sesi kosong atau user tak ditemukan → `{ mode: "BY_DISTRICT", ids: [] }` = tolak semua.

### Data Access Hierarchy Examples

Nama di kolom pertama adalah **persona ilustratif**; kolom Role memakai enum `Role` nyata.

| Persona (ilustrasi) | Role (enum) | UserProvince | UserDistrict | UserFarmerGroup | Result Access |
|------|------|--------------|--------------|-----------------|---------------|
| Ahmad | ADMIN | Riau | — | — | `BY_DISTRICT`: semua district di Riau → semua Lembaga di dalamnya |
| Erma | ADMIN | — | Kampar | — | `BY_DISTRICT`: semua Lembaga di Kampar |
| Anissa | OPERATOR | — | — | KBM, Kopsa | `BY_FARMER_GROUP`: hanya KBM & Kopsa |
| Dian | DONOR | — | — | — | `ALL` (tanpa assignment) — read-only lewat permission menu, bukan lewat scope |
| Super Admin | SUPERADMIN | — | — | — | `ALL` (skip filter) |

> Bila assignment farmer group **dicampur** dengan province/district (mis. Kampar + KBM), yang menang adalah district → `BY_DISTRICT` Kampar (lihat urutan evaluasi di atas).

### Helper Filter (dipakai di Server Actions)

| Helper (`src/lib/access-context.ts`) | Peruntukan |
|---|---|
| `farmerGroupAccessFilter(access)` | Fragmen `where` untuk query `FarmerGroup` (`BY_FARMER_GROUP` → `id in`; `BY_DISTRICT` → `districtId in`) |
| `farmerAccessFilter(access)` | Model ber-field `farmerGroupId` + relasi `farmerGroup` (mis. `Farmer`, `TrainingActivity`) |
| `farmerRelationAccessFilter(access)` | Model ber-relasi `farmer` (mis. `LandParcel`, `ProductionRecord`, `TrainingParticipant`) |
| `getAccessibleDistrictIds(access)` | Daftar id district yang boleh diakses (`null` = ALL); `BY_FARMER_GROUP` di-resolve ke district lembaga yang di-assign |

### Permission Resolution Priority

1. **SUPERADMIN** → Grant all, skip all filters
2. **UserPermissionOverride** (Granted) → Grant
3. **UserPermissionOverride** (Revoked) → Forbid
4. **RolePermission** (default) → Check C/V/E/D
5. **Pewarisan kaskade induk→anak** → izin induk diturunkan ke seluruh anak menu
6. **No Permission** → Hide menu / Forbidden

**Pewarisan kaskade**: `getEffectiveMenuPermissions` (`src/lib/rbac.ts`) menelusuri pohon menu top-down — izin efektif tiap node = izin induk + `RolePermission` node itu, lalu override per-user diterapkan per node (grant menambah, revoke mencabut, termasuk mencabut hasil warisan). Contoh konkret: `role-permissions.csv` **tidak punya baris** `master-data-farmers`, tetapi ADMIN/OPERATOR tetap dapat VIEW menu Petani karena mewarisi VIEW dari induk `master-data`.

</details>
