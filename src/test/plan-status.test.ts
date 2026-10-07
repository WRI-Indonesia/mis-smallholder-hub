import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { allIssues, parseReleasePlan } from "@/lib/release-plan";
import { planStatus } from "@/lib/plan-status";

// Ringkasan untuk /pagi (scripts/plan-status.ts) — pola fixture release-plan.test.ts.
const sprintMd = readFileSync(join(__dirname, "../../docs/project/sprint.md"), "utf-8");

const table = (rows: string[]) =>
  ["| # | Issue | Kategori | Poin | Target | Status | ⚖️ Keputusan owner |", "| - | - | - | - | - | - | - |", ...rows].join("\n");
const doc = [
  "# Rencana",
  "",
  "### Rencana Rilis",
  "",
  "Terakhir diperbarui: 2026-09-10",
  "",
  "#### Rilis v1.0.0 · 2026-09-01 → 2026-09-07 — Lama (dirilis 2026-09-07)",
  "",
  table([
    "| 1 | **#10** Selesai | Keamanan | L | — | ✅ Selesai | — |",
    "| 2 | **#11** Digeser | Rilis | M | — | ⏭️ Digeser | — |",
  ]),
  "",
  "#### Rilis v1.1.0 · 2026-09-08 → 2026-09-21 — Berjalan",
  "",
  table([
    "| 1 | **#11** Digeser ke sini | Rilis | M | — | 🟡 Dikerjakan | — |",
    "| 2 | **#12** Tunggu | Data | L | — | ⚖️ Menunggu keputusan | Pilih A/B |",
    "| 3 | **#13** Kecil | Kerapian | S | — | 🔲 Todo | — |",
    "| 4 | **#14** Beres | Performa | S | — | ✅ Selesai | — |",
    "| 5 | **Rilis v1.1.0** | Rilis | M | — | 🔲 Todo | Go rilis |",
  ]),
  "",
  "#### Backlog terurut",
  "",
  ["| # | Issue | Status | Catatan |", "| - | - | - | - |", "| 1 | **#20** Nanti | ⚖️ Menunggu keputusan | Masih perlu? |", "| 2 | **TD-001** Utang | 🔲 Todo | — |"].join("\n"),
].join("\n");

describe("planStatus — fixture", () => {
  const s = planStatus(parseReleasePlan(doc), "2026-09-15");

  it("rilis berjalan = rilis pertama yang belum bertanda dirilis", () => {
    expect(s.active?.version).toBe("v1.1.0");
    expect(s.active?.daysLeft).toBe(6);
  });

  it("sisa poin tanpa butir selesai; kebutuhan per minggu kalender termasuk hari ini", () => {
    // 3 + 5 + 1 + 1 + 3 = 13 total, 1 selesai → 12 sisa dalam 7 hari (1 minggu).
    expect(s.active?.points).toMatchObject({ total: 13, done: 1, remaining: 12 });
    expect(s.active?.neededPerWeek).toBeCloseTo(12);
  });

  it("velocity hanya dari rilis dirilis; poin digeser tidak dihitung selesai", () => {
    expect(s.velocity.releases).toBe(1);
    expect(s.velocity.average).toBeCloseTo(5);
  });

  it("dikerjakan & keputusan: rujukan issue + deskripsi tanpa rujukan", () => {
    expect(s.active?.inProgress).toEqual([{ ref: "#11", description: "Digeser ke sini" }]);
    expect(s.decisions).toEqual([{ release: "v1.1.0", ref: "#12", description: "Tunggu", decision: "Pilih A/B" }]);
    expect(s.backlogDecisions).toEqual([{ ref: "#20", note: "Masih perlu?" }]);
  });

  it("butir tanpa issue (baris Rilis) tetap tampil di todo dengan ref null", () => {
    expect(s.active?.todo.map((t) => t.ref)).toEqual(["#13", null]);
  });

  it("issueNumbers unik, hanya issue GitHub (tanpa TD-xxx)", () => {
    expect(s.issueNumbers).toEqual([10, 11, 12, 13, 14, 20]);
  });

  it("rilis lewat target tanpa penanda dirilis tetap berjalan (terlambat), tanpa kebutuhan per minggu", () => {
    const late = planStatus(parseReleasePlan(doc), "2026-09-30");
    expect(late.active).toMatchObject({ version: "v1.1.0", state: "late", daysLeft: 0, neededPerWeek: null });
  });
});

describe("planStatus — sprint.md nyata", () => {
  it("jalan tanpa melempar dan issueNumbers = issue GitHub di allIssues", () => {
    const plan = parseReleasePlan(sprintMd);
    const s = planStatus(plan, "2026-09-30");
    const expected = [...new Set(allIssues(plan).filter((r) => r.isIssue).map((r) => r.number))];
    expect(s.issueNumbers).toHaveLength(expected.length);
    expect(s.issueNumbers.every((n) => expected.includes(n))).toBe(true);
  });
});
