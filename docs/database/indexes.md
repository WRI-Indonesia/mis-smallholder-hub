# Database — Index Strategy

> Bagian dari dokumentasi **Database**. Indeks: [../README.md](../README.md) · Terkait: [erd.md](./erd.md) · [models.md](./models.md) · [constraints.md](./constraints.md) · [migrations.md](./migrations.md) · [security.md](./security.md) · [performance.md](./performance.md) · [dashboard-snapshots.md](./dashboard-snapshots.md)

<details>
<summary><strong>Index Strategy</strong> — Strategi indexing untuk performa query</summary>

## Strategi Indeks

### Indeks Utama (Unik)

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
| **Reference Benchmark (#243)** | | | |
| ReferenceBenchmark | PK | `id` (CUID) | Primary key |
| ReferenceBenchmark | UNIQUE | `farmerGroupId` | Satu baris acuan per Lembaga |
| ReferenceBenchmark | INDEX | `isActive` | Filter acuan aktif |
| **Farmer Group Boundary** | | | |
| FarmerGroupBoundary | PK | `id` (CUID) | Primary key |
| FarmerGroupBoundary | INDEX | `farmerGroupId` | Boundary per Lembaga |
| FarmerGroupBoundary | INDEX | `isActive` | Filter boundary aktif |
| FarmerGroupBoundary | GIST | `geom` | Index spasial PostGIS (ST_Intersects/ST_Contains) — ditulis manual di migration 20260819041658 karena kolom `Unsupported` (#266) |
| **Administrative Boundary** | | | |
| AdministrativeBoundary | PK | `id` (CUID) | Primary key |
| AdministrativeBoundary | INDEX | `(level, isActive)` | Baca garis batas per level (KABUPATEN/KECAMATAN/DESA) |
| AdministrativeBoundary | INDEX | `districtId` | Poligon wilayah per district |
| AdministrativeBoundary | GIST | `geom` | Index spasial PostGIS — manual di migration 20260819073337 (#266) |
| **Farmer** | | | |
| Farmer | PK | `id` (CUID) | Primary key |
| Farmer | UNIQUE | `(farmerGroupId, farmerId)` | ID Petani unik per Lembaga (TD-024, migration 20260721060000) |
| **Land Parcel** | | | |
| LandParcel | PK | `id` (CUID) | Primary key |
| LandParcel | GIST | `geom` | Index spasial PostGIS pada kolom **generated** (`ST_DWithin` tetangga ≤ 25 m #327, topology #317) — manual di migration 20260914100000, nama `tbl_land_parcel_geom_idx` (pola `*_geom_idx` yang dijaga test) |
| **Land Parcel Identity & Satelit (#296)** | | | |
| LandParcelIdentity | PK | `id` (CUID) = `parcelUid` | Identitas stabil antar revisi |
| LandParcelIdentity | UNIQUE | `(farmerId, parcelId)` | Satu identitas per pasangan petani+ID lahan |
| LandParcelDocument | PK | `id` (CUID) | Primary key |
| LandStdb | PK | `id` (CUID) | Primary key |
| LandStdb | PARTIAL UNIQUE | `(farmerId, number) WHERE number IS NOT NULL AND is_active` | `uniq_land_stdb_farmer_number` — nomor STDB unik per petani di antara baris aktif; tulis tangan (migrasi `20260829031525`, #306; UNIQUE `(farmerId, number)` lama dilepas) |
| LandStdb | PARTIAL UNIQUE | `(farmerId) WHERE stage IN (PERSIAPAN_DATA, PENGAJUAN, REVISI) AND is_active` | `uniq_land_stdb_farmer_open` — satu STDB berproses per petani |
| LandStdb | INDEX | `stage` | Filter tahapan STDB |
| LandParcelStdb | PK | `id` (CUID) | Primary key |
| LandParcelStdb | UNIQUE | `(parcelUid, stdbId)` | Tautan lahan↔STDB tidak ganda |
| LandParcelExternalId | PK | `id` (CUID) | Primary key |
| LandParcelExternalId | UNIQUE | `(parcelUid, source, code)` | Kode tak ganda di lahan yang sama (sejak 2026-09-23; dulu `(source, code)`) |
| LandParcelExternalId | INDEX | `(source, code)` | Cari lahan lain pemakai kode yang sama (cek silang klaim ganda, tab Legalitas) |
| LandParcelProgram | PK | `id` (CUID) | Primary key |
| LandParcelBorder | PK | `id` (CUID) | Primary key |
| LandParcelBorder | UNIQUE | `parcelUid` | Sepadan 1:1 per identitas lahan (#326) — sekaligus index baca `findUnique` |
| LandParcelNkt | PK | `id` (CUID) | Primary key |
| LandParcelNkt | UNIQUE | `parcelUid` | Status NKT 1:1 per identitas lahan (#328) |
| LandParcelNkt | INDEX | `status` | Filter Laporan Lahan / hitungan layer peta per status |
| BmpAssessment | PK | `id` (CUID) | Primary key |
| BmpAssessment | INDEX | `(farmerId, surveyYear)` | Riwayat per petani + cek "sudah ada tahun ini" (#344) |
| BmpAssessment | INDEX | `surveyYear` | Filter tahun survei daftar/dashboard |
| BmpAssessment | INDEX | `isActive` | Soft delete |
| BmpAssessment | PARTIAL UNIQUE | `(farmerId, surveyYear) WHERE is_active` | `uniq_bmp_assessment_farmer_year_active` — satu penilaian aktif per petani-tahun, tulis tangan (migrasi `20260920100000`) |
| BmpIndicator | PK / UNIQUE | `id` · `(code, level)` | Master indikator (#346) |
| BmpIndicator | INDEX | `activityCode` | Kelompokkan per kegiatan |
| BmpAssessmentDetail | UNIQUE | `(assessmentId, indicatorId)` | Upsert per indikator |
| BmpGroupAssessment | INDEX | `(farmerGroupId, surveyYear)` · `isActive` | Penilaian Lembaga per tahun |
| BmpGroupAssessment | PARTIAL UNIQUE | `(farmerGroupId, surveyYear) WHERE is_active` | `uniq_bmp_group_assessment_group_year_active` (tulis tangan) |
| BmpGroupAssessmentDetail | UNIQUE | `(groupAssessmentId, indicatorId)` | Upsert per indikator |
| LandMarker | PK | `id` (CUID) | Primary key |
| LandMarker | UNIQUE | `code` | Kode patok fisik `HJP-PTK-000123` (#331) — kunci unggah ulang & rujukan laporan |
| LandMarkerCounter | PK | `prefix` | Deret kode per awalan Lembaga; diperbarui atomik (`ON CONFLICT DO UPDATE … RETURNING`) |
| LandMarker | GIST (manual, `tbl_land_marker_geom_idx`) | `geom` | Snap ≤ 5 m "Buat patok dari poligon" & unggahan (`ST_DWithin` patok ↔ geometri lahan) (#329); dijaga `migration-guards.test.ts` seperti `*_geom_idx` lain |
| LandMarker | INDEX | `isActive` | Kueri patok aktif |
| LandParcelMarker | PK | `id` (CUID) | Primary key |
| LandParcelMarker | UNIQUE | `(parcelUid, markerId)` | Satu tautan per pasangan lahan–patok; tautan yang dilepas diaktifkan ulang, bukan dibuat baru |
| LandParcelMarker | UNIQUE partial (manual, `uniq_land_parcel_marker_seq`) | `(parcelUid, sequenceNo) WHERE is_active` | Nomor patok unik per lahan hanya untuk tautan aktif (pola partial STDB #306); urut-ulang dua fase menghindari tabrakan sementara |
| LandParcelMarker | INDEX | `markerId` | Daftar lahan pemakai satu patok ("juga patok lahan …") |
| LandParcelMarker | INDEX | `(parcelUid, isActive)` | Daftar patok satu lahan |
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
| UserFarmerGroup | UNIQUE | `(userId, farmerGroupId)` | Cegah penugasan user–Lembaga ganda |
| UserPermissionOverride | PK | `id` (CUID) | Primary key |
| UserPermissionOverride | UNIQUE | `(userId, menuKey, permission)` | Prevent duplicate permission overrides |

### Indeks Sekunder (Non-Unik)

| Tabel | Kolom | Tujuan Query | Performa Impact |
|-------|-------|--------------|-----------------|
| **FarmerGroup** | `districtId` | Filter Lembaga per district (akses data RBAC) | HIGH — frequently used in list/filter |
| FarmerGroup | `isActive` | Filter Lembaga aktif/nonaktif | MEDIUM |
| FarmerGroup | `code` | Cari Lembaga per kode | MEDIUM |
| **Farmer** | `farmerGroupId` | Semua petani dalam satu Lembaga | HIGH — list farmers, bulk operations |
| Farmer | `isActive` | Filter active farmers | HIGH |
| Farmer | `farmerId` | Search farmer by internal ID | HIGH — frequently used in lookup |
| **TrainingActivity** | `packageId` | Get all activities for a training package | MEDIUM |
| TrainingActivity | `farmerGroupId` | Kegiatan pelatihan per Lembaga (filter RBAC) | HIGH |
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
| **ProductionRecord** | `farmerId` | Produksi per petani; cek duplikat bulk upload (`farmer_id IN` literal: 35 ms vs 52 ms lewat unique, 840k baris) | HIGH — bulk upload produksi, detail petani |
| ProductionRecord | `(parcelId, period)` | Produksi per lahan (+ periode): Peta BMP, Detail Lahan, Profil Lahan, list per lahan+periode — menggantikan `parcelId` tunggal (#251) | HIGH — peta & detail lahan |
| ProductionRecord | `period` | Rentang periode (Report Produksi per Lembaga — planner memilih indeks ini) | HIGH — laporan bulanan/tahunan |
| **MainDashboardSnapshot** | `snapshotDate` | Ambil snapshot terbaru (dashboard read) | HIGH |
| MainDashboardSnapshot | `createdBy` | Audit/list snapshot per user | LOW |
| MainDashboardSnapshot | `isActive` | Filter snapshot aktif (soft delete) | MEDIUM |
| **BmpDashboardSnapshot** | `snapshotDate` | Ambil snapshot terbaru (dashboard read) | HIGH |
| BmpDashboardSnapshot | `createdBy` | Audit/list snapshot per user | LOW |
| BmpDashboardSnapshot | `isActive` | Filter snapshot aktif (soft delete) | MEDIUM |

### Catatan Pemeliharaan Indeks

- **CUID vs Auto-Increment**: CUID digunakan untuk semua PK (kecuali `LandMarkerCounter`, PK = `prefix`) karena distribusi random lebih baik untuk UUID-style lookups dan tidak bocorkan business metrics
- **Composite Unique Indexes**: Digunakan untuk enforce business rule (contoh: satu farmer hanya bisa terdaftar 1x di satu training activity)
- **Missing Indexes**: Tidak ada index pada `created_at` / `modified_at` karena audit query jarang dilakukan dan bisa pakai full table scan

### Pengukuran ProductionRecord (#251, 2026-09-30)

Grain diputuskan owner: **1 baris/lahan/bulan** → proyeksi ±900k baris 2028. Diukur di DB lokal terpisah (salinan snapshot prod 2026-09-28 + baris sintetis semua 14.016 lahan aktif × 60 bulan 2024-01…2028-12 = **840.960 baris aktif**), `EXPLAIN ANALYZE` hangat, Lembaga terbesar (`ICS-1408-02`, 858 petani, 2.192 lahan):

| Query (asal kode) | Indeks lama | Indeks baru | Rencana eksekusi baru |
| --- | --- | --- | --- |
| Peta BMP — `parcel IN (…) + aktif`, group by lahan+periode (`map.ts` `getBmpMapData`) | 182 ms | **116 ms** | Index Scan `(parcel_id, period)` × 2.192 |
| Detail Lahan / Profil Lahan — `parcel = X + aktif` | 0,08 ms | 0,05 ms | Bitmap `(parcel_id, period)` |
| List per lahan+periode (`production.ts`) | 0,22 ms | **0,005 ms** | Index Scan `(parcel_id, period)` — dulu BitmapAnd dgn 14k entri periode |
| Report Produksi — Lembaga + rentang 2026 (`report.ts`) | 36 ms | 29 ms | Index Scan `period` (168k baris) + hash join; `(farmer_id, period)` diuji, **tidak dipakai planner** → tidak ditambah |
| Cek duplikat bulk upload — `farmer_id IN` 200 literal | 35 ms | 35 ms | Bitmap `farmer_id` (tanpanya 52 ms lewat unique) |
| Insert 20k baris (median 7×, 2 putaran bergantian) | 434 / 469 ms | 479 / 519 ms | **±10% lebih lambat** — komposit (47 MB) lebih berat dari `parcel_id`+`is_active` tunggal; ≈ +2 dtk untuk import penuh 900k |

`isActive` tunggal dibuang: tak satu pun rencana eksekusi memakainya (hampir semua baris aktif). Partial index `WHERE is_active` tidak dipakai karena Prisma 7 tak bisa mendeklarasikannya di schema — akan terus diusulkan DROP oleh `migrate dev` seperti GiST `*_geom_idx`. **Ukur ulang sesudah import besar pertama di prod** (#251) dan catat di sini.

### Target Performa Query

| Query Type | Target Response Time | Index Strategy |
|------------|---------------------|----------------|
| Login (email lookup) | < 100ms | UNIQUE index on `User.email` |
| Daftar Lembaga per district | < 200ms | Index on `FarmerGroup.districtId` + `isActive` |
| Daftar petani per Lembaga | < 300ms | Index on `Farmer.farmerGroupId` + `isActive` |
| List parcels by farmer | < 300ms | Index on `LandParcel.farmerId` + `isActive` |
| Training participant list | < 300ms | Index on `TrainingParticipant.activityId` |
| RBAC permission check | < 150ms | Composite unique indexes on RBAC tables |
| Geography hierarchy lookup | < 100ms | UNIQUE code indexes on all geography tables |

</details>
