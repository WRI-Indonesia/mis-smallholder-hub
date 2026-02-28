# Unit Test

## Task 1 : Initial Setup

- [x] Setup Unit Test with Vitest

## Task 2 : Scaffolding Public Pages

- [ ] Test `Navbar` user connection flow (localStorage toggle)
- [ ] Test Mode and Language toggle functionality locally

## Task 3 : Scaffolding Authentication Pages + Admin Dashboard

- [ ] Test `Navbar` hiding logic on Dashboard routes
- [ ] Test `DashboardBreadcrumb` URL segmentation and dynamic text generation
- [ ] Test `AppSidebar` rendering and Logo standard routing
- [ ] Test `NavMain` correctly highlighting the active menu based on pathname
- [ ] Test `LoginForm` simulated user login & validation
- [ ] Test `generate_pages.mjs` script ensuring it correctly scaffolds missing files

## Task 4 : setup prisma schema & seed core data

- [ ] Test Prisma Client connection and basic CRUD operations
- [ ] Test `User` and `Menu` relationship integrity
- [ ] Test Regional Data constraints (Province -> District -> SubDistrict -> Village)
- [ ] Test `training-type` data structure retrieval
- [ ] Test CSV Seeding script parsing logic and data deduplication (`upsert`)
