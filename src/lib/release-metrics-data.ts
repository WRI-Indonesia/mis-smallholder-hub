import metricsMd from "../../docs/project/metrics.md";
import { parseReleaseMetrics } from "./release-metrics";

/**
 * Data Metrik Rilis (#227) — `docs/project/metrics.md` di-bundle webpack
 * (`asset/source`) dan diparse SEKALI saat modul dimuat. Satu sumber kebenaran;
 * format rusak akan melempar saat build/boot, bukan salah render diam-diam.
 *
 * Catatan: jangan import file ini dari unit test (vitest tidak memuat `.md`);
 * test memakai `fs.readFileSync` + parser murninya langsung.
 */
export const releaseMetrics = parseReleaseMetrics(metricsMd);
