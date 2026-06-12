# Database Schema — ERD

> Visualisasi Entity Relationship Diagram untuk schema aktif.
> Update terakhir: 2026-06-11

---

## High-Level ERD

```mermaid
erDiagram
    %% GEOGRAPHY HIERARCHY
    Province ||--o{ District : "has"
    District ||--o{ Subdistrict : "has"
    Subdistrict ||--o{ Village : "has"
    
    %% FARMER GROUP & FARMER
    District ||--o{ FarmerGroup : "located in"
    FarmerGroup ||--o{ Farmer : "has members"
    
    %% TRAINING MODULE
    TrainingPackage ||--o{ TrainingActivity : "used in"
    FarmerGroup ||--o{ TrainingActivity : "hosts"
    TrainingActivity ||--o{ TrainingParticipant : "has"
    Farmer ||--o{ TrainingParticipant : "attends"
    
    %% RBAC & MENU
    User ||--o{ UserProvince : "assigned"
    User ||--o{ UserDistrict : "assigned"
    User ||--o{ UserFarmerGroup : "assigned"
    User ||--o{ UserPermissionOverride : "has"
    Province ||--o{ UserProvince : "scope"
    District ||--o{ UserDistrict : "scope"
    FarmerGroup ||--o{ UserFarmerGroup : "scope"
    MenuItem ||--o{ MenuItem : "parent-child"
    MenuItem ||--o{ RolePermission : "default perms"
    MenuItem ||--o{ UserPermissionOverride : "override perms"
```

---

## Quick Summary

### Implemented Models (7 Categories)

| Category | Tables | Key Features |
|----------|--------|--------------|
| **Geography** | Province, District, Subdistrict, Village | 4-level hierarchy, soft-delete, audit trail |
| **User & Auth** | User | NextAuth integration, Role-based access |
| **RBAC** | RolePermission, UserProvince, UserDistrict, UserFarmerGroup, UserPermissionOverride | Permission matrix, data access control, menu override |
| **Menu** | MenuItem | Recursive parent-child (3-level), dynamic menu management |
| **Farmer Group** | FarmerGroup | District-based, location coordinates, category (EX_PLASMA/SWADAYA) |
| **Farmer** | Farmer | Demographics, joinedYear, relation to FarmerGroup & Training |
| **Training** | TrainingPackage, TrainingActivity, TrainingParticipant | 5 training packages, evidence upload (S3), bulk participant upload |

### Planned Models (7 Categories)

- **Parcel** (MD-04) — Land management per farmer
- **Production** (MD-06) — Agronomy & production records
- **Staff** (MD-07) — Staff activity tracking
- **HCV** (MD-08) — High Conservation Value assessments
- **BUSDEV** (MD-09) — Business development tracking
- **IMPACT** (MD-10) — Impact metrics
- **Workplan** (MD-11) — Work planning & tasks

### Enums

`Role`, `PermissionLevel`, `FarmerGroupCategory`, `Gender`, `ActivityStatus`, `TrainingCategory`

### Common Patterns

- **Soft Delete**: Semua tabel memiliki `isActive Boolean @default(true)`
- **Audit Trail**: `created_at`, `created_by`, `modified_at`, `modified_by`
- **CUID Primary Keys**: Semua tabel menggunakan CUID untuk ID
- **Table Naming**: `tbl_*` (transactional), `reg_*` (regional), `ref_*` (reference), `rbac_*` (RBAC)

### Schema Version

| Version | Date | Key Changes | Impact |
|---------|------|-------------|--------|
| **2.0.0** | 2026-06-11 | Training module, Farmer.joinedYear | Medium (new tables + optional field) |
| 1.5.0 | 2026-05-22 | RBAC overrides, User data access | High (new RBAC tables) |
| 1.0.0 | 2026-04-14 | Initial schema | — |

---

<details open>
<summary><strong>ERD Overview</strong> — Visualisasi lengkap relasi antar tabel</summary>

## ERD Overview

