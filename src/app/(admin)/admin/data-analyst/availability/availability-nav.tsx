import Link from "next/link";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";

/**
 * Sub-nav keluarga menu Ketersediaan Data (#417 A, epic #415): satu komponen
 * untuk Semua Lembaga · Per Lembaga · Produksi — dibuat sekali setelah #416.
 * Hanya item yang boleh dibuka (VIEW, termasuk override per user) yang tampil;
 * item aktif = sub-judul halaman, sehingga H1 cukup "Ketersediaan Data".
 * Entitas berikutnya (Pelatihan, …) cukup menambah satu baris di `ITEMS`.
 */
const ITEMS = [
  { key: "data-analyst-data-availability", label: "Semua Lembaga", href: "/admin/data-analyst/data-availability" },
  { key: "data-analyst-data-completeness", label: "Per Lembaga", href: "/admin/data-analyst/data-completeness" },
  { key: "data-analyst-availability-production", label: "Produksi", href: "/admin/data-analyst/availability/production" },
] as const;

export type AvailabilityNavKey = (typeof ITEMS)[number]["key"];

export async function AvailabilityNav({ active, helpSlot }: { active: AvailabilityNavKey; helpSlot?: React.ReactNode }) {
  const allowed = await Promise.all(ITEMS.map((i) => hasPermission(i.key, "VIEW")));
  const items = ITEMS.filter((_, idx) => allowed[idx] || ITEMS[idx].key === active);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Ketersediaan Data</h1>
        {helpSlot}
      </div>
      <nav aria-label="Ketersediaan Data" className="flex flex-wrap gap-1 border-b">
        {items.map((i) => {
          const current = i.key === active;
          return (
            <Link
              key={i.key}
              href={i.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 py-1.5 text-sm transition-colors",
                current ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
              )}
            >
              {i.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
