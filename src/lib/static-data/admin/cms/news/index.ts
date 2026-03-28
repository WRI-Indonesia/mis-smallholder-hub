export type NewsArticle = {
  id: string;
  title: string;
  status: "Published" | "Draft";
  date: string;
  author: string;
};

import Papa from "papaparse";
import csvRaw from "./data.csv";

export const mockArticles: NewsArticle[] = Papa.parse(csvRaw, { header: true, skipEmptyLines: true }).data as NewsArticle[];
