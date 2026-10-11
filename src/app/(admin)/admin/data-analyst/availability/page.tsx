import { redirect } from "next/navigation";

/** Induk grup Ketersediaan Data (#416) — pintu masuknya tetap Semua Lembaga (pola Risk Management). */
export default function AvailabilityIndexPage() {
  redirect("/admin/data-analyst/data-availability");
}
