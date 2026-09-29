import { DATA_SCHEMA } from "@/lib/data-schema.generated";
import type { CanvasSchema, SchemaEntity, SchemaField, SchemaMap } from "@/types/data-schema";

/**
 * Pembantu murni di atas artefak peta skema (#256). Tidak mengimpor Prisma
 * Client, jadi aman dipakai komponen mana pun; sumber angkanya tetap satu —
 * `prisma/schema/*.prisma` lewat `npm run build:schema`.
 */

export const dataSchema: SchemaMap = DATA_SCHEMA;

/**
 * Field yang keterisiannya bisa dihitung: non-relasi, dan bukan `Json`
 * (Prisma `_count` hanya menerima field skalar terurut — kolom Json ditolak).
 */
export const countableFields = (entity: SchemaEntity): SchemaField[] =>
  entity.fields.filter((f) => f.kind !== "relation" && f.type !== "Json");

/** Proyeksi ramping untuk kanvas ERD — lihat catatan pada `CanvasSchema`. */
export const canvasSchema = (schema: SchemaMap = DATA_SCHEMA): CanvasSchema => ({
  entities: schema.entities.map((e) => ({
    name: e.name,
    tableName: e.tableName,
    domain: e.domain,
    scalarCount: e.scalarCount,
    fieldCount: e.fields.length,
  })),
  relations: schema.relations,
});
