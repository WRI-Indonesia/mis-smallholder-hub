import metricsMd from "../../docs/project/metrics.md";
import roadmapMd from "../../docs/project/roadmap.md";
import techDebtMd from "../../docs/project/tech-debt.md";
import { parseReleaseMetrics } from "./release-metrics";
import { parseRoadmapPhases, parseStreamLabels, summarizeRoadmap } from "./roadmap";
import { parseActiveTechDebt } from "./tech-debt";

/**
 * Data Metrik Rilis (#227) — `docs/project/metrics.md` di-bundle webpack
 * (`asset/source`) dan diparse SEKALI saat modul dimuat. Satu sumber kebenaran;
 * format rusak akan melempar saat build/boot, bukan salah render diam-diam.
 *
 * Catatan: jangan import file ini dari unit test (vitest tidak memuat `.md`);
 * test memakai `fs.readFileSync` + parser murninya langsung.
 */
export const releaseMetrics = parseReleaseMetrics(metricsMd);

/** Item TD aktif untuk dialog rincian kartu Tech debt (sumber: tech-debt.md). */
export const activeTechDebt = parseActiveTechDebt(techDebtMd);

/**
 * Rincian roadmap (#250) untuk section Detail Roadmap — pembuktian angka
 * "Roadmap %" yang di `metrics.md` hanya berupa satu angka (sumber: roadmap.md).
 */
export const roadmapSummary = summarizeRoadmap(
  parseRoadmapPhases(roadmapMd),
  parseStreamLabels(roadmapMd)
);
