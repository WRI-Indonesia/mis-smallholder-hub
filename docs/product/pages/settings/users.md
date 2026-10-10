# User Management

[← Menu Settings](README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: User Management (/admin/settings/users)
├── Header
│   ├── Heading: User Management
│   └── Deskripsi: Kelola akun pengguna sistem
├── Toolbar / Filter
│   ├── Filter status: Semua / Aktif / Nonaktif
│   ├── Pencarian: Cari nama atau email...
│   ├── Excel (export data-users)
│   ├── Kolom (Tampilkan Kolom)
│   └── Tambah User (CREATE)
├── Tabel user (DataTable)
│   ├── Kolom: Nama · Email · Role · Akses Data · Akses Menu · Status · (aksi)
│   └── Aksi baris: Edit · Nonaktifkan / Aktifkan kembali · Akses Data · Hak Akses Menu
├── Dialog
│   ├── Tambah User / Edit User
│   │   └── Nama · Email · Role · Password · Batal / Buat / Simpan
│   ├── Akses Data — {nama user}
│   │   ├── Ringkasan Akses
│   │   ├── Pencarian
│   │   ├── Tab: Provinsi
│   │   │   └── Checkbox nama provinsi (auto-save)
│   │   ├── Tab: Distrik
│   │   │   └── Checkbox {distrik} ({provinsi}) (auto-save)
│   │   ├── Tab: Lembaga Petani
│   │   │   └── Checkbox {nama} {abrv} — {distrik} (auto-save)
│   │   ├── Empty state: Tidak ada data
│   │   └── Tutup
│   └── Hak Akses Menu — {nama user}
│       ├── Status Override
│       ├── Pencarian: Cari menu...
│       ├── Matrix izin menu
│       │   ├── Kolom: Menu · C · V · E · D · X · P · Status
│       │   ├── Baris: menu parent → menu anak (CornerDownRight)
│       │   └── Sel izin: role default granted / role default denied
│       │                / override granted / override revoked
│       ├── Badge Status: role / granted / revoked
│       ├── Keterangan (legend)
│       ├── Empty state: Tidak ada menu ditemukan
│       └── Tutup
└── Toast
    ├── Status user diubah / Gagal mengubah status
    ├── User berhasil dibuat / User berhasil diupdate
    ├── Gagal memuat data akses / Gagal menyimpan
    └── Gagal memuat data izin menu / Gagal mengubah akses
```

## Sub Menu: User Management (`settings-users`)

| Atribut | Nilai |
|---|---|
| URL | `/admin/settings/users` |
| Icon | `UserCog` |
| Order | 1 |

## Page: `/admin/settings/users`

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/settings/users/page.tsx` |
| Client | `src/app/(admin)/admin/settings/users/user-list-client.tsx` |
| Tipe | Server Component (list) → Client Component (tabel + dialog) |
| Guard | `requirePermission("settings-users")`; halaman meneruskan `currentUserId` (sesi) & `isSuperAdmin` ke klien untuk menyembunyikan kontrol yang pasti ditolak server (#386) |
| Server action / data | `getUsers()` (`src/server/actions/user.ts`), `getUserPermissionsForMenu("settings-users")`. **Semua action pengelolaan pengguna hanya untuk pemanggil ber-scope `ALL`** (`src/lib/user-admin-guard.ts`, #386 — lihat [standards/rbac.md](../../../standards/rbac.md#anti-eskalasi-pengelolaan-pengguna-386-butir-2)) |
| Loading | `loading.tsx` |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| `Panduan` | Tautan | `HelpHint` — ikon `?` di header menuju tutorial Bantuan untuk `settings-users` (`findTutorialForMenu`), dibuka di tab baru |
| `User Management` | Heading | `h1`, deskripsi: `Kelola akun pengguna sistem` |
| Filter status | Tombol grup | `Semua` / `Aktif` / `Nonaktif` (toolbar kiri, filter client-side) |
| Pencarian | Filter | Placeholder `Cari nama atau email...`, mencari pada kolom `name` dan `email` |
| `Excel` | Tombol | Export data tabel, nama file `data-users` — digate izin `EXPORT` (#245) |
| `Kolom` | Dropdown | Toggle visibilitas kolom (`Tampilkan Kolom`) |
| `Tambah User` | Tombol | Ikon `Plus`; tampil hanya jika permission `CREATE` |
| Tabel user | Tabel | Komponen `DataTable` — sortable, paginasi (`Tampilkan N dari X data`, `Halaman n dari m`) |
| Aksi baris | Tombol | `Edit` (permission EDIT), `Nonaktifkan` / `Aktifkan kembali` (permission DELETE) via `TableActions`. **Anti-eskalasi (#386):** baris akun SUPERADMIN tanpa `Edit`/`Nonaktifkan` bila pemanggil bukan SUPERADMIN; baris **akun sendiri** tanpa `Nonaktifkan` (`Edit` tetap — nama/email/password) |
| `Akses Data` | Tombol | Ikon `Database`; tampil jika permission `EDIT`, bukan baris akun sendiri, dan bukan akun SUPERADMIN bagi pemanggil non-SUPERADMIN; membuka dialog Akses Data |
| `Hak Akses Menu` | Tombol | Ikon `Shield`; tampil jika permission `EDIT` **dan** `user.role !== "SUPERADMIN"` **dan** bukan baris akun sendiri; membuka dialog Hak Akses Menu |
| Toast | Notifikasi | `Status user diubah` / pesan galat server (mis. penolakan anti-eskalasi) atau `Gagal mengubah status` |

**Kolom tabel user**

| Kolom | Sortable | Isi |
|---|---|---|
| `Nama` | Ya | `user.name` |
| `Email` | Ya | `user.email` |
| `Role` | Ya | Badge role berwarna (`ROLE_BADGE_CLASS`, `src/lib/roles.ts`): SUPERADMIN (merah), ADMIN (biru), OPERATOR (hijau), MANAGEMENT (ungu), DONOR (teal) |
| `Akses Data` | Tidak | Badge outline gabungan: nama provinsi, nama distrik, dan `abrv` (fallback `name`) lembaga petani; `—` bila tidak ada |
| `Akses Menu` | Tidak | Badge amber `{n} Override` bila ada `permissionOverrides`; `—` bila kosong |
| `Status` | Ya | Badge `Aktif` / `Nonaktif` |
| (aksi) | — | Kolom aksi baris |

### Dialog: Tambah User / Edit User

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/settings/users/user-form-modal.tsx` |
| Server action | `createUser()` / `updateUser()` (`src/server/actions/user.ts`) |
| Judul | `Tambah User` (create) / `Edit User` (edit) |

| Objek | Tipe | Keterangan |
|---|---|---|
| `Nama` | Input | Wajib |
| `Email` | Input | `type="email"`, wajib |
| `Role` | Select | Opsi digenerate dari `ROLES` (`src/lib/roles.ts`) — 5 opsi: `SUPERADMIN`, `ADMIN`, `OPERATOR`, `MANAGEMENT`, `DONOR`; default `OPERATOR`. **#386:** opsi `SUPERADMIN` hanya tampil bagi pemanggil SUPERADMIN (atau bila akun yang diedit sudah SUPERADMIN); saat mengedit **akun sendiri** role tampil sebagai teks terkunci (`title` "Role akun Anda sendiri tidak bisa diubah") + nilai tersembunyi |
| `Password` | Input | `type="password"`; wajib saat create. Saat edit label bersuffix `(kosongkan jika tidak diubah)` |
| `Batal` / `Buat` / `Simpan` | Tombol | `Buat` saat create, `Simpan` saat edit |
| Toast | Notifikasi | `User berhasil dibuat` / `User berhasil diupdate`; galat server ditampilkan apa adanya (mis. pesan penolakan anti-eskalasi). Email unik dibandingkan tanpa beda huruf besar |

### Dialog: Akses Data — {nama user}

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/settings/users/user-data-access-modal.tsx` |
| Server action | `getUserDataAccess()`, `getRegionsForSelect()`, `assignUserProvince()` / `removeUserProvince()`, `assignUserDistrict()` / `removeUserDistrict()`, `assignUserFarmerGroup()` / `removeUserFarmerGroup()` (`src/server/actions/user-data-access.ts`) |
| Judul | `Akses Data — {userName}` |

| Objek | Tipe | Keterangan |
|---|---|---|
| `Ringkasan Akses` | Panel | Bila belum ada assignment: `Belum dibatasi (akses semua data)` (ikon `ShieldAlert`). Bila ada: badge `Semua district di {provinsi}` (ikon `Map`), badge nama distrik (ikon `Building2`), badge `abrv`/nama lembaga petani (ikon `Tractor`) |
| Pencarian | Filter | Placeholder `Cari provinsi, distrik, atau lembaga petani...`; memfilter ketiga tab |
| `Provinsi` | Tab | Ikon `Map`; badge jumlah provinsi terpilih; daftar checkbox nama provinsi |
| `Distrik` | Tab | Ikon `Building2`; badge jumlah distrik terpilih; daftar checkbox `{nama distrik} ({nama provinsi})` |
| `Lembaga Petani` | Tab | Ikon `Tractor`; badge jumlah lembaga terpilih; daftar checkbox `{nama} {abrv} — {distrik}` |
| Checkbox | Toggle | Setiap centang/lepas langsung memanggil assign/remove action (auto-save, spinner per baris) |
| Empty state | Teks | `Tidak ada data` per tab |
| `Tutup` | Tombol | Menutup dialog dan me-refresh daftar user |
| Toast | Notifikasi | `Gagal memuat data akses` / `Gagal menyimpan` |

### Dialog: Hak Akses Menu — {nama user}

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/settings/users/user-menu-access-modal.tsx` |
| Server action | `getMenuItemsForSelect()`, `getUserEffectivePermissions()`, `setUserMenuOverride()`, `removeUserMenuOverride()` (`src/server/actions/user-menu-access.ts`) |
| Judul | `Hak Akses Menu — {userName}` (ikon `Shield`), subteks `Role: {userRole}` |

| Objek | Tipe | Keterangan |
|---|---|---|
| `Status Override` | Panel | `Tidak ada override (mengikuti default role)` atau `{n} override aktif dari default role` (ikon `ShieldAlert` bila > 0) |
| Pencarian | Filter | Placeholder `Cari menu...`; mencocokkan judul menu, parent ikut ditampilkan |
| Matrix izin menu | Matrix | Kolom: `Menu`, `C`, `V`, `E`, `D`, `X` (Export), `P` (Print), `Status` — 6 kolom izin dari `PERMISSION_LEVELS` (`src/lib/permission-levels.ts`). Baris: menu parent (tanpa indentasi) diikuti anaknya (indentasi + ikon `CornerDownRight`). **Keterbatasan:** `getTreeItems()` hanya merender level 1–2, sehingga menu level 3 (Fire Alert, `dashboard-risk-fire`) tidak tampil dan tidak bisa diberi override per-user di sini (induknya `dashboard-risk` punya anak → sel kosong) |
| Sel izin | Toggle | Hanya dirender untuk menu **tanpa anak**; menu yang punya anak menampilkan sel kosong dan `—` pada kolom Status |
| Sel — role default granted | Status | Blok solid `bg-primary` bertitik; title `Default Role: Diberikan (Klik untuk cabut)` → membuat override `granted = false` |
| Sel — role default denied | Status | Kotak kosong ber-border; title `Default Role: Ditolak (Klik untuk berikan)` → membuat override `granted = true` |
| Sel — override granted | Status | Kotak hijau ikon `Check`; title `Override: Diberikan (Klik untuk hapus override)` → menghapus override |
| Sel — override revoked | Status | Kotak merah ikon `X`; title `Override: Dicabut (Klik untuk hapus override)` → menghapus override |
| Badge `Status` | Badge | `role` (tidak ada override), `granted` (semua override memberi), `revoked` (ada override mencabut) |
| Keterangan | Legend | `Role default (diberikan)`, `Role default (ditolak)`, `Override: diberikan (hijau)`, `Override: dicabut (merah)` |
| Empty state | Teks | `Tidak ada menu ditemukan` |
| `Tutup` | Tombol | Menutup dialog dan me-refresh daftar user |
| Toast | Notifikasi | `Gagal memuat data izin menu` / `Gagal mengubah akses` |
