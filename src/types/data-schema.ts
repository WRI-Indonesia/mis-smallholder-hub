/**
 * Tipe peta skema (#256) — bentuk serializable hasil pindai
 * `prisma/schema/*.prisma`, aman dikirim ke komponen kanvas ERD.
 */

export type SchemaFieldKind = "scalar" | "enum" | "relation";

export type SchemaField = {
  name: string;
  /** Tipe apa adanya dari skema (`String`, `DateTime`, `Gender`, `Farmer`). */
  type: string;
  kind: SchemaFieldKind;
  /** Tanpa penanda `?`. */
  isRequired: boolean;
  /** Bertipe daftar (`Farmer[]`). */
  isList: boolean;
  isId: boolean;
  isUnique: boolean;
  /** Nama kolom bila berbeda (`@map`). */
  dbName: string | null;
  /** Nama relasi eksplisit (`@relation("MenuHierarchy")`), bila ada. */
  relationName: string | null;
  /** Kolom foreign key pada sisi ini (`@relation(fields: [...])`). */
  relationFields: string[];
};

export type SchemaEntity = {
  name: string;
  /** Properti pada Prisma Client (`farmer`) — kunci yang dipakai jalur data. */
  clientName: string;
  /** Nama tabel bila berbeda (`@@map`). */
  tableName: string | null;
  /** Berkas skema asalnya tanpa ekstensi (`farmer`, `geography`, `rbac`, …) — dipakai mengelompokkan kanvas ERD. */
  domain: string;
  fields: SchemaField[];
  /** Jumlah field non-relasi. */
  scalarCount: number;
  /** `@@unique([...])`. */
  compoundUnique: string[][];
  /** `@@index([...])`. */
  indexes: string[][];
};

export type RelationKind = "1:1" | "1:n" | "n:n";

export type SchemaRelation = {
  /** Kunci unik edge: nama relasi eksplisit, atau pasangan entitasnya. */
  key: string;
  /** Sisi "satu" pada 1:n — entitas yang memiliki banyak. */
  from: string;
  /** Sisi "banyak" pada 1:n. */
  to: string;
  kind: RelationKind;
  /** Nama field relasi di sisi `from` dan `to` (null bila sisi lawan tak dideklarasikan). */
  fromField: string | null;
  toField: string | null;
  /** Relasi ke entitas yang sama (mis. MenuItem parent-child). */
  isSelf: boolean;
};

export type SchemaEnum = {
  name: string;
  values: string[];
  domain: string;
};

export type SchemaMap = {
  entities: SchemaEntity[];
  relations: SchemaRelation[];
  enums: SchemaEnum[];
};
