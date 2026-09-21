import type { ComponentType } from "react";
import { Building2, Users, Map, GraduationCap, TrendingUp } from "lucide-react";
import { AVAILABILITY_DOMAIN_KEYS, AVAILABILITY_DOMAIN_LABELS, domainScoreOf, scoreBand } from "@/lib/data-availability-aggregation";
import { BAND_LEGEND } from "@/lib/score-band-styles";
import type { AvailabilityDomainKey, AvailabilityGroupEntry, BmpFarmerGroupCategory } from "@/types/dashboard";

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

/** Label kategori Lembaga (filter header & modal radar). */
export const CATEGORY_LABELS: Record<BmpFarmerGroupCategory, string> = {
  EX_PLASMA: "Ex-Plasma",
  SWADAYA: "Swadaya",
};

/** Label sumbu/kolom pendek: "Profil Lembaga" → "Profil". */
export const shortDomainLabel = (key: AvailabilityDomainKey) => AVAILABILITY_DOMAIN_LABELS[key].replace("Profil Lembaga", "Profil");

/** Lima skor domain sebuah Lembaga sebagai peta — input `RadarChart` bersama. */
export const entryDomainScores = (e: AvailabilityGroupEntry): Record<AvailabilityDomainKey, number> =>
  Object.fromEntries(AVAILABILITY_DOMAIN_KEYS.map((k) => [k, domainScoreOf(e, k)])) as Record<AvailabilityDomainKey, number>;
