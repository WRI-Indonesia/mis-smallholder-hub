import { FileText, BookOpen, Play, Wrench } from "lucide-react"

export type KnowledgeType = "Artikel" | "Video" | "Dokumentasi Kegiatan" | "Toolkit Training"

export const TYPE_CONFIG: Record<KnowledgeType, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  "Artikel":               { icon: FileText,  color: "text-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  "Dokumentasi Kegiatan":  { icon: BookOpen,  color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  "Video":                 { icon: Play,      color: "text-rose-500",    bg: "bg-rose-500/10",    border: "border-rose-500/20" },
  "Toolkit Training":      { icon: Wrench,    color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
}
