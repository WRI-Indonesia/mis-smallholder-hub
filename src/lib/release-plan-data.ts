import sprintMd from "../../docs/project/sprint.md";
import { parseReleasePlan } from "./release-plan";

/**
 * Data Rencana Pengembangan (#378, per rilis sejak 2026-09-30) —
 * `docs/project/sprint.md` di-bundle webpack (`asset/source`) dan diparse SEKALI
 * saat modul dimuat, pola `release-metrics-data.ts`. Perubahan rencana tampil
 * setelah build ulang.
 *
 * Catatan: jangan import file ini dari unit test (vitest tidak memuat `.md`);
 * test memakai `fs.readFileSync` + parser murninya langsung.
 */
export const releasePlan = parseReleasePlan(sprintMd);
