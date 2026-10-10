# Dokumentasi Smallholder HUB

Indeks dokumentasi proyek. Setiap file bersifat **atomic** (satu topik) dan dikelompokkan ke enam area: **Standar**, **Database**, **Produk**, **QA/QC**, **Keputusan**, **Proyek**.

> Konvensi: setiap file diawali breadcrumb yang menautkan kembali ke indeks ini dan file terkait. UI copy berbahasa Indonesia; identifier code berbahasa Inggris.

## 📐 Standar (`standards/`) — aturan & standar pengembangan

| File | Isi |
|------|-----|
| [standards/principles.md](./standards/principles.md) | Prinsip development (Think Before Coding, Simplicity, Surgical, Goal-Driven) |
| [standards/workflow.md](./standards/workflow.md) | Branching, Issue Workflow, Safety & Approval |
| [standards/environments.md](./standards/environments.md) | Skema file `.env` per environment (local/dev/staging/prod), aturan S3 dev vs prod, akses prod eksplisit |
| [standards/versioning.md](./standards/versioning.md) | SemVer aplikasi, kriteria bump versi, alur rilis & tag/GitHub Release |
| [standards/rollback.md](./standards/rollback.md) | Prosedur rollback deploy: aplikasi (revert), migrasi (roll-forward / darurat / restore), migrasi gagal, paritas workflow deploy |
| [standards/code-standards.md](./standards/code-standards.md) | Code standards, Data Access & Soft Delete, Revision Tracking |
| [standards/rbac.md](./standards/rbac.md) | RBAC data-access hierarchy, user assignment & menu-access UI, hierarchical menu |
| [standards/ui-ux.md](./standards/ui-ux.md) | Prinsip UI/UX, tata letak, modal, sensor data pribadi + indeks sub-standar: [tabel](./standards/ui-ux-tables.md) · [peta](./standards/ui-ux-map.md) · [bulk upload](./standards/ui-ux-bulk-upload.md) · [konten Bantuan](./standards/ui-ux-help.md) |
| [standards/architecture.md](./standards/architecture.md) | Informasi proyek, arsitektur, tech stack, ringkasan teknis (angka test/model/migrasi/menu) |
| [standards/ai-model-guide.md](./standards/ai-model-guide.md) | Panduan pilih model & effort AI (Claude Code) per kelas tugas |

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
| [product/navigation.md](./product/navigation.md) | Peta navigasi: lapis route, role, struktur menu sidebar & status tiap sub menu |
| [product/access-context.md](./product/access-context.md) | Access context resolution & permission priority |
| [product/crud-flows.md](./product/crud-flows.md) | Farmer CRUD example + bulk upload flow |
| [product/role-flows.md](./product/role-flows.md) | Alur per role (SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT, DONOR) |
| [product/pages/README.md](./product/pages/README.md) | Katalog Menu → Sub Menu → Page → Object (satu file per menu utama) |

## 🧪 QA/QC (`qa/`) — pengujian manual per rilis

| File | Isi |
|------|-----|
| [qa/README.md](./qa/README.md) | Proses QA/QC manual: kapan (setelah deploy staging, sebelum PR `staging → main`), siapa, aturan bukti (gitignored — repo publik) |
| [qa/_template/](./qa/_template/) | Master per rilis: scope (akun & persiapan data) · smoke `SM-nn` · kasus uji `TC-<issue>-nn` ber-tag P0/P1/P2 · QC data · temuan · sign-off · template lembar run |
| [qa/regression.md](./qa/regression.md) | Kasus `[regresi]` yang ikut setiap rilis (lahir dari temuan review/bug) |
| [qa/v1.4.0/](./qa/v1.4.0/) · [v1.5.0](./qa/v1.5.0/) · [v1.6.0](./qa/v1.6.0/) | Paket QA tiga rilis terakhir yang sudah terbit (00–05 + `runs/`; v1.5.1 hotfix tanpa paket); lebih lama di [qa/archive/](./qa/archive/) |
| [qa/archive/](./qa/archive/) | Paket QA rilis lebih lama (v0.35.0 — rilis pertama proses ini — s.d. v1.3.0) |
| [qa/v1.6.1/](./qa/v1.6.1/) | Rilis berjalan — PATCH v1.6.1 (2026-10-11 → 10-25; kasus uji TC-409/TC-386 ditulis saat issue ditutup) |
| `scripts/qa/` | `data-qc.ts` (cek DB read-only → tabel markdown) · `new-run.mjs` (lembar run dari spesifikasi) · `summary.mjs` (rekap Pass/Fail per run) |

