import { redirectToFirstAccessibleChild } from "@/lib/rbac";

/** Indeks induk `settings`: ke anak pertama yang boleh diakses pengguna ini (TD-051). */
export default async function SettingsIndexPage() {
  await redirectToFirstAccessibleChild("settings");
}
