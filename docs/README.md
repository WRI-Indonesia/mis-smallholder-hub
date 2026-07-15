# Dokumentasi Smallholder HUB

Indeks dokumentasi proyek. Setiap file bersifat **atomic** (satu topik) dan dikelompokkan ke empat area: **Standar**, **Database**, **Produk**, **Proyek**.

> Konvensi: setiap file diawali breadcrumb yang menautkan kembali ke indeks ini dan file terkait. UI copy berbahasa Indonesia; identifier code berbahasa Inggris.

## 📐 Standar (`standards/`) — aturan & standar pengembangan

| File | Isi |
|------|-----|
| [standards/principles.md](./standards/principles.md) | Prinsip development (Think Before Coding, Simplicity, Surgical, Goal-Driven) |
| [standards/workflow.md](./standards/workflow.md) | Branching, Issue Workflow, Safety & Approval |
| [standards/versioning.md](./standards/versioning.md) | SemVer aplikasi, kriteria bump versi, alur rilis & tag/GitHub Release |
| [standards/code-standards.md](./standards/code-standards.md) | Code standards, Data Access & Soft Delete, Revision Tracking |
| [standards/rbac.md](./standards/rbac.md) | RBAC data-access hierarchy, user assignment & menu-access UI, hierarchical menu |
| [standards/ui-ux.md](./standards/ui-ux.md) | Prinsip UI/UX, tabel, bulk upload, shapefile, geospatial, dashboard snapshot |
| [standards/architecture.md](./standards/architecture.md) | Informasi proyek, arsitektur, tech stack |

## 🗄️ Database (`database/`) — skema, indeks, operasional DB

| File | Isi |
|------|-----|
| [database/erd.md](./database/erd.md) | High-level ERD, quick summary, ERD overview, implementation status |
| [database/models.md](./database/models.md) | Common fields, enums, naming, RBAC flow, farmer & training model, file structure |
| [database/indexes.md](./database/indexes.md) | Index strategy (primary/secondary, performance targets) |
| [database/constraints.md](./database/constraints.md) | Constraint & data integrity (FK, cascade, business rules, soft delete) |
| [database/migrations.md](./database/migrations.md) | Migration strategy (workflow, risk, history, checklist) |
| [database/security.md](./database/security.md) | Security considerations (auth, RBAC, OWASP, audit trail) |
| [database/performance.md](./database/performance.md) | Performance & data volume (projections, query optimization, pooling) |
| [database/dashboard-snapshots.md](./database/dashboard-snapshots.md) | Dashboard snapshot pattern |

## 🖥️ Produk (`product/`) — alur UI/UX per role

| File | Isi |
|------|-----|
| [product/architecture.md](./product/architecture.md) | Quick reference, status legend, system architecture, sidebar menu |
| [product/access-context.md](./product/access-context.md) | Access context resolution & permission priority |
| [product/crud-flows.md](./product/crud-flows.md) | Farmer CRUD example + bulk upload flow |
| [product/role-flows.md](./product/role-flows.md) | Alur per role (SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT) |
| [product/module-status.md](./product/module-status.md) | Cerminan status modul (kanonis di `project/roadmap.md`) |

## 📊 Proyek (`project/`) — status delivery & proses

| File | Isi |
|------|-----|
| [project/brief.md](./project/brief.md) | Biweekly management brief |
| [project/roadmap.md](./project/roadmap.md) | **Source of truth** — roadmap governance & Phase Status |
| [project/sprint.md](./project/sprint.md) | Sprint focus & issue control |
| [project/tech-debt.md](./project/tech-debt.md) | Technical debt & bug register |
| [project/changelog.md](./project/changelog.md) | Changelog & decision log (append-only) |
| [project/contributing.md](./project/contributing.md) | Panduan kontribusi & update dokumen |

---

**Alur baca yang disarankan:** developer baru → `standards/principles.md` + `standards/code-standards.md` + `project/contributing.md`; kerja fitur → `standards/` + `database/` + `product/`; status/laporan → `project/`.
