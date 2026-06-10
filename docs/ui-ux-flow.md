# Smallholder HUB — UI/UX Flow

> Dokumentasi alur navigasi dan user journey berdasarkan role.
> Last updated: 2026-06-10

---

## Status Legend

| Symbol | Status | Keterangan |
|--------|--------|-----------|
| ✅ | Done | Implementasi selesai dan terverifikasi |
| 🟡 | In Progress | Sedang dikerjakan atau partial |
| 🔲 | Planned | Masuk roadmap tetapi belum dimulai |
| 🔴 | Blocked | Terhambat dependency atau keputusan |

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Public User Flow](#public-user-flow)
3. [SUPERADMIN Flow](#superadmin-flow)
4. [ADMIN Flow](#admin-flow)
5. [OPERATOR Flow](#operator-flow)
6. [MANAGEMENT Flow](#management-flow)
7. [RBAC & Data Access Pattern](#rbac--data-access-pattern)

---

## System Overview

```mermaid
flowchart TD
    START([User Access System]) --> AUTH{Authenticated?}
    AUTH -->|No| PUBLIC[Public Routes]
    AUTH -->|Yes| ROLE{Check Role}
    
    PUBLIC --> HOME[✅ Home Page]
    PUBLIC --> COMM[🔲 Community]
    PUBLIC --> KNOW[🔲 Knowledge Management]
    
    ROLE -->|SUPERADMIN| SA[SUPERADMIN Panel]
    ROLE -->|ADMIN| ADM[ADMIN Panel]
    ROLE -->|OPERATOR| OPR[OPERATOR Panel]
    ROLE -->|MANAGEMENT| MGT[MANAGEMENT Panel]
    
    SA --> DASH_SA[Full Dashboard Access]
    SA --> MD_SA[Full Master Data Access]
    SA --> SET_SA[Full Settings Access]
    SA --> RPT_SA[Full Report Access]
    SA --> BULK_SA[Full Bulk Upload Access]
    SA --> TOOLS_SA[Full Tools Access]
    
    ADM --> DASH_ADM[Limited Dashboard]
    ADM --> MD_ADM[Filtered Master Data]
    ADM --> SET_ADM[Limited Settings]
    ADM --> RPT_ADM[Limited Report]
    ADM --> BULK_ADM[Limited Bulk Upload]
    
    OPR --> DASH_OPR[View Dashboard]
    OPR --> MD_OPR[CRUD within scope]
    OPR --> RPT_OPR[View Reports]
    
    MGT --> DASH_MGT[View Dashboard]
    MGT --> RPT_MGT[View Reports]
    
    style HOME fill:#90EE90
    style COMM fill:#FFE4B5
    style KNOW fill:#FFE4B5
    style SA fill:#90EE90
    style ADM fill:#90EE90
    style OPR fill:#90EE90
    style MGT fill:#90EE90
```

---

## Public User Flow

```mermaid
flowchart LR
    subgraph PUBLIC["✅ Public Routes"]
        HOME[✅ Home Page<br/>Hero + Info Cards]
        
        COMM[🔲 Community<br/>Placeholder - Coming Soon]
        KNOW[🔲 Knowledge Management<br/>Placeholder - Coming Soon]
        LOGIN[✅ Login Page<br/>NextAuth Credentials]
        
        HOME --> LOGIN
        HOME --> COMM
        HOME --> KNOW
    end
    
    LOGIN --> ADMIN_PANEL[Admin Panel<br/>Based on Role]
    
    style HOME fill:#90EE90
    style LOGIN fill:#90EE90
    style COMM fill:#FFE4B5
    style KNOW fill:#FFE4B5
```

---

## SUPERADMIN Flow

**Full system access - no data filtering, all permissions granted**

```mermaid
flowchart TD
    SA_HOME([SUPERADMIN Login]) --> SA_DASH[Dashboard]
    
    %% Dashboard Branch
    SA_DASH --> SA_DASH_BASIC[🔲 Basic Dashboard<br/>Summary Cards + Filter]
    SA_DASH --> SA_DASH_MAP[🔲 Interactive Map<br/>KT Markers + Filter]
    SA_DASH --> SA_DASH_BMP[🔲 Dashboard BMP<br/>Best Management Practice]
    
    %% Master Data Branch
    SA_HOME --> SA_MD[Master Data]
    
    SA_MD --> SA_MD_REGION[✅ Regions<br/>Province/District/Subdistrict/Village]
    SA_MD --> SA_MD_GROUP[✅ Farmer Groups<br/>List/Detail/CRUD]
    SA_MD --> SA_MD_FARMER[✅ Farmers<br/>List/Detail/CRUD + RBAC]
    SA_MD --> SA_MD_PARCEL[🔲 Parcels<br/>Map + Polygon]
    SA_MD --> SA_MD_TRAINING[🔲 Training<br/>Participants + Evidence]
    SA_MD --> SA_MD_PROD[🔲 Production<br/>Period + Chart]
    SA_MD --> SA_MD_STAFF[🔲 Staff<br/>WRI + Activity]
    SA_MD --> SA_MD_HCV[🔲 HCV<br/>High Conservation Value]
    SA_MD --> SA_MD_BUSDEV[🔲 BUSDEV<br/>Business Development]
    SA_MD --> SA_MD_IMPACT[🔲 IMPACT<br/>Impact Metrics]
    SA_MD --> SA_MD_WORKPLAN[🔲 Workplan<br/>Annual Planning]
    
    %% Settings Branch
    SA_HOME --> SA_SET[Settings]
    SA_SET --> SA_SET_USER[✅ User Management<br/>CRUD + Data Access]
    SA_SET --> SA_SET_ROLE[✅ Role & Permission<br/>Matrix Management]
    SA_SET --> SA_SET_MENU[✅ Menu Management<br/>Dynamic Sidebar]
    SA_SET --> SA_SET_REGION[✅ Region Settings<br/>Tree Hierarchy]
    
    %% Report Branch
    SA_HOME --> SA_RPT[Report]
    
    SA_RPT --> SA_RPT_USER[🔲 Report User<br/>Table + Excel Export]
    SA_RPT --> SA_RPT_REGION[🔲 Report Region<br/>Hierarchy + Export]
    SA_RPT --> SA_RPT_KT[🔲 Report Kelompok Tani<br/>Cascade Filter + Export]
    
    %% Bulk Upload Branch
    SA_HOME --> SA_BULK[Bulk Upload]
    SA_BULK --> SA_BULK_FARMER[✅ Bulk Farmer<br/>Excel Mapping + Validation]
    SA_BULK --> SA_BULK_KT[🔲 Bulk KT<br/>CSV + Preview]
    SA_BULK --> SA_BULK_REGION[🔲 Bulk Region<br/>Hierarchy Validation]
    
    %% Tools Branch
    SA_HOME --> SA_TOOLS[🟡 Tools]
    SA_TOOLS --> SA_TOOLS_EXPORT[✅ Export CSV]
    SA_TOOLS --> SA_TOOLS_S3[🟡 S3/PDF Manager]
    SA_TOOLS --> SA_TOOLS_GIS[🔲 GIS Utilities]
    
    %% Profile
    SA_HOME --> SA_PROFILE[✅ Profile<br/>Change Password]
    
    style SA_MD_REGION fill:#90EE90
    style SA_MD_GROUP fill:#90EE90
    style SA_MD_FARMER fill:#90EE90
    style SA_MD_PARCEL fill:#FFE4B5
    style SA_MD_TRAINING fill:#FFE4B5
    style SA_MD_PROD fill:#FFE4B5
    style SA_MD_STAFF fill:#FFE4B5
    style SA_MD_HCV fill:#FFE4B5
    style SA_MD_BUSDEV fill:#FFE4B5
    style SA_MD_IMPACT fill:#FFE4B5
    style SA_MD_WORKPLAN fill:#FFE4B5
    style SA_SET_USER fill:#90EE90
    style SA_SET_ROLE fill:#90EE90
    style SA_SET_MENU fill:#90EE90
    style SA_SET_REGION fill:#90EE90
    style SA_RPT_USER fill:#FFE4B5
    style SA_RPT_REGION fill:#FFE4B5
    style SA_RPT_KT fill:#FFE4B5
    style SA_BULK_FARMER fill:#90EE90
    style SA_BULK_KT fill:#FFE4B5
    style SA_BULK_REGION fill:#FFE4B5
    style SA_TOOLS_EXPORT fill:#90EE90
    style SA_TOOLS_S3 fill:#FFFF99
    style SA_TOOLS_GIS fill:#FFE4B5
    style SA_PROFILE fill:#90EE90
    style SA_DASH_BASIC fill:#FFE4B5
    style SA_DASH_MAP fill:#FFE4B5
    style SA_DASH_BMP fill:#FFE4B5
```

---

## ADMIN Flow

**District/Province level access - filtered by UserDistrict/UserProvince**

```mermaid
flowchart TD
    
    ADM_HOME([ADMIN Login]) --> ADM_DASH[Dashboard<br/>🔲 Filtered by District]
    
    %% Master Data - Filtered
    ADM_HOME --> ADM_MD[Master Data<br/>Filtered by Assignment]
    ADM_MD --> ADM_MD_GROUP[✅ Farmer Groups<br/>Within Assigned District]
    ADM_MD --> ADM_MD_FARMER[✅ Farmers<br/>Within Assigned District/Group]
    ADM_MD --> ADM_MD_PARCEL[🔲 Parcels<br/>Within Assigned Scope]
    ADM_MD --> ADM_MD_TRAINING[🔲 Training<br/>Within Assigned Scope]
    
    %% Limited Settings Access
    ADM_HOME --> ADM_SET[Settings<br/>Limited Access]
    ADM_SET --> ADM_SET_USER[View/Edit Users<br/>Based on Permission]
    ADM_SET --> ADM_SET_REGION[View Region Hierarchy]
    
    %% Report Access
    ADM_HOME --> ADM_RPT[Report<br/>🔲 Filtered Data]
    ADM_RPT --> ADM_RPT_USER[Report User<br/>Within Scope]
    ADM_RPT --> ADM_RPT_KT[Report KT<br/>Within District]
    
    %% Bulk Upload - Limited
    ADM_HOME --> ADM_BULK[Bulk Upload<br/>Within Scope]
    ADM_BULK --> ADM_BULK_FARMER[✅ Bulk Farmer<br/>Assigned Groups Only]
    
    %% Profile
    ADM_HOME --> ADM_PROFILE[✅ Profile<br/>Change Password]
    
    style ADM_MD_GROUP fill:#90EE90
    style ADM_MD_FARMER fill:#90EE90
    style ADM_MD_PARCEL fill:#FFE4B5
    style ADM_MD_TRAINING fill:#FFE4B5
    style ADM_SET_USER fill:#90EE90
    style ADM_SET_REGION fill:#90EE90
    style ADM_BULK_FARMER fill:#90EE90
    style ADM_PROFILE fill:#90EE90
    style ADM_DASH fill:#FFE4B5
    style ADM_RPT fill:#FFE4B5
```

---

## OPERATOR Flow

**Field-level access - filtered by UserFarmerGroup**

```mermaid
flowchart TD
    OPR_HOME([OPERATOR Login]) --> OPR_DASH[Dashboard<br/>🔲 View Summary]
    
    %% Master Data - CRUD within assigned KT
    OPR_HOME --> OPR_MD[Master Data<br/>Assigned KT Only]
    OPR_MD --> OPR_MD_FARMER[✅ Farmers<br/>CRUD within Assigned KT]
    OPR_MD --> OPR_MD_PARCEL[🔲 Parcels<br/>CRUD within Assigned KT]
    OPR_MD --> OPR_MD_TRAINING[🔲 Training<br/>Record Attendance]
    OPR_MD --> OPR_MD_PROD[🔲 Production<br/>Input Data]
    
    %% Report - View Only
    OPR_HOME --> OPR_RPT[Report<br/>🔲 View Only]
    OPR_RPT --> OPR_RPT_KT[Report KT<br/>Assigned Groups Only]
    
    %% Profile
    OPR_HOME --> OPR_PROFILE[✅ Profile<br/>Change Password]
    
    style OPR_MD_FARMER fill:#90EE90
    style OPR_MD_PARCEL fill:#FFE4B5
    style OPR_MD_TRAINING fill:#FFE4B5
    style OPR_MD_PROD fill:#FFE4B5
    style OPR_PROFILE fill:#90EE90
    style OPR_DASH fill:#FFE4B5
    style OPR_RPT fill:#FFE4B5
```

---

## MANAGEMENT Flow

**Read-only dashboard and reports**

```mermaid
flowchart TD
    MGT_HOME([MANAGEMENT Login]) --> MGT_DASH[Dashboard<br/>🔲 View All Metrics]
    
    MGT_DASH --> MGT_DASH_SUMMARY[Summary Cards<br/>Organization-wide]
    MGT_DASH --> MGT_DASH_MAP[🔲 Interactive Map<br/>All KT Locations]
    MGT_DASH --> MGT_DASH_BMP[🔲 BMP Dashboard<br/>Performance Metrics]
    
    %% Report Access
    MGT_HOME --> MGT_RPT[Report<br/>🔲 View All Reports]
    MGT_RPT --> MGT_RPT_USER[Report User<br/>All Users]
    MGT_RPT --> MGT_RPT_REGION[Report Region<br/>All Regions]
    MGT_RPT --> MGT_RPT_KT[Report KT<br/>All Groups]
    MGT_RPT --> MGT_RPT_TRAINING[🔲 Report Training<br/>Summary]
    MGT_RPT --> MGT_RPT_PROD[🔲 Report Production<br/>Charts + Export]
    
    %% Profile
    MGT_HOME --> MGT_PROFILE[✅ Profile<br/>Change Password]
    
    style MGT_PROFILE fill:#90EE90
    style MGT_DASH fill:#FFE4B5
    style MGT_RPT fill:#FFE4B5
    style MGT_DASH_MAP fill:#FFE4B5
    style MGT_DASH_BMP fill:#FFE4B5
```

---

## RBAC & Data Access Pattern

### Permission Resolution Flow

```mermaid
flowchart TD
    START([User Action Request]) --> AUTH{Authenticated?}
    AUTH -->|No| DENY[❌ Redirect to Login]
    AUTH -->|Yes| SUPER{Role = SUPERADMIN?}
    
    SUPER -->|Yes| GRANT[✅ Grant Full Access<br/>Skip all filters]
    SUPER -->|No| MENU{Has Menu Access?}
    
    MENU -->|No| HIDE[🚫 Hide Menu Item]
    MENU -->|Yes| PERM{Has Required Permission?}
    
    PERM -->|No| FORBID[❌ Forbidden]
    PERM -->|Yes| OVERRIDE{Has Override?}
    
    OVERRIDE -->|Granted| GRANT
    OVERRIDE -->|Revoked| FORBID
    OVERRIDE -->|No Override| ROLE_PERM[Check Role Permission]
    
    ROLE_PERM --> DATA_SCOPE{Resolve Data Scope}
    
    DATA_SCOPE --> UP{UserProvince<br/>Assigned?}
    UP -->|Yes| EXPAND_PROV[Expand to Districts<br/>Get all KT in Province]
    UP -->|No| UD{UserDistrict<br/>Assigned?}
    
    UD -->|Yes| EXPAND_DIST[Filter by Districts<br/>Get all KT in Districts]
    UD -->|No| UFG{UserFarmerGroup<br/>Assigned?}
    
    UFG -->|Yes| FILTER_KT[Filter by KT<br/>Only Assigned Groups]
    UFG -->|No| NO_ACCESS[🚫 No Data Access]
    
    EXPAND_PROV --> QUERY[Execute Query<br/>with Filter]
    EXPAND_DIST --> QUERY
    FILTER_KT --> QUERY
    QUERY --> GRANT
    
    style GRANT fill:#90EE90
    style DENY fill:#FFB6C1
    style FORBID fill:#FFB6C1
    style HIDE fill:#D3D3D3
    style NO_ACCESS fill:#FFB6C1
```

### Data Access Hierarchy

```mermaid
flowchart LR
    subgraph "Access Context Resolution"
        USER[User] --> CHECK{Check Assignments}
        
        CHECK --> CASE1[Case 1:<br/>SUPERADMIN]
        CHECK --> CASE2[Case 2:<br/>No Assignment]
        CHECK --> CASE3[Case 3:<br/>UserProvince]
        CHECK --> CASE4[Case 4:<br/>UserDistrict]
        CHECK --> CASE5[Case 5:<br/>UserFarmerGroup Only]
        
        CASE1 --> MODE1[Mode: ALL<br/>✅ Full Access]
        CASE2 --> MODE2[Mode: ALL<br/>✅ Unrestricted]
        CASE3 --> MODE3[Mode: BY_DISTRICT<br/>🔍 Province → Districts]
        CASE4 --> MODE4[Mode: BY_DISTRICT<br/>🔍 Assigned Districts]
        CASE5 --> MODE5[Mode: BY_FARMER_GROUP<br/>🔍 Specific Groups]
        
        MODE1 --> RESULT[Query Execution]
        MODE2 --> RESULT
        MODE3 --> RESULT
        MODE4 --> RESULT
        MODE5 --> RESULT
    end
    
    style MODE1 fill:#90EE90
    style MODE2 fill:#90EE90
    style MODE3 fill:#87CEEB
    style MODE4 fill:#87CEEB
    style MODE5 fill:#FFD700
```

---

## Master Data CRUD Flow

### Standard CRUD Pattern (Farmer Example)

```mermaid
flowchart TD
    START([User Access Farmer Module]) --> LIST[Farmer List Page]
    
    LIST --> FILTER[Apply Filters<br/>Search + KT + Status]
    FILTER --> TABLE[✅ DataTable<br/>Pagination + Sort]
    
    TABLE --> VIEW_BTN{Action: View?}
    TABLE --> EDIT_BTN{Action: Edit?}
    TABLE --> DELETE_BTN{Action: Delete?}
    TABLE --> ADD_BTN{Add Button?}
    
    VIEW_BTN -->|Has VIEW Permission| DETAIL[✅ Detail Page<br/>Read-only Info]
    EDIT_BTN -->|Has EDIT Permission| EDIT_MODAL[✅ Edit Modal<br/>Form + Validation]
    DELETE_BTN -->|Has DELETE Permission| DELETE_MODAL[✅ Soft Delete<br/>Confirmation Dialog]
    ADD_BTN -->|Has CREATE Permission| ADD_MODAL[✅ Create Modal<br/>Form + Validation]
    
    EDIT_MODAL --> VALIDATE{Zod Validation}
    ADD_MODAL --> VALIDATE
    
    VALIDATE -->|Error| SHOW_ERROR[Show Error Messages]
    VALIDATE -->|Success| SERVER_ACTION[Server Action]
    
    SERVER_ACTION --> BACKEND_CHECK{Permission Check<br/>at Backend}
    BACKEND_CHECK -->|Denied| FORBIDDEN[❌ Forbidden]
    BACKEND_CHECK -->|Allowed| QUERY[Execute Query<br/>with RBAC Filter]
    
    QUERY --> AUDIT[Add Audit Trail<br/>created_by/modified_by]
    AUDIT --> SUCCESS[✅ Success Toast]
    SUCCESS --> REFRESH[Refresh Data]
    REFRESH --> TABLE
    
    DELETE_MODAL --> SOFT_DELETE[Update isActive = false]
    SOFT_DELETE --> AUDIT
    
    style TABLE fill:#90EE90
    style DETAIL fill:#90EE90
    style EDIT_MODAL fill:#90EE90
    style ADD_MODAL fill:#90EE90
    style DELETE_MODAL fill:#90EE90
    style SUCCESS fill:#90EE90
    style FORBIDDEN fill:#FFB6C1
```

---

## Bulk Upload Flow

### Farmer Bulk Upload Pattern (✅ Implemented)

```mermaid
flowchart TD
    START([User Access Bulk Upload]) --> SELECT_KT[Select Farmer Group<br/>✅ Searchable Combobox]
    
    SELECT_KT --> UPLOAD_FILE[Upload Excel File<br/>✅ .xlsx format]
    
    UPLOAD_FILE --> PARSE[Parse Excel<br/>✅ Detect Columns]
    
    PARSE --> MAP[✅ Dynamic Column Mapping<br/>Auto-match + Manual Select]
    
    MAP --> VALIDATE[✅ Smart Validation]
    
    VALIDATE --> NORM[Normalize Data<br/>Gender L/P → M/F<br/>NIK format<br/>Date parsing]
    
    NORM --> CHECK[File-level + DB-level<br/>Uniqueness Check]
    
    CHECK --> PREVIEW[✅ Preview Table<br/>Valid + Error Rows]
    
    PREVIEW --> FILTER{User Action}
    
    FILTER -->|Download Full| EXCEL_FULL[✅ Export All Rows<br/>With Status Column]
    FILTER -->|Download Errors Only| EXCEL_ERROR[✅ Export Invalid Rows<br/>With Error Messages]
    FILTER -->|Save Valid Data| SAVE{Confirm Save?}
    
    SAVE -->|Yes| TRANSACTION[✅ Bulk Insert<br/>Transaction-based]
    SAVE -->|No| PREVIEW
    
    TRANSACTION --> SUCCESS[✅ Success Toast<br/>X records saved]
    SUCCESS --> REDIRECT[Redirect to Farmer List]
    
    EXCEL_FULL --> PREVIEW
    EXCEL_ERROR --> PREVIEW
    
    style SELECT_KT fill:#90EE90
    style UPLOAD_FILE fill:#90EE90
    style MAP fill:#90EE90
    style VALIDATE fill:#90EE90
    style PREVIEW fill:#90EE90
    style TRANSACTION fill:#90EE90
    style EXCEL_FULL fill:#90EE90
    style EXCEL_ERROR fill:#90EE90
    style SUCCESS fill:#90EE90
```

---

## Report Export Flow

### Report Generation Pattern (🔲 Planned)

```mermaid
flowchart TD
    START([User Access Report Module]) --> MENU[Report Menu]
    
    MENU --> RPT_USER[🔲 Report User]
    MENU --> RPT_REGION[🔲 Report Region]
    MENU --> RPT_KT[🔲 Report KT]
    
    RPT_USER --> FILTER_USER[Filter Options<br/>Role, Status, Region]
    RPT_REGION --> FILTER_REGION[Filter Options<br/>Province, District]
    RPT_KT --> FILTER_KT[Cascade Filter<br/>Province → District → KT]
    
    FILTER_USER --> TABLE_USER[DataTable<br/>User Summary]
    FILTER_REGION --> TABLE_REGION[DataTable<br/>Region Hierarchy]
    FILTER_KT --> TABLE_KT[DataTable<br/>KT Details]
    
    TABLE_USER --> EXPORT{Export Action}
    TABLE_REGION --> EXPORT
    TABLE_KT --> EXPORT
    
    EXPORT -->|Excel| GEN_EXCEL[Generate Excel<br/>exceljs]
    EXPORT -->|PDF| GEN_PDF[Generate PDF<br/>Future Phase]
    
    GEN_EXCEL --> DOWNLOAD[✅ Download File]
    GEN_PDF --> DOWNLOAD
    
    style RPT_USER fill:#FFE4B5
    style RPT_REGION fill:#FFE4B5
    style RPT_KT fill:#FFE4B5
    style GEN_EXCEL fill:#FFE4B5
    style GEN_PDF fill:#D3D3D3
```

---

## Dashboard Flow (🔲 Planned)

```mermaid
flowchart TD
    START([User Access Dashboard]) --> RESOLVE{Resolve Data Scope}
    
    RESOLVE -->|SUPERADMIN| ALL[All Data]
    RESOLVE -->|BY_DISTRICT| DIST[District Filter]
    RESOLVE -->|BY_FARMER_GROUP| KT[KT Filter]
    
    ALL --> DASH[🔲 Dashboard Page]
    DIST --> DASH
    KT --> DASH
    
    DASH --> CARDS[🔲 Summary Cards<br/>Users, KT, Farmers, etc]
    DASH --> FILTER[🔲 District Filter Dropdown]
    DASH --> MAP[🔲 Interactive Map<br/>KT Markers]
    DASH --> BMP[🔲 BMP Charts<br/>Best Management Practice]
    
    FILTER --> REFRESH[Reload Dashboard Data]
    REFRESH --> CARDS
    
    MAP --> POPUP[Click KT Marker<br/>Show Info]
    
    BMP --> CATEGORY[Filter by Category<br/>Grouped Bar Chart]
    
    style DASH fill:#FFE4B5
    style CARDS fill:#FFE4B5
    style FILTER fill:#FFE4B5
    style MAP fill:#FFE4B5
    style BMP fill:#FFE4B5
```

---

## Navigation Structure

### Admin Sidebar Menu Hierarchy

```
📊 Dashboard (🔲 DASH-01)
├── Basic Dashboard
├── Interactive Map
└── Dashboard BMP

📁 Master Data
├── ✅ Regions (MD-01)
├── ✅ Kelompok Tani (MD-02)
├── ✅ Petani (MD-03)
├── 🔲 Lahan / Parcels (MD-04)
├── 🔲 Pelatihan / Training (MD-05)
├── 🔲 Produksi / Production (MD-06)
├── 🔲 Staff (MD-07)
├── 🔲 HCV (MD-08)
├── 🔲 BUSDEV (MD-09)
├── 🔲 IMPACT (MD-10)
└── 🔲 Workplan (MD-11)

📈 Report (🔲 RPT-01)
├── 🔲 Report User
├── 🔲 Report Region
└── 🔲 Report Kelompok Tani

📤 Bulk Upload (🟡 BULK-01)
├── ✅ Bulk Upload Petani (BULK-03)
├── 🔲 Bulk Upload Kelompok Tani
└── 🔲 Bulk Upload Region

⚙️ Settings
├── ✅ User Management (PLATFORM-04)
├── ✅ Role & Permission (PLATFORM-04)
├── ✅ Menu Management (PLATFORM-05)
└── ✅ Region Settings (MD-01)

🔧 Tools (🟡 TOOLS-01)
├── ✅ Export CSV
├── 🟡 S3/PDF Manager
└── 🔲 GIS Utilities

👤 Profile
└── ✅ Change Password
```

---

## Implementation Status Summary

### Completed Modules (✅)

| Module | Phase | Features |
|--------|-------|----------|
| Platform Foundation | PLATFORM-01/02/03/04/05 | Next.js setup, Prisma schema, Auth, RBAC, Menu system |
| Regions | MD-01 | Tree hierarchy, CRUD, Province/District/Subdistrict/Village |
| Farmer Groups | MD-02 | List, Detail, CRUD, RBAC filtering |
| Farmers | MD-03 | Full CRUD, RBAC, DataTable, Excel export |
| Bulk Upload Farmer | BULK-03 | Excel mapping, smart validation, preview, error download |
| User Management | PLATFORM-04 | CRUD, Data Access, Permission Override |
| Settings | PLATFORM-04/05 | Role/Permission matrix, Menu management, Region settings |

### In Progress (🟡)

| Module | Phase | Status |
|--------|-------|--------|
| Tools | TOOLS-01 | Export CSV ✅, S3/PDF CLI partial |
| Bulk Upload Menu | BULK-01 | Menu & route setup done, KT/Region pending |

### Planned - Now (🔲)

| Module | Phase | Next Steps |
|--------|-------|-----------|
| Dashboard | DASH-01 | **URGENT**: Define scope (cards, metrics, filters) in 48h |
| Report | RPT-01 | Menu setup + placeholder pages → User/Region/KT reports |
| Bulk Upload KT | BULK-01 | CSV upload with validation & preview |

### Planned - Next (🔲)

| Module | Phase | Dependencies |
|--------|-------|--------------|
| Parcels | MD-04 | After MD-03 (Farmer) |
| Training | MD-05 | After MD-03/04 |
| Production | MD-06 | After MD-03, validate per-farmer vs per-parcel |
| Bulk Upload Region | BULK-02 | After BULK-01 (KT) |

### Planned - Later (🔲)


| Module | Phase | Notes |
|--------|-------|-------|
| Staff | MD-07 | Scope to be defined |
| HCV | MD-08 | High Conservation Value tracking |
| BUSDEV | MD-09 | Business Development module |
| IMPACT | MD-10 | Impact metrics & reporting |
| Workplan | MD-11 | Annual planning |
| CMS | CMS-01 | Content Management System |
| Community | COMM-01 | Community engagement features |
| i18n | COMM-02 | Internationalization |

### Blocked (🔴)

| Module | Phase | Blocker |
|--------|-------|---------|
| Dashboard BMP | DASH-04 | Requires DASH-01 & DASH-02 completion |

---

## Notes

### Current Priorities (2026-06-10)

1. **P0 - BUG-002**: Fix stale dashboard scripts in `/scripts/debug/`
2. **P0 - DASH-01**: Dashboard scope agreement (BLOCKING) - define in 48h
3. **P1 - RPT-01**: Menu & placeholder for Report module
4. **P1 - BULK-01**: Complete KT & Region bulk upload implementation

### Key Decisions Needed

| Decision | Owner | Deadline | Impact |
|----------|-------|----------|--------|
| Dashboard minimal scope | Product + Engineering | 2026-06-11 | DASH-01 implementation can start |
| Production data model | Product + Domain Expert | Before MD-06 | Per-farmer vs per-parcel structure |

### Testing Coverage


**Test Status**: 130 tests passing ✅

Covered modules:
- ✅ Auth & RBAC
- ✅ Menu system
- ✅ User management
- ✅ Region management
- ✅ Farmer management
- ✅ Bulk upload

Need coverage:
- Dashboard
- Report
- Training
- Parcel
- Production

### Code Compliance

**14/14 rules FULLY COMPLIANT** ✅

All code follows:
- Kebab-case naming
- English variables
- Zod validation
- Server actions in correct directory
- RBAC patterns (AccessContext discriminated union)
- Soft delete (isActive field)
- Proper data filtering
- UI/UX standards (loading states, table actions, Shadcn UI)

---

## Related Documentation

- [progress.md](./progress.md) - Detailed phase status & roadmap
- [rule.md](./rule.md) - Development rules & standards
- [database-schema.md](./database-schema.md) - ERD & schema documentation
- [general-rule.md](./general-rule.md) - Behavioral principles

---

**Last Updated**: 2026-06-10  
**Next Review**: After DASH-01 scope agreement
