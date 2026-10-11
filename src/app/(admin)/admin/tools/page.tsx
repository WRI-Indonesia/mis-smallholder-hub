import { redirectToFirstAccessibleChild } from "@/lib/rbac";

/** Indeks induk `tools`: ke anak pertama yang boleh diakses pengguna ini (TD-051). */
export default async function ToolsIndexPage() {
  await redirectToFirstAccessibleChild("tools");
}
