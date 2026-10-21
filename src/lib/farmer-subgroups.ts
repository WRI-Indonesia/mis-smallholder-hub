/** Field sub-kelompok dari satu lahan (LandParcel.subGroupLv2 = Kelompok Tani). */
export interface SubGroupParcel {
  /** Kelompok Tani (Sub Lv.2). */
  subGroupLv2: string | null;
}

export interface FarmerSubGroups {
  /** Distinct Kelompok Tani turunan dari lahan aktif petani. */
  kelompokTani: string[];
}

/**
 * Derivasi Kelompok Tani seorang petani dari lahan aktifnya (#152).
 * Keanggotaan sub-kelompok bersifat per-lahan (#146) — petani TIDAK punya field
 * KT sendiri; satu petani bisa muncul di beberapa KT via banyak lahan.
 * Distinct ternormalisasi (trim + case-insensitive, konsisten dgn Report KT
 * #154) agar typo/spasi tak menggandakan; label = varian pertama yang ditemui
 * (trimmed), diurutkan alfabetis. Kosong/whitespace diabaikan.
 * (Level Gapoktan/KUD dihapus #189.)
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
    kelompokTani: collect(parcels.map((p) => p.subGroupLv2)),
  };
}
