# MIS Smallholder Hub - Plan

## Task 1 : Initial Setup

- [x] Setup Nextjs project use typescript
- [x] Setup Tailwind CSS
- [x] Setup Database : PostgreSQL
- [x] Setup UI Library : Shadcn UI
- [x] Setup Testing Framework : Vitest
- [x] Setup Linting and Formatting : ESLint, Prettier

## Task 2 : Scaffolding Public Pages

- [x] Navbar (Logo: "MIS Smallholder Hub" text + Custom SVG, Navigation, Theme/Language Toggle, Auth Buttons)
- [x] Home Page
- [x] Community Page
- [x] Activity Page
- [x] Media Page
- [x] Dashboard Page
- [x] Footer

## Task 3 : Scaffolding Authentication Pages + Admin Dashboard

- [x] Login Page
- [x] Register Page
- [x] Admin Dashboard Page (Private Route) use `npx shadcn@latest add sidebar-07`

## Task 4 : setup prisma schema & seed core data (user, menu, province, district, sub-district, village, training type)

- [x] setup prisma schema
- [x] setup seed core data


## Task 5: Setup Master Data Management (CRUD)

- [x] **Infrastructure & Validation**
  - [x] Implement Server Actions or API Routes for database interactions
  - [x] Implement Zod schemas for strict data validation (create & update)
  - [x] Integrate React Hook Form for client-side form handling

- [x] **UI Components & Features**
  - [x] Build dynamic Data Tables (Shadcn UI) with pagination & search
  - [x] Build Add/Edit Dialogs (Modals) or separate full pages
  - [x] Implement "Delete" confirmation dialogues

- [x] **Implement Core Entity Pages**
  - [x] User Management
  - [x] Menu settings
  - [x] Master: Training Type

## Task 6: Unified Regional Hierarchy (Tree View)

- [x] Consolidate Province, District, SubDistrict, and Village into a single page (`/dashboard/settings/regional`).
- [x] Build a Lazy-Loaded `Tree` component to recursively render regions.
- [x] Implement inline CRUD Modal Actions (Add Child, Edit, Delete) accessible via node dropdowns.
- [x] Implement intelligent cascading Code inputs (auto-prefixing parent codes).
- [x] Integrate global Server-Side DB Search covering all regional tiers.