import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { refreshTokenRole } from "@/lib/auth-role-refresh";

// Dedupe per request: auth() dipanggil berkali-kali dalam satu render.
const lookupUserRole = cache((id: string) =>
  prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true } })
);

export const { handlers, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Jalur Node saja (middleware tetap memakai authConfig tanpa Prisma):
    // role + isActive dibaca ulang dari DB paling lama tiap 5 menit (#342).
    async jwt(params) {
      const token = await authConfig.callbacks!.jwt!(params);
      return token && refreshTokenRole(token, lookupUserRole);
    },
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
