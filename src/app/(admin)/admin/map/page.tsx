import { redirectToFirstAccessibleChild } from "@/lib/rbac";

/** Indeks induk `map`: ke anak pertama yang boleh diakses pengguna ini (TD-051). */
export default async function MapIndexPage() {
  await redirectToFirstAccessibleChild("map");
}
