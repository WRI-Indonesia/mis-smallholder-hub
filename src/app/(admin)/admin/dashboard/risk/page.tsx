import { redirectToFirstAccessibleChild } from "@/lib/rbac";

/** Indeks induk `dashboard-risk`: ke anak pertama yang boleh diakses pengguna ini (TD-051). */
export default async function DashboardRiskIndexPage() {
  await redirectToFirstAccessibleChild("dashboard-risk");
}