```mermaid
erDiagram
    %% ═══════════════════════════════════════════
    %% GEOGRAPHY
    %% ═══════════════════════════════════════════

    Province {
        String id PK
        String code UK
        String name
        Boolean is_active
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    District {
        String id PK
        String province_id FK
        String code UK
        String name
        Boolean is_active
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    Subdistrict {
        String id PK
        String district_id FK
        String code UK
        String name
        Boolean is_active
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    Village {
        String id PK
        String subdistrict_id FK
        String code UK
        String name
        Boolean is_active
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    Province ||--o{ District : "has"
    District ||--o{ Subdistrict : "has"
    Subdistrict ||--o{ Village : "has"

    %% ═══════════════════════════════════════════
    %% USER & AUTH
    %% ═══════════════════════════════════════════

    User {
        String id PK
        String name
        String email UK
        String password
        Role role
        Boolean is_active
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    %% ═══════════════════════════════════════════
    %% FARMER GROUP
    %% ═══════════════════════════════════════════

    FarmerGroup {
        String id PK
        String district_id FK
        String code
        String abrv
        String abrv_3id
        String name
        FarmerGroupCategory category
        Int join_year
        Float location_lat
        Float location_long
        Boolean is_active
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    District ||--o{ FarmerGroup : "has"

    %% ═══════════════════════════════════════════
    %% FARMER
    %% ═══════════════════════════════════════════

    Farmer {
        String id PK
        String farmer_group_id FK
        Gender gender
        String name
        String farmer_id
        String nik
        String address
        String birth_place
        DateTime birth_date
        Int joined_year
        Boolean is_active
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    FarmerGroup ||--o{ Farmer : "has"

    %% ═══════════════════════════════════════════
    %% TRAINING
    %% ═══════════════════════════════════════════

    TrainingPackage {
        String id PK
        TrainingCategory code UK
        String name
        String desc
        Boolean is_active
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    TrainingActivity {
        String id PK
        String ref_training_package_id FK
        String farmer_group_id FK
        String location
        DateTime training_date
        String evidence_key
        String evidence_name
        Boolean is_active
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    TrainingParticipant {
        String id PK
        String training_activity_id FK
        String farmer_id FK
        Boolean is_active
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    TrainingPackage ||--o{ TrainingActivity : "has"
    FarmerGroup ||--o{ TrainingActivity : "hosts"
    TrainingActivity ||--o{ TrainingParticipant : "has"
    Farmer ||--o{ TrainingParticipant : "attends"

    %% ═══════════════════════════════════════════
    %% MENU
    %% ═══════════════════════════════════════════

    MenuItem {
        String id PK
        String key UK
        String parent_key FK
        String title
        String url
        String icon
        Int order
        Boolean is_active
        Boolean is_visible
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    MenuItem ||--o{ MenuItem : "parent-child"

    %% ═══════════════════════════════════════════
    %% RBAC
    %% ═══════════════════════════════════════════

    RolePermission {
        String id PK
        Role role
        String menu_key FK
        PermissionLevel permission
        Boolean is_active
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    UserProvince {
        String id PK
        String user_id FK
        String province_id FK
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    UserDistrict {
        String id PK
        String user_id FK
        String district_id FK
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    UserFarmerGroup {
        String id PK
        String user_id FK
        String farmer_group_id FK
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    UserPermissionOverride {
        String id PK
        String user_id FK
        String menu_key FK
        PermissionLevel permission
        Boolean granted
        Boolean is_active
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    MenuItem ||--o{ RolePermission : "default permissions"
    MenuItem ||--o{ UserPermissionOverride : "overrides"
    User ||--o{ UserProvince : "assigned"
    User ||--o{ UserDistrict : "assigned"
    User ||--o{ UserFarmerGroup : "assigned"
    User ||--o{ UserPermissionOverride : "has"
    Province ||--o{ UserProvince : "assigned to"
    District ||--o{ UserDistrict : "assigned to"
    FarmerGroup ||--o{ UserFarmerGroup : "assigned to"
```

</details>

---

<details>
<summary><strong>Schema Implementation Status</strong> — Status implementasi dan roadmap</summary>

## Schema Implementation Status

### ✅ Implemented (Production-Ready)

| Category | Tables | Status |
|----------|--------|--------|
| **Geography** | Province, District, Subdistrict, Village | ✅ Complete with hierarchy & indexes |
| **User & Auth** | User | ✅ Complete with NextAuth integration |
| **RBAC** | RolePermission, UserProvince, UserDistrict, UserFarmerGroup, UserPermissionOverride | ✅ Complete with permission matrix |
| **Menu** | MenuItem | ✅ Complete with recursive parent-child (3-level support) |
| **Farmer Group** | FarmerGroup | ✅ Complete with location & category |
| **Farmer** | Farmer | ✅ Complete with demographics & joinedYear field |
| **Training** | TrainingPackage, TrainingActivity, TrainingParticipant | ✅ Complete with evidence upload & participant management |

### 🔲 Planned (Roadmap)

| Category | Tables | Target Phase |
|----------|--------|--------------|
| **Parcel** | LandParcel | MD-04 |
| **Production** | ProductionRecord | MD-06 |
| **Staff** | Staff, StaffActivity | MD-07 |
| **HCV** | HCVAssessment | MD-08 |
| **Business Development** | BusinessDevelopment | MD-09 |
| **Impact** | ImpactMetrics | MD-10 |
| **Workplan** | Workplan, WorkplanTask | MD-11 |

---

## Common Fields (semua tabel)

| Field | Type | Keterangan |
|-------|------|-----------|
| `created_at` | DateTime | Auto-set saat create |
| `created_by` | String? | User ID yang membuat (null saat seed) |
| `modified_at` | DateTime | Auto-update saat edit |
| `modified_by` | String? | User ID yang terakhir edit |

</details>

---

<details>
<summary><strong>Enums</strong> — Definisi enumerasi sistem</summary>

## Enums

```mermaid
classDiagram
    class Role {
        SUPERADMIN
        ADMIN
        OPERATOR
        MANAGEMENT
    }

    class PermissionLevel {
        CREATE
        VIEW
        EDIT
        DELETE
    }

    class FarmerGroupCategory {
        EX_PLASMA
        SWADAYA
    }

    class Gender {
        M
        F
    }

    class ActivityStatus {
        DRAFT
        PENDING_APPROVAL
        APPROVED
        REJECTED
    }

    class TrainingCategory {
        PAKET_1_BMP_PC_RSPO_NKT
        PAKET_2_MK
        PAKET_2_K3
        PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV
        OTHER
    }
```

</details>

---

<details>
<summary><strong>Table Naming Convention</strong> — Konvensi penamaan tabel</summary>

