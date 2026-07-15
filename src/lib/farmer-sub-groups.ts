/** Field sub-kelompok dari satu lahan (LandParcel.subGroupLv1/subGroupLv2). */
export interface SubGroupParcel {
  /** Gapoktan/KUD (Sub Lv.1). */
  subGroupLv1: string | null;
  /** Kelompok Tani (Sub Lv.2). */
  subGroupLv2: string | null;
}

export interface FarmerSubGroups {
  /** Distinct Gapoktan/KUD turunan dari lahan aktif petani. */
  gapoktan: string[];
  /** Distinct Kelompok Tani turunan dari lahan aktif petani. */
  kelompokTani: string[];
}

/**
 * Derivasi Kelompok Tani/Gapoktan seorang petani dari lahan aktifnya (#152).
 * Keanggotaan sub-kelompok bersifat per-lahan (#146) — petani TIDAK punya field
 * KT sendiri; satu petani bisa muncul di beberapa KT/Gapoktan via banyak lahan.
 * Distinct ternormalisasi (trim + case-insensitive, konsisten dgn Report KT
 * #154) agar typo/spasi tak menggandakan; label = varian pertama yang ditemui
 * (trimmed), diurutkan alfabetis. Kosong/whitespace diabaikan.
 */
export function deriveFarmerSubGroups(parcels: SubGroupParcel[]): FarmerSubGroups {
  const collect = (values: (string | null)[]) => {
    const seen = new Map<string, string>();
    for (const v of values) {
      const t = v?.trim();
      if (!t) continue;
      const key = t.toLowerCase();
      if (!seen.has(key)) seen.set(key, t);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, "id"));
  };

  return {
    gapoktan: collect(parcels.map((p) => p.subGroupLv1)),
    kelompokTani: collect(parcels.map((p) => p.subGroupLv2)),
  };
}
