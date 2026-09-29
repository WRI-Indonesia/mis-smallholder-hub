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
│   ├── (admin)/admin/        # dashboard, master-data, data-analyst, map, report, bulk-upload, settings, tools, profile, help
│   ├── (public)/             # Home, community, knowledge-management
│   ├── api/                  # NextAuth + proxy tile peta (map-overlay, map-hotspot, map-basemap)
│   ├── login/                # Halaman login
│   ├── not-found.tsx         # 404 global
│   └── globals.css           # Design tokens
├── components/
│   ├── ui/                   # Shadcn primitives
│   ├── shared/               # DataTable, TableActions, TableSkeleton, DeleteDialog + map-popup (standar popup peta #188), parcels-distribution-map
│   ├── auth/                 # Login form
│   ├── layout/               # Admin & public layout
│   └── session-provider.tsx, theme-provider.tsx
├── content/                  # Materi Bantuan (help/, 65 file .md — dibundel via loader asset/source di next.config.ts)
├── hooks/                    # Custom hooks (use-mobile, use-url-filters, use-vector-basemap)
├── lib/                      # Prisma, rbac, access-context, utils, helper murni (firms, map-data, dsb)
├── server/actions/           # Server Actions
├── test/                     # Unit test Vitest (111 file)
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
| Charts | Custom SVG tanpa library (`recharts` dihapus #129) — palet `src/lib/chart-palette.ts`, geometri radar `src/lib/radar-geometry.ts` |
| Validation | Zod (server: `safeParse` di actions; form client ditangani manual via FormData/useState — React Hook Form tidak dipakai) |

---

## Ringkasan Teknis

Diverifikasi **2026-09-29** terhadap kode di branch `mvp` (app `v1.1.0`).

| Aspek | Angka | Catatan |
|---|---|---|
| Test | **111 file / 1.916 test passing** ✅ | `npx vitest run`; rincian coverage di [roadmap.md § OPS-01](../project/roadmap.md) |
| Server Actions | **39 file** | `src/server/actions/` — satu file per domain, seluruh akses data lewat sini |
| Prisma | **25 file schema / 40 model / 39 migrasi** | `prisma/schema/` modular; semua model ber-audit field + `isActive` (pengecualian: [constraints.md](../database/constraints.md#soft-delete-pattern)) |
| Menu | **9 top-level / 38 sub menu + 1 level-3** | `prisma/seeds/data/menu.csv` |
| Materi Bantuan | **65 file Markdown** | `src/content/help/**` |
| Fase selesai | lihat [roadmap.md § Phase Status](../project/roadmap.md#phase-status-indeks) | — |
