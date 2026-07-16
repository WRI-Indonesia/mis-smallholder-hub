# Database — Dashboard Snapshot Pattern

> Bagian dari dokumentasi **Database**. Indeks: [../README.md](../README.md) · Terkait: [erd.md](./erd.md) · [models.md](./models.md) · [indexes.md](./indexes.md) · [constraints.md](./constraints.md) · [migrations.md](./migrations.md) · [security.md](./security.md) · [performance.md](./performance.md)

## Dashboard Snapshot Pattern

### Architecture Decision: Separate Table Per Dashboard

**Decision**: Use **separate snapshot table for each dashboard type** instead of single generic snapshot table.

**Rationale**:

1. **Type Safety & Schema Clarity**
   - Each dashboard has different JSON data structure
   - Field `data Json` can be strongly typed per dashboard
   - Easier validation at Prisma schema level

2. **Query Performance**
   - More specific indexes per dashboard type
   - No need to filter by `dashboardType` in every query
   - Faster pagination (smaller data scope)

3. **Maintainability**
   - Easy to track which snapshot belongs to which dashboard
   - Independent schema migrations per dashboard
   - Easier debugging (no mixed data)

4. **Storage Optimization**
   - Different retention policies per dashboard
   - Production dashboard might need daily snapshots
   - Analytics dashboard might only need weekly snapshots

5. **Access Control**
   - More granular RBAC per dashboard type
   - User can access snapshots for dashboard A but not B

---

### Naming Convention

```
tbl_snapshot_<dashboard_name>
```