## Table Naming Convention

| Prefix | Arti | Contoh |
|--------|------|--------|
| `tbl_` | Tabel transaksional / data utama | `tbl_user`, `tbl_farmer_group`, `tbl_farmer`, `tbl_training_activity`, `tbl_training_participant` |
| `reg_` | Reference data regional | `reg_province`, `reg_district` |
| `ref_` | Reference data domain | `ref_training_package` |
| `rbac_` | Tabel RBAC / permission | `rbac_role_permission`, `rbac_user_district` |
| `cache_` | Cache / materialized view | `cache_dashboard_stats` |

</details>

---

<details>
<summary><strong>RBAC & Data Access</strong> — Flow autentikasi, otorisasi, dan data access control</summary>

## RBAC Flow

```mermaid
flowchart TD
    A[User Login] --> B{Check Role}
    B -->|SUPERADMIN| SA[Skip all filters — full access]
    B -->|Other| C[Load RolePermission for role]
    C --> D{Has UserPermissionOverride?}
    D -->|Yes| E[Apply override: grant/revoke]
    D -->|No| F[Use role defaults]
    E --> G[Final permission set]
    F --> G
    G --> H[Filter menu visibility]
    G --> I[Resolve data scope]
    I --> J{UserProvince exists?}
    J -->|Yes| K[All districts in province → all KT]
    J -->|No| L{UserDistrict exists?}
    L -->|Yes| M[All KT in assigned districts]
    L -->|No| N{UserFarmerGroup exists?}
    N -->|Yes| O[Only assigned KT]
    N -->|No| P[No data access]
```

---

## Data Access Examples

| User | Role | UserProvince | UserDistrict | UserFarmerGroup | Hasil Akses |
|------|------|-------------|-------------|-----------------|-------------|
| Ahmad | Project Leader | Riau | — | — | Semua district di Riau → semua KT |
| Erma | District Coord | — | Kampar | — | Semua KT di Kampar |
| Anissa | Facilitator | — | Kampar | KBM, Kopsa | Hanya KBM & Kopsa |
| Super Admin | SUPERADMIN | — | — | — | Semua (skip filter) |

---

## Data Access Pattern

```mermaid
flowchart LR
    subgraph "Resolve Accessible Districts"
        S[Start] --> UP{UserProvince?}
        UP -->|Yes| EXP["Expand: province.districts[]"]
        UP -->|No| UD{UserDistrict?}
        UD -->|Yes| DIR["Use: user.districts[]"]
        UD -->|No| NONE["No access"]
        EXP --> MERGE[Merge district IDs]
        DIR --> MERGE
    end

    subgraph "Resolve Accessible KT"
        MERGE --> UFG{UserFarmerGroup?}
        UFG -->|Yes| FG["Filter: only assigned KT"]
        UFG -->|No| ALL["All KT in accessible districts"]
    end

    subgraph "Server Action Query"
        FG --> W["WHERE is_active=true AND farmer_group_id IN (...)"]
        ALL --> W
    end
```

</details>

---

---

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
| **Training** | | | |
| TrainingPackage | PK | `id` (CUID) | Primary key |
| TrainingPackage | UNIQUE | `code` (TrainingCategory enum) | Package lookup by category |
| TrainingActivity | PK | `id` (CUID) | Primary key |
| TrainingParticipant | PK | `id` (CUID) | Primary key |
| TrainingParticipant | UNIQUE | `(activityId, farmerId)` | Prevent duplicate participant registration |
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
| Training participant list | < 300ms | Index on `TrainingParticipant.activityId` |
| RBAC permission check | < 150ms | Composite unique indexes on RBAC tables |
| Geography hierarchy lookup | < 100ms | UNIQUE code indexes on all geography tables |

</details>

---

<details>
<summary><strong>Constraint & Data Integrity</strong> — Aturan integritas data dan validasi</summary>

## Constraint & Data Integrity

### Foreign Key Constraints

| Child Table | FK Field | Parent Table | Parent Field | On Delete | On Update |
|-------------|----------|--------------|--------------|-----------|-----------|
| **Geography Hierarchy** | | | | | |
| District | `provinceId` | Province | `id` | RESTRICT | CASCADE |
| Subdistrict | `districtId` | District | `id` | RESTRICT | CASCADE |
| Village | `subdistrictId` | Subdistrict | `id` | RESTRICT | CASCADE |
| **FarmerGroup** | | | | | |
| FarmerGroup | `districtId` | District | `id` | RESTRICT | CASCADE |
| **Farmer** | | | | | |
| Farmer | `farmerGroupId` | FarmerGroup | `id` | RESTRICT | CASCADE |
| **Training** | | | | | |
| TrainingActivity | `packageId` | TrainingPackage | `id` | RESTRICT | CASCADE |
| TrainingActivity | `farmerGroupId` | FarmerGroup | `id` | RESTRICT | CASCADE |
| TrainingParticipant | `activityId` | TrainingActivity | `id` | CASCADE | CASCADE |
| TrainingParticipant | `farmerId` | Farmer | `id` | RESTRICT | CASCADE |
| **RBAC** | | | | | |
| RolePermission | `menuKey` | MenuItem | `key` | CASCADE | CASCADE |
| UserProvince | `userId` | User | `id` | CASCADE | CASCADE |
| UserProvince | `provinceId` | Province | `id` | CASCADE | CASCADE |
| UserDistrict | `userId` | User | `id` | CASCADE | CASCADE |
| UserDistrict | `districtId` | District | `id` | CASCADE | CASCADE |
| UserFarmerGroup | `userId` | User | `id` | CASCADE | CASCADE |
| UserFarmerGroup | `farmerGroupId` | FarmerGroup | `id` | CASCADE | CASCADE |
| UserPermissionOverride | `userId` | User | `id` | CASCADE | CASCADE |
| UserPermissionOverride | `menuKey` | MenuItem | `key` | CASCADE | CASCADE |
| **Menu Hierarchy** | | | | | |
| MenuItem | `parentKey` | MenuItem | `key` | CASCADE | CASCADE |

