import type {
  TrainingActivityReportRow,
  TrainingFarmerReportRow,
  TrainingReportResult,
} from "@/types/report";

/** Satu kegiatan pelatihan mentah (aktif, paket ≠ OTHER, peserta aktif saja) untuk Report Pelatihan. */
export interface TrainingRawActivity {
  id: string;
  trainingDate: Date;
  location: string | null;
  package: { code: string; name: string };
  participants: { farmerId: string; preTestScore: number | null; postTestScore: number | null }[];
}

/** Satu petani aktif Lembaga — penyebut cakupan paket. */
export interface TrainingRawFarmer {
  id: string;
  farmerId: string;
  name: string;
  gender: TrainingFarmerReportRow["gender"];
}

/** Kode paket yang punya kolom tanggal di Tab Petani & angka cakupan di ringkasan. */
const PAKET_1 = "PAKET_1_BMP_PC_RSPO_NKT";
const PAKET_2_MK = "PAKET_2_MK";
const PAKET_2_K3 = "PAKET_2_K3";
const PAKET_3_4 = "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV";

/** Persentase terhadap jumlah petani, 2 desimal; tanpa petani → 0. */
function pct(count: number, totalPetani: number): number {
  return totalPetani > 0 ? parseFloat(((count / totalPetani) * 100).toFixed(2)) : 0;
}

/**
 * Agregasi Report Pelatihan per Lembaga (dipindah dari `getTrainingReport`,
 * audit #440 F2 — agar bisa diuji tanpa DB):
 *
 * - **Tanggal paket per petani** = tanggal kegiatan TERAWAL paket itu yang ia ikuti.
 * - **Tab Kegiatan**: satu baris per kegiatan; peserta yang bukan petani aktif
 *   Lembaga (petani nonaktif/pindah) tetap tampil dengan kode & nama "—".
 * - **Ringkasan**: `totalPeserta` = jumlah kehadiran, `totalPesertaUnik` =
 *   petani berbeda — keduanya MENGHITUNG peserta non-aktif tadi; cakupan paket
 *   (`totalUnikPaket*`/`pctPaket*`) hanya menghitung petani aktif Lembaga.
 */
export function buildTrainingReport(
  activities: TrainingRawActivity[],
  farmers: TrainingRawFarmer[],
): TrainingReportResult {
  // farmerId -> Map<packageCode, ISO tanggal terawal>
  const farmerPackageDateMap = new Map<string, Map<string, string>>();
  const uniqueParticipants = new Set<string>();
  let totalPeserta = 0;
  for (const act of activities) {
    const date = act.trainingDate.toISOString();
    totalPeserta += act.participants.length;
    for (const p of act.participants) {
      uniqueParticipants.add(p.farmerId);
      let pMap = farmerPackageDateMap.get(p.farmerId);
      if (!pMap) {
        pMap = new Map();
        farmerPackageDateMap.set(p.farmerId, pMap);
      }
      // ISO UTC sebanding secara leksikografis — kegiatan terawal menang apa pun urutan masukan.
      const prev = pMap.get(act.package.code);
      if (prev === undefined || date < prev) pMap.set(act.package.code, date);
    }
  }

  const farmerMap = new Map(farmers.map((f) => [f.id, f]));

  const activityRows: TrainingActivityReportRow[] = activities.map((act) => ({
    id: act.id,
    packageName: act.package.name,
    packageCode: act.package.code,
    trainingDate: act.trainingDate.toISOString(),
    location: act.location,
    totalParticipants: act.participants.length,
    participants: act.participants.map((p) => {
      const f = farmerMap.get(p.farmerId);
      return {
        farmerId: p.farmerId,
        farmerIdCode: f?.farmerId ?? "—",
        name: f?.name ?? "—",
        preTestScore: p.preTestScore,
        postTestScore: p.postTestScore,
      };
    }),
  }));

  let totalUnikPaket1 = 0;
  let totalUnikPaket2MK = 0;
  let totalUnikPaket2K3 = 0;
  let totalUnikPaket34 = 0;

  const farmerRows: TrainingFarmerReportRow[] = farmers.map((f) => {
    const dates = farmerPackageDateMap.get(f.id);
    const paket1Date = dates?.get(PAKET_1) ?? null;
    const paket2MKDate = dates?.get(PAKET_2_MK) ?? null;
    const paket2K3Date = dates?.get(PAKET_2_K3) ?? null;
    const paket34Date = dates?.get(PAKET_3_4) ?? null;
    if (paket1Date) totalUnikPaket1++;
    if (paket2MKDate) totalUnikPaket2MK++;
    if (paket2K3Date) totalUnikPaket2K3++;
    if (paket34Date) totalUnikPaket34++;
    return { id: f.id, farmerId: f.farmerId, name: f.name, gender: f.gender, paket1Date, paket2MKDate, paket2K3Date, paket34Date };
  });

  const totalPetani = farmers.length;

  return {
    summary: {
      totalPetani,
      totalKegiatan: activities.length,
      totalPeserta,
      totalPesertaUnik: uniqueParticipants.size,
      totalUnikPaket1,
      pctPaket1: pct(totalUnikPaket1, totalPetani),
      totalUnikPaket2MK,
      pctPaket2MK: pct(totalUnikPaket2MK, totalPetani),
      totalUnikPaket2K3,
      pctPaket2K3: pct(totalUnikPaket2K3, totalPetani),
      totalUnikPaket34,
      pctPaket34: pct(totalUnikPaket34, totalPetani),
    },
    activities: activityRows,
    farmers: farmerRows,
  };
}
