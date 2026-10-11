import { redirectToFirstAccessibleChild } from "@/lib/rbac";

/** Indeks induk `platform-developer`: ke anak pertama yang boleh diakses pengguna ini (TD-051). */
export default async function PlatformDeveloperIndexPage() {
  await redirectToFirstAccessibleChild("platform-developer");
}
