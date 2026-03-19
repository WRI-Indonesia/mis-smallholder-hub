export type FarmerGroup = {
  id: string;
  name: string;
  type: "Koperasi" | "Asosiasi";
  region: "Kampar" | "Siak" | "Pelalawan" | "Rokan Hulu";
  established: number;
  members: number;
  description: string;
  contact: string;
};

export const farmerGroups: FarmerGroup[] = [
  {
    id: "g-001",
    name: "Koperasi Tani Makmur Jaya",
    type: "Koperasi",
    region: "Kampar",
    established: 2015,
    members: 120,
    description: "Koperasi yang berfokus pada budidaya kelapa sawit berkelanjutan dan penyediaan pupuk bersubsidi untuk anggota di wilayah Kampar. Saat ini terus membantu anggotanya mengadopsi prinsip pertanian cerdas iklim.",
    contact: "0812-3456-7890",
  },
  {
    id: "g-002",
    name: "Asosiasi Petani Plasma Siak",
    type: "Asosiasi",
    region: "Siak",
    established: 2018,
    members: 85,
    description: "Wadah perkumpulan petani plasma yang memperjuangkan standar harga panen sawit dan praktik budidaya RSPO. Pengurus aktif mengadakan diskusi penyelesaian hama.",
    contact: "0813-4567-8901",
  },
  {
    id: "g-003",
    name: "KUD Bina Usaha Pelalawan",
    type: "Koperasi",
    region: "Pelalawan",
    established: 2010,
    members: 250,
    description: "Koperasi Unit Desa yang menyediakan layanan simpan pinjam, penjualan hasil kebun kolektif, dan penyuluhan mekanis terpadu.",
    contact: "0821-5678-9012",
  },
  {
    id: "g-004",
    name: "Asosiasi Petani Swadaya Rokan",
    type: "Asosiasi",
    region: "Rokan Hulu",
    established: 2020,
    members: 60,
    description: "Jaringan petani mandiri yang berkomitmen memutus rantai tengkulak dan mendistribusikan hasil panen secara kolektif sesuai best management practices.",
    contact: "0822-6789-0123",
  },
  {
    id: "g-005",
    name: "Koperasi Agro Lestari",
    type: "Koperasi",
    region: "Kampar",
    established: 2019,
    members: 95,
    description: "Berkomitmen pada pengelolaan limbah pertanian, sertifikasi ramah lingkungan dan penerapan metodologi penanaman yang direkomendasikan dinas kehutanan.",
    contact: "0852-7890-1234",
  },
];
