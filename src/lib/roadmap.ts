import type {
  PhaseHorizon,
  PhaseStatus,
  PhaseWeight,
  RemainingPhase,
  RoadmapPhase,
  RoadmapSummary,
  StreamSummary,
} from "@/types/roadmap";

/**
 * Parser & agregasi Detail Roadmap (#250). Sumber tunggal:
 * `docs/project/roadmap.md` (di-bundle webpack `asset/source`, pola #227) —
 * TIDAK ada tabel DB / JSON pendamping, supaya tidak drift dengan dokumen yang
 * memang sudah menjadi source of truth status delivery.
 *
 * Seperti `release-metrics.ts`: tabel rusak / nilai di luar Definisi / kode fase
 * ganda → throw → build & test gagal, bukan salah render di produksi.
 */

/** Pengali bobot pada formula Roadmap % (roadmap.md §Bobot Definition). */
const WEIGHT_POINTS: Record<PhaseWeight, number> = { inti: 2, pendukung: 1 };

/** ✅ = 1 · 🟠 = 0,5 · sisanya 0 (versioning.md §Metrik Nilai Rilis). */
const STATUS_SCORE: Record<PhaseStatus, number> = {
  Done: 1,
  Partial: 0.5,
  "Not Started": 0,
  Planned: 0,
  Blocked: 0,
};

const HORIZONS: PhaseHorizon[] = ["Done", "Now", "Next", "Later", "Blocked"];

/** Buang penanda markdown inline supaya teks layak tampil apa adanya di UI. */
const plain = (s: string) => s.replace(/\*\*/g, "").replace(/`/g, "").trim();

/** Potong satu section markdown: dari heading `marker` sampai heading level sama/lebih tinggi. */
function sliceSection(markdown: string, marker: string, stopAt: string): string {
  const start = markdown.indexOf(marker);
  if (start === -1) throw new Error(`roadmap.md: section '${marker}' tidak ditemukan`);
  const rest = markdown.slice(start + marker.length);
  const end = rest.indexOf(stopAt);
  return end === -1 ? rest : rest.slice(0, end);
}

/** Baris tabel markdown → sel-sel (tanpa baris separator). */
function tableRows(section: string): string[][] {
  return section
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && !/^\|[\s\-:|]+\|$/.test(l))
    .map((l) => l.slice(1, -1).split("|").map((c) => c.trim()));
}

/**
 * Label panjang tiap stream dari `<details>` Stream Definition
 * (kolom: Stream | Arti | Cakupan) — dipakai sebagai judul bar per stream.
 */
export function parseStreamLabels(markdown: string): Record<string, string> {
  const section = sliceSection(markdown, "<summary><strong>Stream Definition</strong>", "</details>");
  const labels: Record<string, string> = {};
  for (const cells of tableRows(section)) {
    if (cells.length < 2) continue;
    const key = cells[0].replace(/`/g, "").trim();
    if (!/^[A-Z]+$/.test(key)) continue; // lewati baris header
    labels[key] = plain(cells[1]);
  }
  if (Object.keys(labels).length === 0) {
    throw new Error("roadmap.md: tabel Stream Definition kosong / format kolom berubah");
  }
  return labels;
}

/**
 * Evidence & next step per fase dari `### Rincian per Phase` — hanya bullet
 * pertama masing-masing; bullet tambahan (catatan audit) sengaja diabaikan.
 */
function parsePhaseDetails(markdown: string): Record<string, { evidence: string | null; nextStep: string | null }> {
  const section = sliceSection(markdown, "### Rincian per Phase", "\n### ");
  const details: Record<string, { evidence: string | null; nextStep: string | null }> = {};
  let current: string | null = null;
  for (const line of section.split("\n")) {
    const summary = line.trim().match(/^<summary><strong>([A-Z]+-\d+)<\/strong>/);
    if (summary) {
      current = summary[1];
      details[current] = { evidence: null, nextStep: null };
      continue;
    }
    if (!current) continue;
    if (line.trim() === "</details>") {
      current = null;
      continue;
    }
    const evidence = line.trim().match(/^-\s+\*\*Evidence:\*\*\s*(.+)$/);
    if (evidence && !details[current].evidence) {
      details[current].evidence = plain(evidence[1]);
      continue;
    }
    const next = line.trim().match(/^-\s+\*\*Next step:\*\*\s*(.+)$/);
    if (next && !details[current].nextStep) details[current].nextStep = plain(next[1]);
  }
  return details;
}

/**
 * Parse tabel §Phase Status (Indeks). Kolom (urutan wajib):
 * Phase | Deskripsi | Status | Horizon | Bobot
 */
