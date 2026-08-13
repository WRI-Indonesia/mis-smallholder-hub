# Database — Performance & Data Volume

> Bagian dari dokumentasi **Database**. Indeks: [../README.md](../README.md) · Terkait: [erd.md](./erd.md) · [models.md](./models.md) · [indexes.md](./indexes.md) · [constraints.md](./constraints.md) · [migrations.md](./migrations.md) · [security.md](./security.md) · [dashboard-snapshots.md](./dashboard-snapshots.md)

<details>
<summary><strong>Performance & Data Volume</strong> — Estimasi volume data dan optimasi performa</summary>

## Performance & Data Volume

### Data Volume Estimates

> **Aktual** = diukur langsung dari `mis-prod` (read-only, **2026-08-13**), baris `isActive: true`. **Proyeksi 2028** = rencana owner, bukan hasil ukur — ditandai jelas supaya tidak dikutip sebagai fakta. Versi dokumen ini sebelumnya memuat angka yang meleset s/d 150× (#254).

| Tabel | Aktual (2026-08-13) | Proyeksi 2028 | Dasar proyeksi |
|-------|--------------------:|--------------:|----------------|
| **Province** | 1 | 1–5 | Area kerja nyata, bukan cakupan nasional |
| **District** | 4 | 4–10 | Kampar, Siak, Pelalawan, Rokan Hulu |
| **Subdistrict** | 1 | — | Belum diisi; hanya dipakai bila alamat diperinci |
| **Village** | 1 | — | Belum diisi (lihat catatan di bawah) |
| **User** | 41 | ~60 | Mengikuti jumlah pendamping/ICS |
| **FarmerGroup** | 31 | ~45 | Lembaga baru menyusul cakupan |
| **Farmer** | 8.626 | **12.000** | Target owner 2028 (≈1,4× aktual) |
| **LandParcel** | 10.953 | ~15.250 | 12.000 petani × **1,27 lahan/petani** (rasio terukur) |
| **Tree** | 286 | **jutaan** (bila dipetakan luas) | Lihat catatan Tree di bawah |
| **ProductionRecord** | 10.783 | **~915.000** | 60 periode bulanan (2024–2028) × ~15.250 lahan |
| **MainDashboardSnapshot** | 46 | ~150 | Generate manual via Tools |
| **BmpDashboardSnapshot** | 18 | ~90 | Generate manual via Tools |
| **TrainingPackage** | 5 | 7–10 | Pertumbuhan lambat |
| **TrainingActivity** | 820 | ~1.150 | ≈1,4× mengikuti Lembaga |
| **TrainingParticipant** | 31.383 | ~44.000 | ≈1,4× mengikuti Petani |
| **MenuItem** | 41 | ~50 | Pertumbuhan lambat |
| **RolePermission** | 451 | ~550 | 5 role × menu × 6 izin (EXPORT/PRINT sejak #245) |

**Cara membaca pertumbuhannya.** Hanya `ProductionRecord` yang meledak (~85×), dan itu **pertumbuhan cakupan, bukan waktu**: mengisi mundur panen bulanan 2024–2028 untuk lahan yang sudah ada. Seluruh komponen lain hanya ~1,4×. Karena itu perencanaan indeks difokuskan ke `ProductionRecord` (lihat #251), bukan disebar rata.

**Catatan `Village`/`Subdistrict`.** Keduanya berisi 1 baris — bukan terhapus lunak, memang belum diisi. Versi dokumen sebelumnya mencantumkan 500 dan 5.000 sebagai "static reference data"; itu asumsi cakupan nasional yang tidak pernah terjadi. Bila kelak alamat petani diperinci sampai desa, barulah tabel ini terisi.

**Catatan `Tree`.** Saat ini hanya **1 lahan** yang dipetakan pohonnya (286 titik pada 1,95 ha = **147 pohon/ha** terukur). Dengan luas rata-rata lahan **1,547 ha**, satu lahan setara ±227 pohon. Bila program memetakan pohon untuk seluruh lahan, tabel ini menjadi **±2,5 juta baris hari ini** dan **±3,5 juta baris pada 2028** — jauh melampaui seluruh tabel lain digabung. Ini keputusan program, bukan konsekuensi otomatis; angka di atas sengaja tidak dimasukkan ke total karena belum diputuskan.

### Table Size Estimates (2028)

| Tabel | Record | Avg Row Size | Data | Index | Total |
|-------|-------:|--------------|-----:|------:|------:|
| **ProductionRecord** | 915k | 250 bytes (estimasi) | ~230 MB | ~60 MB | **~290 MB** |
| **TrainingParticipant** | 44k | 300 bytes (estimasi) | ~13 MB | ~4 MB | ~17 MB |
| **Farmer** | 12k | 500 bytes (estimasi) | ~6 MB | ~2 MB | ~8 MB |
| **LandParcel** | 15,25k | ~500 bytes (**geometry ~305 B terukur** + kolom lain) | ~7,6 MB | ~3 MB | **~11 MB** |
| **MainDashboardSnapshot** | 150 | ~200 KB (estimasi — `data` JSON agregat) | ~30 MB | < 1 MB | ~30 MB |
| **BmpDashboardSnapshot** | 90 | ~100 KB (estimasi — `data` JSON agregat) | ~9 MB | < 1 MB | ~9 MB |
| **TrainingActivity** | 1,15k | 700 bytes (estimasi) | ~0,8 MB | ~0,3 MB | ~1,1 MB |
| **FarmerGroup** | 45 | 600 bytes (estimasi) | ~30 KB | ~10 KB | ~40 KB |
| **RBAC + Menu** | ~1,2k | 400 bytes (estimasi) | ~0,5 MB | ~0,2 MB | ~0,7 MB |
| **TOTAL (2028, tanpa Tree)** | ~990k record | — | ~300 MB | ~70 MB | **~370 MB** |

**Conclusion**: ukuran database berada di orde **ratusan MB**, bukan beberapa GB — tidak butuh partitioning maupun sharding, dan tidak ada tabel yang mendekati batas praktis PostgreSQL. Yang mendominasi adalah **`ProductionRecord`** (jumlah baris), bukan `LandParcel.geometry` seperti tertulis di versi sebelumnya. Satu-satunya yang bisa mengubah orde besaran ini adalah keputusan memetakan pohon untuk seluruh lahan (lihat catatan `Tree`).

### Bentuk & ukuran `LandParcel.geometry` (aktual, 2026-08-13)

Versi dokumen sebelumnya mengestimasi kolom ini "puluhan–ratusan KB per lahan" (~50 KB) lalu memproyeksikan tabelnya ~3 GB. Hasil ukur atas **10.953 lahan aktif** (seluruhnya ber-geometry, tidak ada yang null):

| | min | p50 | p90 | p99 | max | rata-rata |
|---|----:|----:|----:|----:|----:|----------:|
| **byte per lahan** (JSON terserialisasi) | 206 | 288 | 369 | 673 | 1.160 | **305** |
| **titik per poligon** | 4 | 5 | 8 | — | 29 | **5,9** |

Total seluruh kolom ini di database: **3,18 MB** untuk 65.089 titik koordinat. Estimasi lama meleset **~160×**.

Bentuknya: **10.781 `Polygon` + 172 `MultiPolygon`**, dan **95,9% poligon punya ≤10 titik**. Konsekuensi teknisnya penting dan berlawanan dengan intuisi umum soal data spasial:

- **`ST_Simplify` tidak relevan** — tidak ada yang bisa disederhanakan dari poligon 4–6 titik.
- **Vector tiles & filter bbox/viewport tidak relevan** untuk dataset seukuran ini; ongkos infrastrukturnya jauh melebihi 3 MB yang dihemat.
- **`jsonb` (bukan tipe `geometry` PostGIS) adalah pilihan yang tepat untuk jalur tampilan**: MapLibre membutuhkan GeoJSON, sehingga `jsonb` dikirim apa adanya, sedangkan kolom `geometry` wajib melewati `ST_AsGeoJSON()` per baris. PostGIS tetap masuk akal bila kelak dibutuhkan kueri spasial (irisan, jarak, dalam-poligon) — bukan untuk menampilkan.

**Metode ukur**: panjang JSON terserialisasi (`Buffer.byteLength(JSON.stringify(geometry))`) per baris, dijalankan read-only. Angka penyimpanan fisik `jsonb` di disk bisa sedikit berbeda karena overhead biner dan TOAST, tetapi ordenya sama — ratusan byte, bukan puluhan KB.

### Query Performance Optimization

#### Critical Queries

| Query | Expected Volume | Index Used | Target Time |
|-------|-----------------|-----------|-------------|
| **List Farmers by KT** | 100-500 rows | `Farmer.farmerGroupId` + `isActive` | < 300ms |
| **Training Participant List** | 50-200 rows | `TrainingParticipant.activityId` + `isActive` | < 300ms |
| **User Login** | 1 row | `User.email` (UNIQUE) | < 100ms |
| **RBAC Permission Check** | 1-10 rows | Composite UNIQUE on RBAC tables | < 150ms |
| **Dashboard Stats Aggregation** | 1 row (aggregate) | Materialized view (future) | < 1s |
| **Produksi per lahan × periode** | s/d ~915k baris (2028) | Lihat **#251** — indeks disiapkan sebelum import massal | < 1s |

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

#### Payload Trimming — `select` ramping untuk list (#163)

Eager loading via `include` membawa **full row** (audit fields, dan pada `LandParcel` termasuk `geometry` GeoJSON yang bisa puluhan–ratusan KB per lahan) — di halaman list, seluruhnya ikut diserialisasi ke RSC payload menuju browser. Aturan sejak #163:

- **List action wajib `select` eksplisit** sesuai field yang dipakai list client (termasuk field yang di-round-trip form edit, mis. `evidenceKey/Name` pelatihan) — bukan `include` full-row. `geometry` **tidak boleh** ikut payload list (hanya fetch detail by-id).
- Perhatikan **round-trip form**: field yang tidak dikirim client harus berarti "tidak diubah" di server (`undefined` = skip; lihat `updateLandParcel` geometry), bukan ter-null.
- **Agregat turunan list** (count/sum lintas relasi) dihitung via `groupBy`/`_count`/`_sum` di DB — jangan menarik 1 baris per child untuk dihitung di JS (lihat `getFarmerGroups`).

```typescript
// BAD — full row + geometry ikut ke payload list
prisma.landParcel.findMany({ include: { farmer: { include: { farmerGroup: true } } } });

// GOOD — select ramping sesuai kolom list, tanpa geometry
prisma.landParcel.findMany({
  select: {
    id: true, parcelId: true, area: true, /* …kolom list lain… */
    farmer: { select: { name: true, farmerId: true, farmerGroup: { select: { name: true } } } },
  },
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

Jika data bertumbuh signifikan (> 1M records). Berdasarkan angka terukur 2026-08-13, **tidak satu pun butir di bawah ini relevan saat ini** — proyeksi 2028 masih ~990k record dan ~370 MB:

- **Partitioning**: kandidat pertamanya `ProductionRecord` by `period` (bukan `TrainingParticipant`, yang proyeksi 2028-nya hanya ~44k), dan hanya bila import massal produksi benar-benar menembus jutaan baris.
- **Materialized Views**: untuk agregasi dashboard — sebagian sudah dijawab pola snapshot (`MainDashboardSnapshot`/`BmpDashboardSnapshot`).
- **Read Replicas**: untuk kueri pelaporan berat.
- **Archive Strategy**: pindahkan data lama (> 5 tahun) ke tabel arsip.
- **Pemetaan pohon menyeluruh** adalah satu-satunya keputusan yang bisa langsung memindahkan database ke orde jutaan baris (lihat catatan `Tree`); bila diambil, butir partitioning perlu ditinjau untuk `Tree`, bukan untuk tabel lain.

**Yang TIDAK relevan untuk dataset ini** (sering diusulkan untuk data spasial, tetapi tidak berlaku di sini): `ST_Simplify`, vector tiles, dan filter bbox/viewport — poligon lahan rata-rata hanya 5,9 titik dan seluruh kolom geometry berjumlah 3,18 MB.

</details>
