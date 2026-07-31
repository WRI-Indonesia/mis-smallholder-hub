/**
 * Penekanan token angka di sub-teks kartu KPI dashboard (#191/#198): warna
 * hanya untuk DATA (persen & total — emerald di light, putih di dark);
 * konteks tahun tetap muted tanpa penekanan. Urutan token seragam antar
 * card: %, total, tahun.
 */
const EMPH_STYLES = {
  percent: "font-semibold text-emerald-700 dark:font-medium dark:text-foreground",
  total: "font-semibold text-emerald-700 dark:font-medium dark:text-foreground",
  year: "",
} as const;

export function StatEmph({
  kind,
  children,
}: {
  kind: keyof typeof EMPH_STYLES;
  children: React.ReactNode;
}) {
  if (!EMPH_STYLES[kind]) return <>{children}</>;
  return <span className={EMPH_STYLES[kind]}>{children}</span>;
}