**Examples**:
- `tbl_snapshot_main_dashboard` — Main dashboard (DASH-01) ✅
- `tbl_snapshot_bmp_dashboard` — Dashboard BMP (DASH-04, #166) ✅ — data JSON `BmpSnapshotData` per **Lembaga Petani** (monthly + byYear produksi/lahan melapor + subset `monthlyFull`/`byYearFull` lahan-lengkap + availability 4 kategori MAP-02 + totals); unique `(snapshot_date, district_id)`; di-slice client-side (Distrik/Lembaga/Kategori/Tahun) via pure `src/lib/bmp-dashboard-aggregation.ts`
- `tbl_snapshot_production_dashboard` — Production analytics (future)
- `tbl_snapshot_training_dashboard` — Training progress (future)
- `tbl_snapshot_financial_dashboard` — Financial reports (future)

---

### Common Fields Pattern

All snapshot tables share these standard fields:

```prisma
model <Dashboard>Snapshot {
  id String @id @default(cuid())
  
  // Snapshot Metadata
  snapshotDate DateTime // Timestamp when snapshot was created
  
  // Optional Filters (varies per dashboard)
  districtId String? // For district-filterable dashboards
  // ... other filter fields specific to dashboard
  
  // Aggregated Data (structure varies per dashboard)
  data Json // Stores dashboard-specific aggregated statistics
  
  // Audit Trail
  createdBy String
  createdByUser User @relation(fields: [createdBy], references: [id], onDelete: Restrict, onUpdate: Cascade)
  
  isActive Boolean @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  modifiedAt DateTime @updatedAt @map("modified_at")
  modifiedBy String? @map("modified_by")
  
  // Unique Constraint (varies per dashboard filters)
  @@unique([snapshotDate, districtId, ...otherFilters])
  @@index([snapshotDate])
  @@index([createdBy])
  @@index([isActive])
  @@map("tbl_snapshot_<dashboard_name>")
}
```

---

### Example: Main Dashboard Snapshot

**Model**: `MainDashboardSnapshot`  
**Table**: `tbl_snapshot_main_dashboard`

```prisma
model MainDashboardSnapshot {
  id String @id @default(cuid())

  // Snapshot Metadata
  snapshotDate DateTime @map("snapshot_date")
  districtId   String?  @map("district_id") // NULL = all districts
  joinedYear   Int?     @map("joined_year") // NULL = all years

  // Relations
  district District? @relation(fields: [districtId], references: [id], onDelete: SetNull, onUpdate: Cascade)

  // Aggregated Data (JSON) — flat DashboardSnapshotData
  data Json // Flat DashboardSnapshotData: { totalKelompokTani, totalKelompokTaniLahan, totalPetani, totalPetaniLaki, totalPetaniPerempuan, totalPersilLahan, totalLuasLahan, trainingCounts, certStats, kelompokTaniList }
  // NB label: `totalKelompokTani` = jumlah FarmerGroup (= Lembaga Petani, mislabel legacy); `totalKelompokTaniLahan` = distinct KT (subGroupLv2) turunan per-lahan (#148).
  // Each kelompokTaniList[] entry: { id, name, code, districtId, districtName, locationLat, locationLong, kelompokTaniCount, rspoCertStatus/Year, ispoCertStatus/Year, sapMapAssuranceStatus/Year (#169), <all-years stats>, byYear: { "<year>": KTYearStats } }
  //   kelompokTaniCount = distinct subGroupLv2 (KT) di Lembaga ini (year-independent) → sum lintas Lembaga = totalKelompokTaniLahan; scope-slice recompute via sumKelompokTaniStats.
  // → the dashboard slices this single master snapshot client-side by Distrik / Tahun Bergabung / Lembaga Petani

  // Audit Trail
  createdBy String @map("created_by")
  createdByUser User @relation("MainDashboardSnapshots", fields: [createdBy], references: [id], onDelete: Restrict, onUpdate: Cascade)

  isActive Boolean @default(true) @map("is_active")

  createdAt  DateTime @default(now()) @map("created_at")
  modifiedAt DateTime @updatedAt @map("modified_at")
  modifiedBy String?  @map("modified_by")

  @@unique([snapshotDate, districtId, joinedYear], name: "main_dashboard_snapshot_unique")
  @@index([snapshotDate])
  @@index([createdBy])
  @@index([isActive])
  @@map("tbl_snapshot_main_dashboard")
}
```

**Data JSON Structure**:
```json
{
  "totalKelompokTani": 50,
  "totalKelompokTaniLahan": 0,
  "totalPetani": 1250,
  "totalPersilLahan": 2100,
  "totalLuasLahan": 5250.75,
  "trainingCounts": {
    "PAKET_1_BMP_PC_RSPO_NKT": 800,
    "PAKET_2_MK": 650,
    "PAKET_2_K3": 720,
    "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV": 580
  },
  "kelompokTaniList": [...]
}
```

---

### Alternative: Single Generic Table (Not Recommended)

**Use single generic table ONLY if**:
- All dashboards have very similar structure (unlikely)
- Low snapshot frequency across all dashboards (< 100/month)
- Small team with maintenance overhead concerns
- Frequent cross-dashboard comparison queries needed

**Pattern**:
```prisma
model Snapshot {
  id String @id @default(cuid())
  dashboardType String // "main", "production", "training"
  snapshotDate DateTime
  filters Json // Generic filters
  data Json // Generic data
  
  @@unique([dashboardType, snapshotDate, filters])
  @@index([dashboardType])
  @@map("tbl_snapshot_generic")
}
```

**Drawbacks**:
- Complex JSON schema validation
- Less efficient indexes
- Harder to maintain as dashboards grow
- Mixed data in single table
- Generic structure loses type safety

---

### Implementation Guidelines

**For new dashboards**:

1. Create new snapshot model following naming convention
2. Define dashboard-specific filters as nullable fields
3. Document JSON data structure in model comments
4. Add unique constraint based on (snapshotDate + filter fields)
5. Create server actions following pattern from main dashboard
6. Implement RBAC permission checks for snapshot generation/viewing

**Example future dashboard**:
```prisma
model ProductionDashboardSnapshot {
  id String @id @default(cuid())
  snapshotDate DateTime
  districtId String?
  periodMonth String? // YYYY-MM format
  
  data Json // Production-specific aggregated data
  
  // ... standard audit fields ...
  
  @@unique([snapshotDate, districtId, periodMonth])
  @@map("tbl_snapshot_production_dashboard")
}
```

---

### Migration Strategy for Snapshots

**Adding new dashboard snapshot table**:
- Risk: LOW (independent table, no dependencies)
- Strategy: Deploy directly to production
- Rollback: Easy (drop table if needed)

**Modifying existing snapshot table**:
- Risk: MEDIUM (contains historical data)
- Strategy: Test in staging, consider data migration if structure changes
- Rollback: Medium (may need data transformation)

**Best Practices**:
- Never modify JSON structure of existing snapshots (append-only for new fields)
- Version snapshot data structure if breaking changes needed
- Consider retention policies (e.g., delete snapshots older than 2 years)
- Implement background jobs for automated snapshot generation (future enhancement)

### Agregat Kelompok Tani — hanya count di dashboard (#148); tabular = Report real-time (#154)

**Revisi 2026-07-14:** rencana snapshot-table untuk view **tabular** KT **dibatalkan** — agregasi murah (perf 8ms/50k lahan, #153) → view tabular KT jadi **Report real-time** (**#154**, `getKelompokTaniReport`), bukan snapshot. **#153 di-close (superseded).**

Yang **tetap** memakai dashboard snapshot: **hanya angka count** untuk card **"Total Kelompok Tani" (#148, ✅ selesai 2026-07-14)** — field `totalKelompokTaniLahan` (global) + `KTDetails.kelompokTaniCount` (per Lembaga, distinct `subGroupLv2` ternormalisasi trim/case, null diabaikan, **year-independent**) ditambah ke `DashboardSnapshotData`; `sumKelompokTaniStats`/`scopeSnapshotData` menjumlah per-Lembaga saat slice scope; `normalizeSnapshotData` default 0 untuk snapshot lama. **Bukan** tabel snapshot baru. Kartu tampil **0 sampai snapshot baru di-generate** + data `subGroupLv2` terisi (#150).

Pola yang sama dipakai **card & badge sertifikasi (#169, 2026-07-16)**: `certStats` (rekap RSPO/ISPO/SAP-MAP: certified+planned) di level stats + status **+ tahun** per Lembaga di `KTDetails` — rekap dihitung ulang `sumKelompokTaniStats` saat scoping/slice (year-independent); `normalizeSnapshotData` default 0/kosong untuk snapshot pra-#169 (card/badge tampil 0/tanpa tahun sampai regenerate).

> **Catatan generate (2026-07-14):** filter Distrik/Tahun pada Tools → Dashboard Snapshot **dinonaktifkan sementara** (`FILTERS_ENABLED=false` di `snapshot-client.tsx`) → snapshot selalu **Semua Data**. Kolom Distrik/Tahun di tabel daftar **default hidden** (toggleable). Set `true` untuk mengaktifkan kembali.

- Detail/tabular KT/Gapoktan/Blok → **real-time** (Report #154; detail Petani #152).
- Saat KT jadi tabel (**TD-014**), agregasi teks → query relasi.
- Semantik distinct dashboard = per-(Lembaga × KT); Report #154 per-(Lembaga × Gapoktan × KT) — beda granularitas *by design*.
