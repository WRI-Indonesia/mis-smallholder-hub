/** Tipe halaman Peta Data & Skema (DA-07, #256). */

export type FieldFill = {
  field: string;
  /** Wajib di skema (tanpa `?`) — kolom wajib yang tidak 100% menandakan anomali. */
  isRequired: boolean;
  /** Jumlah baris aktif dengan nilai non-NULL. */
  filled: number;
  /** 0–100; null bila entitasnya belum punya baris sama sekali. */
  pct: number | null;
};

export type EntityFill = {
  entity: string;
  clientName: string;
  domain: string;
  /** Jumlah baris aktif (soft delete dihormati). */
  rows: number;
  fields: FieldFill[];
};

export type MenuLabel = {
  key: string;
  title: string;
  parentKey: string | null;
  order: number;
};
