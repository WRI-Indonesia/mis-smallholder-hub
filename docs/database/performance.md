# Database — Performance & Data Volume

> Bagian dari dokumentasi **Database**. Indeks: [../README.md](../README.md) · Terkait: [erd.md](./erd.md) · [models.md](./models.md) · [indexes.md](./indexes.md) · [constraints.md](./constraints.md) · [migrations.md](./migrations.md) · [security.md](./security.md) · [dashboard-snapshots.md](./dashboard-snapshots.md)

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
