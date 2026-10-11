import { redirectToFirstAccessibleChild } from "@/lib/rbac";

/** Indeks induk `report`: ke anak pertama yang boleh diakses pengguna ini (TD-051). */
export default async function ReportIndexPage() {
  await redirectToFirstAccessibleChild("report");
}
