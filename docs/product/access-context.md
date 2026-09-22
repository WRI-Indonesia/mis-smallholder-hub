# Produk — Access Context Resolution

> Bagian dari dokumentasi **Produk**. Indeks: [../README.md](../README.md) · Terkait: [architecture.md](./architecture.md) · [crud-flows.md](./crud-flows.md) · [role-flows.md](./role-flows.md) · [module-status.md](./module-status.md)

<details>
<summary><strong>RBAC & Data Access Pattern</strong></summary>

## Access Context Resolution

```
User Request
    │
    ▼
┌────────────────────────┐
│ Check Role & Assignment│
└───────┬────────────────┘
        │
        ├─ Sesi kosong / user tak ditemukan → Mode: BY_DISTRICT, ids: [] (⛔ tolak semua)
        │
        ├─ SUPERADMIN → Mode: ALL (✅ Full Access, no filters)
        │
        ├─ No Assignment → Mode: ALL (✅ Unrestricted access)
        │
        ├─ UserFarmerGroup saja (tanpa Province/District) → Mode: BY_FARMER_GROUP (🔍 Filter by specific groups)
        │
        └─ Ada UserProvince/UserDistrict → Mode: BY_DISTRICT
            (🔍 UserProvince di-expand ke semua district di provinsi + UserDistrict langsung)
            │
            ▼
    ┌──────────────────────┐
    │  Permission Check     │
    │  - Menu Access?       │
    │  - Required Perm?     │
    │  - Override?          │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │  Execute Query        │
    │  + isActive filter    │
    │  + RBAC data filter   │
    │  + Audit trail        │
    └──────────────────────┘
```

> Catatan: `getAccessContext()` (`src/lib/access-context.ts`) **role-agnostik** kecuali cabang SUPERADMIN — semua role lain (ADMIN, OPERATOR, MANAGEMENT, DONOR) mengikuti aturan assignment yang sama. Urutan evaluasi: farmer-group-only lebih dulu, baru province/district; sesi kosong atau user tak ditemukan → `{ mode: "BY_DISTRICT", ids: [] }` = tolak semua.

### Data Access Hierarchy Examples

Nama di kolom pertama adalah **persona ilustratif**; kolom Role memakai enum `Role` nyata.

| Persona (ilustrasi) | Role (enum) | UserProvince | UserDistrict | UserFarmerGroup | Result Access |
|------|------|--------------|--------------|-----------------|---------------|
| Ahmad | ADMIN | Riau | — | — | `BY_DISTRICT`: semua district di Riau → semua Lembaga di dalamnya |
| Erma | ADMIN | — | Kampar | — | `BY_DISTRICT`: semua Lembaga di Kampar |
| Anissa | OPERATOR | — | — | KBM, Kopsa | `BY_FARMER_GROUP`: hanya KBM & Kopsa |
| Dian | DONOR | — | — | — | `ALL` (tanpa assignment) — read-only lewat permission menu, bukan lewat scope |
| Super Admin | SUPERADMIN | — | — | — | `ALL` (skip filter) |

> Bila assignment farmer group **dicampur** dengan province/district (mis. Kampar + KBM), yang menang adalah district → `BY_DISTRICT` Kampar (lihat urutan evaluasi di atas).

### Helper Filter (dipakai di Server Actions)

| Helper (`src/lib/access-context.ts`) | Peruntukan |
|---|---|
| `farmerGroupAccessFilter(access)` | Fragmen `where` untuk query `FarmerGroup` (`BY_FARMER_GROUP` → `id in`; `BY_DISTRICT` → `districtId in`) |
| `farmerAccessFilter(access)` | Model ber-field `farmerGroupId` + relasi `farmerGroup` (mis. `Farmer`, `TrainingActivity`) |
| `farmerRelationAccessFilter(access)` | Model ber-relasi `farmer` (mis. `LandParcel`, `ProductionRecord`, `TrainingParticipant`) |
| `getAccessibleDistrictIds(access)` | Daftar id district yang boleh diakses (`null` = ALL); `BY_FARMER_GROUP` di-resolve ke district lembaga yang di-assign |

### Pengecualian scope yang tercatat

Aturan dasar: setiap pembacaan hanya mengembalikan baris dalam scope user. Dua pengecualian **disengaja** dan harus tetap terdaftar di sini — keduanya untuk data spasial yang tak bisa dinilai tanpa melihat "sisi lain":

