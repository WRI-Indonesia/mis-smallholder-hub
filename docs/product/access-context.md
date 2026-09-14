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
| **Lahan tetangga** (#327) — `fetchParcelNeighbors` (`src/lib/parcel-neighbor-query.ts`), dipakai Profil Lahan (PDF, tiga menu pemanggil) dan peta Detail Lahan | **Poligon**, ID Lahan, jarak, dan **nama Lembaga** semua lahan aktif MIS ≤ 25 m dari lahan yang dilihat — apa pun scope user | **Nama & kode petani** tetangga di luar scope: di-`null`-kan **di server** (`applyNeighborScope`) sebelum keluar dari fungsi, bukan disembunyikan di UI. Tautan ke detail lahan tetangga hanya untuk yang dalam scope (halaman detailnya sendiri 404 bila di luar scope) | Peta yang menghilangkan lahan di sebelahnya menyesatkan di lapangan, tetapi Profil Lahan bisa dicetak siapa pun yang punya akses menu Lahan/Peta/Petani, jadi identitas petani lain tidak boleh ikut. Scope ditentukan lewat kueri kedua ber-`farmerRelationAccessFilter` — aturan akses tidak ditulis ulang di SQL. Lebih konservatif daripada pengecualian #317 di bawah |
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
