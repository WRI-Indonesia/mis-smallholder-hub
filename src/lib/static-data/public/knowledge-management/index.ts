// Knowledge Management static data — NO JSX/ReactNode, pure TypeScript
export type KnowledgeType = "Artikel" | "Dokumentasi Kegiatan" | "Video" | "Toolkit Training";

export interface KnowledgeModule {
  id: string;
  category: string;
  title: string;
  type: KnowledgeType;
  thumbnail: string;
  description: string;
  content?: string;
  videoUrl?: string;
  // Meta fields
  author: string;
  published_date: string;
  read_time_min: number;
  tags: string;
}

import Papa from "papaparse";
import csvRaw from "./data.csv";

const parsed = Papa.parse(csvRaw, { header: true, skipEmptyLines: true });

export const mockModules: KnowledgeModule[] = (parsed.data as any[]).map((row) => ({
  id: row.id,
  category: row.category,
  title: row.title,
  type: row.type as KnowledgeType,
  thumbnail: row.thumbnail,
  description: row.description,
  content: row.content || undefined,
  videoUrl: row.videoUrl || undefined,
  author: row.author,
  published_date: row.published_date,
  read_time_min: parseInt(row.read_time_min, 10),
  tags: row.tags,
}));
