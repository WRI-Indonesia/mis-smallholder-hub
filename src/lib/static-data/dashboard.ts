// Dashboard summary statistics for admin panel
export type DashboardStat = {
  label: string;
  value: string;
  trend: string;
  variant: "primary" | "destructive";
};

export const dashboardStats: DashboardStat[] = [
  { label: "Total Petani", value: "1,248", trend: "+12% dari bulan lalu", variant: "primary" },
  { label: "Total Luas Lahan", value: "4,530 Ha", trend: "+5 Ha terdaftar minggu ini", variant: "primary" },
  { label: "Sertifikasi RSPO", value: "84%", trend: "Petani telah tersertifikasi", variant: "primary" },
  { label: "Laporan Insiden (HSE)", value: "3", trend: "Menunggu tindak lanjut", variant: "destructive" },
];
