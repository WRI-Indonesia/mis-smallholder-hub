# Role & Permission

[← Menu Settings](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Role & Permission (/admin/settings/roles)
├── Header
│   ├── Heading: Role & Permission
│   └── Deskripsi: Atur default permission per role untuk setiap menu
├── Matrix role × permission
│   ├── Header baris 1: Menu · SUPERADMIN · ADMIN · OPERATOR · MANAGEMENT
│   │                   (tiap role colSpan=4)
│   ├── Header baris 2: C · V · E · D  (CREATE · VIEW · EDIT · DELETE)
│   ├── Baris
│   │   ├── Menu parent (bg-muted/30)
│   │   └── Menu anak (pl-6, teks muted)
│   └── Sel
│       ├── Granted: kotak solid bg-primary
│       ├── Denied: kotak ber-border
│       └── SUPERADMIN: selalu granted, klik ditolak
├── Legend: Granted · Denied · C = Create · V = View · E = Edit · D = Delete
└── Toast
    ├── Permission ditambahkan / Permission dicabut
    └── SUPERADMIN memiliki semua akses
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
| Server action / data | `getRolePermissions()` (`src/server/actions/role-permission.ts`), `getAllMenuItems()` (`src/server/actions/menu.ts`) |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| `Role & Permission` | Heading | `h1`, deskripsi: `Atur default permission per role untuk setiap menu` |
| Matrix role × permission | Matrix | Header baris 1: kolom `Menu` + 4 grup role (`SUPERADMIN`, `ADMIN`, `OPERATOR`, `MANAGEMENT`), masing-masing `colSpan=4`. Header baris 2: inisial permission `C`, `V`, `E`, `D` (urutan `CREATE`, `VIEW`, `EDIT`, `DELETE`) |
| Baris matrix | Baris | Menu parent (latar `bg-muted/30`, teks medium) diikuti menu anak (indentasi `pl-6`, teks muted). Kedua level dapat di-toggle |
| Sel matrix | Toggle | Tombol per kombinasi role × menu × permission. Kotak solid `bg-primary` = granted, kotak ber-border = denied. Klik memanggil `toggleRolePermission(role, menuKey, permission)` |
| Sel SUPERADMIN | Status | Selalu ditampilkan granted; klik ditolak dengan toast `SUPERADMIN memiliki semua akses` |
| Legend | Legend | `Granted` (kotak solid), `Denied` (kotak border), dan `C = Create · V = View · E = Edit · D = Delete` |
| Toast | Notifikasi | `Permission ditambahkan` / `Permission dicabut` |