## 🧭 Keputusan (`decisions/`) — catatan keputusan besar

| File | Isi |
|------|-----|
| [decisions/README.md](./decisions/README.md) | Kapan & cara menulis catatan keputusan + daftar (0001 soft delete · 0002 hierarki 3 level · 0003 alur rilis · 0004 gate lokal · 0005 produksi acuan izin · 0006 kode UL ganda · 0007 struktur docs) |

## 📊 Proyek (`project/`) — status delivery & proses

| File | Isi |
|------|-----|
| [project/brief.md](./project/brief.md) | Biweekly management brief |
| [project/roadmap.md](./project/roadmap.md) | **Source of truth** — Roadmap 2026–2027: linimasa per kuartal, Phase Status, Parkir |
| [project/roadmap-mvp.md](./project/roadmap-mvp.md) | Arsip Phase Status baseline MVP (beku 2026-09-30, 88,5%) + evidence per fase |
| [project/sprint.md](./project/sprint.md) | Sprint focus & issue control |
| [project/tech-debt.md](./project/tech-debt.md) | Technical debt & bug register |
| [project/changelog.md](./project/changelog.md) | Indeks changelog & decision log per bulan (`changelog/YYYY-MM.md`, append-only) + ringkasan dua minggu terakhir |
| [project/metrics.md](./project/metrics.md) | Metrik Nilai Rilis per rilis (Roadmap % · KPI · RVS) |
| [project/contributing.md](./project/contributing.md) | Panduan kontribusi & update dokumen |

---

## 📏 Konvensi docs

**Penamaan.** Folder & berkas `kebab-case` berbahasa Inggris; isi dan **heading berbahasa Indonesia** (kecuali istilah teknis/nama kode dan kunci yang diparse build: `Phase Status (Indeks)`, `Rincian per Phase`, `Rencana Rilis`, `Debt Register`). Katalog `product/pages/` mengikuti **segmen route** (`list`/`detail`/`new`/`edit`). Indeks folder = `README.md`. Berkas bernomor hanya di `qa/vX.Y.Z/` (`00-scope` … `05-signoff`) dan `decisions/` (`NNNN-slug`). Heading tidak dinomori kecuali daftar yang memang berurutan (`principles.md`, `versioning.md` §Metrik).

**Kepala berkas.** Baris kedua setelah judul: `> Bagian dari dokumentasi **Area**. Indeks: … · Terkait: …`; katalog `product/pages/` memakai `[← Induk](./README.md) · …`.

**Legenda status.**

| Emoji | Arti | Dipakai di |
|---|---|---|
| ✅ | Selesai / Done | semua |
| 🟠 | Sebagian / Partial (sebagian terimplementasi) | `roadmap.md`, `tech-debt.md` |
| 🟡 | Sedang dikerjakan | `sprint.md` (diparse build) |
| 🔲 | Belum dimulai · Planned · Todo · Open | semua |
| ⚖️ | Menunggu keputusan owner | `sprint.md` |
| ⏭️ | Digeser ke sprint lain | `sprint.md` |
| ⛔ | Ditutup tanpa dikerjakan (*not planned*) / tidak berlaku | `sprint.md`, `access-context.md` |
| 🔴 | Blocked / bug aktif | `roadmap.md`, `tech-debt.md` |

**Satu fakta, satu tempat.**

| Fakta | Sumber kebenaran |
|---|---|
| Status fase | `project/roadmap.md` § Phase Status |
| Rencana & status rilis berjalan | `project/sprint.md` § Rencana Rilis |
| Debt & bug | `project/tech-debt.md` |
| Angka per rilis (Roadmap %, KPI, RVS, jumlah test) | `project/metrics.md` |
| Enum, tabel & ringkasan menu, angka teknis | blok `<!-- GENERATED -->` — `npm run build:docs` |
| Keputusan besar | `decisions/` |

**Arsip.** Paket QA yang lebih tua dari 3 rilis terakhir yang sudah terbit → `qa/archive/` (paket rilis yang sedang disiapkan tetap di `qa/`). Changelog per bulan di `project/changelog/`. Tanggal di tabel ditulis ISO (`YYYY-MM-DD`; kolom Changelog bulanan `MM-DD`).

---

**Alur baca yang disarankan:** developer baru → `standards/principles.md` + `standards/code-standards.md` + `project/contributing.md`; kerja fitur → `standards/` + `database/` + `product/`; status/laporan → `project/`.
