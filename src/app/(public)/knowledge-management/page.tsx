import KnowledgeDirectoryClient from "@/components/knowledge/KnowledgeDirectoryClient"
import { mockModules } from "@/lib/static-data/public/knowledge-management"

export const metadata = {
  title: "Knowledge Management | Smallholder HUB",
  description: "Pusat perpustakaan digital, modul pelatihan, dan panduan praktik terbaik untuk petani Smallholder HUB.",
}

export default function KnowledgeManagementPage() {
  return <KnowledgeDirectoryClient initialModules={mockModules} />
}
