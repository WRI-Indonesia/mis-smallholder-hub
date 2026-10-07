import { Prisma } from "@prisma/client";
import { rawFarmerGroupScope, type AccessContext } from "@/lib/access-scope";

/**
 * Fragmen SQL "Lembaga alias `alias` ada di scope user" untuk kueri mentah (PostGIS) —
 * satu definisi dari `rawFarmerGroupScope`, dipakai Tumpang Tindih Lahan (#317) agar
 * mode akses baru tak perlu ditulis ulang di tiap kueri (review ef4ed79). `null` array =
 * tanpa batasan. Alias hanya identifier sederhana (disisipkan sebagai SQL mentah).
 */
export function groupScopeSql(alias: string, access: AccessContext): Prisma.Sql {
  if (!/^[a-z][a-z0-9_]*$/.test(alias)) throw new Error(`alias tidak valid: ${alias}`);
  const { groupIds, districtIds } = rawFarmerGroupScope(access);
  const g = Prisma.raw(alias);
  return Prisma.sql`((${groupIds ?? null}::text[] IS NULL OR ${g}.id = ANY(${groupIds ?? null}::text[]))
    AND (${districtIds ?? null}::text[] IS NULL OR ${g}.district_id = ANY(${districtIds ?? null}::text[])))`;
}
