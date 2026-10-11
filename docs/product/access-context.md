# Produk — Access Context Resolution

> Bagian dari dokumentasi **Produk**. Indeks: [../README.md](../README.md) · Terkait: [navigation.md](navigation.md) · [crud-flows.md](./crud-flows.md) · [role-flows.md](./role-flows.md) · [../project/roadmap.md](../project/roadmap.md#phase-status-indeks)

<details>
<summary><strong>RBAC & Data Access Pattern</strong></summary>

## Resolusi Access Context

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

### Contoh Hierarki Akses Data

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

| Helper (`src/lib/access-scope.ts`, di-re-export dari `src/lib/access-context.ts`) | Peruntukan |
|---|---|
| `farmerGroupAccessFilter(access)` | Fragmen `where` untuk query `FarmerGroup` (`BY_FARMER_GROUP` → `id in`; `BY_DISTRICT` → `districtId in`) |
| `farmerAccessFilter(access)` | Model ber-field `farmerGroupId` + relasi `farmerGroup` (mis. `Farmer`, `TrainingActivity`) |
| `farmerRelationAccessFilter(access)` | Model ber-relasi `farmer` (mis. `LandParcel`, `ProductionRecord`, `TrainingParticipant`) |
| `rawFarmerGroupScope(access, groupIds?)` | Cermin `farmerGroupAccessFilter` untuk SQL mentah (PostGIS): `{ groupIds?, districtIds? }`, `undefined` = tanpa batasan; `groupIds` opsional diiris dengan scope |
| `getAccessibleDistrictIds(access)` (di `src/lib/access-context.ts`) | Daftar id district yang boleh diakses (`null` = ALL); `BY_FARMER_GROUP` di-resolve ke district lembaga yang di-assign |

### Pengecualian scope yang tercatat

Aturan dasar: setiap pembacaan hanya mengembalikan baris dalam scope user. Dua pengecualian **disengaja** dan harus tetap terdaftar di sini — keduanya untuk data spasial yang tak bisa dinilai tanpa melihat "sisi lain":

| Pengecualian | Apa yang tembus scope | Apa yang TIDAK tembus | Alasan & guard |
|---|---|---|---|
| **Profil Petani (PDF)** (#343) — `getFarmerProfilePassport` (`src/server/actions/farmer.ts`), tombol header Detail Petani & aksi baris Daftar Petani | Ringkasan petani + lampiran Profil Lahan **semua lahan aktif petani** — lampiran mengikuti scope **petani** (lahan tidak punya scope sendiri: petani dalam scope ⇒ seluruh lahannya ikut) | Petani di luar scope → *tidak ditemukan*; petani nonaktif hanya SUPERADMIN (sama dengan Detail Petani) — kelonggaran itu diteruskan ke kueri lampiran (`fetchParcelPassport … { includeInactiveFarmer }`), lahan nonaktif tetap tak pernah ikut | Guard `hasPermission("master-data-farmers","PRINT")` + `farmerAccessFilter` pada petani; tiap lampiran tetap lewat `fetchParcelPassport` dengan `access` yang **sama** dioper (bukan dihitung ulang per lahan) sehingga tetangga ≤ 25 m di dalamnya mengikuti aturan baris berikut. Section **Monev BMP** di PDF menumpang izin **VIEW `master-data-bmp-monev`** (bukan PRINT Petani) — persis tab Monev BMP di layar; tanpa izin → `bmp: null`, section & badge tidak dicetak |
| **Lahan tetangga** (#327) — `fetchParcelNeighbors` (`src/lib/parcel-neighbor-query.ts`), dipakai Profil Lahan (PDF, tiga menu pemanggil) dan peta Detail Lahan | **Poligon dan identitas lengkap** (nama & kode petani, ID Lahan, Lembaga, jarak) semua lahan aktif MIS ≤ 25 m dari lahan yang dilihat — apa pun scope user | **Tautan ke halaman detail** tetangga: hanya untuk yang dalam scope (`inScope`, kueri kedua ber-`farmerRelationAccessFilter`); halaman detail tetangga di luar scope tetap 404 | Peta yang menghilangkan lahan di sebelahnya menyesatkan di lapangan, dan **nama pemilik tetangga adalah alat verifikasi** (keputusan owner 2026-09-14 — bentuk awal "nama hanya dalam scope" dibatalkan saat review). Aturan yang sama dengan pengecualian #317 di bawah; aturan akses tidak ditulis ulang di SQL. Dicetak siapa pun yang punya izin PRINT menu Lahan/Peta/Petani |
| **Patok bersama** (#329) — `getLandParcelMarkers`, PDF, ekspor per Lembaga | **ID Lahan, nama petani & Lembaga** semua lahan lain yang memakai patok yang sama ("juga patok lahan …"), — apa pun scope user (tanda NKT turunan dihapus #345) | **Tautan ke halaman detail** lahan pemakai lain hanya bila dalam scope (`landParcelId` null di luar scope); akses ke patok selalu lewat **baris lahan** yang diminta (`resolveParcel` ber-`farmerRelationAccessFilter`), tidak ada endpoint per patok | Patok fisik yang sama memang berdiri di batas dua–empat lahan; menyembunyikan pemakai lain membuat "patok bersama" tak bisa diverifikasi di lapangan. Aturan sama dengan tetangga #327 |
| **Patok di Peta Lahan** (#331) — `getMapMarkers`, `getMapMarkerExportRows` | Titik patok + "ID Lahan #n" semua lahan pemakainya (tanpa tanda NKT turunan sejak #345) | Scope = Lembaga di filter ∧ akses user (`farmerGroupAccessFilter` di `AND`, pola `getMapData`); patok hanya muncul bila salah satu lahan pemakainya ada di filter; unduhan digate `map-parcel:EXPORT` | Sama dengan aturan patok bersama: ID lahan pemakai lain bukan rahasia, tetapi datasetnya sendiri hanya untuk wilayah yang boleh dilihat |
| **UL Parcel Code bersama** (2026-09-23, klaim ganda vendor) — `getLandParcelSatellites` (`otherParcels` per kode), tab Legalitas Detail Lahan | **ID Lahan** semua lahan aktif lain yang memegang kode (pemeta + kode) yang sama — apa pun scope user | **Tautan ke halaman detail** hanya bila lahan itu dalam scope (`id` null di luar scope → teks biasa); nama petani/Lembaga lawan tidak dikirim | Klaim ganda tak bisa dicek silang tanpa tahu lahan lawannya; aturan sama dengan patok bersama #329. Akses tetap lewat baris lahan yang diminta (`farmerRelationAccessFilter`) |
| **Tumpang Tindih Lahan** (#317 Fase 2, tab Tumpang Tindih) — `getParcelOverlaps`, `getParcelOverlapGeometries` (`src/server/actions/parcel-overlap.ts`) | Pasangan lahan yang bertumpang tindih bila **minimal satu sisi** dalam scope user; sisi lawan ditampilkan **lengkap** (nama & kode petani, ID lahan, Kelompok Tani, Lembaga, Distrik, poligon) | Pasangan yang kedua sisinya di luar scope; **tautan Detail Lahan** sisi di luar scope (`inScope` false — halaman itu 404) | Verifikasi klaim ganda mustahil tanpa identitas sisi lawan; dibatasi izin menu khusus `data-analyst-parcel-overlap` (DONOR tidak diberi, dikunci `menu-access.test.ts`). Scope SQL dari `rawFarmerGroupScope` (tidak ditulis ulang). Preseden: `getAdminBoundaries` (#266), tetangga #327. **Guard bulk upload shapefile** (#317 Fase 3, `checkUploadParcelOverlaps`) memakai pengecualian yang sama **hanya untuk pemegang izin VIEW `data-analyst-parcel-overlap`**: baris berkas dibatasi scope petani (sama dengan simpan), lahan lawan di DB dicari di seluruh data; identitasnya (ID Lahan, nama & kode petani) disebut bila dalam scope user atau user berizin laporan itu — selain itu peringatan hanya menyebut nama Lembaga lahan lawan (izin VIEW upload saja tidak membuka identitas petani Lembaga lain, review `be8fe45`). **Tab Luar Boundary & Selisih Luas** di menu yang sama (`src/server/actions/parcel-boundary-area.ts`, 2026-10-07) **tidak** memakai pengecualian ini — temuan satu lahan, scope normal |
| **Target Program** (#403) — `getProgramTargets`, `saveProgramTargets` (`src/server/actions/program-target.ts`), Master Data › Target Program & tampilan vs Kontrak Dashboard Pelatihan | Angka target kontrak **seluruh program** (bukan data per Lembaga — tidak ada yang bisa disaring) | Realisasi pembandingnya tetap ikut scope & filter (dihitung dari data Dashboard Pelatihan yang sudah ber-scope) | Target kontrak adalah angka program, bukan data petani; baca butuh VIEW `master-data-program-target` atau `dashboard-training`, ubah EDIT/CREATE/DELETE (SUPERADMIN/ADMIN). Catatan di tampilan bila filter aktif: realisasi terfilter vs target seluruh program |

Menambah pengecualian baru = menambah baris di tabel ini **dan** komentar di fungsinya.

### Scope pada aksi tulis

Scope tidak hanya menyaring bacaan — **target yang dipilih klien** pada aksi tulis juga diverifikasi sebelum ditulis (pelajaran #409, 2026-10-10):

| Aksi | Yang diverifikasi ke scope | Helper / aturan |
|---|---|---|
| Buat/ubah Petani | `farmerGroupId` tujuan | Lembaga dicari dengan `AND: farmerGroupAccessFilter(access)` — di luar scope = *tidak ditemukan* |
| Buat/ubah Lembaga Petani (#409) | `districtId` tujuan (dan distrik saat ini) | `canPlaceGroupInDistrict(access, districtId, currentDistrictId?)` (`src/lib/access-scope.ts`): `BY_DISTRICT` hanya distrik scope; `BY_FARMER_GROUP` tidak boleh membuat Lembaga baru maupun memindah distrik; distrik wajib ada & aktif |
| Kelola pengguna — Settings › Users (#386) | pemanggil, bukan target | Semua action `user.ts` · `user-data-access.ts` · `user-menu-access.ts` hanya untuk pemanggil ber-mode `ALL`; akun SUPERADMIN & role SUPERADMIN hanya oleh SUPERADMIN; akun sendiri tak bisa diubah role/status/penugasan/override (`src/lib/user-admin-guard.ts`) |
| Matriks Role & Permission (#386) | pemanggil | `setRolePermissions` hanya SUPERADMIN |

Rincian aturan anti-eskalasi: [../standards/rbac.md](../standards/rbac.md#anti-eskalasi-pengelolaan-pengguna-386-butir-2); pola kode: [../standards/code-standards.md](../standards/code-standards.md).

### Prioritas Resolusi Izin

1. **SUPERADMIN** → bypass: semua izin, tanpa filter scope
2. Untuk peran lain, per node menu **dari akar ke daun**:
   1. mulai dari izin efektif **induk** (warisan kaskade);
   2. **tambah** baris `RolePermission` node itu (CREATE/VIEW/EDIT/DELETE/EXPORT/PRINT);
   3. terapkan **`UserPermissionOverride`** node itu — `granted` menambah, revoke **mencabut** (termasuk mencabut hasil warisan); hasilnya menjadi warisan anak-anaknya
3. Tidak ada izin yang dibutuhkan di node itu → menu disembunyikan / aksi ditolak

**Pewarisan kaskade**: `getEffectiveMenuPermissions` (`src/lib/rbac.ts`) menelusuri pohon menu top-down — izin efektif tiap node = izin induk + `RolePermission` node itu, lalu override per-user diterapkan per node (grant menambah, revoke mencabut, termasuk mencabut hasil warisan). Contoh konkret: `role-permissions.csv` **tidak punya baris** `dashboard-risk` untuk OPERATOR/MANAGEMENT, tetapi keduanya tetap dapat VIEW menu Risk Management karena mewarisi VIEW dari induk `dashboard` (ADMIN mewarisi CREATE/EDIT/VIEW dari induk yang sama). Sebaliknya DONOR tidak punya baris `dashboard`/`master-data`/`report`/`map` sama sekali — aksesnya hanya dari baris anak miliknya sendiri.

</details>