### Cascade Behavior Explanation

**RESTRICT (Default Prisma)**:
- Mencegah penghapusan parent jika ada child yang masih reference
- Digunakan untuk data master (Geography, TrainingPackage, Farmer, FarmerGroup)
- Error: `Foreign key constraint failed`

**CASCADE**:
- Otomatis menghapus/update child saat parent dihapus/diupdate
- Digunakan untuk data transaksional dan relasi dependency kuat:
  - `TrainingParticipant.activityId` → jika training activity dihapus, semua participant records juga dihapus
  - RBAC assignments → jika user dihapus, semua assignment & overrides juga dihapus
  - Menu hierarchy → jika parent menu dihapus, child menu juga dihapus

### Business Rules & Validation

| Tabel | Field | Constraint | Business Rule |
|-------|-------|-----------|---------------|
| **User** | `email` | UNIQUE, NOT NULL | Email harus unik, digunakan untuk login |
| User | `role` | ENUM, NOT NULL | Role wajib (default: OPERATOR) |
| **Geography** | `code` | UNIQUE, NOT NULL | Code wilayah harus unik (BPS standard) |
| **FarmerGroup** | `category` | ENUM, NOT NULL | Kategori: EX_PLASMA / SWADAYA (default: SWADAYA) |
| **Farmer** | `farmerId` | NOT NULL, INDEXED | Internal farmer ID, bisa sama dengan NIK atau custom ID |
| Farmer | `nik` | NULLABLE, 16 digits | NIK optional, jika diisi harus 16 digit angka |
| Farmer | `gender` | ENUM (M/F), NOT NULL | Gender wajib |
| Farmer | `joinedYear` | INT (1900-2100), NULLABLE | Tahun bergabung dengan KT, optional |
| **TrainingPackage** | `code` | UNIQUE, ENUM | Training category code harus unik |
| **TrainingParticipant** | `(activityId, farmerId)` | UNIQUE COMPOSITE | Satu farmer hanya bisa terdaftar 1x di satu training |
| **MenuItem** | `key` | UNIQUE, NOT NULL | Menu key (slug) harus unik |
| MenuItem | `parentKey` | NULLABLE, FK | Self-reference untuk menu hierarchy (max 3 level) |
| **RolePermission** | `(role, menuKey, permission)` | UNIQUE COMPOSITE | Tidak boleh duplicate role permission |
| **UserProvince** | `(userId, provinceId)` | UNIQUE COMPOSITE | User tidak boleh assigned 2x ke province yang sama |
| **UserDistrict** | `(userId, districtId)` | UNIQUE COMPOSITE | User tidak boleh assigned 2x ke district yang sama |
| **UserFarmerGroup** | `(userId, farmerGroupId)` | UNIQUE COMPOSITE | User tidak boleh assigned 2x ke KT yang sama |

### Soft Delete Pattern

Semua tabel menggunakan **soft delete** dengan field `isActive`:
- `isActive = true` → record aktif
- `isActive = false` → record "dihapus" tapi data tetap ada di DB
- Query default HARUS filter `WHERE isActive = true`
- Untuk recovery data, bisa toggle kembali `isActive = true`

**Keuntungan**:
- Audit trail tetap terjaga
- Data tidak hilang permanen
- Bisa restore kapan saja
- Relasi referential integrity tidak patah

**Trade-off**:
- Perlu disiplin di query layer (selalu filter `isActive`)
- UNIQUE constraint harus conditional (tapi Prisma tidak support, jadi pakai kombinasi unik+isActive di app layer)

### Referential Integrity Check

```mermaid
flowchart TD
    A[Delete Request] --> B{Has Active Children?}
    B -->|Yes| C[RESTRICT — Return Error]
    B -->|No| D{Cascade Policy?}
    D -->|RESTRICT| E[Check isActive = false first]
    D -->|CASCADE| F[Soft delete parent & all children]
    E -->|OK| G[Soft delete parent only]
    E -->|Fail| C
```

</details>

---

<details>
<summary><strong>Migration Strategy</strong> — Strategi migrasi dan versioning schema</summary>

## Migration Strategy

### Migration Workflow

```mermaid
flowchart LR
    A[Schema Change<br/>in .prisma files] --> B[prisma migrate dev]
    B --> C[Generate Migration SQL]
    C --> D[Review Migration]
    D --> E{Safe?}
    E -->|Yes| F[Apply to Dev DB]
    E -->|No| G[Rollback / Edit]
    F --> H[Test & Verify]
    H --> I[Commit Migration]
    I --> J[Deploy to Staging]
    J --> K[Deploy to Production]
```

