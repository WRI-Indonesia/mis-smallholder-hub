# Produk — Alur per Role

> Bagian dari dokumentasi **Produk**. Indeks: [../README.md](../README.md) · Terkait: [architecture.md](./architecture.md) · [access-context.md](./access-context.md) · [crud-flows.md](./crud-flows.md) · [module-status.md](./module-status.md)

<details>
<summary><strong>Role-Specific Access Summary</strong></summary>

## SUPERADMIN

- **Dashboard**: ✅ Main Dashboard (semua snapshot, semua data)
- **Master Data**: ✅ Full CRUD, all regions/groups/farmers
- **Settings**: ✅ User/Role/Menu/Region management
- **Report**: ✅ All reports, all data
- **Bulk Upload**: ✅ All modules
- **Tools**: ✅ Dashboard Snapshot (generate/view/delete), Export, S3/PDF, GIS

## ADMIN (District/Province Level)

- **Dashboard**: ✅ Main Dashboard (snapshot dalam scope distrik + org-wide)
- **Master Data**: ✅ CRUD within assigned district (Groups, Farmers, Training)
- **Settings**: 🟠 Limited (View/Edit users based on permission)
- **Report**: 🔲 Filtered reports (User, KT within scope)
- **Bulk Upload**: ✅ Farmer (assigned groups only)
- **Tools**: ✅ Dashboard Snapshot (generate/view/delete, scope distrik)

## OPERATOR (Field Level)

- **Dashboard**: ✅ Main Dashboard (VIEW; snapshot dalam scope KT + org-wide)
- **Master Data**: ✅ CRUD Farmers/Parcels/Training/Production within assigned KT
- **Settings**: ❌ No access
- **Report**: 🔲 View reports (assigned KT only)
- **Bulk Upload**: ❌ No access
- **Tools**: ❌ No access (tidak diberi akses Dashboard Snapshot)

## MANAGEMENT (Read-Only)

- **Dashboard**: ✅ Main Dashboard (view all metrics, organization-wide)
- **Master Data**: ❌ Read-only (no CRUD)
- **Settings**: ❌ No access
- **Report**: 🔲 View all reports (all data)
- **Bulk Upload**: ❌ No access
- **Tools**: 🟠 Dashboard Snapshot (view-only, tanpa generate/delete)

</details>
