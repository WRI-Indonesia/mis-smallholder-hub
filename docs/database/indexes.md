# Database — Index Strategy

> Bagian dari dokumentasi **Database**. Indeks: [../README.md](../README.md) · Terkait: [erd.md](./erd.md) · [models.md](./models.md) · [constraints.md](./constraints.md) · [migrations.md](./migrations.md) · [security.md](./security.md) · [performance.md](./performance.md) · [dashboard-snapshots.md](./dashboard-snapshots.md)

<details>
<summary><strong>Index Strategy</strong> — Strategi indexing untuk performa query</summary>

## Index Strategy

### Primary Indexes (Unique)

| Tabel | Index | Kolom | Tujuan |
|-------|-------|-------|--------|
| **Geography** | | | |
| Province | PK | `id` (CUID) | Primary key |
| Province | UNIQUE | `code` | Lookup by province code (fast) |
| District | PK | `id` (CUID) | Primary key |
| District | UNIQUE | `code` | Lookup by district code (fast) |
| Subdistrict | PK | `id` (CUID) | Primary key |
| Subdistrict | UNIQUE | `code` | Lookup by subdistrict code (fast) |
| Village | PK | `id` (CUID) | Primary key |
| Village | UNIQUE | `code` | Lookup by village code (fast) |
| **User & Auth** | | | |
| User | PK | `id` (CUID) | Primary key |
| User | UNIQUE | `email` | Login & user lookup |
| **Menu** | | | |
| MenuItem | PK | `id` (CUID) | Primary key |
| MenuItem | UNIQUE | `key` | Menu item lookup by slug |
| **Farmer Group** | | | |
| FarmerGroup | PK | `id` (CUID) | Primary key |
| **Farmer Group Boundary** | | | |
| FarmerGroupBoundary | PK | `id` (CUID) | Primary key |
| FarmerGroupBoundary | GIST | `geom` | Index spasial PostGIS (ST_Intersects/ST_Contains) — ditulis manual di migration 20260819041658 karena kolom `Unsupported` (#266) |
| **Administrative Boundary** | | | |
| AdministrativeBoundary | PK | `id` (CUID) | Primary key |
| AdministrativeBoundary | INDEX | `(level, isActive)` | Baca garis batas per level (KABUPATEN/KECAMATAN/DESA) |
| AdministrativeBoundary | GIST | `geom` | Index spasial PostGIS — manual di migration 20260819073337 (#266) |
| **Farmer** | | | |
| Farmer | PK | `id` (CUID) | Primary key |
| Farmer | UNIQUE | `(farmerGroupId, farmerId)` | ID Petani unik per Lembaga (TD-024, migration 20260721060000) |
| **Land Parcel** | | | |
| LandParcel | PK | `id` (CUID) | Primary key |
| **Land Parcel Identity & Satelit (#296)** | | | |
| LandParcelIdentity | PK | `id` (CUID) = `parcelUid` | Identitas stabil antar revisi |
| LandParcelIdentity | UNIQUE | `(farmerId, parcelId)` | Satu identitas per pasangan petani+ID lahan |
| LandParcelDocument | PK | `id` (CUID) | Primary key |
| LandStdb | PK | `id` (CUID) | Primary key |
| LandStdb | UNIQUE | `(farmerId, number)` | Nomor STDB unik per petani |
| LandParcelStdb | PK | `id` (CUID) | Primary key |
| LandParcelStdb | UNIQUE | `(parcelUid, stdbId)` | Tautan lahan↔STDB tidak ganda |
| LandParcelExternalId | PK | `id` (CUID) | Primary key |
| LandParcelExternalId | UNIQUE | `(source, code)` | UL Parcel Code unik per sumber |
| LandParcelProgram | PK | `id` (CUID) | Primary key |
| **Tree** | | | |
| Tree | PK | `id` (CUID) | Primary key |
| **Training** | | | |
| TrainingPackage | PK | `id` (CUID) | Primary key |
| TrainingPackage | UNIQUE | `code` (TrainingCategory enum) | Package lookup by category |
| TrainingActivity | PK | `id` (CUID) | Primary key |
| TrainingParticipant | PK | `id` (CUID) | Primary key |
| TrainingParticipant | UNIQUE | `(activityId, farmerId)` | Prevent duplicate participant registration |
| **Production** | | | |
| ProductionRecord | PK | `id` (CUID) | Primary key |
| ProductionRecord | UNIQUE | `(farmerId, parcelId, period, harvestNumber)` | Prevent duplicate production entry for same farmer/parcel/period/harvest (parcelId ditambahkan via migration 20260628214742) |
| **Dashboard Snapshot** | | | |
| MainDashboardSnapshot | PK | `id` (CUID) | Primary key |
| MainDashboardSnapshot | UNIQUE | `(snapshotDate, districtId, joinedYear)` | Prevent duplicate snapshot untuk kombinasi tanggal + filter |
| BmpDashboardSnapshot | PK | `id` (CUID) | Primary key |
| BmpDashboardSnapshot | UNIQUE | `(snapshotDate, districtId)` | Prevent duplicate snapshot untuk kombinasi tanggal + filter |
| **RBAC** | | | |
| RolePermission | PK | `id` (CUID) | Primary key |
| RolePermission | UNIQUE | `(role, menuKey, permission)` | Prevent duplicate role permissions |
| UserProvince | PK | `id` (CUID) | Primary key |
| UserProvince | UNIQUE | `(userId, provinceId)` | Prevent duplicate user-province assignment |
| UserDistrict | PK | `id` (CUID) | Primary key |
| UserDistrict | UNIQUE | `(userId, districtId)` | Prevent duplicate user-district assignment |
| UserFarmerGroup | PK | `id` (CUID) | Primary key |
| UserFarmerGroup | UNIQUE | `(userId, farmerGroupId)` | Prevent duplicate user-KT assignment |
| UserPermissionOverride | PK | `id` (CUID) | Primary key |
| UserPermissionOverride | UNIQUE | `(userId, menuKey, permission)` | Prevent duplicate permission overrides |

### Secondary Indexes (Non-Unique)

| Tabel | Kolom | Tujuan Query | Performa Impact |
|-------|-------|--------------|-----------------|
| **FarmerGroup** | `districtId` | Filter KT by district (RBAC data access) | HIGH — frequently used in list/filter |
| FarmerGroup | `isActive` | Filter active/inactive KT | MEDIUM |
| FarmerGroup | `code` | Search KT by code | MEDIUM |
| **Farmer** | `farmerGroupId` | Get all farmers in a KT | HIGH — list farmers, bulk operations |
| Farmer | `isActive` | Filter active farmers | HIGH |
| Farmer | `farmerId` | Search farmer by internal ID | HIGH — frequently used in lookup |
| **TrainingActivity** | `packageId` | Get all activities for a training package | MEDIUM |
| TrainingActivity | `farmerGroupId` | Get training activities by KT (RBAC filter) | HIGH |
| TrainingActivity | `isActive` | Filter active training activities | MEDIUM |
| **TrainingParticipant** | `activityId` | Get participants for an activity (list view) | HIGH |
| TrainingParticipant | `farmerId` | Get all trainings attended by a farmer | HIGH |
| TrainingParticipant | `isActive` | Filter active participants | MEDIUM |
| **LandParcel** | `farmerId` | Get all parcels for a farmer | HIGH — list parcels, map view |
| LandParcel | `isActive` | Filter active parcels | HIGH |
| LandParcel | `parcelId` | Search parcel by ID | MEDIUM — lookup operations |
| LandParcel | `parcelUid` | Join ke identitas & satelit (#296) | HIGH — detail lahan, report legalitas |
| **LandParcelIdentity** | `isActive` | Filter identitas aktif | LOW |
| **LandParcelDocument** | `(parcelUid, isActive)` | Surat aktif satu lahan | HIGH |
| LandParcelDocument | `type` | Agregat per jenis surat | LOW |
| LandParcelDocument | `number` | Cari nomor surat | MEDIUM |
| **LandStdb** | `number` | Cari nomor STDB | MEDIUM |
| LandStdb | `isActive` | Filter STDB aktif | LOW |
| **LandParcelStdb** | `stdbId` | Lahan lain dalam STDB yang sama | MEDIUM |
| **LandParcelExternalId** | `(parcelUid, isActive)` | UL Parcel Code aktif satu lahan | HIGH |
| **LandParcelProgram** | `(parcelUid, isActive)` | Program aktif satu lahan | HIGH |
| LandParcelProgram | `(programType, status)` | Daftar peserta program | LOW |
| **Tree** | `(landParcelId, isActive)` | Set pohon aktif satu lahan (detail lahan, agregat count) | HIGH — tabel terbesar (10⁵–10⁶ baris), semua query lewat index ini |
| Tree | `parcelId` | Relink pohon ke lahan by kunci bisnis (revisi lahan) | MEDIUM |
| Tree | `isActive` | Filter global pohon aktif | LOW |
| **ProductionRecord** | `farmerId` | Get all production records for a farmer | HIGH — list production, farmer summary |
| ProductionRecord | `parcelId` | Get production records by parcel | MEDIUM — parcel-level analysis |
| ProductionRecord | `period` | Filter production by period (YYYY-MM) | HIGH — monthly/yearly reports |
| ProductionRecord | `isActive` | Filter active production records | HIGH |
| **MainDashboardSnapshot** | `snapshotDate` | Ambil snapshot terbaru (dashboard read) | HIGH |
| MainDashboardSnapshot | `createdBy` | Audit/list snapshot per user | LOW |
| MainDashboardSnapshot | `isActive` | Filter snapshot aktif (soft delete) | MEDIUM |
| **BmpDashboardSnapshot** | `snapshotDate` | Ambil snapshot terbaru (dashboard read) | HIGH |
| BmpDashboardSnapshot | `createdBy` | Audit/list snapshot per user | LOW |
| BmpDashboardSnapshot | `isActive` | Filter snapshot aktif (soft delete) | MEDIUM |

### Index Maintenance Notes

- **CUID vs Auto-Increment**: CUID digunakan untuk semua PK karena distribusi random lebih baik untuk UUID-style lookups dan tidak bocorkan business metrics
- **Composite Unique Indexes**: Digunakan untuk enforce business rule (contoh: satu farmer hanya bisa terdaftar 1x di satu training activity)
- **Missing Indexes**: Tidak ada index pada `created_at` / `modified_at` karena audit query jarang dilakukan dan bisa pakai full table scan

### Query Performance Targets

| Query Type | Target Response Time | Index Strategy |
|------------|---------------------|----------------|
| Login (email lookup) | < 100ms | UNIQUE index on `User.email` |
| List KT by district | < 200ms | Index on `FarmerGroup.districtId` + `isActive` |
| List farmers in KT | < 300ms | Index on `Farmer.farmerGroupId` + `isActive` |
| List parcels by farmer | < 300ms | Index on `LandParcel.farmerId` + `isActive` |
| Training participant list | < 300ms | Index on `TrainingParticipant.activityId` |
| RBAC permission check | < 150ms | Composite unique indexes on RBAC tables |
| Geography hierarchy lookup | < 100ms | UNIQUE code indexes on all geography tables |

</details>
