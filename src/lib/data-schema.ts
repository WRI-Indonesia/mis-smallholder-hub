import { DATA_SCHEMA } from "@/lib/data-schema.generated";
import type { SchemaEntity, SchemaField, SchemaMap } from "@/types/data-schema";

/**
 * Pembantu murni di atas artefak peta skema (#256). Tidak mengimpor Prisma
 * Client, jadi aman dipakai komponen mana pun; sumber angkanya tetap satu —
 * `prisma/schema/*.prisma` lewat `npm run build:schema`.
 */

export const dataSchema: SchemaMap = DATA_SCHEMA;

export const findEntity = (name: string): SchemaEntity | undefined =>
  DATA_SCHEMA.entities.find((e) => e.name === name || e.clientName === name);

/**
 * Field yang keterisiannya bisa dihitung: non-relasi, dan bukan `Json`
 * (Prisma `_count` hanya menerima field skalar terurut — kolom Json ditolak).
 */
export const countableFields = (entity: SchemaEntity): SchemaField[] =>
  entity.fields.filter((f) => f.kind !== "relation" && f.type !== "Json");

/** Entitas dikelompokkan per domain, urut nama domain lalu nama entitas. */
export function entitiesByDomain(schema: SchemaMap = DATA_SCHEMA): { domain: string; entities: SchemaEntity[] }[] {
  const groups = new Map<string, SchemaEntity[]>();
  for (const entity of schema.entities) {
    const list = groups.get(entity.domain);
    if (list) list.push(entity);
    else groups.set(entity.domain, [entity]);
  }
  return [...groups.entries()]
    .map(([domain, entities]) => ({ domain, entities }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}

/** Relasi yang menyentuh satu entitas (kedua arah) — dipakai sorot tetangga. */
export const relationsOf = (name: string, schema: SchemaMap = DATA_SCHEMA) =>
  schema.relations.filter((r) => r.from === name || r.to === name);
