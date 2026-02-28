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

- [ ] **Infrastructure & Validation**
  - [ ] Implement Server Actions or API Routes for database interactions
  - [ ] Implement Zod schemas for strict data validation (create & update)
  - [ ] Integrate React Hook Form for client-side form handling

- [ ] **UI Components & Features**
  - [ ] Build dynamic Data Tables (Shadcn UI) with pagination & search
  - [ ] Build Add/Edit Dialogs (Modals) or separate full pages
  - [ ] Implement "Delete" confirmation dialogues

- [ ] **Implement Core Entity Pages**
  - [ ] User Management
  - [ ] Menu settings
  - [ ] Regional: Province
  - [ ] Regional: District
  - [ ] Regional: Sub District
  - [ ] Regional: Village
  - [ ] Master: Training Type