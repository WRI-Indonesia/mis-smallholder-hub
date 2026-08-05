/**
 * Tipe Dashboard Metrik Rilis (#227) — model `Release` mengikuti spec owner
 * §2.1, diparse dari tabel `docs/project/metrics.md` saat build
 * (`src/lib/release-metrics.ts`). Field turunan (§2.2) dihitung, tidak disimpan.
 */

export type ReleaseMetric = {
  /** SemVer, mis. "v0.21.0"; "(siklus berjalan)" → "berjalan". */
  version: string;
  /** ISO date (YYYY-MM-DD); null untuk siklus berjalan. */
  releasedAt: string | null;
  /** 0–100, satu desimal. */
  roadmapPct: number;
  /** Skor kumulatif, anchor v0.9.0 = 1000. */
  rvs: number;
  testCount: number | null;
  bugOpen: number | null;
  techDebt: number | null;
  bantuanDone: number | null;
  bantuanTotal: number | null;
  payloadMb: number | null;
  /** Rekonstruksi retrospektif (pra-v0.21.0) — digambar putus-putus/berongga (§2.3). */
  isEstimated: boolean;
  /** Baris "(siklus berjalan)" — angka bisa berubah sampai dirilis. */
  isProvisional: boolean;
  notes: string;
  /** Mis. ["#211", "#212"] — diekstrak dari kolom catatan. */
  issueRefs: string[];
  /** Turunan: rvs(n) − rvs(n−1); null untuk baris anchor. */
  delta: number | null;
};

/** Jenis hari untuk split perolehan RVS (§4.3). */
export type DayKind = "weekday" | "saturday" | "sunday";

export type PeriodGranularity = "day" | "week" | "month" | "year";

/** Satu batang Panel 2: perolehan RVS per periode, dipecah per jenis hari. */
export type PeriodBucket = {
  /** Kunci periode (mis. "2026-07-15", "2026-W29", "2026-07", "2026"). */
  key: string;
  /** Label tampilan (mis. "13–19 Jul"). */
  label: string;
  weekday: number;
  saturday: number;
  sunday: number;
  total: number;
  /** Jumlah rilis pada periode ini. */
  releases: number;
  /** Ada kontribusi baris estimasi (±) di periode ini. */
  hasEstimated: boolean;
};
