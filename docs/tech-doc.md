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
- `src/components/ui`: Reusable UI components (Shadcn UI)
- `src/components/layout`: Layout components (Navbar, Footer, Sidebar, etc.)
- `src/components/providers`: Context providers (ThemeProvider, etc.)
- `src/lib`: Utilities and configuration functions
- `prisma`: Database schema and migrations
- `public`: Static assets
- `src/lib`: Utilities and configuration functions
- `prisma`: Database schema and migrations
- `public`: Static assets

## 3. Setup & Commands

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