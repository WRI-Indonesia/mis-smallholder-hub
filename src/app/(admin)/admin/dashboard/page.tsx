import { redirect } from "next/navigation";

export default function DashboardIndexPage() {
  redirect("/admin/dashboard/main");
}
