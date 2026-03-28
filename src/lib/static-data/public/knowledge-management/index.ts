// Knowledge Management static data — NO JSX/ReactNode, pure TypeScript
export type KnowledgeType = "Artikel" | "Dokumentasi Kegiatan" | "Video" | "Toolkit Training";

export type KnowledgeModule = {
  id: string;
  category: string;
  title: string;
  type: KnowledgeType;
  thumbnail: string;
  description: string;
  videoUrl?: string;
  content?: string;
};

import Papa from "papaparse";
import csvRaw from "./data.csv";

export const mockModules: KnowledgeModule[] = Papa.parse(csvRaw, { header: true, skipEmptyLines: true }).data as KnowledgeModule[];