export function parseRoadmapPhases(markdown: string): RoadmapPhase[] {
  const section = sliceSection(markdown, "### Phase Status (Indeks)", "\n### ");
  const all = tableRows(section);
  const rows = all.filter((c) => /^[A-Z]+-\d+$/.test(c[0]));

  // Baris yang BERBENTUK data (5 kolom, bukan header) tapi kode fasenya
  // menyimpang — `**MD-12**`, backtick, atau tanda footnote — dulu dilewati
  // diam-diam sehingga penyebut mengecil tanpa jejak. Kontrak berkas ini
  // "format menyimpang membuat build & test gagal", jadi ia harus melempar.
  const menyimpang = all.filter(
    (c) => c.length === 5 && c[0] !== "Phase" && !/^[A-Z]+-\d+$/.test(c[0])
  );
  if (menyimpang.length > 0) {
    throw new Error(
      `roadmap.md: kode phase tidak dikenali — ${menyimpang.map((c) => `"${c[0]}"`).join(", ")}; tulis apa adanya tanpa penekanan/backtick`
    );
  }

  if (rows.length === 0) {
    throw new Error("roadmap.md: tabel Phase Status tidak ditemukan / format kolom berubah");
  }

  const details = parsePhaseDetails(markdown);
  const seen = new Set<string>();

  return rows.map((cells): RoadmapPhase => {
    const key = cells[0];
    // Jumlah kolom salah harus GAGAL KERAS, bukan kolom hilang diam-diam.
    if (cells.length !== 5) {
      throw new Error(
        `roadmap.md ${key}: baris phase harus 5 kolom (Phase | Deskripsi | Status | Horizon | Bobot), dapat ${cells.length}`
      );
    }
    if (seen.has(key)) throw new Error(`roadmap.md: kode phase ganda — ${key}`);
    seen.add(key);

    const [, description, statusCell, horizonCell, weightCell] = cells;

    const statusMatch = statusCell.match(/^(\S+)\s+(.+)$/);
    const status = (statusMatch ? statusMatch[2] : statusCell).trim() as PhaseStatus;
    if (!(status in STATUS_SCORE)) {
      throw new Error(`roadmap.md ${key}: status "${statusCell}" di luar Status Definition`);
    }

    const horizon = horizonCell as PhaseHorizon;
    if (!HORIZONS.includes(horizon)) {
      throw new Error(`roadmap.md ${key}: horizon "${horizonCell}" di luar Horizon Definition`);
    }

    const weight = weightCell as PhaseWeight;
    if (!(weight in WEIGHT_POINTS)) {
      throw new Error(`roadmap.md ${key}: bobot "${weightCell}" harus "inti" atau "pendukung"`);
    }

    const score = STATUS_SCORE[status];
    const maxPoints = WEIGHT_POINTS[weight];

    return {
      key,
      stream: key.split("-")[0],
      description: plain(description),
      status,
      statusIcon: statusMatch ? statusMatch[1] : "",
      horizon,
      weight,
      score,
      maxPoints,
      points: score * maxPoints,
      evidence: details[key]?.evidence ?? null,
      nextStep: details[key]?.nextStep ?? null,
    };
  });
}

/**
 * Agregasi untuk section Detail Roadmap: rincian hitung %, ringkasan per stream,
 * dan sisa fase beserta tambahan pp bila diselesaikan.
 */
export function summarizeRoadmap(
  phases: RoadmapPhase[],
  streamLabels: Record<string, string> = {}
): RoadmapSummary {
  const core = phases.filter((p) => p.weight === "inti");
  const support = phases.filter((p) => p.weight === "pendukung");
  const sum = (list: RoadmapPhase[], pick: (p: RoadmapPhase) => number) =>
    list.reduce((acc, p) => acc + pick(p), 0);

  const coreEarned = sum(core, (p) => p.points);
  const coreMax = sum(core, (p) => p.maxPoints);
  const supportEarned = sum(support, (p) => p.points);
  const supportMax = sum(support, (p) => p.maxPoints);
  const earned = coreEarned + supportEarned;
  const max = coreMax + supportMax;
  if (max === 0) throw new Error("roadmap.md: total bobot 0 — tabel Phase Status kosong?");

  // Urutan stream mengikuti kemunculan pertama di tabel (= urutan roadmap).
  const streams: StreamSummary[] = [];
  const byStream = new Map<string, StreamSummary>();
  for (const p of phases) {
    let s = byStream.get(p.stream);
    if (!s) {
      s = {
        stream: p.stream,
        label: streamLabels[p.stream] ?? p.stream,
        done: 0,
        partial: 0,
        open: 0,
        total: 0,
        points: 0,
        maxPoints: 0,
      };
      byStream.set(p.stream, s);
      streams.push(s);
    }
    if (p.status === "Done") s.done++;
    else if (p.status === "Partial") s.partial++;
    else s.open++;
    s.total++;
    s.points += p.points;
    s.maxPoints += p.maxPoints;
  }

  const remaining: RemainingPhase[] = phases
    .filter((p) => p.status !== "Done")
    .map((phase) => ({ phase, gainPp: ((phase.maxPoints - phase.points) / max) * 100 }))
    .sort((a, b) => b.gainPp - a.gainPp || a.phase.key.localeCompare(b.phase.key));

  return {
    phases,
    total: phases.length,
    coreCount: core.length,
    supportCount: support.length,
    coreEarned,
    coreMax,
    supportEarned,
    supportMax,
    earned,
    max,
    pct: (earned / max) * 100,
    streams,
    remaining,
  };
}
