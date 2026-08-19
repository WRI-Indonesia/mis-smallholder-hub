/**
 * Pemindai skema Prisma untuk halaman Peta Data & Skema (#256).
 *
 * Sumbernya `prisma/schema/*.prisma`, BUKAN `Prisma.dmmf`: DMMF runtime pada
 * setup ini minimal — hanya nama, kind, tipe, `dbName`, dan `relationName`,
 * tanpa penanda wajib/opsional, `@id`/`@unique`, maupun kardinalitas, dan
 * daftar enum-nya kosong. Berkas skema memuat semuanya, plus satu hal yang
 * DMMF tidak akan pernah punya: **pengelompokan domain dari nama berkas**
 * (farmer, geography, rbac, …) — justru itu yang membuat kanvas 22 entitas bisa
 * dibaca.
 *
 * Sintaks yang ditangani sengaja sempit dan gagal keras bila ada yang tak
 * dikenal, mengikuti preseden parser `.md` di repo ini (#227/#250): lebih baik
 * build berhenti daripada diagram diam-diam kehilangan satu relasi. Kesegarannya
 * dijaga `src/test/data-schema.test.ts` (pindai ulang + bandingkan), dan nama
 * model/field-nya disilangkan dengan `Prisma.dmmf` sebagai sumber kedua.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type {
  RelationKind,
  SchemaEntity,
  SchemaEnum,
  SchemaField,
  SchemaMap,
  SchemaRelation,
} from "../src/types/data-schema";

const SCHEMA_DIR = join("prisma", "schema");

const FIELD_RE = /^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/;
const BLOCK_RE = /^(model|enum)\s+(\w+)\s*\{$/;
const LIST_ATTR_RE = /\[([^\]]*)\]/;

const clientName = (model: string) => model[0].toLowerCase() + model.slice(1);
const splitList = (raw: string) => raw.split(",").map((s) => s.trim()).filter(Boolean);

type RelationSide = {
  model: string;
  field: string;
  target: string;
  isList: boolean;
  hasFk: boolean;
  name: string | null;
};

/** Buang komentar `//` di ujung baris (tidak ada string ber-`//` di skema ini). */
const stripComment = (line: string) => {
  const at = line.indexOf("//");
  return (at === -1 ? line : line.slice(0, at)).trim();
};