### Migration Types & Risk Level

| Migration Type | Risk | Strategy | Rollback |
|----------------|------|----------|----------|
| **Add New Table** | LOW | Deploy langsung | Easy (drop table) |
| **Add Nullable Column** | LOW | Deploy langsung | Easy (drop column) |
| **Add NOT NULL Column with Default** | MEDIUM | Backfill di migration | Medium (remove default, drop column) |
| **Add NOT NULL Column without Default** | HIGH | 2-step: (1) add nullable, (2) backfill + alter | Hard |
| **Rename Column** | HIGH | 2-step: (1) add new + copy data, (2) drop old | Medium |
| **Change Column Type** | HIGH | Test di staging, bisa butuh data transformation | Hard |
| **Drop Column** | HIGH | Review dependency dulu, bisa 2-step (deprecated → drop) | Hard (restore from backup) |
| **Drop Table** | CRITICAL | Review dependency + backup, soft-delete preferred | Very Hard |
| **Add UNIQUE Constraint** | MEDIUM | Check duplicate data dulu | Easy (drop constraint) |
| **Add FK Constraint** | MEDIUM | Check orphaned records dulu | Easy (drop constraint) |

### Existing Migrations (History)

| Migration | Date | Description | Impact |
|-----------|------|-------------|--------|
| `20260521232859_init` | 2026-05-21 | Initial schema — Geography, User, Menu, RBAC, FarmerGroup | CRITICAL (baseline) |
| `20260606104223_add_farmer_group_indexes` | 2026-06-06 | Add indexes on FarmerGroup (districtId, isActive, code) | LOW (index only) |
| `20260607000000_add_farmer` | 2026-06-07 | Add Farmer model (demographics, farmerId, nik) | HIGH (new table) |
| `20260610085445_init_training` | 2026-06-10 | Add Training module (Package, Activity, Participant) | HIGH (3 new tables) |
| `20260610091207_add_training_evidence` | 2026-06-10 | Add evidence upload fields to TrainingActivity (evidenceKey, evidenceName) | LOW (nullable fields) |

### Pre-Deployment Checklist

Sebelum deploy migration ke production, pastikan:
- [ ] Migration SQL sudah direview manual (tidak ada DROP TABLE / DROP COLUMN unexpected)
- [ ] Test di local dev environment dulu
- [ ] Test di staging environment dengan production-like data volume
- [ ] Backup database production sebelum migrate
- [ ] Ada rollback plan jika migration gagal
- [ ] Semua query di codebase sudah update (jika ada breaking change)
- [ ] Index creation untuk tabel besar dilakukan CONCURRENTLY (jika perlu)

### Breaking Changes Policy

**Breaking change** adalah migration yang membuat existing code tidak bisa jalan:
- Drop column yang masih dipakai di code
- Rename column tanpa update query
- Change column type yang tidak compatible
- Add NOT NULL constraint tanpa default

**Strategi handling breaking changes**:
1. **2-Step Migration**: Deploy schema dulu (backward-compatible), lalu update code, baru cleanup old schema
2. **Feature Flag**: Wrap new code dengan feature flag, baru enable setelah migration success
3. **Deprecation Period**: Mark field as deprecated, kasih warning di logs, baru drop setelah 1-2 sprint

### Data Backfill Strategy

Jika perlu backfill data untuk field baru dengan NOT NULL constraint:

```sql
-- Example: Add joinedYear to Farmer (already nullable, no backfill needed)
-- If we need to make it NOT NULL in the future:

-- Step 1: Add nullable column (already done)
ALTER TABLE tbl_farmer ADD COLUMN joined_year INTEGER;

-- Step 2: Backfill with business logic (e.g., use FarmerGroup.joinYear as default)
UPDATE tbl_farmer
SET joined_year = fg.join_year
FROM tbl_farmer_group fg
WHERE tbl_farmer.farmer_group_id = fg.id
AND tbl_farmer.joined_year IS NULL;

-- Step 3: Alter to NOT NULL (if needed)
ALTER TABLE tbl_farmer ALTER COLUMN joined_year SET NOT NULL;
```

### Prisma Migration Commands

| Command | Keterangan |
|---------|-----------|
| `npx prisma migrate dev --name <name>` | Generate & apply migration di dev (auto-create DB jika belum ada) |
| `npx prisma migrate deploy` | Apply pending migrations di production (no prompt) |
| `npx prisma migrate status` | Check migration status (pending / applied) |
| `npx prisma migrate resolve --applied <migration-name>` | Mark migration as applied (manual fix) |
| `npx prisma migrate resolve --rolled-back <migration-name>` | Mark migration as rolled back |
| `npx prisma migrate reset` | Drop DB + re-run all migrations + seed (DEV ONLY) |
| `npx prisma db push` | Push schema tanpa migration (DEV ONLY, skip migration files) |

</details>

---

<details>
<summary><strong>Security Considerations</strong> — Aspek keamanan database dan data access</summary>

## Security Considerations

### Authentication & Authorization

| Layer | Mekanisme | Implementation |
|-------|-----------|----------------|
| **Authentication** | NextAuth.js | Email + password, session stored in JWT |
| **Authorization** | Role-Based (RBAC) | 4 roles: SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT |
| **Data Access Control** | Data-level filtering | UserProvince, UserDistrict, UserFarmerGroup assignments |
| **Permission Override** | User-specific exceptions | UserPermissionOverride for grant/revoke specific menu permissions |

