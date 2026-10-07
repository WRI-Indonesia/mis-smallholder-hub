import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  groupRemainingByHorizon,
  parseHorizonLabels,
  parseRoadmapPhases,
  parseStreamLabels,
  summarizeRoadmap,
} from "@/lib/roadmap";
import { parseReleaseMetrics } from "@/lib/release-metrics";

// Sama seperti release-metrics.test.ts: vitest tidak memuat `.md` (itu rule
// webpack), jadi test membaca file nyata + memanggil parser murninya.
const roadmapMd = readFileSync(join(__dirname, "../../docs/project/roadmap.md"), "utf-8");
const metricsMd = readFileSync(join(__dirname, "../../docs/project/metrics.md"), "utf-8");

const table = (rows: string[]) =>
  [
    "### Phase Status (Indeks)",
    "",
    "| Phase | Deskripsi | Status | Horizon | Bobot |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "### Rincian per Phase",
    "",
  ].join("\n");

describe("parseRoadmapPhases — file roadmap.md nyata", () => {
  it("memparse seluruh baris Phase Status dengan bobot & status valid", () => {
    const phases = parseRoadmapPhases(roadmapMd);
    // Baseline reset 2026-09-30 (Roadmap 2026–2027): 26 fase (pasca-MVP + Visi Produk); batas bawah longgar.
    expect(phases.length).toBeGreaterThanOrEqual(14);
    expect(phases[0]).toMatchObject({ key: "PLATFORM-08", stream: "PLATFORM", status: "Partial", weight: "inti" });
    expect(phases.find((p) => p.key === "DQ-01")).toMatchObject({
      status: "Partial",
      horizon: "Now",
      weight: "inti",
      score: 0.5,
      maxPoints: 2,
      points: 1,
    });
    expect(phases.find((p) => p.key === "OPS-02")).toMatchObject({
      status: "Done",
      weight: "pendukung",
      score: 1,
      points: 1,
    });
  });

  it("fase arsip MVP yang diparkir tidak lagi ikut dihitung", () => {
    const keys = parseRoadmapPhases(roadmapMd).map((p) => p.key);
    for (const parked of ["MD-09", "BULK-02", "TOOLS-01", "CMS-01", "COMM-02"]) {
      expect(keys).not.toContain(parked);
    }
  });

  it("mengambil evidence & next step dari blok Rincian per Phase", () => {
    const phases = parseRoadmapPhases(roadmapMd);
    const ops02 = phases.find((p) => p.key === "OPS-02");
    expect(ops02?.evidence).toMatch(/Dockerfile/);
    expect(ops02?.nextStep).toMatch(/rollback/i);
    // Setiap fase wajib punya evidence & next step — rincian kosong = tabel indeks tanpa bukti.
    expect(phases.filter((p) => !p.evidence || !p.nextStep).map((p) => p.key)).toEqual([]);
  });

  it("label stream terbaca dari Stream Definition", () => {
    const labels = parseStreamLabels(roadmapMd);
    expect(labels.MD).toBe("Master Data");
    expect(labels.OPS).toBe("Operations & DevOps");
    expect(labels.SC).toBe("Supply Chain");
  });
});

describe("summarizeRoadmap — rincian angka Roadmap %", () => {
  const summary = summarizeRoadmap(parseRoadmapPhases(roadmapMd), parseStreamLabels(roadmapMd));

  it("memecah skor inti vs pendukung; total = jumlah keduanya", () => {
    expect(summary.coreCount + summary.supportCount).toBe(summary.total);
    expect(summary.coreMax).toBe(summary.coreCount * 2);
    expect(summary.supportMax).toBe(summary.supportCount);
    expect(summary.earned).toBe(summary.coreEarned + summary.supportEarned);
    expect(summary.max).toBe(summary.coreMax + summary.supportMax);
  });

  it("sisa fase terurut menurut tambahan pp; total sisa menutup gap ke 100%", () => {
    const gaps = summary.remaining.map((r) => r.gainPp);
    expect(gaps).toEqual([...gaps].sort((a, b) => b - a));
    const totalGain = gaps.reduce((a, b) => a + b, 0);
    expect(summary.pct + totalGain).toBeCloseTo(100, 6);
    // Fase Done tidak boleh muncul sebagai sisa.
    expect(summary.remaining.every((r) => r.phase.status !== "Done")).toBe(true);
  });

  it("ringkasan per stream konsisten dengan daftar fase", () => {
    const total = summary.streams.reduce((acc, s) => acc + s.total, 0);
    expect(total).toBe(summary.total);
    for (const s of summary.streams) {
      expect(s.done + s.partial + s.open).toBe(s.total);
    }
  });
});

