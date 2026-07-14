import type {
  KelompokTaniDetailReportResult,
  KtDetailGapoktan,
  KtDetailKelompokTani,
  KtDetailPetani,
} from "@/types/report";

/** Satu baris lahan mentah (sudah ter-scope, 1 Lembaga) untuk roster Detail. */
export interface KtDetailRawParcel {
  /** Farmer.id (db) — untuk distinct petani. */
  farmerId: string;
  /** Farmer.farmerId (kode human-facing). */
  farmerCode: string;
  farmerName: string;
  /** Luas lahan (Ha), null bila tak diketahui. */
  area: number | null;
  /** Gapoktan/KUD (Sub Lv.1). */
  subGroupLv1: string | null;
  /** Kelompok Tani (Sub Lv.2). */
  subGroupLv2: string | null;
}

/** Trim; string kosong/whitespace → null. */
function clean(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

/** Kunci grouping ternormalisasi (case-insensitive); null → "". */
const norm = (s: string | null) => (s ?? "").toLowerCase();

/** Sort helper: null/"" selalu di akhir (￿ = code point tertinggi BMP). */
const cmpNullLast = (a: string | null, b: string | null) =>
  (a ?? "￿").localeCompare(b ?? "￿");

/**
 * Roster Report Kelompok Tani (Detail) untuk **satu Lembaga**: susun hierarki
 * **Gapoktan/KUD → Kelompok Tani → daftar Petani**, dengan jumlah lahan & total
 * luas per petani pada tiap kombinasi. Grouping **ternormalisasi** (trim +
 * case-insensitive) agar typo/spasi tak memecah grup; label yang ditampilkan =
 * varian pertama yang ditemui (trimmed). Baris Gapoktan/KT kosong tetap muncul
 * (nilai `null`). Sumber interim (#146): `LandParcel.subGroupLv*`.
 */
export function buildKelompokTaniDetailReport(
  farmerGroupId: string,
  lembagaTani: string,
  parcels: KtDetailRawParcel[],
): KelompokTaniDetailReportResult {
  interface KtAcc {
    kelompokTani: string | null;
    petani: Map<string, KtDetailPetani>;
    lahan: number;
    luas: number;
  }
  interface GapoktanAcc {
    gapoktan: string | null;
    kt: Map<string, KtAcc>;
    petani: Set<string>;
    lahan: number;
    luas: number;
  }

  const gapoktanMap = new Map<string, GapoktanAcc>();
  const allPetani = new Set<string>();
  let totalLahan = 0;
  let totalLuas = 0;

  for (const p of parcels) {
    const g1 = clean(p.subGroupLv1);
    const g2 = clean(p.subGroupLv2);
    const area = p.area ?? 0;

    let g = gapoktanMap.get(norm(g1));
    if (!g) {
      g = { gapoktan: g1, kt: new Map(), petani: new Set(), lahan: 0, luas: 0 };
      gapoktanMap.set(norm(g1), g);
    }
    g.petani.add(p.farmerId);
    g.lahan += 1;
    g.luas += area;

    let kt = g.kt.get(norm(g2));
    if (!kt) {
      kt = { kelompokTani: g2, petani: new Map(), lahan: 0, luas: 0 };
      g.kt.set(norm(g2), kt);
    }
    kt.lahan += 1;
    kt.luas += area;

    let petani = kt.petani.get(p.farmerId);
    if (!petani) {
      petani = {
        farmerId: p.farmerId,
        farmerCode: p.farmerCode,
        name: p.farmerName,
        totalLahan: 0,
        totalLuas: 0,
      };
      kt.petani.set(p.farmerId, petani);
    }
    petani.totalLahan += 1;
    petani.totalLuas += area;

    allPetani.add(p.farmerId);
    totalLahan += 1;
    totalLuas += area;
  }

  let totalKelompokTani = 0;

  const gapoktanList: KtDetailGapoktan[] = Array.from(gapoktanMap.values())
    .map((g) => {
      const kelompokTaniList: KtDetailKelompokTani[] = Array.from(g.kt.values())
        .map((kt) => {
          if (kt.kelompokTani !== null) totalKelompokTani += 1;
          const petani = Array.from(kt.petani.values()).sort(
            (a, b) => a.name.localeCompare(b.name) || a.farmerCode.localeCompare(b.farmerCode),
          );
          return {
            kelompokTani: kt.kelompokTani,
            totalPetani: petani.length,
            totalLahan: kt.lahan,
            totalLuas: kt.luas,
            petani,
          };
        })
        .sort((a, b) => cmpNullLast(a.kelompokTani, b.kelompokTani));

      const ktNonNull = kelompokTaniList.filter((k) => k.kelompokTani !== null).length;
      return {
        gapoktan: g.gapoktan,
        totalKelompokTani: ktNonNull,
        totalPetani: g.petani.size,
        totalLahan: g.lahan,
        totalLuas: g.luas,
        kelompokTaniList,
      };
    })
    .sort((a, b) => cmpNullLast(a.gapoktan, b.gapoktan));

  const totalGapoktan = gapoktanList.filter((g) => g.gapoktan !== null).length;

  return {
    farmerGroupId,
    lembagaTani,
    summary: {
      totalGapoktan,
      totalKelompokTani,
      totalPetani: allPetani.size,
      totalLahan,
      totalLuas,
    },
    gapoktanList,
  };
}
