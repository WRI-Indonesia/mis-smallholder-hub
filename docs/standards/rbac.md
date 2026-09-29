# Standar — RBAC & Menu Access

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [principles.md](./principles.md) · [workflow.md](./workflow.md) · [code-standards.md](./code-standards.md) · [ui-ux.md](./ui-ux.md) · [architecture.md](./architecture.md)

### Inventaris Role

Aplikasi memiliki **5 role** (enum `Role` di `prisma/schema/_config.prisma`):

| Role | Deskripsi |
|------|-----------|
| **SUPERADMIN** | Akses penuh seluruh menu dan data (bypass RBAC). |
| **ADMIN** | Kelola data dalam cakupan wilayah yang ditugaskan. |
| **OPERATOR** | Petugas lapangan: **membaca, mengekspor, dan mencetak** data lembaga/KT yang ditugaskan — tanpa hak tulis. Pemasukan data dikerjakan lewat impor massal oleh admin (keputusan owner 2026-08-13 mengikuti keadaan produksi; sebelumnya tertulis "input & ubah data", lihat #263). |
| **MANAGEMENT** | Read-only (VIEW/EXPORT/PRINT, tanpa menulis): dashboard, laporan, peta, master data, Data Analyst (termasuk Metrik Rilis, Peta Data, Sprint Mingguan), Bantuan, dan daftar snapshot Tools. |
| **DONOR** | Read-only untuk donor/funder: dashboard, laporan (tanpa Kelompok Tani & Patok), peta, bantuan, dan **5 menu master data** (Lembaga Petani, Petani, Pelatihan, Lahan, Monev BMP) — hanya VIEW + PRINT, **tanpa EXPORT** dan tanpa menulis. Riwayat: 2026-08-13 master data dicabut (#263, daftar petani memuat NIK & alamat); **2026-09-29 dibuka kembali atas keputusan owner** (mengikuti perubahan produksi 2026-09-23). |

**Sentralisasi:** daftar role di sisi aplikasi hanya hidup di `src/lib/roles.ts` (`ROLES`, `ROLE_BADGE_CLASS`) — dipakai validasi (`user.schema.ts`), form & daftar pengguna, dan matriks Role & Permission. Menambah role baru cukup: edit `src/lib/roles.ts` + tambah nilai di enum `Role` Prisma (migrasi) + seed permission-nya. Jangan hardcode daftar role di tempat lain.

### Inventaris Permission

Enum `PermissionLevel` (`prisma/schema/_config.prisma`) punya **6 aksi**, dua grup (#245):

| Grup | Aksi | Menggate |
|------|------|----------|
| Data | `CREATE` | Tombol/aksi tambah data |
| Data | `VIEW` | Menu tampil di sidebar + akses halaman/read |
| Data | `EDIT` | Tombol/aksi ubah data |
| Data | `DELETE` | Tombol/aksi nonaktifkan (soft delete) |
| Keluaran | `EXPORT` | Tombol unduh **Excel/SHP/data mentah** (termasuk tombol Excel bawaan `DataTable` via prop `canExport`) |
| Keluaran | `PRINT` | Tombol cetak/unduh **PDF** (laporan, farm passport, cetak peta) |

**Sentralisasi:** daftar + label + huruf singkat permission hanya hidup di `src/lib/permission-levels.ts` (`PERMISSION_LEVELS`, `ALL_PERMISSIONS`) — dipakai bypass SUPERADMIN (`rbac.ts`), matriks Role & Permission, dan modal Hak Akses Menu. Jangan hardcode daftar permission di tempat lain (pola sama dengan `src/lib/roles.ts`).

**Cakupan baris permission keluaran:** baris `EXPORT`/`PRINT` di-seed/backfill **hanya pada menu daun** — cascade bersifat union (induk → anak, tanpa pengurangan), sehingga baris di menu induk membuat revoke per sub-menu tidak efektif (migrasi koreksi `20260812130000`). Grant manual di induk tetap boleh bila memang ingin berlaku satu seksi penuh.

Konvensi gating keluaran (#245, idiom diseragamkan #247):
- **Idiom page**: butuh ≥2 aksi dari satu menu → panggil `getUserPermissionsForMenu(menuKey)` sekali lalu `includes()`; cek tunggal atau lintas-menu → `hasPermission(menuKey, aksi)`. Keduanya di-cache per-request, jadi ini soal keterbacaan, bukan kinerja — jangan campur dua idiom untuk menu yang sama di satu page.
- Page server component mengirim **boolean bernama** (`canExport`/`canPrint`/`canPrintParcel`) ke client, bukan array `permissions` mentah — eksplisit tentang aksi apa yang dipakai komponen (keputusan #247: threading boolean dipertahankan; array hanya untuk list page master-data yang memakai banyak aksi sekaligus).
- Export yang dibangun **client-side dari data yang sudah tampil** cukup digate di UI (datanya memang sudah di tangan user). Server action yang menyuplai data **khusus** export/print (mis. farm passport) wajib guard `hasPermission(menuKey, "PRINT"/"EXPORT")` juga.
- SUPERADMIN bypass mengembalikan keenam aksi (`src/lib/rbac.ts`).

> [!NOTE]
> **Istilah (hierarki final #189):** Petani → Kelompok Tani → Lembaga Petani. Model `FarmerGroup` = **Lembaga Petani**; "KT" (Kelompok Tani) kini merujuk level per-lahan (`subGroupLv2`), bukan `FarmerGroup`.

### Kaskade Izin Menu — union tanpa pengurangan

`getEffectiveMenuPermissions` (`src/lib/rbac.ts`, dipakai `getUserPermissionsForMenu`) menelusuri pohon menu dari akar dan **mewariskan izin induk ke seluruh anaknya**:

```ts
function traverse(key, parentPermissions = new Set()) {
  const currentPerms = new Set(parentPermissions);   // izin induk diwarisi
  // + baris RolePermission menu ini
  // + override per-pengguna (satu-satunya yang bisa MENGURANGI)
  children.forEach(child => traverse(child, currentPerms));
}
```

Tiga konsekuensi yang harus disadari **sebelum menempatkan menu baru**:

1. **Sub-menu tidak pernah bisa lebih ketat daripada induknya.** Memberi `VIEW` pada menu induk berarti memberi `VIEW` pada semua anaknya, sekarang dan yang ditambahkan kelak.
2. **Menghilangkan baris `RolePermission` bukan mekanisme pembatasan.** Menu tanpa baris apa pun tetap terbuka bila induknya terbuka. Satu-satunya pengurangan berlaku lewat `UserPermissionOverride` — dan itu per-pengguna, bukan per-peran.
3. **Menaruh menu sensitif di bawah induk yang luas akan membukanya diam-diam.** Preseden: #245 harus menghapus 52 baris EXPORT/PRINT di menu induk karena revoke per sub-menu memang mandul.

Karena itu, kalau sebuah menu harus terbatas, yang menentukan adalah **izin menu induknya** — bukan daftar baris di menu itu sendiri. Contoh yang berlaku sekarang: `data-analyst-farmer-summary` (Ringkasan Petani) hanya terbuka untuk SUPERADMIN karena induk `data-analyst` hanya ber-VIEW untuk SUPERADMIN dan menu itu tidak diberi baris untuk peran lain — `data-analyst-data-map` terbuka untuk ADMIN/MANAGEMENT karena barisnya sendiri memberi VIEW.

**Dijaga test.** `src/test/menu-access.test.ts` menghitung ulang izin efektif dari `prisma/seeds/data/menu.csv` + `role-permissions.csv` dengan logika kaskade yang sama, lalu membandingkannya dengan daftar akses yang dinyatakan untuk menu sensitif. Klaim seperti "SUPERADMIN saja" karena itu tidak bisa lagi salah tanpa ketahuan di gate lokal. Catatan: yang dijaga adalah **sisi kode**, bukan isi database produksi — keduanya diketahui berbeda (#263). Sejak review #339 (2026-09-15) test yang sama juga menjaga **ikon `menu.csv` ↔ `ICON_MAP`** (`menu.csv` sempat menyemai `map-parcel` ber-ikon `MapPinned` yang tidak ada di `ICON_MAP` sejak #113 — sidebar & Menu Management tampil tanpa ikon pada DB baru; DB prod sudah dikoreksi lewat UI tanpa pernah kembali ke CSV). (Penjaga seed parsial `seed-menu-report-marker.mjs` ikut dihapus 2026-09-29 bersama skripnya — kini `seed-menu-key.mjs` membaca menu & izin langsung dari CSV, jadi tak bisa menyimpang.)

**Jarak ke produksi.** Izin di produksi disesuaikan lewat UI Role & Permission, dan penyesuaian itu tidak punya jalan pulang ke `prisma/seeds/data/*.csv`. Per 2026-08-13 selisihnya **115 baris** (#263); per 2026-09-29 tinggal **11 baris**, seluruhnya izin 2 menu yang belum dirilis (`data-analyst-parcel-overlap`, `data-analyst-sprint`) — seed disamakan ke produksi (keputusan [0005](../decisions/0005-produksi-acuan-menu-izin.md)). Jalankan `npm run rbac:compare` (read-only, keluar kode 1 bila ada selisih) sebagai bagian checklist rilis; unit test tidak bisa menggantikannya karena butuh koneksi database.

**Sidebar.** `filterMenuTreeByAccess` (`src/lib/menu-utils.ts`) menyimpan sebuah node bila ia sendiri dapat diakses **atau** salah satu anaknya lolos. Jadi mencabut izin induk tidak menyembunyikan grupnya selama masih ada anak yang boleh dibuka — inilah yang membuat pembatasan lewat induk tetap berterima secara navigasi.

### Hierarki Akses Data RBAC

Ringkas (`getAccessContext()`, `src/lib/access-context.ts`): SUPERADMIN atau **tanpa assignment** → `ALL`; **hanya** `UserFarmerGroup` → `BY_FARMER_GROUP` (id Lembaga); ada `UserProvince`/`UserDistrict` → `BY_DISTRICT` (gabungan district; assignment Lembaga **diabaikan**); sesi kosong / user tak ditemukan → `BY_DISTRICT` kosong (tolak semua). Terjemahkan ke `where` lewat helper `src/lib/access-scope.ts`, jangan ternary manual. Rincian, contoh, dan pengecualian scope yang tercatat: [product/access-context.md](../product/access-context.md).

> [!WARNING]
> **Bug pattern lama** — jangan memfilter hanya `districtId` tanpa menangani `BY_FARMER_GROUP`: user yang hanya ditugaskan ke Lembaga akan mendapat `districtId: { in: [] }` dan semua datanya hilang. Helper di `access-scope.ts` sudah menangani ketiga mode.

### UI Penugasan Akses Data User

Untuk assign data access per user (Province/District/Lembaga Petani):
- **Server Actions** — di `src/server/actions/user-data-access.ts`: `getUserDataAccess`, `getRegionsForSelect`, `assignUserProvince/District/FarmerGroup`, `removeUserProvince/District/FarmerGroup`
- **Modal** — `UserDataAccessModal` (Tabs: Provinsi | Distrik | Lembaga Petani) dengan live-save checkbox per item
- **Table Summary** — Gunakan komponen `AccessSummaryCell` di kolom "Akses Data": badge per assignment, `—` jika kosong
- **Real-time refresh** — Pass `onDataChange` callback ke modal → panggil `startTransition(() => router.refresh())` setiap toggle berhasil

### UI Override Akses Menu per User

Untuk melakukan override permission menu per user (grant/revoke):
- **Server Actions** — di `src/server/actions/user-menu-access.ts`: `getMenuItemsForSelect`, `getUserEffectivePermissions`, `setUserMenuOverride`, `removeUserMenuOverride`
- **Modal** — `UserMenuAccessModal` dengan matrix C | V | E | D | X (Export) | P (Print) per menu (`PERMISSION_COLUMNS`), visual code status (`role` | `granted` | `revoked`), dan interactive toggle saving.
- **Keamanan** — Pengecekan di server action wajib menolak override terhadap user berkole `SUPERADMIN`.
- **Soft Delete** — Penghapusan override menggunakan update `isActive: false` (bukan physical delete).
- **Optimasi Caching** — Fungsi pembacaan permission di `src/lib/rbac.ts` wajib dibungkus dengan React `cache` untuk mereduksi kueri ganda pada render lifecycle.

### UI Matriks Role & Permission

Untuk mengelola permission per role (matriks role × menu × 6 izin di Settings — header ikon per izin, grup Data ┊ Keluaran, preset baris via dropdown `ListChecks`, toggle satu kolom via klik ikon header, hover highlight silang):
- **Server Actions** — di `src/server/actions/role-permission.ts`: `getRolePermissions` dan `setRolePermissions(updates[])` — set satu atau banyak permission ke keadaan eksplisit dalam **satu transaksi** (satu sel, satu baris penuh, kaskade induk → anak); `toggleRolePermission` per sel dihapus #353 (tak terpakai sejak #187).
- **SUPERADMIN dikecualikan dari matriks** (keputusan governance): kolom yang tampil/diedit hanya `EDITABLE_ROLES = ROLES.filter((r) => r !== "SUPERADMIN")` (`role-matrix-client.tsx`), dan `setRolePermissions` mengabaikan entri role SUPERADMIN — SUPERADMIN bypass RBAC sehingga permission-nya tidak perlu (dan tidak boleh) diatur dari UI.

### Menu Bertingkat (3 Level)

Sistem menu mendukung hierarki sampai **3 level maksimal**:
- **Level 1:** Menu Besar (e.g., Master Data, Settings, Dashboard)
- **Level 2:** Sub Menu (e.g., Petani, Lembaga Petani, Pelatihan, User Management)
- **Level 3:** Detail Sub Menu (e.g., Peserta Pelatihan, Bukti Pelatihan, Land Parcel, Training Record)

**RBAC Permission Inheritance:**
- Permission di **level 1** berlaku untuk semua level 2 dan level 3 di bawahnya (cascade)
- Permission di **level 2** berlaku untuk semua level 3 di bawahnya
- **Override eksplisit** di level lebih dalam meng-override inheritance (revoke atau grant)
- Contoh: User punya VIEW di "Pelatihan" (level 2) → otomatis VIEW di "Peserta Pelatihan" (level 3), kecuali ada explicit REVOKE

> [!WARNING]
> **Cascade = risiko over-grant.** Grant pada menu **induk** mewariskan permission ke **semua** anak (termasuk menu sensitif seperti User/Role/Menu Management). Untuk akses **granular**, grant di level **anak**, jangan induk. Sidebar (`filterMenuTreeByAccess` di `menu-utils.ts`) tetap menampilkan induk sebagai **container** selama salah satu anaknya ter-grant — jadi grant per-anak **tidak** memerlukan grant induk. Konsekuensi: jangan mensyaratkan induk ter-grant hanya agar anak tampil. (Audit lintas-role: `scripts/local/audit-cascade.ts` — local-only; folder `scripts/local/` gitignored, tidak tersedia di clone baru.)

**UI Guidelines:**
- **Max children:** Level 2 maksimal 5 children (level 3) — hindari clutter, pertimbangkan pagination/search jika > 5
- **Dynamic route:** Level 3 gunakan dynamic route jika context-specific: `/admin/master-data/training/[id]/participants`
- **Max depth:** Level 3 tidak boleh punya children (max depth = 3 level)
- **Sidebar visual:**
  - Level 2: `pl-4`, normal text size, collapsible jika punya children
  - Level 3: `pl-4 pr-2`, `text-xs`, bullet `•` (`nav-main.tsx`)
- **Menu Management table visual** (pasca #187B, `menu-list-client.tsx`):
  - Indentasi numerik pada kolom Menu: `paddingLeft: depth * 20`
  - Depth 0 (level 1): **bold** + baris `bg-muted/30`
  - Depth ≥ 1 (level 2–3): `text-muted-foreground`
  - Pohon **collapsible**: tombol chevron (`ChevronRight`/`ChevronDown`) per baris yang punya anak, dinonaktifkan saat mode pencarian aktif

**Technical Implementation:**
- **Dua helper pohon menu** dengan peruntukan berbeda — jangan disatukan:
  - `src/lib/menu-utils.ts` — `buildMenuTree(items, parentKey, currentDepth, maxDepth)` menghasilkan pohon nested `children`; untuk jalur **server & sidebar** (`src/server/actions/menu.ts`, `filterMenuTreeByAccess`)
  - `src/lib/menu-tree.ts` — `buildMenuTree(items)` (satu argumen) menghasilkan node `{ item, depth, children }`, plus `collapsibleKeys`, `descendantKeys`, `flattenTree`; untuk **UI Settings** (tabel collapsible Menu Management & Role & Permission)
- Validation: `validateMenuDepth()` reject jika depth > 3 — dipanggil `validateMenuSeedRows` saat membaca `menu.csv` (bersama cek induk ada & bukan diri sendiri); seed/test gagal sebelum menulis apa pun
- RBAC: `getEffectiveMenuPermissions()` dengan fallback ke parent/grandparent
- Server action: Menu Management hanya `updateMenuItem` Aktif/Visible (#364) — tidak ada create/pindah menu; mengubah Aktif butuh `settings-menu:DELETE`, Visible cukup `EDIT`
