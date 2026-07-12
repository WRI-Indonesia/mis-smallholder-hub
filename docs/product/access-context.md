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
│ Check Role             │
└───────┬────────────────┘
        │
        ├─ SUPERADMIN → Mode: ALL (✅ Full Access, no filters)
        │
        ├─ No Assignment → Mode: ALL (✅ Unrestricted access)
        │
        ├─ UserProvince → Mode: BY_DISTRICT (🔍 Expand to all districts in province)
        │
        ├─ UserDistrict → Mode: BY_DISTRICT (🔍 Filter by assigned districts)
        │
        └─ UserFarmerGroup (only) → Mode: BY_FARMER_GROUP (🔍 Filter by specific groups)
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

### Data Access Hierarchy Examples

| User | Role | UserProvince | UserDistrict | UserFarmerGroup | Result Access |
|------|------|--------------|--------------|-----------------|---------------|
| Ahmad | Project Leader | Riau | — | — | Semua district di Riau → semua KT |
| Erma | District Coord | — | Kampar | — | Semua KT di Kampar |
| Anissa | Facilitator | — | Kampar | KBM, Kopsa | Hanya KBM & Kopsa |
| Super Admin | SUPERADMIN | — | — | — | Semua (skip filter) |

### Permission Resolution Priority

1. **SUPERADMIN** → Grant all, skip all filters
2. **UserPermissionOverride** (Granted) → Grant
3. **UserPermissionOverride** (Revoked) → Forbid
4. **RolePermission** (default) → Check C/V/E/D
5. **No Permission** → Hide menu / Forbidden

</details>
