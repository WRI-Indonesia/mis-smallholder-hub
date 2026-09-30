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
├── test/                     # Unit test Vitest (jumlah: tabel Ringkasan Teknis di bawah)
├── validations/              # Zod schemas
├── types/                    # Custom types
└── middleware.ts             # NextAuth guard /admin/* & /login
```

### Teknologi

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

<!-- GENERATED:tech-summary — npm run build:docs; jangan sunting tangan -->
| Aspek | Angka | Sumber |
|---|---|---|
| Berkas test | **155** | `src/test/**/*.test.ts(x)` — jumlah kasus uji per rilis di [metrics.md](../project/metrics.md) |
| Server Actions | **39 berkas** | `src/server/actions/` — satu berkas per domain, seluruh akses data lewat sini |
| Prisma | **25 berkas skema · 40 model · 19 enum · 40 migrasi** | `prisma/schema/`, `prisma/migrations/` |
| Menu | **9 top-level · 38 sub menu · 1 level-3** | `prisma/seeds/data/menu.csv` |
| Materi Bantuan | **65 berkas Markdown** | `src/content/help/**` |
<!-- /GENERATED:tech-summary -->

Status fase: [roadmap.md § Phase Status](../project/roadmap.md#phase-status-indeks). Semua model ber-audit field + `isActive` (pengecualian: [decisions/0001](../decisions/0001-soft-delete-dan-pengecualian.md)).
