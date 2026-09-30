import type { NextAuthConfig } from "next-auth";

// Edge-compatible config (no Prisma, no Node.js modules)
// Used by middleware for session checking only
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      if (isOnAdmin && !isLoggedIn) return false;
      // /login → /admin bagi yang sudah login diputuskan halaman login (jalur
      // Node, role/isActive dicek ulang — #342). Di sini hanya cookie yang
      // dibaca; akun yang dinonaktifkan masih tampak login dan akan terjebak
      // loop /admin ↔ /login.
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  providers: [], // Added in full auth.ts
};
