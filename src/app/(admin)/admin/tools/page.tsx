import { redirect } from "next/navigation";

export default function ToolsIndexPage() {
  redirect("/admin/tools/snapshot");
}
