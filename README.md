# MIS Smallholder Hub

A web-based Management Information System (MIS) for independent smallholder palm oil farmers. This application allows for monitoring, reporting, and verification (MRV) of smallholder data.

## 🚀 Technologies

This project is built with the following technologies:

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:**
  - [Tailwind CSS v4](https://tailwindcss.com/)
  - [Shadcn UI](https://ui.shadcn.com/)
  - [Lucide React](https://lucide.dev/) (Icons)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Testing:** [Vitest](https://vitest.dev/) & [React Testing Library](https://testing-library.com/)
- **Linting & Formatting:** ESLint & Prettier

## 🛠️ Getting Started

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v20 or higher)
- [PostgreSQL](https://www.postgresql.org/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd mis-smallholder-hub
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory and add your database connection string:
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/mis_smallholder_db?schema=public"
    ```

### Database Setup

1.  **Generate Prisma Client:**
    ```bash
    npx prisma generate
    ```

2.  **Run Migrations:**
    Push the schema to your database:
    ```bash
    npx prisma migrate dev
    ```

3.  **Seed Database (Optional):**
    If there are seed scripts available:
    ```bash
    npx prisma db seed
    ```

### Running the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

```
├── docs/               # Project documentation
├── public/             # Static assets
├── src/
│   ├── app/            # Next.js App Router pages and layouts
│   ├── components/     # React components
│   │   ├── layout/     # Structural components (Navbar, Footer, etc.)
│   │   ├── providers/  # Context providers
│   │   └── ui/         # Reusable UI components (Shadcn UI)
│   ├── lib/            # Utility functions and configurations
│   ├── styles/         # Global styles
│   └── generated/      # Generated artifacts (e.g., Prisma Client)
├── prisma/             # Prisma schema and migrations
├── .eslintrc.json      # ESLint configuration
├── next.config.ts      # Next.js configuration
├── package.json        # Project dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## 🧪 Testing

Run unit tests using Vitest:

```bash
npm run test
```

## 📝 Documentation

For more detailed information, please refer to the documentation in the `docs/` folder:

- [Implementation Plan](docs/plan.md)
- [Technical Documentation](docs/tech-doc.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
