# Smallholder HUB — Developer Guide & Progress

> Panduan utama development Smallholder HUB MIS.
> Detail setiap issue ada di [GitHub Issues](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues).

---

## 📋 Informasi Proyek

| Key | Value |
|-----|-------|
| **Proyek** | Smallholder HUB — Management Information System |
| **Stack** | Next.js 16 · React 19 · Tailwind 4 · Shadcn UI · Prisma 7 · MapLibre |
| **Repository** | `WRI-Indonesia/mis-smallholder-hub` |
| **Terakhir Diupdate** | 2026-05-13 |
| **Diupdate Oleh** | Sofyan (via AI-assisted development) |
| **Branch Aktif** | `dev-phase-4` |

---

## 🔒 Development Rules

<details>
<summary><strong>📋 Development Guidelines Overview</strong></summary>

---

### 🌳 **Branching & Workflow**

<details>
<summary><strong>Branching Strategy</strong></summary>

> **Current Rule:** Development menggunakan branch yang akan ditentukan oleh project owner.
> Jangan membuat branch fitur, branch eksperimen, atau branch PR terpisah
> kecuali project owner mengubah aturan ini secara eksplisit.

**Key Points:**
- ✅ Single branch development approach
- ❌ No feature branches or experimental branches  
- ❌ No separate PR branches
- ⚠️ Only project owner can modify this rule

</details>

<details>
<summary><strong>GitHub Issue Workflow</strong></summary>

Setiap unit kerja **wajib** mengikuti alur berikut:

| Step | Aksi | Detail |
|------|------|--------|
| **1** | 📋 Pick Issue | Ambil satu GitHub Issue yang sudah di-approve. |
| **2** | 💻 Implement | Kerjakan **hanya** scope yang tertulis di issue tersebut. |
| **3** | 🧪 QA/QC Lokal | Jalankan minimal: `npm run build` dan `npm test` (jika test tersedia). |
| **4** | ⚡ Performance Test | Jalankan performance test untuk memastikan tidak ada regresi. |
| **5** | 📊 Report | Laporkan: changed files, hasil verifikasi, QA notes, dan follow-up risk. |
| **6** | ✅ Approval | **Tunggu approval project owner** sebelum push ke GitHub. |

**Workflow Rules:**
- 🔄 Follow steps sequentially
- 🎯 Scope strictly limited to issue description  
- 📈 Performance testing is mandatory
- 🚫 No direct pushes without approval

</details>

---

### ⚠️ **Safety & Approval**

<details>
<summary><strong>Mandatory Approval Required</strong></summary>

> **Selalu minta approval dari project owner** sebelum menjalankan aksi berikut:

| Category | Actions | Risk Level |
|----------|---------|------------|
| **🔥 Destructive Process** | Hapus file, drop table, reset database, force push, atau aksi apapun yang tidak bisa di-undo | **CRITICAL** |
| **🗄️ Database Mutations** | `CREATE`, `UPDATE`, `DELETE` data di database (termasuk via Prisma seed, migration, atau manual query) | **HIGH** |

**Approval Process:**
1. 📝 Submit request with detailed explanation
2. ⏳ Wait for project owner approval
3. ✅ Document the change after completion
4. 🔄 Verify no unintended side effects

</details>

---

### 💻 **Code Standards & Architecture**

<details>
<summary><strong>Coding Conventions</strong></summary>

| Category | Rule | Example |
|----------|------|---------|
| **📁 File Naming** | `kebab-case` untuk semua file komponen React | `user-profile-card.tsx` |
| **🏷️ Variable Naming** | Bahasa Inggris untuk semua code identifiers | `const userData = ...` |
| **📦 Import Strategy** | Import langsung dari sub-module, bukan barrel `index.ts` root | `import { Button } from "@/components/ui/button"` |
| **⚡ Server/Client Split** | Gunakan Server Component secara default, `"use client"` hanya jika diperlukan | Default: Server Component |
| **🗄️ Data Layer** | CSV untuk static data, Prisma untuk database operations | Static: CSV, Dynamic: Prisma |
| **✅ Validation** | Zod schema di `src/validations/` | `userSchema = z.object({...})` |
| **🎯 Server Actions** | Di `src/server/actions/` | `export async function createUser(...)` |

**Architecture Principles:**
- 🏗️ Server-first approach
- 🎯 Minimal client-side JavaScript
- 📊 Clear separation of concerns
- 🔍 Type safety throughout

</details>

---

### 🎨 **UI/UX & Design System**

<details>
<summary><strong>Design System & Components</strong></summary>

| Aspect | Rule | Implementation |
|--------|------|----------------|
| **🎨 Design System** | Selalu gunakan komponen Shadcn UI dan utility class Tailwind 4 | Hindari styling *hardcoded*, prioritaskan penggunaan token desain aplikasi |
| **🌈 Warna & Tipografi** | Gunakan variabel `oklch` di `globals.css` | Teks utamakan gaya responsif dengan standar hierarki heading yang seragam. Font utama 'Acumin Pro Condensed' |

**Component Usage:**
- ✅ Shadcn UI components preferred
- ✅ Tailwind utility classes
- ❌ Inline styles
- ❌ Hardcoded colors

</details>

<details>
<summary><strong>Layout & Page Structure</strong></summary>

