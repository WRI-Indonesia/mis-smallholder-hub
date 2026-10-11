import { redirectToFirstAccessibleChild } from "@/lib/rbac";

/** Indeks induk `bulk-upload`: ke anak pertama yang boleh diakses pengguna ini (TD-051). */
export default async function BulkUploadIndexPage() {
  await redirectToFirstAccessibleChild("bulk-upload");
}
