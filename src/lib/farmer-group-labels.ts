export const GROUP_TYPE_LABELS: Record<string, string> = {
  ASOSIASI: "Asosiasi",
  KOPERASI: "Koperasi",
};

export function formatGroupType(groupType: string | null) {
  return groupType ? GROUP_TYPE_LABELS[groupType] ?? groupType : "—";
}

// Formatter status+tahun bersama untuk semua skema sertifikasi/assurance
// (RSPO, ISPO, SAP/MAP): "2020" (tersertifikasi tahun tsb), "Tersertifikasi"
// (tanpa tahun), "Plan 2026" / "Plan" (rencana), "—" (belum ada info).
export function formatCertStatus(year: number | null, status: string | null) {
  if (status === "CERTIFIED") return year != null ? `${year}` : "Tersertifikasi";
  if (status === "PLANNED") return year != null ? `Plan ${year}` : "Plan";
  return "—";
}

export function formatRspoCert(g: { rspoCertYear: number | null; rspoCertStatus: string | null }) {
  return formatCertStatus(g.rspoCertYear, g.rspoCertStatus);
}

export function formatIspoCert(g: { ispoCertYear: number | null; ispoCertStatus: string | null }) {
  return formatCertStatus(g.ispoCertYear, g.ispoCertStatus);
}

export function formatSapMapAssurance(g: {
  sapMapAssuranceYear: number | null;
  sapMapAssuranceStatus: string | null;
}) {
  return formatCertStatus(g.sapMapAssuranceYear, g.sapMapAssuranceStatus);
}
