/**
 * Tipe Detail Roadmap (#250) — hasil parse tabel `### Phase Status (Indeks)`
 * di `docs/project/roadmap.md` (source of truth status delivery).
 * Semua angka turunan (skor, poin, persen) dihitung, tidak disimpan.
 */

/** Status apa adanya dari tabel; ikon dipisah supaya bisa dirender konsisten. */
export type PhaseStatus = "Done" | "Partial" | "Not Started" | "Planned" | "Blocked";

export type PhaseHorizon = "Done" | "Now" | "Next" | "Later" | "Blocked";

/** Bobot formula Roadmap %: inti ×2, pendukung ×1 (roadmap.md §Bobot Definition). */
export type PhaseWeight = "inti" | "pendukung";

export type RoadmapPhase = {
  /** Kode fase, mis. "BULK-02". */
  key: string;
  /** Prefix stream, mis. "BULK". */
  stream: string;
  description: string;
  status: PhaseStatus;
  /** Emoji status dari tabel (✅ / 🟠 / 🔲 / 🔴) — dipakai apa adanya di UI. */
  statusIcon: string;
  horizon: PhaseHorizon;
  weight: PhaseWeight;
  /** ✅ = 1 · 🟠 = 0,5 · sisanya 0. */
  score: number;
  /** Pengali bobot: inti 2, pendukung 1. */
  maxPoints: number;
  /** `score × maxPoints` — kontribusi fase ini ke Roadmap %. */
  points: number;
  /** Dari blok `<details>` §Rincian per Phase; null bila tidak ada. */
  evidence: string | null;
  nextStep: string | null;
};

export type StreamSummary = {
  stream: string;
  /** Label panjang dari tabel Stream Definition, mis. "Master Data". */
  label: string;
  done: number;
  partial: number;
  /** Belum mulai + planned + blocked. */
  open: number;
  total: number;
  points: number;
  maxPoints: number;
};

/** Fase non-Done + berapa persen-poin yang didapat bila ia selesai penuh. */
export type RemainingPhase = {
  phase: RoadmapPhase;
  /** Tambahan Roadmap % (pp) bila fase ini menjadi ✅ Done. */
  gainPp: number;
};

export type RoadmapSummary = {
  phases: RoadmapPhase[];
  total: number;
  coreCount: number;
  supportCount: number;
  coreEarned: number;
  coreMax: number;
  supportEarned: number;
  supportMax: number;
  /** Total poin diperoleh & maksimum — pembilang/penyebut Roadmap %. */
  earned: number;
  max: number;
  /** 0–100. */
  pct: number;
  streams: StreamSummary[];
  /** Non-Done, terurut gainPp menurun (paling menggerakkan jarum di atas). */
  remaining: RemainingPhase[];
};
