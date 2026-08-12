import { exportToPDF, type PDFExportOptions } from "@/lib/pdf";
import { formatNumber } from "@/lib/format";
import type { KTDetails, SnapshotDetail } from "@/types/dashboard";

// PDF Detail Snapshot Dashboard (#248) — data historis dari kolom JSON
// snapshot (bukan query live). Builder opsi dipisah dari save (pola
// build-vs-save #179/TD-019) agar bisa diverifikasi unit test.

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "12 Agu 2026, 10:30" — tanggal snapshot (historis), bukan tanggal unduh. */
function formatSnapshotDateTime(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${day} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}, ${time}`;
}

const formatArea = (n: number) =>
  `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ha`;

/** Jumlah paket pelatihan (dari 4) dengan cakupan > 0 — sama dengan kolom tabel/Excel. */
const coverageCount = (kt: KTDetails) =>
  Object.values(kt.trainingCoverage).filter((c) => c > 0).length;

/** Satu baris KPI sertifikasi — angka sama dengan kartu ringkasan (snapshot pra-#169 → 0). */
const certValue = (counts?: { certified: number; planned: number }) =>
  `${formatNumber(counts?.certified ?? 0)} tersertifikasi, ${formatNumber(counts?.planned ?? 0)} plan`;

/**
 * Opsi `exportToPDF` untuk Detail Snapshot: judul + tanggal snapshot,
 * ringkasan KPI (identik dengan kartu ringkasan), lalu tabel per Lembaga
 * Petani dengan kolom yang sama dengan tabel/Excel halaman detail.
 */
export function buildSnapshotPdfOptions(snapshot: SnapshotDetail): PDFExportOptions {
  const stats = snapshot.data;

  return {
    filename: `snapshot-${snapshot.id}`,
    title: "SNAPSHOT DASHBOARD",
    subtitle: "Smallholder HUB Management Information System",
    metadata: [
      { label: "Tanggal Snapshot", value: formatSnapshotDateTime(snapshot.snapshotDate) },
      { label: "Dibuat Oleh", value: snapshot.createdByName },
      { label: "Filter Distrik", value: snapshot.districtName ?? "Semua Distrik" },
      { label: "Filter Tahun", value: snapshot.joinedYear ? String(snapshot.joinedYear) : "Semua Tahun" },
      { label: "Total Lembaga Petani", value: formatNumber(stats.totalKelompokTani) },
      { label: "Total Kelompok Tani", value: formatNumber(stats.totalKelompokTaniLahan ?? 0) },
      { label: "Sertifikasi RSPO", value: certValue(stats.certStats?.rspo) },
      { label: "Sertifikasi ISPO", value: certValue(stats.certStats?.ispo) },
      { label: "Assurance SAP/MAP", value: certValue(stats.certStats?.sapMap) },
      { label: "Total Petani", value: formatNumber(stats.totalPetani) },
      { label: "Petani Laki-laki", value: formatNumber(stats.totalPetaniLaki ?? 0) },
      { label: "Petani Perempuan", value: formatNumber(stats.totalPetaniPerempuan ?? 0) },
      { label: "Total Persil Lahan", value: formatNumber(stats.totalPersilLahan) },
      { label: "Total Luas Lahan", value: formatArea(stats.totalLuasLahan) },
      { label: "Paket 1 - BMP/NKT/RSPO", value: `${formatNumber(stats.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT)} petani` },
      { label: "Paket 2 - MK", value: `${formatNumber(stats.trainingCounts.PAKET_2_MK)} petani` },
      { label: "Paket 2 - HSE", value: `${formatNumber(stats.trainingCounts.PAKET_2_K3)} petani` },
      { label: "Paket 3 & 4 - GEDSI/BUSDEV", value: `${formatNumber(stats.trainingCounts.PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV)} petani` },
    ],
    columns: [
      { header: "Nama Lembaga Petani", key: "name" },
      { header: "Kelompok Tani", key: "kelompokTaniCount" },
      { header: "Total Petani", key: "totalFarmers" },
      { header: "Total Persil", key: "totalParcels" },
      { header: "Luas Lahan", key: "totalArea" },
      { header: "Cakupan Pelatihan", key: "coverage" },
    ],
    data: stats.kelompokTaniList.map((kt) => ({
      name: kt.name,
      kelompokTaniCount: formatNumber(kt.kelompokTaniCount ?? 0),
      totalFarmers: formatNumber(kt.totalFarmers),
      totalParcels: formatNumber(kt.totalParcels),
      totalArea: formatArea(kt.totalArea),
      coverage: `${coverageCount(kt)}/4 paket`,
    })),
  };
}

/** Unduh PDF Detail Snapshot (client-side). */
export function exportSnapshotPdf(snapshot: SnapshotDetail) {
  exportToPDF(buildSnapshotPdfOptions(snapshot));
}
