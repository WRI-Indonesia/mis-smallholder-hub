import { redirect } from "next/navigation";

/** Induk menu Platform Developer (tooling internal tim pengembang) — halaman pertama: Metrik Rilis. */
export default function PlatformDeveloperIndexPage() {
  redirect("/admin/dashboard/metrics");
}
