import { redirectToFirstAccessibleChild } from "@/lib/rbac";

/** Indeks induk `master-data`: ke anak pertama yang boleh diakses pengguna ini (TD-051). */
export default async function MasterDataIndexPage() {
  await redirectToFirstAccessibleChild("master-data");
}