### Password Security

- **Storage**: Password disimpan dengan **bcrypt hash** (cost factor: 10)
- **No Plain Text**: Password plain text tidak pernah disimpan di database
- **Salt**: Bcrypt otomatis generate unique salt per password
- **Migration**: Jika ganti hashing algorithm, perlu re-hash saat user login (gradual migration)

### SQL Injection Prevention

- **Prisma ORM**: Semua query pakai Prisma Client → parameterized queries otomatis
- **No Raw Query**: Hindari `prisma.$queryRaw` dengan user input tanpa sanitasi
- **Input Validation**: Validate & sanitize input di server action / API route sebelum query

### Data Access Patterns (RBAC)

```mermaid
flowchart TD
    A[User Request] --> B{Role?}
    B -->|SUPERADMIN| SA[Skip filter — akses semua]
    B -->|Other| C{UserProvince exists?}
    C -->|Yes| D[Filter: district IN province.districts]
    C -->|No| E{UserDistrict exists?}
    E -->|Yes| F[Filter: district IN user.districts]
    E -->|No| G{UserFarmerGroup exists?}
    G -->|Yes| H[Filter: farmerGroupId IN user.farmerGroups]
    G -->|No| I[No data access — return empty]
    
    D --> J[Apply farmerGroup filter if exists]
    F --> J
    J --> K[Final query with WHERE clause]
    H --> K
```

### Sensitive Data Protection

| Data Type | Tabel | Field | Protection Strategy |
|-----------|-------|-------|---------------------|
| **Password** | User | `password` | Bcrypt hash (cost 10), never return di API response |
| **Email** | User | `email` | Unique index, validate format di app layer |
| **NIK (ID Card)** | Farmer | `nik` | Optional field, validate 16 digits jika diisi, bisa mask di UI (****1234) |
| **Location Coordinates** | FarmerGroup | `locationLat`, `locationLong` | Public (untuk mapping), tidak sensitif |
| **S3 Evidence Key** | TrainingActivity | `evidenceKey` | Private S3 bucket, generate pre-signed URL saat akses |

### Audit Trail

Semua tabel memiliki audit fields:
- `createdAt` — timestamp record dibuat
- `createdBy` — user ID yang membuat (nullable saat seed)
- `modifiedAt` — timestamp terakhir diupdate
- `modifiedBy` — user ID yang terakhir update

**Use Case**:
- Track siapa yang membuat/edit data
- Debug issue "data tiba-tiba berubah"
- Compliance requirement (ISO, audit eksternal)

### Database Access Control (PostgreSQL Level)

Rekomendasi production setup:
- **Application User**: User PostgreSQL khusus untuk aplikasi dengan permission terbatas (tidak punya DROP TABLE / DROP DATABASE)
- **Admin User**: Superuser PostgreSQL hanya untuk migration dan maintenance
- **Connection Limit**: Set `max_connections` sesuai expected load (default: 100)
- **SSL Mode**: Wajibkan SSL untuk koneksi production (`sslmode=require`)
- **IP Whitelist**: Restrict akses database hanya dari IP aplikasi server

### Environment Variables Security

Jangan commit ke Git:
- `DATABASE_URL` — connection string dengan password
- `NEXTAUTH_SECRET` — secret key untuk JWT signing
- `AWS_SECRET_ACCESS_KEY` — S3 credentials

Gunakan:
- `.env.local` untuk development (gitignored)
- Environment variables di CI/CD pipeline untuk staging/production
- Secret manager (AWS Secrets Manager, Google Secret Manager) untuk production

### OWASP Top 10 Compliance

| Risk | Mitigation |
|------|-----------|
| **A01: Broken Access Control** | RBAC + data-level filtering per user assignment |
| **A02: Cryptographic Failures** | Bcrypt for passwords, SSL for DB connection, S3 encryption at rest |
| **A03: Injection** | Prisma ORM parameterized queries, input validation |
| **A04: Insecure Design** | Soft delete pattern, audit trail, referential integrity |
| **A05: Security Misconfiguration** | Environment variables, no default passwords in seed |
| **A07: Identification and Authentication Failures** | NextAuth session management, secure password hashing |
| **A09: Security Logging and Monitoring Failures** | Audit trail (createdBy, modifiedBy), application logging |

</details>

---

<details>
<summary><strong>Performance & Data Volume</strong> — Estimasi volume data dan optimasi performa</summary>

## Performance & Data Volume

### Data Volume Estimates (3-Year Projection)

| Tabel | Current | Year 1 | Year 2 | Year 3 | Growth Rate |
|-------|---------|--------|--------|--------|-------------|
| **Province** | 5 | 5 | 5 | 5 | Static (reference data) |
| **District** | 50 | 50 | 50 | 50 | Static |
| **Subdistrict** | 500 | 500 | 500 | 500 | Static |
| **Village** | 5000 | 5000 | 5000 | 5000 | Static |
| **User** | 20 | 50 | 100 | 150 | ~50/year |
| **FarmerGroup** | 100 | 150 | 200 | 250 | ~50/year |
| **Farmer** | 5000 | 15000 | 30000 | 50000 | ~15k/year (high growth) |
| **TrainingPackage** | 5 | 7 | 10 | 10 | Slow growth |
| **TrainingActivity** | 200 | 800 | 1600 | 2400 | ~800/year (4 training/KT/year avg) |
| **TrainingParticipant** | 10000 | 50000 | 120000 | 200000 | ~50k/year (high growth, many-to-many) |
| **MenuItem** | 30 | 40 | 50 | 60 | Slow growth |
| **RolePermission** | 120 | 160 | 200 | 240 | Follows MenuItem growth (4 roles × menus × 4 perms) |
| **RBAC User Assignments** | 100 | 300 | 600 | 900 | Follows User growth |

