/**
 * Penilai `where` ala Prisma — subset yang dipakai test guard scope (`*-guard.test.ts`):
 * kesamaan, `in`, `not` (nilai primitif), `AND`/`OR`, relasi bersarang. Operator relasi
 * daftar (`some`/`none`/`every`) dan `contains` dianggap lolos (tak relevan untuk scope).
 * Dipakai Prisma tiruan untuk memfilter data contoh, sehingga test memeriksa SEMANTIK
 * filter (baris di luar scope tak kembali), bukan sekadar bentuk `where` — kelas
 * BUG-007/#127 lolos test bentuk (#408).
 */
export type Row = Record<string, unknown>;

export function isPlain(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);
}

export function matches(row: Row, where: unknown): boolean {
  if (!isPlain(where)) return true;
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined) return true;
    if (k === "AND") return (Array.isArray(v) ? v : [v]).every((w) => matches(row, w));
    if (k === "OR") return (v as unknown[]).some((w) => matches(row, w));
    if (isPlain(v)) {
      if ("in" in v) return (v.in as unknown[]).includes(row[k]);
      if ("not" in v && !isPlain(v.not)) return row[k] !== v.not;
      if ("none" in v || "some" in v || "every" in v || "contains" in v || "not" in v) return true;
      if (isPlain(row[k])) return matches(row[k] as Row, v);
      return true;
    }
    return row[k] === v;
  });
}
