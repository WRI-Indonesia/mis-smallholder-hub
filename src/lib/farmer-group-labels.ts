export const GROUP_TYPE_LABELS: Record<string, string> = {
  ASOSIASI: "Asosiasi",
  KOPERASI: "Koperasi",
};

export function formatGroupType(groupType: string | null) {
  return groupType ? GROUP_TYPE_LABELS[groupType] ?? groupType : "—";
}

// "2020" (tersertifikasi tahun tsb), "Tersertifikasi" (tanpa tahun),
// "Plan 2026" / "Plan" (rencana), "—" (belum ada info).
export function formatRspoCert(g: { rspoCertYear: number | null; rspoCertStatus: string | null }) {
  if (g.rspoCertStatus === "CERTIFIED") return g.rspoCertYear != null ? `${g.rspoCertYear}` : "Tersertifikasi";
  if (g.rspoCertStatus === "PLANNED") return g.rspoCertYear != null ? `Plan ${g.rspoCertYear}` : "Plan";
  return "—";
}