| Pengecualian | Apa yang tembus scope | Apa yang TIDAK tembus | Alasan & guard |
|---|---|---|---|
| **Profil Petani (PDF)** (#343) — `getFarmerProfilePassport` (`src/server/actions/farmer.ts`), tombol header Detail Petani & aksi baris Daftar Petani | Ringkasan petani + lampiran Profil Lahan **semua lahan aktif petani** — lampiran mengikuti scope **petani** (lahan tidak punya scope sendiri: petani dalam scope ⇒ seluruh lahannya ikut) | Petani di luar scope → *tidak ditemukan*; petani nonaktif hanya SUPERADMIN (sama dengan Detail Petani) — kelonggaran itu diteruskan ke kueri lampiran (`fetchParcelPassport … { includeInactiveFarmer }`), lahan nonaktif tetap tak pernah ikut | Guard `hasPermission("master-data-farmers","PRINT")` + `farmerAccessFilter` pada petani; tiap lampiran tetap lewat `fetchParcelPassport` dengan `access` yang **sama** dioper (bukan dihitung ulang per lahan) sehingga tetangga ≤ 25 m di dalamnya mengikuti aturan baris berikut. Section **Monev BMP** di PDF menumpang izin **VIEW `master-data-bmp-monev`** (bukan PRINT Petani) — persis tab Monev BMP di layar; tanpa izin → `bmp: null`, section & badge tidak dicetak |
| **Lahan tetangga** (#327) — `fetchParcelNeighbors` (`src/lib/parcel-neighbor-query.ts`), dipakai Profil Lahan (PDF, tiga menu pemanggil) dan peta Detail Lahan | **Poligon dan identitas lengkap** (nama & kode petani, ID Lahan, Lembaga, jarak) semua lahan aktif MIS ≤ 25 m dari lahan yang dilihat — apa pun scope user | **Tautan ke halaman detail** tetangga: hanya untuk yang dalam scope (`inScope`, kueri kedua ber-`farmerRelationAccessFilter`); halaman detail tetangga di luar scope tetap 404 | Peta yang menghilangkan lahan di sebelahnya menyesatkan di lapangan, dan **nama pemilik tetangga adalah alat verifikasi** (keputusan owner 2026-09-14 — bentuk awal "nama hanya dalam scope" dibatalkan saat review). Aturan yang sama dengan pengecualian #317 di bawah; aturan akses tidak ditulis ulang di SQL. Dicetak siapa pun yang punya izin PRINT menu Lahan/Peta/Petani |
| **Patok bersama** (#329) — `getLandParcelMarkers`, PDF, ekspor per Lembaga | **ID Lahan, nama petani & Lembaga** semua lahan lain yang memakai patok yang sama ("juga patok lahan …"), — apa pun scope user (tanda NKT turunan dihapus #345) | **Tautan ke halaman detail** lahan pemakai lain hanya bila dalam scope (`landParcelId` null di luar scope); akses ke patok selalu lewat **baris lahan** yang diminta (`resolveParcel` ber-`farmerRelationAccessFilter`), tidak ada endpoint per patok | Patok fisik yang sama memang berdiri di batas dua–empat lahan; menyembunyikan pemakai lain membuat "patok bersama" tak bisa diverifikasi di lapangan. Aturan sama dengan tetangga #327 |
| **Patok di Peta Lahan** (#331) — `getMapMarkers`, `getMapMarkerExportRows` | Titik patok + "ID Lahan #n" semua lahan pemakainya (tanpa tanda NKT turunan sejak #345) | Scope = Lembaga di filter ∧ akses user (`farmerGroupAccessFilter` di `AND`, pola `getMapData`); patok hanya muncul bila salah satu lahan pemakainya ada di filter; unduhan digate `map-parcel:EXPORT` | Sama dengan aturan patok bersama: ID lahan pemakai lain bukan rahasia, tetapi datasetnya sendiri hanya untuk wilayah yang boleh dilihat |
| **Topology check** (#317 Fase 2, direncanakan) — `getParcelTopologyFindings` | Pasangan lahan yang bertumpang tindih bila **minimal satu sisi** dalam scope user; sisi lawan ditampilkan **lengkap** (nama petani, ID lahan, lembaga) | Pasangan yang kedua sisinya di luar scope | Verifikasi klaim ganda mustahil tanpa identitas sisi lawan; dibatasi izin menu khusus `data-analyst-parcel-overlap` (bukan menu umum). Preseden: `getAdminBoundaries` (#266) |

Menambah pengecualian baru = menambah baris di tabel ini **dan** komentar di fungsinya.

### Permission Resolution Priority

1. **SUPERADMIN** → Grant all, skip all filters
2. **UserPermissionOverride** (Granted) → Grant
3. **UserPermissionOverride** (Revoked) → Forbid
4. **RolePermission** (default) → Check C/V/E/D
5. **Pewarisan kaskade induk→anak** → izin induk diturunkan ke seluruh anak menu
6. **No Permission** → Hide menu / Forbidden

**Pewarisan kaskade**: `getEffectiveMenuPermissions` (`src/lib/rbac.ts`) menelusuri pohon menu top-down — izin efektif tiap node = izin induk + `RolePermission` node itu, lalu override per-user diterapkan per node (grant menambah, revoke mencabut, termasuk mencabut hasil warisan). Contoh konkret: `role-permissions.csv` **tidak punya baris** `master-data-farmers`, tetapi ADMIN/OPERATOR tetap dapat VIEW menu Petani karena mewarisi VIEW dari induk `master-data`.

</details>
