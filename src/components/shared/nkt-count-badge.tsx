import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";

/**
 * Badge "n NKT" untuk kolom Lahan NKT di daftar Lembaga Petani & Petani (#338).
 * Satu komponen agar kedua daftar tidak menyimpang, dengan gaya yang sama
 * dengan badge NKT di daftar Lahan (`bg-red-600`, #328). 0 → "—" redup.
 */
export function NktCountBadge({ count }: { count: number }) {
  if (count <= 0) return <span className="text-muted-foreground">—</span>;
  return <Badge className="bg-red-600 hover:bg-red-600 font-sans tabular-nums">{formatNumber(count)} NKT</Badge>;
}
