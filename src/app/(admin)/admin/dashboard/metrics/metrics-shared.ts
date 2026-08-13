import type { ReleaseMetric } from "@/types/release-metrics";

/**
 * Konstanta bersama Dashboard Metrik Rilis (#227). Warna mengikuti spec owner
 * §4.3–§4.5 dan LULUS validator palet dataviz (light: surface card putih —
 * kontras <3:1 di-relief dengan label/tabel + arsir; dark: semua ≥3:1;
 * CVD ΔE ≥ 8.4 dengan arsir sebagai encoding kedua). Warna per entitas, tidak
 * pernah per peringkat; pasangan light/dark eksplisit (jangan hardcode satu).
 */
export const SERIES = {
  weekday: { light: "#1baf7a", dark: "#199e70", label: "Senin–Jumat" },
  saturday: { light: "#eda100", dark: "#c98500", label: "Sabtu" },
  sunday: { light: "#e87ba4", dark: "#d55181", label: "Minggu" },
  growth: { light: "#2a78d6", dark: "#3987e5", label: "RVS" }, // dipakai juga utk test (semantik "pertumbuhan")
  roadmap: { light: "#eb6834", dark: "#d95926", label: "Roadmap" },
} as const;

export const seriesColor = (key: keyof typeof SERIES, dark: boolean) =>
  dark ? SERIES[key].dark : SERIES[key].light;

/**
 * Palet STATUS untuk Detail Roadmap (#250) — sengaja terpisah dari `SERIES`:
 * status fase adalah keadaan (selesai/sebagian/belum), bukan identitas seri,
 * jadi warnanya tidak boleh dipinjam dari palet kategorikal Panel 2.
 * Divalidasi dengan validator dataviz pada surface card halaman ini (light
 * #ffffff, dark #26332a): dua slot berwarna LULUS semua cek — lightness,
 * chroma, CVD (ΔE protan 8,6 light / 9,9 dark), normal-vision, kontras ≥ 3:1.
 * Slot "belum" sengaja netral (abu) sehingga gagal cek chroma: ia menandai
 * *ketiadaan* status, bukan kategori setara. Reliefnya: angka hitungan yang
 * selalu tampil di samping bar + legenda berlabel (bukan warna semata).
 */
export const PHASE_STATUS = {
  done: { light: "#12805a", dark: "#25a074", label: "Selesai" },
  partial: { light: "#d9730d", dark: "#c97a12", label: "Sebagian" },
  open: { light: "#8b948f", dark: "#74817a", label: "Belum" },
} as const;

export const phaseStatusColor = (key: keyof typeof PHASE_STATUS, dark: boolean) =>
  dark ? PHASE_STATUS[key].dark : PHASE_STATUS[key].light;

const nfInt = new Intl.NumberFormat("id-ID");
const nf1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Semua angka lewat formatter — tidak ada float mentah di layar (spec §4.1/§8). */
export const fmtInt = (n: number) => nfInt.format(Math.round(n));
export const fmtPct1 = (n: number) => `${nf1.format(n)}%`;
export const fmt1 = (n: number) => nf1.format(n);
/** Poin (mis. 74 dari 85) — maksimal 1 desimal, karena 🟠 menyumbang 0,5. */
export const fmtPoints = (n: number) => (Number.isInteger(n) ? nfInt.format(n) : nf1.format(n));
export const fmt2 = (n: number) => nf2.format(n);
export const fmtDelta = (n: number) => `${n >= 0 ? "+" : "−"}${nfInt.format(Math.abs(Math.round(n)))}`;

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_ID[m - 1]} ${y}`;
};
export const fmtDateShort = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_ID[m - 1]}`;
};

/** Nilai RVS dengan prefiks ≈ untuk baris estimasi (spec §2.3). */
export const fmtRvs = (r: Pick<ReleaseMetric, "rvs" | "isEstimated">) =>
  `${r.isEstimated ? "≈" : ""}${fmtInt(r.rvs)}`;

/** Epoch hari (UTC) dari ISO date — dasar sumbu waktu proporsional. */
export const dayEpoch = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** Tanggal efektif sebuah baris pada sumbu kalender (provisional → hari ini). */
export const effectiveDate = (r: ReleaseMetric, today: string) => r.releasedAt ?? today;

/** Repo GitHub proyek — tautan versi (release tag) & issue di Daftar rilis. */
export const REPO_URL = "https://github.com/WRI-Indonesia/mis-smallholder-hub";
export const releaseUrl = (version: string) => `${REPO_URL}/releases/tag/${version}`;
export const issueUrl = (ref: string) => `${REPO_URL}/issues/${ref.replace("#", "")}`;
