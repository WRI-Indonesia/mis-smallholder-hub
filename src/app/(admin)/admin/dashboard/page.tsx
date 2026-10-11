import { redirectToFirstAccessibleChild } from "@/lib/rbac";

/** Indeks induk `dashboard`: ke anak pertama yang boleh diakses pengguna ini (TD-051). */
export default async function DashboardIndexPage() {
  await redirectToFirstAccessibleChild("dashboard");
}
