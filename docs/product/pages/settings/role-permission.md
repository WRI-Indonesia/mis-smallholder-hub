# Role & Permission

[← Menu Settings](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Role & Permission (/admin/settings/roles)
├── Header
│   ├── Heading: Role & Permission
│   └── Deskripsi: Atur default permission per role untuk setiap menu
├── Toolbar
│   ├── Pencarian: Cari menu... (title / key, level 1–3; induk tetap tampil bila anak cocok)
│   ├── Buka semua / Tutup semua (nonaktif saat mencari)
│   └── Selektor role: chip toggle ADMIN · OPERATOR · MANAGEMENT · DONOR (default semua) + "Semua"
├── Matrix role × permission (scroll box, sticky header + kolom Menu)
│   ├── Header baris 1: Menu · [role yang dipilih] (tiap role colSpan=4)  — SUPERADMIN TIDAK ditampilkan
│   ├── Header baris 2: C · V · E · D  (CREATE · VIEW · EDIT · DELETE)
│   ├── Baris (render rekursif 3 level, collapsible)
│   │   ├── Chevron buka/tutup (bila punya anak)
│   │   ├── Judul menu (indentasi per level)
│   │   └── Tombol ListChecks: toggle semua izin di baris ini
│   └── Sel: Granted (kotak solid bg-primary) / Denied (kotak border) — klik = toggle optimistis
├── Legend: Granted · Denied · ListChecks · C/V/E/D · "SUPERADMIN selalu akses penuh (tidak ditampilkan)"
├── Dialog kaskade: "Terapkan ke sub-menu?" (Batal · Hanya menu ini · Termasuk sub-menu)
└── Toast: Gagal menyimpan permission (revert optimistis)
```

## Sub Menu: Role & Permission (`settings-roles`)

| Atribut | Nilai |
|---|---|
| URL | `/admin/settings/roles` |
| Icon | `Shield` |
| Order | 3 |

## Page: `/admin/settings/roles`

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/settings/roles/page.tsx` |
| Client | `src/app/(admin)/admin/settings/roles/role-matrix-client.tsx` |
| Tipe | Server Component → Client Component (matrix) |
| Guard | `requirePermission("settings-roles")` |
| Server action / data | `getRolePermissions()`, `setRolePermissions(updates)` (`src/server/actions/role-permission.ts`), `getAllMenuItems()` (`src/server/actions/menu.ts`) |
| Helper | `buildMenuTree` / `flattenTree` / `descendantKeys` / `collapsibleKeys` (`src/lib/menu-tree.ts`), `useCollapseState` (`src/lib/use-collapse-state.ts`), `ROLES` (`src/lib/roles.ts`) |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| `Role & Permission` | Heading | `h1`, deskripsi: `Atur default permission per role untuk setiap menu` |
| Pencarian | Filter | Placeholder `Cari menu...`; mencocokkan `title`/`key` level 1–3, leluhur ikut tampil, subtree cocok di-expand paksa |
| `Buka semua` / `Tutup semua` | Tombol | Buka/tutup seluruh induk; state disimpan `localStorage` (`role-matrix:open`), default *collapsed*; nonaktif saat mencari |
| Selektor role | Chip toggle | Pilih role yang ditampilkan (`ADMIN`, `OPERATOR`, `MANAGEMENT`, `DONOR`); default semua; minimal 1; tombol `Semua` untuk reset. **SUPERADMIN dikecualikan** dari matriks (selalu akses penuh, tak dapat diubah) |
| Matrix role × permission | Matrix | Dalam scroll box (`overflow-auto max-h-[70vh]`); header baris role & baris `C/V/E/D` **sticky top**, kolom `Menu` **sticky left**. Baris dirender **rekursif 3 level** (fix bug level-3) |
| Baris menu | Baris | Chevron buka/tutup (bila punya anak), judul terindentasi per kedalaman, tombol `ListChecks` untuk toggle semua izin di baris (× role tampil) |
| Sel matrix | Toggle | Kotak solid `bg-primary` = granted, kotak border = denied. Klik = **toggle optimistis** (update lokal → `setRolePermissions`), revert + toast bila gagal — tanpa `router.refresh()` |
| Aksi baris (`ListChecks`) | Bulk | Set seluruh izin baris (× role tampil) ke lawan kondisi saat ini. Bila menu punya sub-menu → dialog kaskade |
| Dialog kaskade | Dialog | `Terapkan ke sub-menu?` — `Batal` · `Hanya menu ini` · `Termasuk sub-menu` (menerapkan ke seluruh keturunan) |
| Legend | Legend | `Granted` · `Denied` · `ListChecks` (toggle baris) · `C = Create · V = View · E = Edit · D = Delete · SUPERADMIN selalu akses penuh (tidak ditampilkan)` |
| Toast | Notifikasi | `Gagal menyimpan permission` (saat gagal; sukses tanpa toast karena optimistis) |
