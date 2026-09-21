import type { ComponentType } from "react";
import { Building2, Users, Map, GraduationCap, TrendingUp } from "lucide-react";
import { scoreBand } from "@/lib/data-availability-aggregation";
import { BAND_LEGEND } from "@/lib/score-band-styles";
import type { AvailabilityDomainKey } from "@/types/dashboard";

/**
 * Metadata tampilan domain DA-03 — satu sumber untuk kartu domain, matriks,
 * dan "paling tertinggal" (review #352 putaran 3: sebelumnya lima salinan
 * daftar domain & dua peta ikon). Urutan kunci dari lib (`AVAILABILITY_DOMAIN_KEYS`).
 */
export const DOMAIN_ICONS: Record<AvailabilityDomainKey, ComponentType<{ className?: string }>> = {
  profil: Building2,
  petani: Users,
  lahan: Map,
  pelatihan: GraduationCap,
  produksi: TrendingUp,
};

export const formatScore = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);

export const bandLabel = (score: number) => BAND_LEGEND.find((s) => s.band === scoreBand(score))?.label ?? "";
