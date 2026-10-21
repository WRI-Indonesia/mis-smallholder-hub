import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { authorizeCredentials } from "@/lib/auth-credentials";
import { createRoleLookup, withRoleRefresh } from "@/lib/auth-role-refresh";

const lookupUserRole = createRoleLookup((id) =>
  prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true } })
);

export const { handlers, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Jalur Node saja (middleware tetap memakai authConfig tanpa Prisma):
    // role + isActive dibaca ulang dari DB, dimemo ≤ 1 menit per user (#342).
    jwt: withRoleRefresh(authConfig.callbacks!.jwt!, lookupUserRole),
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
});
