import type {
  KelompokTaniReportResult,
  KelompokTaniReportRow,
} from "@/types/report";

/** Satu baris lahan mentah (sudah ter-scope) untuk agregasi Report Kelompok Tani. */
export interface KtRawParcel {
  /** Farmer.id — untuk hitung distinct petani. */
  farmerId: string;
  farmerGroupId: string;
  /** FarmerGroup.name (= Lembaga Tani). */
  lembagaTani: string;
  /** Gapoktan (Sub Lv.1). */
  subGroupLv1: string | null;
  /** Kelompok Tani (Sub Lv.2). */
  subGroupLv2: string | null;
}

/** Trim; string kosong/whitespace → null. */
function clean(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

/**
 * Agregasi Report Kelompok Tani (real-time): kelompokkan lahan per
 * **(Lembaga × Gapoktan × Kelompok Tani)**, hitung **distinct petani** &
 * **jumlah lahan** tiap kombinasi. Grouping **ternormalisasi** (trim +
 * case-insensitive) agar typo/spasi tak memecah baris; label yang ditampilkan =
 * varian pertama yang ditemui (trimmed). Baris dengan Gapoktan/KT kosong tetap
 * muncul (nilai `null`). Sifat interim (#146): sumber = `LandParcel.subGroupLv*`;
 * saat KT jadi tabel (TD-014), sumber pindah ke relasi.
 */
export function buildKelompokTaniReport(
  parcels: KtRawParcel[],
): KelompokTaniReportResult {
  const groups = new Map<
    string,
    {
      farmerGroupId: string;
      lembagaTani: string;
      gapoktan: string | null;
      kelompokTani: string | null;
      petani: Set<string>;
      lahan: number;
    }
  >();

  const allPetani = new Set<string>();
  const distinctLembaga = new Set<string>();
  const distinctGapoktan = new Set<string>();

  for (const p of parcels) {
    const g1 = clean(p.subGroupLv1);
    const g2 = clean(p.subGroupLv2);
    const key = `${p.farmerGroupId}||${(g1 ?? "").toLowerCase()}||${(g2 ?? "").toLowerCase()}`;

    let grp = groups.get(key);
    if (!grp) {
      grp = {
        farmerGroupId: p.farmerGroupId,
        lembagaTani: p.lembagaTani,
        gapoktan: g1,
        kelompokTani: g2,
        petani: new Set(),
        lahan: 0,
      };
      groups.set(key, grp);
    }
    grp.petani.add(p.farmerId);
    grp.lahan += 1;

    allPetani.add(p.farmerId);
    distinctLembaga.add(p.farmerGroupId);
    if (g1) distinctGapoktan.add(`${p.farmerGroupId}||${g1.toLowerCase()}`);
  }

  const rows: KelompokTaniReportRow[] = Array.from(groups.entries()).map(
    ([key, g]) => ({
      key,
      farmerGroupId: g.farmerGroupId,
      lembagaTani: g.lembagaTani,
      gapoktan: g.gapoktan,
      kelompokTani: g.kelompokTani,
      totalPetani: g.petani.size,
      totalLahan: g.lahan,
    }),
  );

  // Urut: Lembaga → Gapoktan → Kelompok Tani (null di akhir).
  rows.sort(
    (a, b) =>
      a.lembagaTani.localeCompare(b.lembagaTani) ||
      (a.gapoktan ?? "￿").localeCompare(b.gapoktan ?? "￿") ||
      (a.kelompokTani ?? "￿").localeCompare(b.kelompokTani ?? "￿"),
  );

  const totalKelompokTani = rows.filter((r) => r.kelompokTani !== null).length;

  return {
    summary: {
      totalKelompokTani,
      totalGapoktan: distinctGapoktan.size,
      totalLembagaTani: distinctLembaga.size,
      totalPetani: allPetani.size,
      totalLahan: parcels.length,
    },
    rows,
  };
}
