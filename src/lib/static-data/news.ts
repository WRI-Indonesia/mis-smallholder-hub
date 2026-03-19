export type NewsArticle = {
  id: string;
  title: string;
  status: "Published" | "Draft";
  date: string;
  author: string;
};

export const mockArticles: NewsArticle[] = [
  { id: "news-1", title: "Panen Raya Padi Organik Desa Sukamaju", status: "Published", date: "12 Mar 2026", author: "Admin Cabang" },
  { id: "news-2", title: "Sosialisasi Penggunaan Pupuk Non-Subsidi", status: "Draft", date: "15 Mar 2026", author: "Super Admin" },
  { id: "news-3", title: "Laporan Dampak El Nino 2026", status: "Published", date: "18 Mar 2026", author: "Tim Agronomi" },
  { id: "news-4", title: "Peluncuran Fitur Pemetaan Lahan 2.0", status: "Draft", date: "20 Mar 2026", author: "Sistem Eksternal" },
];
