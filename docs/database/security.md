# Database — Security Considerations

> Bagian dari dokumentasi **Database**. Indeks: [../README.md](../README.md) · Terkait: [erd.md](./erd.md) · [models.md](./models.md) · [indexes.md](./indexes.md) · [constraints.md](./constraints.md) · [migrations.md](./migrations.md) · [performance.md](./performance.md) · [dashboard-snapshots.md](./dashboard-snapshots.md)

<details>
<summary><strong>Security Considerations</strong> — Aspek keamanan database dan data access</summary>

## Pertimbangan Keamanan

### Autentikasi & Otorisasi

| Layer | Mekanisme | Implementation |
|-------|-----------|----------------|
| **Authentication** | NextAuth.js | Email + password, session stored in JWT |
| **Authorization** | Role-Based (RBAC) | 5 roles: SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT, DONOR (donor/funder read-only: dashboard, laporan, peta) |
| **Data Access Control** | Data-level filtering | UserProvince, UserDistrict, UserFarmerGroup assignments |
| **Permission Override** | User-specific exceptions | UserPermissionOverride for grant/revoke specific menu permissions |

### Keamanan Password

- **Storage**: Password disimpan dengan **bcrypt hash** (cost factor: 10)
- **No Plain Text**: Password plain text tidak pernah disimpan di database
- **Salt**: Bcrypt otomatis generate unique salt per password
- **Migration**: Jika ganti hashing algorithm, perlu re-hash saat user login (gradual migration)

### Pencegahan SQL Injection

- **Prisma ORM**: Semua query pakai Prisma Client → parameterized queries otomatis
- **Raw Query**: `$queryRaw`/`$executeRaw` dipakai untuk fitur PostGIS (tetangga, tumpang tindih, klip) — **wajib tagged template** (parameter otomatis); jangan pernah `$queryRawUnsafe`/`Prisma.raw` dengan input user
- **Input Validation**: Validate & sanitize input di server action / API route sebelum query

### Pola Akses Data (RBAC)

Ringkas (`getAccessContext()`, `src/lib/access-context.ts`): SUPERADMIN atau **tanpa assignment** → `ALL`; **hanya** `UserFarmerGroup` → `BY_FARMER_GROUP` (id Lembaga); ada `UserProvince`/`UserDistrict` → `BY_DISTRICT` (gabungan district; assignment Lembaga **diabaikan**); sesi kosong / user tak ditemukan → `BY_DISTRICT` kosong (tolak semua). Terjemahkan ke `where` lewat helper `src/lib/access-scope.ts`, jangan ternary manual. Rincian, contoh, dan pengecualian scope yang tercatat: [product/access-context.md](../product/access-context.md).

### Perlindungan Data Sensitif

| Data Type | Tabel | Field | Protection Strategy |
|-----------|-------|-------|---------------------|
| **Password** | User | `password` | Bcrypt hash (cost 10), never return di API response |
| **Email** | User | `email` | Unique index, validate format di app layer |
| **NIK (ID Card)** | Farmer | `nik` | Optional field, validate 16 digits jika diisi, bisa mask di UI (****1234) |
| **Location Coordinates** | FarmerGroup | `locationLat`, `locationLong` | Public (untuk mapping), tidak sensitif |
| **Parcel Geometry** | LandParcel | `geometry` | Koordinat lahan milik individu — akses hanya via Server Action ber-RBAC (scope district/KT), tidak ikut payload list (fetch detail by-id, #163) |
| **Tree Coordinates** | Tree | `longitude`, `latitude` | Titik GPS pohon di dalam lahan milik individu (#238) — akses hanya via Server Action ber-RBAC (scope via relasi lahan→petani), dikirim utuh hanya per-lahan di halaman detail; lintas lahan wajib agregat |
| **Marker Coordinates** | LandMarker | `longitude`, `latitude` | Titik GPS patok batas lahan individu (#329) — akses via Server Action ber-RBAC (scope via lahan) |
| **Vendor Geometry** | LandParcelExternalId | `rawGeometry` | Geometri mentah dari vendor (#296) — tidak pernah dibaca aplikasi (di-select `false`, TD-035); bila kelak dibaca, wajib lewat action ber-scope |
| **ICS Boundary** | FarmerGroupBoundary | `geom`, `geojson` | Poligon wilayah Lembaga (bukan milik individu) — tetap lewat action ber-izin menu |
| **S3 Evidence Key** | TrainingActivity | `evidenceKey` | Private S3 bucket, generate pre-signed URL saat akses. Kunci hanya dibuat server (`buildTrainingEvidenceKey`: `training/<activityId>/<ts>-<nama>`) setelah izin EDIT dan pelatihan dicek ada & dalam scope; `updateTrainingActivity` hanya menerima kunci kosong atau milik pelatihan itu sendiri (format sekarang, atau format lama #45 `training/evidence/<yyyy>/<mm>/<id>/…`) — `isTrainingEvidenceKeyFor`; `getTrainingActivityById` hanya membuat presigned URL untuk kunci yang lolos pemeriksa yang sama; `createTrainingActivity` mengabaikan kolom bukti; `""` dinormalkan ke `NULL` (#385). Audit mis-prod 2026-09-29: 26 baris `evidence_key = ''` (import ITM, `SH-0019`), 0 kunci berkas asli |

### Jejak Audit

Semua tabel memiliki audit fields (kecuali `LandMarkerCounter`):
- `createdAt` — timestamp record dibuat
- `createdBy` — user ID yang membuat (nullable saat seed; wajib di tabel snapshot)
- `modifiedAt` — timestamp terakhir diupdate
- `modifiedBy` — user ID yang terakhir update

> `createdBy`/`modifiedBy` **diisi dari `auth()` session (`session.user.id`) di semua Server Action mutasi** — pola `createdBy: session?.user?.id ?? null` (canonical: `farmer.ts`). Gap di mutasi user/menu/role-permission/region-toggle/assignment/override ditutup #130 (TD-010). Tetap `null` hanya untuk data hasil seed.

**Use Case**:
- Track siapa yang membuat/edit data
- Debug issue "data tiba-tiba berubah"
- Compliance requirement (ISO, audit eksternal)

### Kontrol Akses Database (Level PostgreSQL)

Rekomendasi production setup:
- **Application User**: User PostgreSQL khusus untuk aplikasi dengan permission terbatas (tidak punya DROP TABLE / DROP DATABASE)
- **Admin User**: Superuser PostgreSQL hanya untuk migration dan maintenance
- **Connection Limit**: Set `max_connections` sesuai expected load (default: 100)
- **SSL Mode**: Wajibkan SSL untuk koneksi production (`sslmode=require`)
- **IP Whitelist**: Restrict akses database hanya dari IP aplikasi server

### Keamanan Environment Variable

Jangan commit ke Git:
- `DATABASE_URL` — connection string dengan password
- `NEXTAUTH_SECRET` — secret key untuk JWT signing
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — kredensial S3 (`src/lib/s3.ts`)
- `FIRMS_MAP_KEY_*` — key NASA FIRMS (proxy titik api)

Gunakan:
- Satu berkas per environment (`.env` = local, `.env.dev`, `.env.staging`, `.env.prod`; semuanya gitignored) — **jangan** membuat `.env.local` (Next.js memuatnya otomatis). Aturan lengkap: [../standards/environments.md](../standards/environments.md)
- Staging & produksi: `.env` ditulis workflow deploy dari GitHub secret (`MIS_STAGING_ENV`, secret `deploy-main.yml`)

### Kepatuhan OWASP Top 10

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
