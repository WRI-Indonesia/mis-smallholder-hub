import { ReactNode } from "react"
import { FileText, PlayCircle } from "lucide-react"

export type KnowledgeModule = {
  id: string;
  category: string;
  title: string;
  type: "PDF" | "Dokumen" | "Video";
  icon: ReactNode;
};

export const mockModules: KnowledgeModule[] = [
  { id: "km-001", category: "SOP Budidaya", title: "Panduan Pemupukan Berimbang", type: "PDF", icon: <FileText className="text-blue-500 w-8 h-8" /> },
  { id: "km-002", category: "Sertifikasi", title: "Checklist Kelayakan RSPO", type: "Dokumen", icon: <FileText className="text-green-500 w-8 h-8" /> },
  { id: "km-003", category: "Tutorial", title: "Video Penggunaan Traktor Mini", type: "Video", icon: <PlayCircle className="text-red-500 w-8 h-8" /> },
  { id: "km-004", category: "Hama & Penyakit", title: "Katalog Penyakit Tanaman Padi", type: "PDF", icon: <FileText className="text-blue-500 w-8 h-8" /> },
  { id: "km-005", category: "SOP Budidaya", title: "Panduan GAP Kelapa Sawit", type: "PDF", icon: <FileText className="text-blue-500 w-8 h-8" /> },
];