### Table Size Estimates (Year 3)

| Tabel | Record Count | Avg Row Size | Total Size | Index Size | Total |
|-------|-------------|--------------|------------|-----------|-------|
| **Farmer** | 50k | 500 bytes | ~25 MB | ~5 MB | ~30 MB |
| **TrainingParticipant** | 200k | 300 bytes | ~60 MB | ~15 MB | ~75 MB |
| **TrainingActivity** | 2.4k | 700 bytes | ~1.7 MB | ~0.5 MB | ~2.2 MB |
| **FarmerGroup** | 250 | 600 bytes | ~150 KB | ~50 KB | ~200 KB |
| **Geography (all)** | 5.5k | 300 bytes | ~1.65 MB | ~0.5 MB | ~2.15 MB |
| **RBAC (all)** | 900 | 400 bytes | ~360 KB | ~100 KB | ~460 KB |
| **TOTAL (Year 3)** | ~260k records | — | ~90 MB | ~22 MB | **~112 MB** |

**Conclusion**: Database size sangat manageable di PostgreSQL, tidak butuh partitioning / sharding.

### Query Performance Optimization

#### Critical Queries

| Query | Expected Volume | Index Used | Target Time |
|-------|-----------------|-----------|-------------|
| **List Farmers by KT** | 100-500 rows | `Farmer.farmerGroupId` + `isActive` | < 300ms |
| **Training Participant List** | 50-200 rows | `TrainingParticipant.activityId` + `isActive` | < 300ms |
| **User Login** | 1 row | `User.email` (UNIQUE) | < 100ms |
| **RBAC Permission Check** | 1-10 rows | Composite UNIQUE on RBAC tables | < 150ms |
| **Dashboard Stats Aggregation** | 1 row (aggregate) | Materialized view (future) | < 1s |

#### Pagination Strategy

Untuk list queries dengan banyak data (> 1000 rows), gunakan pagination:
- **Offset-based**: `LIMIT` + `OFFSET` (simple, tapi lambat di offset besar)
- **Cursor-based**: Pakai `id` atau `createdAt` sebagai cursor (fast, tapi tidak bisa random access)

```typescript
// Offset-based (current)
const farmers = await prisma.farmer.findMany({
  where: { farmerGroupId: 'xxx', isActive: true },
  skip: (page - 1) * pageSize,
  take: pageSize,
});

// Cursor-based (future optimization)
const farmers = await prisma.farmer.findMany({
  where: { farmerGroupId: 'xxx', isActive: true },
  take: pageSize,
  cursor: lastId ? { id: lastId } : undefined,
  skip: lastId ? 1 : 0,
});
```

#### N+1 Query Prevention

Gunakan Prisma `include` untuk eager loading:

```typescript
// BAD — N+1 query (1 query farmers + N query farmerGroup)
const farmers = await prisma.farmer.findMany();
farmers.forEach(f => console.log(f.farmerGroup.name)); // N queries

// GOOD — 1 query dengan JOIN
const farmers = await prisma.farmer.findMany({
  include: { farmerGroup: true },
});
```

### Database Connection Pooling

Prisma connection pool configuration:
```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10"
```

| Environment | Connection Limit | Pool Timeout |
|-------------|------------------|--------------|
| **Development** | 5 | 10s |
| **Staging** | 10 | 20s |
| **Production** | 20-50 | 30s |

**Notes**:
- Jangan set terlalu tinggi → exhaust PostgreSQL `max_connections`
- Monitor connection usage dengan `SHOW max_connections;` dan `SELECT count(*) FROM pg_stat_activity;`

### Caching Strategy

| Data Type | Cache TTL | Strategy |
|-----------|-----------|----------|
| **Geography (Province, District, etc)** | 24 hours | In-memory cache atau Redis (jarang berubah) |
| **TrainingPackage** | 1 hour | In-memory cache (5 rows only, very stable) |
| **Menu Items** | 1 hour | In-memory cache (stale-while-revalidate) |
| **Dashboard Aggregate Stats** | 5 minutes | Redis cache + background refresh |
| **User Session** | 30 days | NextAuth JWT (no DB query per request) |
| **RBAC Permissions** | 1 hour | In-memory per user session |

### Future Optimization Considerations

Jika data bertumbuh signifikan (> 1M records):
- **Partitioning**: Partition `TrainingParticipant` by `createdAt` (yearly) jika > 1M rows
- **Materialized Views**: Create materialized view untuk dashboard aggregation
- **Read Replicas**: Setup PostgreSQL read replica untuk reporting queries
- **Archive Strategy**: Move old training data (> 5 years) ke archive table atau separate DB

</details>

---

