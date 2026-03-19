export type KnowledgeModule = {
  id: string;
  category: string;
  title: string;
  type: "Artikel" | "Dokumentasi Kegiatan" | "Video";
  thumbnail: string;
  description: string;
  videoUrl?: string;
  content?: string;
};

export const mockModules: KnowledgeModule[] = [
  { 
    id: "km-001", category: "SOP Budidaya", title: "Panduan Pemupukan Berimbang", type: "Artikel", 
    thumbnail: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&q=80&w=800",
    description: "Panduan teknis mengenai dosis dan waktu pemupukan yang paling tepat untuk pertumbuhan optimal kelapa sawit di tanah gambut. Mencegah pemborosan pupuk dan menjaga kelestarian hara.",
    content: "Pemupukan berimbang adalah kunci utama dalam budidaya kelapa sawit. Dosis pupuk harus disesuaikan dengan hasil analisis daun dan tanah yang dilakukan setiap tahun. Pada tahap piringan, aplikasikan Nitrogen dan Kalium secara terpisah dengan jarak 3 bulan. ... \n\n (Konten artikel lebih panjang ...)",
  },
  { 
    id: "km-002", category: "Sertifikasi", title: "Checklist Kelayakan RSPO", type: "Dokumentasi Kegiatan", 
    thumbnail: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=800",
    description: "Kumpulan dokumen persyaratan yang diperlukan kelompok tani untuk mengajukan sertifikasi Roundtable on Sustainable Palm Oil (RSPO) tahun ini.",
    content: "Berikut merupakan dokumentasi kegiatan sosialisasi RSPO yang diadakan di Distrik Pelalawan. Proses mencakup pemeriksaan HGU, pengelolaan sempadan sungai, serta bukti nol-bakar. Anggota grup dapat mengunduh formulir checklist di bagian akhir halaman.",
  },
  { 
    id: "km-003", category: "Tutorial", title: "Video Penggunaan Traktor Mini", type: "Video", 
    thumbnail: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=800",
    description: "Tutorial langkah demi langkah mengoperasikan traktor mini untuk membajak lahan dengan aman dan efisien.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  { 
    id: "km-004", category: "Hama & Penyakit", title: "Katalog Penyakit Tanaman Padi", type: "Artikel", 
    thumbnail: "https://images.unsplash.com/photo-1595844781498-842b03fb4b35?auto=format&fit=crop&q=80&w=800",
    description: "Identifikasi jenis-jenis penyakit yang paling umum menyerang tanaman padi unggul, beserta rekomendasi penanganan organiknya.",
    content: "Penyakit Hawar Daun Bakteri (HDB) yang disebabkan oleh Xanthomonas campestris pv. oryzae merupakan ancaman utama. Pengendaliannya bisa menggunakan varietas tahan hama, jarak tanam legowo, dan menghindari genangan air yang terlalu menetap.",
  },
  { 
    id: "km-005", category: "SOP Budidaya", title: "Penerapan GAP Pengendalian Gulma", type: "Artikel", 
    thumbnail: "https://images.unsplash.com/photo-1592982537447-6f2c5c5ebddb?auto=format&fit=crop&q=80&w=800",
    description: "Prinsip-prinsip Good Agricultural Practices (GAP) untuk rotasi perawaran gulma di ring piringan agar unsur hara tidak tersedot dan terhindar dari jamur ganoderma.",
    content: "Metode melingkar (circle weeding) selebar 1.5 - 2 meter dari bonggol harus bersih total dari pakis maupun ilalang liar. Penyemprotan herbisida sistemik hanya disarankan pada musim curah hujan rendah agar obat tidak memuai.",
  },
];
