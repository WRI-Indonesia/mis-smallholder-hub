import type {
  KelompokTaniDetailReportResult,
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
 * **Kelompok Tani → daftar Petani**, dengan jumlah lahan & total luas per petani
 * pada tiap KT. Grouping **ternormalisasi** (trim + case-insensitive) agar
 * typo/spasi tak memecah grup; label yang ditampilkan = varian pertama yang
 * ditemui (trimmed). Baris KT kosong tetap muncul (nilai `null`). Sumber interim
 * (#146): `LandParcel.subGroupLv2`. (Level Gapoktan/KUD dihapus #189.)
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

  const ktMap = new Map<string, KtAcc>();
  const allPetani = new Set<string>();
  let totalLahan = 0;
  let totalLuas = 0;

  for (const p of parcels) {
    const g2 = clean(p.subGroupLv2);
    const area = p.area ?? 0;

    let kt = ktMap.get(norm(g2));
    if (!kt) {
      kt = { kelompokTani: g2, petani: new Map(), lahan: 0, luas: 0 };
      ktMap.set(norm(g2), kt);
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

  const kelompokTaniList: KtDetailKelompokTani[] = Array.from(ktMap.values())
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

  return {
    farmerGroupId,
    lembagaTani,
    summary: {
      totalKelompokTani,
      totalPetani: allPetani.size,
      totalLahan,
      totalLuas,
    },
    kelompokTaniList,
  };
}
