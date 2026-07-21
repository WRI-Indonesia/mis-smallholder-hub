# Menu: Settings

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | `settings` |
| URL | `/admin/settings` |
| Icon | `Settings` |
| Order | 2 |
| Sub menu | 4 — User Management (`settings-users`), Menu Management (`settings-menu`), Role & Permission (`settings-roles`), Regions (`settings-regions`) |
| Catatan | Tidak ada `page.tsx` pada route induk `/admin/settings`; menu induk hanya berfungsi sebagai grup navigasi di sidebar. |

Sumber metadata menu: `prisma/seeds/data/menu.csv`. Semua halaman berada di bawah guard NextAuth (`middleware.ts`) dan tiga lapis keamanan (menu permission, access context, soft delete).

## Diagram objek

```text
Menu: Settings (/admin/settings) — grup navigasi, tanpa page.tsx
├── Sub Menu: User Management (settings-users)
│   └── Page: User Management (/admin/settings/users)
├── Sub Menu: Menu Management (settings-menu)
│   └── Page: Menu Management (/admin/settings/menu)
├── Sub Menu: Role & Permission (settings-roles)
│   └── Page: Role & Permission (/admin/settings/roles)
└── Sub Menu: Regions (settings-regions)
    └── Page: Region Management (/admin/settings/regions)
```

## Daftar sub menu

| # | Sub menu | Key | URL | Icon | Order | Halaman | Dokumen |
|---|---|---|---|---|---|---|---|
| 1 | User Management | `settings-users` | `/admin/settings/users` | `UserCog` | 1 | 1 | [user-management.md](./user-management.md) |
| 2 | Menu Management | `settings-menu` | `/admin/settings/menu` | `Menu` | 2 | 1 | [menu-management.md](./menu-management.md) |
| 3 | Role & Permission | `settings-roles` | `/admin/settings/roles` | `Shield` | 3 | 1 | [role-permission.md](./role-permission.md) |
| 4 | Regions | `settings-regions` | `/admin/settings/regions` | `MapPin` | 4 | 1 | [regions.md](./regions.md) |
