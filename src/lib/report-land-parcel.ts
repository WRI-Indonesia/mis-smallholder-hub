import type {
  LandParcelReportResult,
  LandParcelReportRow,
} from "@/types/report";

/** Satu baris lahan mentah (sudah ter-scope) untuk Report Lahan. */
export interface LpRawParcel {
  /** LandParcel.id (DB). */
  id: string;
  /** LandParcel.parcelId (= ID Lahan). */
  parcelCode: string;
  /** Farmer.id — untuk hitung distinct petani. */
  farmerId: string;
  /** Farmer.farmerId (= ID Petani). */
  farmerCode: string;
  /** Farmer.name. */
  farmerName: string;
  farmerGroupId: string;
  /** FarmerGroup.name (= Lembaga Petani). */
  lembagaTani: string;
  /** Gapoktan/KUD (Sub Lv.1). */
  subGroupLv1: string | null;
  /** Kelompok Tani (Sub Lv.2). */
  subGroupLv2: string | null;
  /** Blok kebun. */
  blok: string | null;
  /** Luas lahan (Ha), null bila tak diketahui. */
  area: number | null;
}

/** Trim; string kosong/whitespace → null. */
function clean(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

/**
 * Report Lahan (real-time, #177): roster datar **1 baris = 1 lahan aktif**
 * dengan Lembaga/Petani/ID Petani/ID Lahan/KT. KT & Gapoktan = atribut
 * per-lahan (`LandParcel.subGroupLv*`, keputusan #146/#152 — petani tidak
 * punya field KT sendiri); nilai dinormalisasi trim (kosong → null) dan
 * distinct KT dihitung ternormalisasi case-insensitive per Lembaga (pola #154).
 * Urutan: Lembaga → KT (null di akhir) → Nama Petani → ID Lahan.
 * Sifat interim (TD-014): saat KT jadi tabel, sumber pindah ke relasi.
 */
export function buildLandParcelReport(
  parcels: LpRawParcel[],
): LandParcelReportResult {
  const distinctPetani = new Set<string>();
  const distinctLembaga = new Set<string>();
  const distinctKt = new Set<string>();
  let totalLuas = 0;

  const rows: LandParcelReportRow[] = parcels.map((p) => {
    const g1 = clean(p.subGroupLv1);
    const g2 = clean(p.subGroupLv2);

    distinctPetani.add(p.farmerId);
    distinctLembaga.add(p.farmerGroupId);
    if (g2) distinctKt.add(`${p.farmerGroupId}||${g2.toLowerCase()}`);
    totalLuas += p.area ?? 0;

    return {
      id: p.id,
      farmerGroupId: p.farmerGroupId,
      lembagaTani: p.lembagaTani,
      namaPetani: p.farmerName,
      idPetani: p.farmerCode,
      idLahan: p.parcelCode,
      kelompokTani: g2,
      gapoktan: g1,
      blok: clean(p.blok),
      luas: p.area,
    };
  });

  rows.sort(
    (a, b) =>
      a.lembagaTani.localeCompare(b.lembagaTani) ||
      (a.kelompokTani ?? "￿").localeCompare(b.kelompokTani ?? "￿") ||
      a.namaPetani.localeCompare(b.namaPetani) ||
      a.idLahan.localeCompare(b.idLahan),
  );

  return {
    summary: {
      totalLahan: rows.length,
      totalPetani: distinctPetani.size,
      totalKelompokTani: distinctKt.size,
      totalLembagaTani: distinctLembaga.size,
      totalLuas,
    },
    rows,
  };
}
