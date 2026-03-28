// Dashboard summary statistics for admin panel
export type DashboardStat = {
  label: string;
  value: string;
  trend: string;
  variant: "primary" | "destructive";
};

import Papa from "papaparse";
import csvRaw from "./data.csv";

export const dashboardStats: DashboardStat[] = Papa.parse(csvRaw, { header: true, skipEmptyLines: true }).data as DashboardStat[];
