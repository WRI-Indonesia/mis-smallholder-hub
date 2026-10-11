import { redirectToFirstAccessibleChild } from "@/lib/rbac";

/** Indeks induk `data-analyst`: ke anak pertama yang boleh diakses pengguna ini (TD-051). */
export default async function DataAnalystIndexPage() {
  await redirectToFirstAccessibleChild("data-analyst");
}
