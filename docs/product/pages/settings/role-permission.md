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
│   ├── Header baris 1: Menu · [role yang dipilih] (tiap role colSpan=6)  — SUPERADMIN TIDAK ditampilkan
│   ├── Header baris 2: ikon per izin + tooltip — grup Data (Create · View · Edit · Delete)
│   │   ┊ pemisah border tebal ┊ grup Keluaran (Export Excel · Print PDF); klik ikon = toggle satu kolom
│   ├── Baris (render rekursif 3 level, collapsible)
│   │   ├── Chevron buka/tutup (bila punya anak)
│   │   ├── Judul menu (indentasi per level)
│   │   └── Dropdown ListChecks: preset baris — Lihat saja · Lihat + Unduh · Akses penuh · Kosongkan
│   └── Sel: Granted (kotak solid bg-primary) / Denied (kotak border) — klik = toggle optimistis;
│       hover = highlight silang baris × kolom
├── Legend: Granted · Denied · Preset baris · ikon per izin · "SUPERADMIN selalu akses penuh (tidak ditampilkan)"
├── Dialog kaskade: "Terapkan ke sub-menu?" (Batal · Hanya menu ini · Termasuk sub-menu)
├── Dialog toggle kolom: "Toggle satu kolom?" (Batal · Terapkan) — satu izin × semua menu × satu role
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
| `Panduan` | Tautan | `HelpHint` — ikon `?` di header menuju tutorial Bantuan untuk `settings-roles` (`findTutorialForMenu`), dibuka di tab baru |
| `Role & Permission` | Heading | `h1`, deskripsi: `Atur default permission per role untuk setiap menu` |
| Pencarian | Filter | Placeholder `Cari menu...`; mencocokkan `title`/`key` level 1–3, leluhur ikut tampil, subtree cocok di-expand paksa |
| `Buka semua` / `Tutup semua` | Tombol | Buka/tutup seluruh induk; state disimpan `localStorage` (`role-matrix:open`), default *collapsed*; nonaktif saat mencari |
| Selektor role | Chip toggle | Pilih role yang ditampilkan (`ADMIN`, `OPERATOR`, `MANAGEMENT`, `DONOR`); default semua; minimal 1; tombol `Semua` untuk reset. **SUPERADMIN dikecualikan** dari matriks (selalu akses penuh, tak dapat diubah) |
| Matrix role × permission | Matrix | Dalam scroll box (`overflow-auto max-h-[70vh]`); header baris role & baris ikon izin **sticky top**, kolom `Menu` **sticky left**. **6 izin per role** (`PERMISSION_META`): grup Data `CREATE·VIEW·EDIT·DELETE` ┊ grup Keluaran `EXPORT·PRINT` dengan pemisah border tebal antar grup. Baris dirender **rekursif 3 level** (fix bug level-3) |
| Header izin | Tombol | Ikon per izin (Plus/Eye/Pencil/Trash2/FileSpreadsheet/Printer) + tooltip `title`; **klik = toggle satu kolom** (satu izin × semua menu × role tsb) lewat dialog konfirmasi |
| Baris menu | Baris | Chevron buka/tutup (bila punya anak), judul terindentasi per kedalaman, dropdown `ListChecks` berisi **preset baris** |
| Preset baris (`ListChecks`) | Dropdown | `Lihat saja` (V) · `Lihat + Unduh` (V+X+P) · `Akses penuh` (semua) · `Kosongkan` (tanpa izin) — diterapkan × role tampil; bila menu punya sub-menu → dialog kaskade |
| Sel matrix | Toggle | Kotak solid `bg-primary` = granted, kotak border = denied. Klik = **toggle optimistis** (update lokal → `setRolePermissions`), revert + toast bila gagal — tanpa `router.refresh()`. Hover sel = highlight silang baris × kolom |
| Dialog kaskade | Dialog | `Terapkan ke sub-menu?` — `Batal` · `Hanya menu ini` · `Termasuk sub-menu` (menerapkan ke seluruh keturunan) |
| Dialog toggle kolom | Dialog | `Toggle satu kolom?` — konfirmasi memberi/mencabut satu izin pada **semua menu** untuk satu role |
| Legend | Legend | `Granted` · `Denied` · `Preset baris` · ikon+nama tiap izin · `Klik ikon header = toggle satu kolom · SUPERADMIN selalu akses penuh (tidak ditampilkan)` |
| Toast | Notifikasi | `Gagal menyimpan permission` (saat gagal; sukses tanpa toast karena optimistis) |