<details>
<summary><strong>Farmer Model</strong> — Detail model Farmer dengan joinedYear field</summary>

## Farmer Model Details

### Core Fields

| Field | Type | Constraint | Keterangan |
|-------|------|-----------|------------|
| `id` | String | PK | CUID generated |
| `farmerGroupId` | String | FK | Relasi ke FarmerGroup |
| `gender` | Gender | Required | Enum: M / F |
| `name` | String | Required | Nama petani |
| `farmerId` | String | Required, Indexed | ID petani (bisa sama dengan NIK atau ID internal KT) |
| `nik` | String? | Optional | NIK 16 digit (nullable) |
| `address` | String? | Optional | Alamat tinggal |
| `birthPlace` | String? | Optional | Tempat lahir |
| `birthDate` | DateTime? | Optional | Tanggal lahir |
| `joinedYear` | Int? | Optional | Tahun bergabung dengan KT (range: 1900-2100) |

### Relationships

```
FarmerGroup (1) ─→ (N) Farmer
Farmer (1) ─→ (N) TrainingParticipant
```

### RBAC Filter Context

Farmer data difilter berdasarkan:
- `BY_DISTRICT`: User dengan assignment Province/District → akses semua Farmer di KT dalam district scope
- `BY_FARMER_GROUP`: User dengan assignment KT spesifik → akses hanya Farmer di KT assigned
- `ALL`: SUPERADMIN atau user tanpa assignment → akses semua Farmer

### Bulk Upload Support

- **Template-less approach**: Upload Excel tanpa template, user mapping kolom secara dinamis
- **Smart Validation**:
  - Gender normalization: `L/P` → `M/F`
  - NIK validation: harus 16 digit angka atau kosong
  - Date parsing: Excel serial number atau format string `dd/mm/yyyy`, `yyyy-mm-dd`
  - joinedYear validation: integer 1900-2100 atau kosong
- **Duplicate Check**: File-level dan DB-level untuk `farmerId` dalam `farmerGroupId` yang sama
- **Download Error Report**: User bisa download Excel berisi hanya baris error dengan kolom "Keterangan"

</details>

---

<details>
<summary><strong>Training Module</strong> — Struktur 3-layer training management</summary>

## Training Module Architecture

### Overview

Modul Training menggunakan struktur 3-layer untuk mengelola data pelatihan petani:
1. **TrainingPackage** (ref) — Katalog paket pelatihan standar
2. **TrainingActivity** (transactional) — Aktivitas pelatihan yang dilaksanakan per Kelompok Tani
3. **TrainingParticipant** (many-to-many) — Peserta pelatihan (relasi Farmer ↔ Training Activity)

### Training Data Flow

```mermaid
flowchart LR
    TP[TrainingPackage<br/>ref_training_package] --> TA[TrainingActivity<br/>tbl_training_activity]
    FG[FarmerGroup] --> TA
    TA --> TPART[TrainingParticipant<br/>tbl_training_participant]
    F[Farmer] --> TPART
```

### Training Package Categories

| Code | Nama Paket |
|------|-----------|
| `PAKET_1_BMP_PC_RSPO_NKT` | Paket 1: BMP, PC, RSPO, NKT |
| `PAKET_2_MK` | Paket 2: Manajemen Kebun |
| `PAKET_2_K3` | Paket 2: K3 (Keselamatan dan Kesehatan Kerja) |
| `PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV` | Paket 3-4: GEDSI, Financial Literacy, Livelihood, Business Development |
| `OTHER` | Paket lainnya |

### Training Activity Features

- **Evidence Upload**: Setiap aktivitas pelatihan bisa menyertakan bukti dokumen (PDF) yang disimpan di S3
  - `evidence_key`: S3 object key
  - `evidence_name`: Nama file asli untuk display
- **Location**: Lokasi pelaksanaan pelatihan (teks bebas)
- **Training Date**: Tanggal pelaksanaan pelatihan

### Training Participant Management

- **Many-to-Many Relation**: Satu petani bisa ikut banyak training, satu training bisa punya banyak peserta
- **Unique Constraint**: `(activityId, farmerId)` — tidak boleh duplikasi peserta di aktivitas yang sama
- **Bulk Upload Support**: Upload peserta via Excel/CSV dengan validasi 3-tier (Valid, Warning, Error)
- **RBAC Filter**: Data peserta mengikuti access context dari Farmer (BY_DISTRICT / BY_FARMER_GROUP)

### Schema Relationships

```
TrainingPackage (1) ─→ (N) TrainingActivity
FarmerGroup (1) ─→ (N) TrainingActivity
TrainingActivity (1) ─→ (N) TrainingParticipant
Farmer (1) ─→ (N) TrainingParticipant
```

</details>

---

<details>
<summary><strong>File Structure</strong> — Struktur file Prisma schema</summary>

## File Structure

```
prisma/schema/
├── _config.prisma        # Generator, datasource, enums
├── user.prisma           # User identity
├── geography.prisma      # Province → District → Subdistrict → Village
├── farmer-group.prisma   # FarmerGroup
├── farmer.prisma         # Farmer
├── training.prisma       # TrainingPackage, TrainingActivity, TrainingParticipant
├── rbac.prisma           # RolePermission, UserProvince, UserDistrict, UserFarmerGroup, UserPermissionOverride
└── menu.prisma           # MenuItem
```

</details>
