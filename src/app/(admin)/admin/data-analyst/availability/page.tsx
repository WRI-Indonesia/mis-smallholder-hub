import { redirectToFirstAccessibleChild } from "@/lib/rbac";

/** Indeks induk `data-analyst-availability`: ke anak pertama yang boleh diakses pengguna ini (TD-051). */
export default async function DataAnalystAvailabilityIndexPage() {
  await redirectToFirstAccessibleChild("data-analyst-availability");
}
