# Standar — Arsitektur & Tech Stack

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [principles.md](./principles.md) · [workflow.md](./workflow.md) · [code-standards.md](./code-standards.md) · [rbac.md](./rbac.md) · [ui-ux.md](./ui-ux.md)

## Informasi Proyek

| Key | Value |
|-----|-------|
| **Stack** | Next.js 16 · React 19 · Tailwind 4 · Shadcn UI · Prisma 7 · MapLibre |
| **Repository** | `WRI-Indonesia/mis-smallholder-hub` |
| **Branch Aktif** | `mvp` |

---

## Arsitektur

```
src/
├── app/
│   ├── (admin)/admin/        # dashboard, master-data, data-analyst, map, report, bulk-upload, settings, tools, profile
│   ├── (public)/             # Home, community, knowledge
│   ├── api/                  # NextAuth + proxy tile peta (map-overlay, map-hotspot)
│   └── globals.css           # Design tokens
├── components/
│   ├── ui/                   # Shadcn primitives
│   ├── shared/               # DataTable, TableActions, TableSkeleton, DeleteDialog
│   ├── auth/                 # Login form
│   └── layout/               # Admin & public layout
├── hooks/                    # Custom hooks (use-mobile)
├── lib/                      # Prisma, rbac, access-context, utils, helper murni (firms, map-data, dsb)
├── server/actions/           # Server Actions
├── validations/              # Zod schemas
├── types/                    # Custom types
└── middleware.ts             # NextAuth guard /admin/* & /login
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Shadcn UI |
| Styling | Tailwind 4 + oklch tokens |
| Database | PostgreSQL + PostGIS |
| ORM | Prisma 7 (modular schema) |
| Maps | MapLibre GL JS |
| Charts | — (belum ada; `recharts` dihapus di #129, dipasang lagi saat chart produksi dikerjakan) |
| Validation | Zod (server: `safeParse` di actions; form client ditangani manual via FormData/useState — React Hook Form tidak dipakai) |
