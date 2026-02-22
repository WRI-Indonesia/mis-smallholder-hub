# MIS Smallholder Hub - Technical Documentation

Configuration and setup details for the MIS Smallholder Hub application.

## 1. Technology Stack

- **Framework:** Next.js 16 (App Router)

- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + Shadcn UI + `tailwindcss-animate`

- **Icons:** Lucide React
- **Theme Management:** `next-themes`

- **Database:** PostgreSQL (managed via Prisma ORM)
- **Testing:** Vitest + React Testing Library

- **Linting & Formatting:** ESLint + Prettier

## 2. Project Structure

- `src/app`: Page routes and layouts (App Router)
  - `src/app/dashboard`: Nested dashboard routes with persistent sidebar layout.

- `src/components/ui`: Reusable UI components (Shadcn UI)
- `src/components/layout`: Layout components (Navbar, Footer)

- `src/components/providers`: Context providers (ThemeProvider, etc.)
- `src/components/auth`: Authentication forms (Login, Register).

- `src/components/app-sidebar.tsx`: Main sidebar configuration and menu registry.
- `src/components/dashboard-breadcrumb.tsx`: Dynamic client component for generating breadcrumbs from URL segments.

- `src/lib`: Utilities, configuration functions, and dummy data (`src/lib/dummy-data`).
- `prisma`: Database schema and migrations

- `public`: Static assets

## 3. Architecture Notes

### Authentication (Phase 2 MVP)

For the current development phase, authentication is handled client-side using a dummy user profile stored in `src/lib/dummy-data/user.ts`. Upon a successful login simulation, the user object is stored in `localStorage` under the key `user`. The `Navbar` and `Sidebar` check this local storage entry to toggle the UI from a "Login" state to a logged-in User Menu state.

### Admin Dashboard Layout

The application features a responsive admin dashboard generated via Shadcn's `sidebar-07` template.

- **Layout Separation**: The `AppSidebar` component is wrapped inside a dedicated `src/app/dashboard/layout.tsx`. This ensures the sidebar and sticky header (containing dynamic breadcrumbs) persist seamlessly across all nested `/dashboard/*` page navigations without re-rendering.
- **Dynamic Breadcrumbs**: `DashboardBreadcrumb` is a client component that reads the `usePathname()` hook to automatically map the current URL segments to capitalized breadcrumbs (e.g., `/dashboard/master-data` -> `Dashboard > Master Data`).

### Navigation & Routing

- **Navbar Visibility**: The global top `Navbar` is built to read the current route via `usePathname()` and returns `null` if the user is on any `/dashboard` route. This provides a cleaner full-screen layout for the Admin Sidebar.

- **Client-Side Routing**: The `NavMain` recursively builds sidebar links using Next.js `<Link>` components rather than native anchors to prevent full page reloads, preserving the user's `Collapsible` menu expansion states during navigation.
- **Dynamic Active States**: The Sidebar matches `usePathname()` against the nested `url` properties of `SIDEBAR_DATA` to automatically expand the correct accordion group on a hard reload.

### Page Scaffolding

- A custom Node script (`generate_pages.mjs`) is used during development to read the `src/lib/dummy-data/sidebar-list.ts` configuration, extract all URLs using regex, and programmatically generate basic `page.tsx` React component files inside `/app/dashboard/...` if they don't yet exist.

## 4. Setup & Commands

### Prerequisites

- Node.js (v20+)

- npm
- PostgreSQL Database

### Installation

```bash
npm install
```

### Database Setup

1. Configure `.env` with your `DATABASE_URL`.
2. Run migrations (when schema is ready):
   ```bash
   npx prisma migrate dev
   ```

### Development

```bash
npm run dev
```

### Testing

Run unit tests with Vitest:
```bash
npm run test
```

### Linting

```bash
npm run lint
```
