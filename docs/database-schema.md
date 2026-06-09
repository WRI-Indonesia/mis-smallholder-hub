# Database Schema — ERD

> Visualisasi Entity Relationship Diagram untuk schema aktif.
> Update terakhir: 2026-06-09

---

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
        Boolean is_active
        DateTime created_at
        String created_by
        DateTime modified_at
        String modified_by
    }

    FarmerGroup ||--o{ Farmer : "has"

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

---

## Common Fields (semua tabel)

| Field | Type | Keterangan |
|-------|------|-----------|
| `created_at` | DateTime | Auto-set saat create |
| `created_by` | String? | User ID yang membuat (null saat seed) |
| `modified_at` | DateTime | Auto-update saat edit |
| `modified_by` | String? | User ID yang terakhir edit |

---

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
```

---

## Table Naming Convention

| Prefix | Arti | Contoh |
|--------|------|--------|
| `tbl_` | Tabel transaksional / data utama | `tbl_user`, `tbl_farmer_group` |
| `reg_` | Reference data regional | `reg_province`, `reg_district` |
| `ref_` | Reference data domain (nanti) | `ref_commodity`, `ref_batch` |
| `rbac_` | Tabel RBAC / permission | `rbac_role_permission`, `rbac_user_district` |
| `cache_` | Cache / materialized view | `cache_dashboard_stats` |

---

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

---

## File Structure

```
prisma/schema/
├── _config.prisma        # Generator, datasource, enums
├── user.prisma           # User identity
├── geography.prisma      # Province → District → Subdistrict → Village
├── farmer-group.prisma   # FarmerGroup
├── farmer.prisma         # Farmer
├── rbac.prisma           # RolePermission, UserProvince, UserDistrict, UserFarmerGroup, UserPermissionOverride
└── menu.prisma           # MenuItem
```
