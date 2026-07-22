import type {
  KelompokTaniReportResult,
  KelompokTaniReportRow,
} from "@/types/report";

/** Satu baris lahan mentah (sudah ter-scope) untuk agregasi Report Kelompok Tani. */
export interface KtRawParcel {
  /** Farmer.id — untuk hitung distinct petani. */
  farmerId: string;
  farmerGroupId: string;
  /** FarmerGroup.name (= Lembaga Petani). */
  lembagaTani: string;
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

/**
 * Agregasi Report Kelompok Tani (real-time): kelompokkan lahan per
 * **(Lembaga × Kelompok Tani)**, hitung **distinct petani** & **jumlah lahan**
 * tiap kombinasi. Grouping **ternormalisasi** (trim + case-insensitive) agar
 * typo/spasi tak memecah baris; label yang ditampilkan = varian pertama yang
 * ditemui (trimmed). Baris dengan KT kosong tetap muncul (nilai `null`). Sifat
 * interim (#146): sumber = `LandParcel.subGroupLv2`; saat KT jadi tabel
 * (TD-014), sumber pindah ke relasi. (Level Gapoktan/KUD dihapus #189.)
 */
export function buildKelompokTaniReport(
  parcels: KtRawParcel[],
): KelompokTaniReportResult {
  const groups = new Map<
    string,
    {
      farmerGroupId: string;
      lembagaTani: string;
      kelompokTani: string | null;
      petani: Set<string>;
      lahan: number;
      luas: number;
    }
  >();

  const allPetani = new Set<string>();
  const distinctLembaga = new Set<string>();
  let totalLuas = 0;

  for (const p of parcels) {
    const g2 = clean(p.subGroupLv2);
    const area = p.area ?? 0;
    const key = `${p.farmerGroupId}||${(g2 ?? "").toLowerCase()}`;

    let grp = groups.get(key);
    if (!grp) {
      grp = {
        farmerGroupId: p.farmerGroupId,
        lembagaTani: p.lembagaTani,
        kelompokTani: g2,
        petani: new Set(),
        lahan: 0,
        luas: 0,
      };
      groups.set(key, grp);
    }
    grp.petani.add(p.farmerId);
    grp.lahan += 1;
    grp.luas += area;

    allPetani.add(p.farmerId);
    distinctLembaga.add(p.farmerGroupId);
    totalLuas += area;
  }

  const rows: KelompokTaniReportRow[] = Array.from(groups.entries()).map(
    ([key, g]) => ({
      key,
      farmerGroupId: g.farmerGroupId,
      lembagaTani: g.lembagaTani,
      kelompokTani: g.kelompokTani,
      totalPetani: g.petani.size,
      totalLahan: g.lahan,
      totalLuas: g.luas,
    }),
  );

  // Urut: Lembaga → Kelompok Tani (null di akhir).
  rows.sort(
    (a, b) =>
      a.lembagaTani.localeCompare(b.lembagaTani) ||
      (a.kelompokTani ?? "￿").localeCompare(b.kelompokTani ?? "￿"),
  );

  const totalKelompokTani = rows.filter((r) => r.kelompokTani !== null).length;

  return {
    summary: {
      totalKelompokTani,
      totalLembagaTani: distinctLembaga.size,
      totalPetani: allPetani.size,
      totalLahan: parcels.length,
      totalLuas,
    },
    rows,
  };
}
