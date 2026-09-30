import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findFirst({
          where: {
            email: {
              equals: credentials.email as string,
              mode: "insensitive",
            },
          },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