**Layout Halaman Admin:**
- 📄 **Header halaman** (judul & deksripsi) wajib selalu ada untuk memberikan konteks kepada pengguna
- 📦 **Pembungkus data** (tabel, metrik) menggunakan komponen `<Card>`
- 📝 **Form kompleks** dengan banyak isian harus dibuat rapi: pisahkan menjadi beberapa seksi, hindari *scroll* bertumpuk pada modal, jika perlu gunakan halaman detail penuh atau *Tabs*

**Layout Principles:**
- 📱 Mobile-first responsive design
- 🎯 Clear visual hierarchy
- 📦 Consistent component usage
- 🔄 Logical content flow

</details>

<details>
<summary><strong>Data Tables & Filters</strong></summary>

**Tabel & Filter Data:**
- 🔍 **Search dan input filter** diletakkan berdampingan di atas tabel, berbaris (*stack*) di layar mobile dan sebaris (*inline*) di desktop
- ⚡ **Aksi (*actions*)** konsisten menggunakan desain minimal (contoh: ikon pada tabel, menu dropdown jika lebih dari 2 aksi)

**Table Typography Standard** — Wajib konsisten di semua tabel admin:

| Element | Styling | Use Case |
|---------|---------|----------|
| **Header row** | `bg-muted/70 border-b-2 border-border` · setiap `<TableHead>`: `text-xs font-semibold uppercase tracking-wider text-muted-foreground` | Table headers |
| **Nama / data utama** | `text-sm font-medium` | Primary names, titles |
| **Kode / ID teknis** | `text-sm font-mono text-muted-foreground` | kode kelompok, NIK, kode persil, ID legal |
| **Data sekunder / deskriptif** | `text-sm text-muted-foreground` | kabupaten, provinsi, kelompok |
| **Angka / luas** | `text-sm tabular-nums` (kanan: tambah `text-right`) | Numbers, measurements |
| **Nilai kosong / null** | karakter `—` dengan `text-muted-foreground` | Empty values |
| **Kategori / status** | gunakan komponen `<Badge>` (bukan teks biasa) | Status indicators |
| **Koordinat / info tambahan kecil** | `text-xs font-mono text-muted-foreground` | Coordinates, technical info |

**❌ Avoid in table cells:**
- `text-primary`, `font-bold`, atau `italic` (kecuali ada alasan desain yang eksplisit)

</details>

<details>
<summary><strong>Responsive & Interactive</strong></summary>

**Responsive Design:**
- 📱 Wajib mendukung *breakpoint* standar (mobile, tablet, desktop)
- 🔄 Fluid layouts with proper breakpoints
- 📏 Consistent spacing across devices

**State & Feedback:**
- ⏳ **Loading state** wajib (indikator loading atau *Skeleton*) pada data fetching
- 🔔 **Notifikasi visual** (Toast) wajib ditampilkan setelah *Server Actions* berhasil atau gagal
- 🎯 Clear user feedback for all interactions
- ✅ Success/error states properly handled

**Interaction Guidelines:**
- 🖱️ Hover states for interactive elements
- ⌨️ Keyboard navigation support
- 📱 Touch-friendly interface
- 🔄 Smooth transitions and animations

</details>

---

### 📚 **Quick Reference**

| Category | Key Rules | Priority |
|----------|-----------|----------|
| **🌳 Branching** | Single branch, no feature branches | **HIGH** |
| **🔄 Workflow** | 6-step issue process mandatory | **HIGH** |
| **⚠️ Safety** | Approval required for destructive actions | **CRITICAL** |
| **💻 Code** | Server-first, TypeScript, English identifiers | **MEDIUM** |
| **🎨 UI** | Shadcn + Tailwind, responsive design | **MEDIUM** |
| **📊 Tables** | Standardized typography, consistent actions | **MEDIUM** |

</details>

---

## � Task Management

<details>
<summary><strong>🚀 Project Roadmap Overview</strong></summary>

---

### 🗺️ **Development Flow & Dependencies**

```
Fase 1 ✅ → Fase 2 ✅ → DB Hardening ✅ → Fase 4 (Master Data) ✅ → Fase 3 (Auth) ⏭️ → Fase 7 (Dashboard) ✅ → Fase 5–6 → Fase 8–9 → Fase 10–12
```

**Key Dependencies:**
- 🔗 **Database Foundation**: Fase 1-2 must complete before any data-intensive features
- ⚡ **Master Data Priority**: Fase 4 critical for business operations
- 📊 **Dashboard Integration**: Fase 7 depends on Master Data completion
- 🔐 **Authentication**: Fase 3 skipped for now, may impact future phases

---

### 📊 **Phase Status Overview**

| Status | Count | Phases |
|--------|-------|---------|
| ✅ **Completed** | 8 | Fase 1, 2, DB, 4, 4.a, 4.a Infra, 7, 7.a, 7.b |
| ⏭️ **Skipped** | 1 | Fase 3 (Auth) |
| 🔲 **Pending** | 6 | Fase 4.b, 4.c, 5, 6, 8, 9, 10, 11, 12 |

**Progress: 57% Complete** (9 out of 16 major phases)

</details>

---

### 🎯 **Active & Upcoming Tasks**

<details>
<summary><strong>🔥 Currently In Progress</strong></summary>

