// Tipe untuk sub-menu Data Analyst → Komparasi Data Acuan (#243).

/** Kunci metrik komparasi — sama dengan kolom ReferenceBenchmark. */
export type BenchmarkMetricKey =
  | "farmerCount"
  | "parcelCount"
  | "areaHa"
  | "trainingP1"
  | "trainingP2Mk"
  | "trainingP2K3"
  | "trainingP34"
  | "productionFarmerCount";

/** Nilai acuan manual per metrik (null = belum diisi). */
export type BenchmarkReferenceValues = Record<BenchmarkMetricKey, number | null>;

/** Agregat MIS live per metrik. */
export type BenchmarkMisValues = Record<BenchmarkMetricKey, number>;

export interface BenchmarkComparisonRow {
  farmerGroupId: string;
  code: string | null;
  abrv: string | null;
  name: string;
  districtId: string;
  districtName: string;
  /** null = lembaga belum punya baris acuan. */
  reference: BenchmarkReferenceValues | null;
  notes: string | null;
  mis: BenchmarkMisValues;
  /** Selisih = acuan − MIS; null bila acuan metrik tsb belum diisi. */
  diff: Record<BenchmarkMetricKey, number | null>;
  /** Label metrik yang masih selisih ≠ 0 (mis. "Luas Lahan (34.32)"). */
  diffSummary: string[];
}

export interface BenchmarkDistrictSection {
  districtId: string;
  districtName: string;
  rows: BenchmarkComparisonRow[];
  /** Total per metrik: acuan (hanya yang terisi) dan MIS. */
  totals: { reference: BenchmarkMisValues; mis: BenchmarkMisValues };
}

export interface BenchmarkComparisonView {
  sections: BenchmarkDistrictSection[];
  /** Jumlah lembaga yang masih punya selisih ≠ 0 pada minimal satu metrik. */
  groupsWithDiff: number;
  totalGroups: number;
}
