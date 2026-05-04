# Database Schema

Berikut adalah visualisasi skema database Smallholder HUB MIS.

```
erDiagram
    %% Hierarchy
    Province ||--o{ District : "has"
    District ||--o{ Subdistrict : "has"
    Subdistrict ||--o{ Village : "has"

    %% Master Data & Users
    District ||--o{ FarmerGroup : "has"
    FarmerGroup ||--o{ FarmerGroupDetail : "has"
    FarmerGroupType ||--o{ FarmerGroupDetail : "type"
    FarmerGroup ||--o{ Farmer : "members"

    Farmer ||--o{ LandParcel : "owns"
    Batch ||--o{ Farmer : "part of"
    Commodity ||--o{ LandParcel : "planted with"

    User }|--|| Role : "is"

    %% Agronomy
    LandParcel ||--o{ AgronomyProduction : "produces"
    LandParcel ||--o{ AgronomyMaintenance : "maintained by"
    MaintenanceType ||--o{ AgronomyMaintenance : "type"

    %% Training & Certification
    FarmerGroup ||--o{ TrainingActivity : "hosts"
    TrainingPackage ||--o{ TrainingActivity : "uses"
    TrainingActivity ||--o{ TrainingParticipant : "has"
    Farmer ||--o{ TrainingParticipant : "attends"
    TrainingActivity ||--o{ TrainingEvidence : "evidence"

    FarmerGroup ||--o{ Certification : "certified for"
    CertificationType ||--o{ Certification : "type"
    Certification ||--o{ AuditActivity : "has"
    AuditType ||--o{ AuditActivity : "type"
    AuditActivity ||--o{ AuditEvidence : "evidence"

    %% HSE
    Farmer ||--o{ HseWorker : "is"
    HseWorker ||--o{ HseDetail : "has"

    %% Tables mapping (Conceptual)
    Province {
        String id PK
        String code UK
        String name
    }
    District {
        String id PK
        String code UK
        String name
        String provinceId FK
    }
    Subdistrict {
        String id PK
        String code UK
        String name
        String districtId FK
    }
    Village {
        String id PK
        String code UK
        String name
        String subdistrictId FK
    }
```
