import type { ComponentType } from "react";
import { Building2, Users, Map, GraduationCap, TrendingUp } from "lucide-react";
import { AVAILABILITY_DOMAIN_KEYS, domainScoreOf } from "@/lib/data-availability-aggregation";
import type { AvailabilityDomainKey, AvailabilityGroupEntry, BmpFarmerGroupCategory } from "@/types/dashboard";

/**
 * Metadata tampilan domain DA-03 — satu sumber untuk kartu domain, matriks,
 * dan "paling tertinggal" (review #352 putaran 3: sebelumnya lima salinan
 * daftar domain & dua peta ikon). Urutan kunci dari lib (`AVAILABILITY_DOMAIN_KEYS`);
 * formatter angka dari `src/lib/format.ts`, label band dari `score-band-styles`,
 * label domain pendek dari lib agregasi (review putaran 4: tanpa salinan lokal).
 */
export const DOMAIN_ICONS: Record<AvailabilityDomainKey, ComponentType<{ className?: string }>> = {
  profil: Building2,
  petani: Users,
  lahan: Map,
  pelatihan: GraduationCap,
  produksi: TrendingUp,
};

/** Label kategori Lembaga (filter header & modal radar). */
export const CATEGORY_LABELS: Record<BmpFarmerGroupCategory, string> = {
  EX_PLASMA: "Ex-Plasma",
  SWADAYA: "Swadaya",
};


/** Lima skor domain sebuah Lembaga sebagai peta — input `RadarChart` bersama. */
export const entryDomainScores = (e: AvailabilityGroupEntry): Record<AvailabilityDomainKey, number> =>
  Object.fromEntries(AVAILABILITY_DOMAIN_KEYS.map((k) => [k, domainScoreOf(e, k)])) as Record<AvailabilityDomainKey, number>;
