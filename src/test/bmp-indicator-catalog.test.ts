import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { BMP_EXCLUSIVE_CRITERIA, bmpActivityWeightSum } from "@/lib/bmp-survey-form";

/**
 * Penjaga master indikator Monev BMP (`prisma/seeds/data/bmp-indicators.csv`).
 * Skor akhir maksimal harus 3,00 (owner 2026-09-20): Σ bobot efektif tiap
 * kegiatan = 1,0. Gulma memuat kriteria alternatif 1.3.2 (petani ATAU pekerja,
 * 0,2 masing-masing) — dijumlahkan mentah Σ = 1,2, dihitung sekali Σ = 1,0.
 * Test ini gagal bila katalog dibangkitkan ulang dengan bobot lain, atau bila
 * aturan alternatif tak lagi menutup selisihnya.
 */
const rows = parse(readFileSync(join(process.cwd(), "prisma", "seeds", "data", "bmp-indicators.csv"), "utf8"), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
const refs = rows.map((r) => ({ activityCode: r.activity_code, criteriaCode: r.criteria_code, level: r.level as "LEMBAGA" | "INDIVIDU", weight: r.weight ? Number(r.weight) : null, inFinalScore: r.in_final_score === "TRUE" }));

describe("bmp-indicators.csv — bobot", () => {
  it("32 baris: 18 INDIVIDU + 14 LEMBAGA, 21 berbobot, unik per (code, level)", () => {
    expect(rows).toHaveLength(32);
    expect(rows.filter((r) => r.level === "INDIVIDU")).toHaveLength(18);
    expect(rows.filter((r) => r.level === "LEMBAGA")).toHaveLength(14);
    expect(rows.filter((r) => r.in_final_score === "TRUE" && r.weight)).toHaveLength(21);
    expect(new Set(rows.map((r) => `${r.code}|${r.level}`)).size).toBe(32);
  });

  it("Σ bobot efektif per kegiatan = 1,0 (maks skor kegiatan 3,00); Σ bobot kegiatan = 1,0 (maks skor akhir 3,00)", () => {
    for (const code of ["1.1", "1.2", "1.3", "1.4", "1.5"]) expect(bmpActivityWeightSum(refs, code), `kegiatan ${code}`).toBe(1);
    const activityWeight = new Map(rows.map((r) => [r.activity_code, Number(r.activity_weight)]));
    expect(Math.round([...activityWeight.values()].reduce((a, b) => a + b, 0) * 100) / 100).toBe(1);
  });

  it("kriteria alternatif 1.3.2 = dua indikator INDIVIDU berbobot sama (petani/pekerja 0,2); bobot template 1.3.3.1 tetap 0,6", () => {
    const alt = rows.filter((r) => BMP_EXCLUSIVE_CRITERIA.has(r.criteria_code) && r.in_final_score === "TRUE");
    expect(alt.map((r) => [r.code, r.level, r.weight])).toEqual([["1.3.2.1", "INDIVIDU", "0.2"], ["1.3.2.2", "INDIVIDU", "0.2"]]);
    expect(rows.find((r) => r.code === "1.3.3.1")?.weight).toBe("0.6");
    // Tanpa aturan alternatif Σ Gulma mentah = 1,2 — inilah asal "Gulma bisa 3,60".
    const raw = refs.filter((r) => r.activityCode === "1.3" && r.inFinalScore && r.weight != null).reduce((s, r) => s + (r.weight ?? 0), 0);
    expect(Math.round(raw * 100) / 100).toBe(1.2);
  });
});