| Phase | Description | Priority | Issues | Status |
|-------|-------------|----------|--------|--------|
| **4.a** | Master Data CRUD - Phase 2 (Training, Agronomy) | **HIGH** | [#44](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/44) Telegram Notification 🔲 | 🟡 **In Progress** |
| **7.c** | Dashboard BMP (Best Management Practice) | **HIGH** | [#48](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/48) Dashboard BMP 🟡 | 🟡 **In Progress** |

**Active Issues:**
- 🔔 **#44** - Telegram Notification System (Training Activities)
- 📊 **#48** - Dashboard BMP: Score Cards, Combo Chart, Monev Cards, Filter Distrik+KT

**Scaffold Issues Created (🔲 Pending):**
- 📊 [#49](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/49) - Dashboard Training: Scaffold UI Lengkap
- 📋 [#50](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/50) - Kelompok Tani Detail: Tab BMP Scaffold UI
- 📋 [#51](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/51) - Data Petani Detail: Tab Pelatihan & Produksi Scaffold UI
- 🔧 [#52](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/52) - Import Data Massal: Agronomy Produksi Scaffold UI
- 🔧 [#53](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/53) - Import Data Massal: Agronomy Monev BMP Scaffold UI

</details>

<details>
<summary><strong>📋 Next Priority Phases</strong></summary>

| Phase | Description | Priority | Dependencies |
|-------|-------------|----------|-------------|
| **4.b** | Master Data CRUD - Phase 3 (HCV, BUSDEV) | **HIGH** | Fase 4.a completion |
| **4.c** | Master Data CRUD - Phase 4 (IMPACT, Workplan) | **HIGH** | Fase 4.b completion |
| **5** | CMS & Content Management | **MEDIUM** | Master Data completion |
| **6** | Tools (Import/Export/GIS) | **MEDIUM** | Master Data completion |

**Next Steps:**
1. 🎯 Complete Fase 4.b (HCV, BUSDEV modules)
2. 📊 Implement Fase 4.c (IMPACT, Workplan tracking)
3. 📝 Build CMS for content management
4. 🔧 Develop import/export and GIS tools

</details>

---

### ✅ **Completed Milestones**

<details>
<summary><strong>🏆 Foundation Phases</strong></summary>

| Phase | Description | Completion Date | Key Issues |
|-------|-------------|------------------|------------|
| **1** | Initialization & UI Statis | ✅ Complete | — |
| **2** | Database Schema & Migrations | ✅ Complete | — |

**Foundation Achievements:**
- 🏗️ Next.js 16 + React 19 setup
- 🎨 Shadcn UI + Tailwind 4 design system
- 🗄️ PostgreSQL + PostGIS database
- 📱 Responsive mobile-first UI

</details>

<details>
<summary><strong>🔒 Database & Infrastructure</strong></summary>

| Phase | Description | Completion Date | Key Issues | Milestone |
|-------|-------------|------------------|------------|-----------|
| **DB** | Database Schema Hardening | ✅ Complete | [#29](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/29) Audit Trail ✅ · [#31](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/31) Sync Production DB ✅ | [Milestone #4](https://github.com/WRI-Indonesia/mis-smallholder-hub/milestone/4) |

**Infrastructure Wins:**
- 🔐 Audit trail fields for 22 tables
- 🔄 Production database synchronization
- 📊 Schema drift fixes and baseline

</details>

<details>
<summary><strong>📊 Master Data Management</strong></summary>

| Phase | Description | Completion Date | Key Issues | Milestone |
|-------|-------------|------------------|------------|-----------|
| **4** | Master Data CRUD | ✅ Complete | [#17](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/17) Shared Infra ✅ · [#18](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/18) Regions ✅ · [#19](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/19) Groups ✅ · [#20](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/20) Farmers ✅ · [#21](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/21) Parcels ✅ · [#22](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/22) Final QA ✅ | [Milestone #3](https://github.com/WRI-Indonesia/mis-smallholder-hub/milestone/3) |
| **4.a Infra** | Dynamic Menu Management | ✅ Complete | [#35](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/35) Dynamic Menu Management ✅ | [Milestone #6](https://github.com/WRI-Indonesia/mis-smallholder-hub/milestone/6) |
| **4.a** | Master Data CRUD - Phase 2 (Training, Agronomy) | ✅ Complete | [#39](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/39) Training List & Detail ✅ · [#41](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/41) Staff WRI List & Detail ✅ · [#43](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/43) Staff Activity ✅ · [#45](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/45) Training PDF Management ✅ | — |

**Master Data Achievements:**
- 🏛️ Regions, Districts, Subdistricts management
- 👥 Farmers & Groups CRUD with relationships
- � Land parcels with PostGIS integration
- 🎓 Training activities & staff management
- 📋 Dynamic menu system with RBAC

</details>

<details>
<summary><strong>� Dashboard & Analytics</strong></summary>

| Phase | Description | Completion Date | Key Issues | Milestone |
|-------|-------------|------------------|------------|-----------|
| **7** | Dashboard & Reporting (DB) | ✅ Complete | [#34](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/34) Dashboard Server Actions ✅ · [#37](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/37) Interactive Map ✅ | [Milestone #7](https://github.com/WRI-Indonesia/mis-smallholder-hub/milestone/7) |
| **7.a** | Dashboard & Reporting (DB) - Basic Data | ✅ Complete | [#34](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/34) Dashboard Server Actions ✅ | [Milestone #7](https://github.com/WRI-Indonesia/mis-smallholder-hub/milestone/7) |
| **7.b** | Dashboard & Reporting (DB) - Interactive Map | ✅ Complete | [#37](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/37) Interactive Map ✅ | [Milestone #7](https://github.com/WRI-Indonesia/mis-smallholder-hub/milestone/7) |

**Dashboard Features:**
- 📊 Real-time statistics with caching
- 🗺️ Interactive MapLibre integration
- 🔍 Advanced filtering and search
- 📱 Responsive dashboard design
- ⚡ Sub-100ms performance optimization

</details>

---

### 🔄 **Skipped & Future Phases**

<details>
<summary><strong>⏭️ Skipped Phases</strong></summary>

| Phase | Description | Reason | Future Consideration |
|-------|-------------|--------|---------------------|
| **3** | Autentikasi & RBAC | ⏭️ Skipped | May be revisited after core features complete |

**Skip Rationale:**
- 🚀 Focus on core business functionality first
- 🔐 Authentication can be added later without disrupting existing features
- 📊 Business value prioritized over security infrastructure for now

</details>

<details>
<summary><strong>🔮 Future Roadmap</strong></summary>

| Phase | Description | Priority | Estimated Complexity |
|-------|-------------|----------|---------------------|
| **8** | Community & Knowledge (DB) | **MEDIUM** | Moderate |
| **9** | Workplan Tracker | **MEDIUM** | Moderate |
| **10** | Polish (i18n, Accessibility) | **LOW** | Low |
| **11** | Testing & QA | **HIGH** | High |
| **12** | DevOps & Deployment | **HIGH** | High |

**Future Focus Areas:**
- 🌐 Internationalization & accessibility
- 🧪 Comprehensive testing suite
- 🚀 Production deployment pipeline
- 📋 Work planning and tracking tools
- 👥 Community features and knowledge management

</details>

---

### 📈 **Quick Stats**

| Metric | Value | Status |
|--------|-------|--------|
| **Total Phases** | 16 | — |
| **Completed** | 9 (57%) | ✅ On Track |
| **In Progress** | 1 (6%) | 🟡 Active |
| **Pending** | 6 (37%) | 🔲 Planned |
| **Skipped** | 1 (6%) | ⏭️ Deferred |
| **Total Issues** | 17+ | — |
| **Closed Issues** | 15+ | ✅ Healthy |
| **Active Issues** | 1-2 | 🟡 Manageable |

</details>

### Changelog

<details>
<summary><strong>🗓️ Mei 2026</strong> (19 entries)</summary>

| Tanggal & Waktu | Perubahan |
|-----------------|-----------|
| 2026-05-13 12:30 | Issue #48 in progress — Update UI/UX Grafik BMP: Penambahan filter Kategori (Ex Plasma / Swadaya) khusus untuk grafik. Penyesuaian *mock data* CSV agar lebih realistis (target Swadaya ~17 ton/Ha/thn, Ex Plasma ~23 ton/Ha/thn). Perbaikan visual grafik: bar diubah menjadi *grouped* (berdampingan) menggunakan warna hijau solid terang (`#a3e635`, `#22c55e`, `#047857`) agar *vibrant* di *dark mode*, urutan legenda dipaksa (*override payload*) menjadi Muda-Dewasa-Tua-Produktivitas, nilai maksimal sumbu Y kanan disesuaikan menjadi 2x max data agar garis produktivitas lebih ke tengah, dan warna font label sumbu diubah menjadi `#9ca3af` agar kontras tinggi di *light* maupun *dark mode*. |
| 2026-05-13 00:36 | Issue #48 in progress — Dashboard BMP: Scaffold UI lengkap dengan static CSV data. 5 score cards (Total Petani, Persil, Luas Lahan, Produksi, Produktivitas). Combo chart Recharts (Bar produksi + Line produktivitas, dual Y-axis). Monev BMP cards 4 kategori (Teladan/Praktisi/Pemula/Belum) dengan progress bar. Filter Distrik + Kelompok Tani (dependent). Layout mengikuti Basic Data Dashboard (full viewport, header bar, no scroll). 3 file CSV data (30 KT, 4 distrik). Build ✅, Tests 181/181 ✅. |
| 2026-05-12 23:52 | 6 GitHub Issues dibuat (#48–#53): #48 Dashboard BMP, #49 Dashboard Training, #50 KT Detail Tab BMP, #51 Petani Detail Tab Pelatihan+Produksi, #52 Import Agronomy Produksi, #53 Import Agronomy Monev BMP. Semua scaffold only, tanpa perubahan DB/Prisma. |
| 2026-05-11 17:37 | Dashboard Implementation Complete - Full Database-Driven System: Issue #34 selesai dengan implementasi komprehensif. **Server Actions**: `getDashboardStats()`, `getDashboardGroupMarkers()`, `getDistrictsForDashboard()` dengan Promise.all parallel execution. **UI Components**: dashboard-client.tsx (state management), dashboard-server.tsx (server orchestration), enhanced basic-data-detail-panel.tsx. **Map Controls**: Reset north & tilt button, basemap selector (Light/Dark/Satellite/Hybrid), auto theme switching dengan manual override. **Database**: Prisma schema enhancements, batch relationships, dashboard cache tables untuk performance optimization. **Assets**: Custom map markers (3 states), seed data updates. **Testing**: 7 unit tests, performance benchmarks (<100ms all functions). **Development Tools**: Debug utilities, testing scripts, cache refresh system. **TypeScript**: All errors fixed, proper null safety, GeoJSON type compliance. Total 10 commits, 174/174 tests passing, build successful. GitHub issue #34 closed dengan comprehensive comment. |
| 2026-05-09 22:30 | Issue #45 selesai — Training PDF Management: Implementasi lengkap PDF management untuk training evidence. Server actions: `uploadTrainingPDF`, `getTrainingPDFs`, `generatePDFLink`, `deleteTrainingPDF`, `listAllTrainingPDFs`, `cleanupOrphanedPDFs`. UI component `PDFManager` dengan upload modal, thumbnail preview, link generation, delete confirmation. CLI tools: `pdf-manager.js` (link/list/download/delete/cleanup) + `get-link.js` (simple presigned URL). File organization: `training/evidence/YYYY/MM/activity-id/timestamp-filename.pdf`. Enhanced S3 metadata tracking, presigned URL dengan custom expiry, download links dengan custom filename. Utility functions: validation, safe filename generation, S3 key parsing, file size formatting, URL expiry detection. 20 unit tests. Environment variables disesuaikan dengan existing `.env` (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME). Build ✅, Tests 174/174 ✅. |
| 2026-05-09 20:30 | Issue #45 dibuat — Training PDF Management: Implementasi script S3 untuk PDF upload dan read di Kegiatan Training. Script `get-link.js` untuk generate presigned URL dengan IDCloudHost S3 endpoint (is3.cloudhost.id), region id-jkt-1, bucket mis-dev. Support environment variables S3_KEY, S3_SECRET, S3_BUCKET. Generate signed URL valid 1 jam untuk akses PDF evidence training. Integrasi dengan existing training evidence system untuk better PDF handling dan link generation. |
| 2026-05-09 16:20 | Issue #43 selesai — Staff Activity: Daily Log, Approval, Calendar View & Export. Prisma schema 2 model baru (`StaffActivity`, `StaffActivityPhoto`) + enum `ActivityStatus` (DRAFT/PENDING_APPROVAL/APPROVED/REJECTED). Migration SQL manual. Server actions: `getStaffActivities`, `getStaffActivityById`, `createStaffActivity`, `updateStaffActivity`, `submitStaffActivity`, `approveStaffActivity`, `rejectStaffActivity`, `deleteStaffActivity`, `addActivityPhoto`, `deleteActivityPhoto`, `getActivitiesForExport`, `exportActivitiesToExcel`. Upload foto ke S3 `staff-activity/`. List view: tabel semua hari dalam bulan, kolom Planning + Realisasi, weekend highlight merah, status badge 4 warna, aksi per baris (Edit/Submit/Approve/Reject/Delete). Calendar view: grid bulanan, dot status per tanggal, klik untuk input/lihat. Month picker: klik teks bulan → popover grid 12 bulan + spinner tahun. Section accordion collapsible. Export Excel format Monthly Deliverables (ExcelJS). Field `activity` di-split menjadi `planning` (required) + `realization` (opsional). Issue #44 dibuat untuk Telegram notification. Build ✅, Tests 154/154 ✅. |
| 2026-05-09 12:20 | Issue #41 selesai — Master Data Staff WRI: Prisma schema 4 model baru (`JobDesk`, `Staff`, `StaffDistrict`, `StaffFarmerGroup`), migration SQL manual, seed 8 job desks, seed menu entry `md-staff`. Server actions: `getStaff`, `getStaffById`, `createStaff`, `updateStaff`, `deleteStaff`, `getJobDesksForDropdown`, `getStaffForDropdown`. List page (DataTable + filter Job Desk searchable combobox + tombol Tambah Staff). Form modal create/edit: Job Desk combobox (`shouldFilter=false`), Line Manager searchable (exclude self), multi-select Distrik + KT dengan Pilih Semua shortcut + badge preview, pre-populate saat edit via `getStaffById`. Detail page: profil + direct reports clickable + tabel distrik + tabel KT. Kosong = semua (distrik/KT). 14 unit tests. Build ✅, Tests 130/130 ✅. |
| 2026-05-08 21:00 | Issue #39 selesai (final) — Training module lengkap: List page (DataTable + filter KT searchable combobox + tombol Tambah Kegiatan), Form modal create/edit (KT + paket searchable, tanggal, lokasi, upload PDF evidence ke S3 bucket mis-dev dengan presigned URL), Detail page (summary card + daftar peserta + tombol Tambah Peserta dual-panel modal + hapus peserta), server actions: `getTrainingActivities`, `getTrainingActivityById`, `createTrainingActivity`, `updateTrainingActivity`, `deleteTrainingActivity`, `addParticipants`, `removeParticipant`, `getFarmersByGroup`, `uploadTrainingEvidence`. S3 lib (`src/lib/s3.ts`): presigned URL 7 hari. Build ✅, Tests 116/116 ✅. |
| 2026-05-08 19:45 | Issue #39 selesai — Master Data Training List & Detail: server action `getTrainingActivities` + `getTrainingActivityById` + `deleteTrainingActivity`, list page dengan DataTable (6 kolom: KT, paket, tanggal, lokasi, peserta, evidence link), detail page (summary card + tabel peserta dengan NIK masking), delete dengan konfirmasi dialog + router.refresh, placeholder Edit (toast info), 17 unit tests baru (schema validation, pagination, date formatting, NIK masking). Build ✅, Tests 117/117 ✅. |
| 2026-05-08 16:45 | Issue #37 selesai — Interactive Map Dashboard: filter kabupaten + multi-select KT mempengaruhi map & ringkasan, panel section jadi collapsible (Filter/Layer/Basemap), marker KT non-cluster pakai icon. Build ✅, Tests 100/100 ✅. |
| 2026-05-07 14:55 | Issue #37 dibuat — Interactive Map Dashboard: full-screen GIS map, marker KT (29 titik), polygon lahan (10 PostGIS), layer control panel, basemap switcher, popup on click. Milestone #7 dibuat. |
| 2026-05-07 14:35 | Post-merge polish #35 — fix form edit kosong (useEffect reset), action icon (titik 3 → Edit2+Trash2), search tabel menu, icon support child menu sidebar, `src/lib/icon-map.tsx` (ICON_MAP + ICON_LIST), icon picker combobox dengan search, URL field disabled saat edit, typography audit & standarisasi semua tabel admin, dark mode contrast fix (--muted token), fix double header Data Lahan, pindah Regions ke `settings/regions`, table style rule di rule&progress.md. Build ✅, Tests 95/95 ✅. |
| 2026-05-07 09:12 | Issue #35 selesai — Dynamic Menu Management: Prisma schema `MenuItem`, migration SQL manual (workaround schema drift), seed 31 items, 7 server actions, async Server Component sidebar, `menu-utils.ts` RBAC refactor, 9 scaffold pages, Settings → Menu Management UI (CRUD + drag-and-drop + search). Build ✅, Tests 95/95 ✅, Perf: `getMenuItems` ~46ms warm, MenuManagementPage ~339ms. |
| 2026-05-07 08:30 | Issue #35 dibuat — Dynamic Menu Management: migrasi menu sidebar dari CSV statis ke DB (Prisma schema `MenuItem`, migration, seed, Server Actions CRUD, dynamic sidebar, scaffold 9 halaman baru, Settings → Menu Management UI). Milestone #6 dibuat. |
| 2026-05-06 23:45 | Issue #22 selesai — Final QA Fase 4: hapus semua debug logs (SERVER/PAGE/CLIENT DEBUG) dari 4 file, lokalisasi teks bahasa Inggris di farmer detail page, ganti badge status hardcoded dengan data real (parcel count), hapus placeholder data `Math.random()` di group detail tabs (training/BMP), hapus external image URL wikimedia. Build ✅, Tests 81/81 ✅, Perf: Groups 324ms, Farmers 335ms, Parcels 100ms, Provinces 33ms, Districts 63ms — semua < 500ms. |
| 2026-05-06 22:10 | Issue #31 selesai — mis-main di-sync: 6 migrations applied via `prisma migrate deploy`, schema drift fixes (abrv_3id + birthdate nullable), seed berhasil (users 4, provinces 2, districts 12, subdistricts 63, farmer-groups 29, batches 2, commodities 3, ref data lengkap). 2 pre-existing seed bugs ditemukan & didokumentasikan (villages.csv & farmers.csv ID mismatch). Build ✅, Tests 81/81 ✅, Perf: Groups 0.33ms, Farmers 0.20ms. |
| 2026-05-06 20:00 | Issue #31 dibuat — Sync production database (mis-main): apply 6 migrations + seed data referensi. mis-main saat ini kosong (0 tabel aplikasi). |
| 2026-05-06 18:30 | Issue #29 selesai — Audit trail fields (createdAt, createdBy, modifiedAt, modifiedBy) ditambahkan ke 22 tabel. Migration SQL manual (ADD COLUMN IF NOT EXISTS + FK constraints). Prisma client di-regenerate. Server actions (farmer, farmer-group, land-parcel) diupdate. 12 unit tests baru (audit-trail.test.ts). Build ✅, Tests 81/81 ✅, Perf: Farmers 0.41ms, Parcels 0.32ms. |
| 2026-05-06 16:00 | Milestone #4 "Database Schema Hardening" dibuat. Issue #29 dibuat — audit trail fields (createdAt, createdBy, modifiedAt, modifiedBy) untuk 22 tabel. |
| 2026-05-05 21:00 | Issue #21 selesai — Parcels CRUD lengkap: Zod schema, server actions (PostGIS raw SQL), page, list client (filter kelompok tani, search, pagination), form modal (petani searchable), view modal (detail + peta MapLibre dengan switcher Light/Dark/Satellite), 16 unit tests. |
| 2026-05-04 10:00 | Restrukturisasi dokumen. Tambah rules. Skip Fase 3, mulai Fase 4. GitHub Issues & Milestone dibuat. |

</details>

<details>
<summary><strong>🗓️ April 2026</strong> (1 entry)</summary>

| Tanggal & Waktu | Perubahan |
|-----------------|-----------|
| 2026-04-14 15:00 | Fase 2 selesai — Prisma 7 modular schema, 3 migrasi PostgreSQL + PostGIS, seeding modular. |

</details>

<details>
<summary><strong>🗓️ Maret 2026</strong> (5 entries)</summary>

| Tanggal & Waktu | Perubahan |
|-----------------|-----------|
| 2026-03-30 11:00 | Code review menyeluruh. Sinkronisasi status. |
| 2026-03-28 09:00 | Modernisasi Basic Data Dashboard. Perbaikan Home page. |
| 2026-03-18 08:00 | Inisiasi proyek. Setup Next.js, Shadcn, static data, public pages. |
| 2026-03-18 | Inisiasi proyek. Setup Next.js, Shadcn, static data, public pages. |

</details>

---

## 📁 Referensi Arsitektur

<details>
<summary>Struktur Folder</summary>

```
src/
├── app/
│   ├── (admin)/
│   │   ├── layout.tsx                    # Admin shell — Server Component
│   │   └── admin/
│   │       ├── error.tsx / loading.tsx   # Error & loading boundaries
│   │       ├── dashboard/page.tsx        # Basic Data Dashboard (orchestrator)
│   │       ├── master-data/             # farmers, groups, parcels, regions
│   │       ├── cms/                     # news, pages, community, knowledge
│   │       ├── settings/               # users, roles, system
│   │       └── tools/                  # import, export, geo
│   ├── (public)/
│   │   ├── layout.tsx                    # Public shell (navbar + footer)
│   │   ├── error.tsx / loading.tsx
│   │   ├── page.tsx                      # Home
│   │   ├── community/                   # List + [id] detail
│   │   └── knowledge-management/        # List + [id] detail
│   ├── login/page.tsx
│   ├── layout.tsx                        # Root (ThemeProvider)
│   ├── not-found.tsx                     # Global 404
│   └── globals.css                       # Design tokens (oklch)
├── components/
│   ├── ui/                               # 23 Shadcn primitives
│   ├── shared/                           # Reusable (DataTable, DeleteDialog) — Fase 4
│   ├── dashboard/                        # Modular dashboard components
│   ├── community/                        # Community client component
│   ├── knowledge/                        # Knowledge client component
│   ├── maps/                             # Profile mini map
│   ├── auth/                             # Login form
│   └── layout/
│       ├── admin/                        # Sidebar, nav, header, breadcrumb
│       └── public/                       # Navbar, footer, hero carousel
├── lib/
│   ├── static-data/                      # CSV data layer (per domain sub-module)
│   ├── prisma.ts                         # Prisma singleton (PrismaPg adapter)
│   ├── constants.ts                      # Shared constants
│   ├── map-utils.ts                      # Map utilities & coordinates
│   └── utils.ts                          # cn() helper
├── server/actions/                       # Server Actions
├── validations/                          # Zod schemas
├── types/                                # Custom types (action-result, csv module declaration)
└── hooks/use-mobile.ts                   # Mobile breakpoint hook
```

</details>

<details>
<summary>Tech Stack</summary>

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Shadcn UI |
| Styling | Tailwind CSS 4 + oklch design tokens |
| Database | PostgreSQL + PostGIS |
| ORM | Prisma 7 (modular schema, PrismaPg adapter) |
| Auth | NextAuth.js (planned) |
| Maps | MapLibre GL JS + react-map-gl |
| Charts | Recharts |
| Validation | Zod + React Hook Form |
| Font | Acumin Pro Condensed + Geist fallback |

</details>

<details>
<summary>Fase 1 — Detail (Selesai)</summary>

Seluruh UI statis (public + admin) selesai dengan data CSV, responsif mobile, dark/light mode, peta interaktif MapLibre.

| Sub-fase | Deskripsi |
|----------|-----------|
| 1.1 | Inisiasi proyek Next.js, konfigurasi environment |
| 1.2 | Instalasi dependensi (Prisma, NextAuth, MapLibre, Recharts, dll.) |
| 1.3 | Inisiasi Shadcn UI (23 komponen primitif) |
| 1.4 | Setup folder structure, multi-layout, design system oklch |
| 1.5 | Scaffolding UI statis (Home, Community, Knowledge, Admin sidebar, 404) |
| 1.6 | UI statis dengan static-data CSV (semua halaman public + admin) |
| 1.7 | Responsivitas mobile (hamburger menu, grid responsif) |
| 1.8 | Refaktor arsitektur (server component, decomposition, naming, barrel, cleanup) |

</details>

<details>
<summary>Fase 2 — Detail (Selesai)</summary>

Prisma 7 + PostgreSQL + PostGIS. Schema modular (9 file `.prisma`), 4 migrasi, seeding modular (12 pasang file).

| File | Models |
|------|--------|
| `_config.prisma` | Generator, datasource, enum `Role` |
| `user.prisma` | `User` (SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT) |
| `geography.prisma` | `Province`, `District` |
| `farmer-group.prisma` | `FarmerGroup`, `FarmerGroupType`, `FarmerGroupDetail` |
| `farmer.prisma` | `Batch`, `Commodity`, `Farmer`, `LandParcel` |
| `agronomy.prisma` | `AgronomyProduction`, `AgronomyMaintenance`, `MaintenanceType` |
| `training.prisma` | `TrainingPackage`, `TrainingActivity`, `TrainingParticipant`, `TrainingEvidence` |
| `certification.prisma` | `CertificationType`, `Certification`, `AuditType`, `AuditActivity`, `AuditEvidence` |
| `hse.prisma` | `HseWorker`, `HseDetail` |

</details>

### Outstanding Technical Debt

<details>
<summary><strong>🔧 Technical Debt Overview</strong> (18 items)</summary>

---

#### 🚨 **High Priority** (Critical Issues)

| Issue | Location | Tags | Description |
|-------|----------|------|-------------|
| Schema drift baseline | `prisma/migrations/` | `bug` `database` `migration` | `abrv_3id` dan `birthdate` nullable ditambahkan manual ke mis-dev tanpa migration — perlu migration baseline |
| S3 orphan files cleanup | `src/lib/s3.ts`, `src/server/actions/training.ts` | `bug` `storage` `cleanup` | Saat delete kegiatan training atau ganti evidence, file PDF lama di bucket `mis-dev` tidak ikut terhapus. Perlu tools cleanup (list orphan keys vs DB records) — ditunda ke fase Tools |
| `villages.csv` ID mismatch | `prisma/seeds/data/villages.csv` | `bug` `data` `seed` | subdistrictId format `subd-140101` tidak cocok dengan `subd-1404010` di subdistricts.csv — `reg-village` selalu kosong |

---

#### ⚡ **Performance & Optimization**

| Issue | Location | Tags | Description |
|-------|----------|------|-------------|
| `getMenuItems()` tidak di-cache | `server/actions/menu.ts` | `performance` `cache` `menu` | Dipanggil per halaman tanpa cache — tambahkan `unstable_cache` atau React `cache()` saat halaman bertambah banyak |
| Dashboard cache optimization | `src/server/actions/dashboard-cache.ts` | `performance` `cache` `dashboard` `enhancement` | Cache tables created but not yet integrated into main dashboard flow — consider implementing for sub-100ms performance |
| Map marker performance | `src/components/dashboard/basic-data-map.tsx` | `performance` `maps` `optimization` | Custom markers loaded but could benefit from sprite optimization for large datasets |

---

#### 🧹 **Code Quality & Cleanup**

| Issue | Location | Tags | Description |
|-------|----------|------|-------------|
| `window.location.reload()` di menu CRUD | `settings/menu/menu-manager-client.tsx` | `refactor` `ux` `navigation` | Ganti dengan `router.refresh()` dari `next/navigation` untuk avoid full page reload |
| Unused DropdownMenu imports | `settings/menu/menu-manager-client.tsx` | `cleanup` `imports` | `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuTrigger` tidak terpakai setelah refactor action ke icon button |
| `prisma/seed.ts` masih pakai `ts-node` | `package.json` | `refactor` `tooling` `consistency` | `"seed": "npx ts-node prisma/seed.ts"` — perlu diupdate ke `tsx` agar konsisten |
| TypeScript strict mode | Multiple files | `enhancement` `typescript` `type-safety` | Some files still use `any` types — consider full strict mode implementation |

---

#### 🐛 **UI/UX & Frontend Issues**

| Issue | Location | Tags | Description |
|-------|----------|------|-------------|
| Dark mode audit | Semua halaman | `bug` `ui` `dark-mode` | Beberapa hardcoded `text-white` tanpa dark variant |
| `isActive` vs `isVisible` semantik | `settings/menu/menu-manager-client.tsx` | `ux` `ui` `clarity` | Perlu tooltip/helper text di form modal agar tidak membingungkan user |
| Drag-and-drop flat list | `settings/menu/menu-manager-client.tsx` | `enhancement` `ux` `menu` | Reorder bekerja pada semua 31 item sekaligus, idealnya per parent group |

---

#### 🔒 **Logic & Validation Issues**

| Issue | Location | Tags | Description |
|-------|----------|------|-------------|
| Circular reference check 1 level | `server/actions/menu.ts` `updateMenuItem()` | `bug` `validation` `logic` | Hanya cegah self-reference langsung, belum deteksi A→B→A |

---

#### 📋 **Documentation & Guidelines**

| Issue | Location | Tags | Description |
|-------|----------|------|-------------|
| Spacing guideline | `globals.css` | `documentation` `design-system` | Belum ada panduan spacing formal |

---

#### 🔄 **Future Features** (Planned for Later Phases)

| Issue | Location | Tags | Description |
|-------|----------|------|-------------|
| Language toggle non-functional | `navbar.tsx`, `admin-header-actions.tsx` | `feature` `i18n` `phase-10` | TODO: Fase 10 — i18n |

---

#### ✅ **Resolved Items**

| Issue | Location | Tags | Resolution |
|-------|----------|------|------------|
| `farmers.csv` ID mismatch | `prisma/seeds/data/farmers.csv` | `bug` `data` `seed` `resolved` | ✅ FIXED - Updated farmerGroupId format untuk match dengan farmer-groups.csv |

---

#### 🗂️ **Git & Repository Issues**

| Issue | Location | Tags | Description |
|-------|----------|------|-------------|
| `.DS_Store` in git | Root | `cleanup` `git` | Perlu `git rm --cached` |

</details>