describe("parseHorizonLabels & groupRemainingByHorizon — sisa fase per horizon (#392)", () => {
  it("label periode horizon dibaca dari Horizon Definition roadmap.md nyata", () => {
    const labels = parseHorizonLabels(roadmapMd);
    expect(labels.Now).toMatch(/Kuartal 4 2026/);
    expect(labels.Next).toMatch(/Semester 1 2027/);
    expect(labels.Later).toMatch(/Semester 2 2027/);
    // Penanda markdown dibuang agar layak tampil apa adanya.
    expect(Object.values(labels).some((l) => l?.includes("**"))).toBe(false);
  });

  it("menolak tabel Horizon Definition yang hilang", () => {
    expect(() => parseHorizonLabels("# Roadmap")).toThrow(/Horizon Definition/);
  });

  it("roadmap.md nyata: blok Now → Next → Later, jumlahnya menutup seluruh sisa fase", () => {
    const summary = summarizeRoadmap(parseRoadmapPhases(roadmapMd), {}, parseHorizonLabels(roadmapMd));
    const groups = groupRemainingByHorizon(summary);
    expect(groups.map((g) => g.horizon)).toEqual(["Now", "Next", "Later"]);
    expect(groups.reduce((a, g) => a + g.items.length, 0)).toBe(summary.remaining.length);
    expect(groups[0].label).toMatch(/Kuartal 4 2026/);
    const gap = groups.reduce((a, g) => a + g.gainPp, 0);
    expect(summary.pct + gap).toBeCloseTo(100, 6);
  });

  it("dalam blok: inti dulu, Partial sebelum belum-mulai, lalu kode; horizon kosong disembunyikan", () => {
    const phases = parseRoadmapPhases(
      table([
        "| MD-01 | A | 🔲 Not Started | Now | pendukung |",
        "| MD-02 | B | 🔲 Not Started | Now | inti |",
        "| MD-03 | C | 🟠 Partial | Now | inti |",
        "| MD-04 | D | 🟠 Partial | Now | pendukung |",
        "| MD-05 | E | ✅ Done | Done | inti |",
        "| MD-06 | F | 🔲 Planned | Later | inti |",
      ])
    );
    const groups = groupRemainingByHorizon(summarizeRoadmap(phases, {}, { Now: "K4" }));
    expect(groups.map((g) => g.horizon)).toEqual(["Now", "Later"]);
    expect(groups[0].items.map((r) => r.phase.key)).toEqual(["MD-03", "MD-02", "MD-04", "MD-01"]);
    expect(groups[0].label).toBe("K4");
    expect(groups[1].label).toBeNull();
    // Poin terbuka = maks − diperoleh: inti 2−1 + 2 + pendukung 1−0,5 + 1.
    expect(groups[0].openPoints).toBe(4.5);
  });
});

describe("konsistensi roadmap.md ↔ metrics.md", () => {
  it("Roadmap % hasil hitung ulang cocok dengan baris rilis terakhir (toleransi 0,1 pp)", () => {
    const computed = summarizeRoadmap(parseRoadmapPhases(roadmapMd)).pct;
    const releases = parseReleaseMetrics(metricsMd);
    const last = releases[releases.length - 1];
    // Angka manual di metrics.md tidak lagi sekadar dipercaya: lupa update salah
    // satu file ketahuan di gate lokal, bukan di produksi.
    expect(Math.abs(computed - last.roadmapPct)).toBeLessThanOrEqual(0.1);
  });
});

describe("parseRoadmapPhases — format menyimpang gagal keras", () => {
  it("menolak jumlah kolom salah (Bobot hilang)", () => {
    expect(() => parseRoadmapPhases(table(["| MD-01 | Regions | ✅ Done | Done |"]))).toThrow(/5 kolom/);
  });

  it("menolak status di luar Status Definition", () => {
    expect(() => parseRoadmapPhases(table(["| MD-01 | Regions | ✅ Selesai | Done | inti |"]))).toThrow(
      /Status Definition/
    );
  });

  it("menolak horizon di luar Horizon Definition", () => {
    expect(() => parseRoadmapPhases(table(["| MD-01 | Regions | ✅ Done | Besok | inti |"]))).toThrow(
      /Horizon Definition/
    );
  });

  it("menolak bobot selain inti/pendukung", () => {
    expect(() => parseRoadmapPhases(table(["| MD-01 | Regions | ✅ Done | Done | utama |"]))).toThrow(/inti/);
  });

  it("menolak kode phase ganda", () => {
    expect(() =>
      parseRoadmapPhases(table(["| MD-01 | Regions | ✅ Done | Done | inti |", "| MD-01 | Regions | ✅ Done | Done | inti |"]))
    ).toThrow(/ganda/);
  });

  it("menolak tabel/section yang hilang", () => {
    expect(() => parseRoadmapPhases("# Roadmap\n\ntidak ada tabel")).toThrow(/tidak ditemukan/);
    expect(() => parseRoadmapPhases(table([]))).toThrow(/tidak ditemukan/);
  });

  it("skor mengikuti Status Definition: ✅ 1 · 🟠 0,5 · sisanya 0", () => {
    const phases = parseRoadmapPhases(
      table([
        "| MD-01 | A | ✅ Done | Done | inti |",
        "| MD-02 | B | 🟠 Partial | Next | pendukung |",
        "| MD-03 | C | 🔲 Planned | Later | pendukung |",
        "| MD-04 | D | 🔴 Blocked | Blocked | inti |",
      ])
    );
    expect(phases.map((p) => p.points)).toEqual([2, 0.5, 0, 0]);
    const summary = summarizeRoadmap(phases);
    expect(summary.earned).toBe(2.5);
    expect(summary.max).toBe(6);
    expect(summary.pct).toBeCloseTo(41.666, 2);
  });
});