export function scanSchema(root: string = process.cwd()): SchemaMap {
  const dir = join(root, SCHEMA_DIR);
  const files = readdirSync(dir).filter((f) => f.endsWith(".prisma")).sort();
  if (files.length === 0) throw new Error(`schema-scan: tidak ada berkas .prisma di ${SCHEMA_DIR}`);

  const sources = files.map((file) => ({
    domain: file.replace(/\.prisma$/, "").replace(/^_/, ""),
    lines: readFileSync(join(dir, file), "utf-8").split("\n").map(stripComment),
  }));

  // Lintasan 1: kumpulkan nama model & enum supaya kind tiap field bisa ditentukan.
  const modelNames = new Set<string>();
  const enumNames = new Set<string>();
  for (const { lines } of sources) {
    for (const line of lines) {
      const block = BLOCK_RE.exec(line);
      if (!block) continue;
      (block[1] === "model" ? modelNames : enumNames).add(block[2]);
    }
  }

  const entities: SchemaEntity[] = [];
  const enums: SchemaEnum[] = [];
  const sides: RelationSide[] = [];

  // Lintasan 2: isi tiap blok.
  for (const { domain, lines } of sources) {
    let kind: "model" | "enum" | null = null;
    let name = "";
    let entity: SchemaEntity | null = null;
    let values: string[] = [];

    for (const line of lines) {
      if (!line) continue;

      const block = BLOCK_RE.exec(line);
      if (block) {
        [, kind, name] = block as unknown as [string, "model" | "enum", string];
        if (kind === "model") {
          entity = {
            name,
            clientName: clientName(name),
            tableName: null,
            domain,
            fields: [],
            scalarCount: 0,
            compoundUnique: [],
            indexes: [],
          };
        } else {
          values = [];
        }
        continue;
      }

      if (line === "}") {
        if (kind === "model" && entity) {
          entity.scalarCount = entity.fields.filter((f) => f.kind !== "relation").length;
          entities.push(entity);
        } else if (kind === "enum") {
          enums.push({ name, values, domain });
        }
        kind = null;
        entity = null;
        continue;
      }

      if (kind === "enum") {
        values.push(line);
        continue;
      }
      if (kind !== "model" || !entity) continue;

      // Atribut level blok.
      if (line.startsWith("@@")) {
        if (line.startsWith("@@map(")) entity.tableName = /"([^"]+)"/.exec(line)?.[1] ?? null;
        else if (line.startsWith("@@unique(")) entity.compoundUnique.push(splitList(LIST_ATTR_RE.exec(line)?.[1] ?? ""));
        else if (line.startsWith("@@index(")) entity.indexes.push(splitList(LIST_ATTR_RE.exec(line)?.[1] ?? ""));
        continue;
      }

      // Field `Unsupported(...)` (mis. kolom PostGIS `geom` di
      // FarmerGroupBoundary, #266) tidak muncul di Prisma.dmmf maupun Client —
      // dilewati agar artefak tetap identik dengan DMMF.
      if (/^\w+\s+Unsupported\(/.test(line)) continue;

      const match = FIELD_RE.exec(line);
      if (!match) {
        throw new Error(`schema-scan: baris tak dikenal di model ${entity.name} — "${line}"`);
      }
      const [, fieldName, type, list, optional, attrs] = match;
      const isRelation = modelNames.has(type);
      const relationAttr = /@relation\(([^)]*)\)/.exec(attrs)?.[1] ?? "";

      const field: SchemaField = {
        name: fieldName,
        type,
        kind: isRelation ? "relation" : enumNames.has(type) ? "enum" : "scalar",
        isRequired: !optional,
        isList: Boolean(list),
        isId: /@id\b/.test(attrs),
        isUnique: /@unique\b/.test(attrs),
        dbName: /@map\("([^"]+)"\)/.exec(attrs)?.[1] ?? null,
        relationName: /^\s*"([^"]+)"/.exec(relationAttr)?.[1] ?? null,
        relationFields: splitList(/fields:\s*\[([^\]]*)\]/.exec(relationAttr)?.[1] ?? ""),
      };
      entity.fields.push(field);

      if (isRelation) {
        sides.push({
          model: entity.name,
          field: fieldName,
          target: type,
          isList: field.isList,
          hasFk: field.relationFields.length > 0,
          name: field.relationName,
        });
      }
    }

    if (kind !== null) throw new Error(`schema-scan: blok ${name} tidak tertutup di ${domain}.prisma`);
  }

  return {
    entities: entities.sort((a, b) => a.name.localeCompare(b.name)),
    relations: pairRelations(sides),
    enums: enums.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/**
 * Pasangkan kedua sisi tiap relasi jadi satu edge. Kunci pasangan = nama relasi
 * eksplisit bila ada (Prisma mewajibkannya saat dua relasi menghubungkan pasangan
 * entitas yang sama), selain itu pasangan nama entitas.
 */
function pairRelations(sides: RelationSide[]): SchemaRelation[] {
  const groups = new Map<string, RelationSide[]>();
  for (const side of sides) {
    const key = side.name ?? [side.model, side.target].sort().join("↔");
    const list = groups.get(key);
    if (list) list.push(side);
    else groups.set(key, [side]);
  }

  const relations: SchemaRelation[] = [];
  for (const [key, group] of groups) {
    if (group.length > 2) {
      throw new Error(`schema-scan: relasi "${key}" punya ${group.length} sisi — beri @relation("nama") eksplisit`);
    }
    const [a, b] = group;

    if (!b) {
      // Sisi lawan tidak dideklarasikan — tetap digambar, arah dari FK.
      relations.push({
        key,
        from: a.isList ? a.model : a.target,
        to: a.isList ? a.target : a.model,
        kind: a.isList ? "1:n" : "1:1",
        fromField: a.isList ? a.field : null,
        toField: a.isList ? null : a.field,
        isSelf: a.model === a.target,
      });
      continue;
    }

    let kind: RelationKind;
    let parent: RelationSide;
    let child: RelationSide;
    if (a.isList && b.isList) {
      kind = "n:n";
      [parent, child] = [a, b];
    } else if (a.isList || b.isList) {
      kind = "1:n";
      parent = a.isList ? a : b;
      child = a.isList ? b : a;
    } else {
      kind = "1:1";
      parent = a.hasFk ? b : a; // pemegang foreign key adalah sisi anak
      child = a.hasFk ? a : b;
    }

    relations.push({
      key,
      from: parent.model,
      to: child.model,
      kind,
      fromField: parent.field,
      toField: child.field,
      isSelf: parent.model === child.model,
    });
  }

  return relations.sort((x, y) => x.from.localeCompare(y.from) || x.to.localeCompare(y.to) || x.key.localeCompare(y.key));
}
