/** Pelanggaran unique/partial unique index Postgres yang dilempar Prisma (P2002). */
export function isPrismaUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}
