import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Isi `authorize` provider Credentials (dipanggil `src/lib/auth.ts`). Dipisah dari
 * konfigurasi NextAuth agar bisa diuji dengan modul asli (#413): email dicocokkan
 * tanpa peka huruf besar, akun nonaktif ditolak, password diperiksa bcrypt.
 */
export async function authorizeCredentials(credentials: Partial<Record<"email" | "password", unknown>> | undefined) {
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
}
