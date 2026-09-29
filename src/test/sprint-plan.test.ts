import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  SPRINT_STACK_ORDER,
  SPRINT_STATUS_LABEL,
  carryOvers,
  parseSprintPlan,
  pendingDecisions,
  sprintComposition,
  sprintDay,
  sprintPhase,
  planTotals,
  sprintProgress,
  sprintStatusPoints,
  sprintVelocity,
  splitRow,
} from "@/lib/sprint-plan";

// Vitest tidak memuat `.md` (itu rule webpack), jadi test membaca file nyata
// + memanggil parser murninya — pola roadmap.test.ts.
const sprintMd = readFileSync(join(__dirname, "../../docs/project/sprint.md"), "utf-8");

const doc = (body: string) => ["# Sprint", "", "### Sprint Focus", "", body, "", "<details>", "#### Sprint 99 · lama", "</details>"].join("\n");
const table = (rows: string[]) =>
  ["| # | Issue | Kategori | Poin | Target minggu ini | Status | ⚖️ Keputusan owner |", "| - | - | - | - | - | - | - |", ...rows].join("\n");

describe("parseSprintPlan — file sprint.md nyata", () => {
  const plan = parseSprintPlan(sprintMd);

  it("memparse sprint berurutan, tanggal Senin → Minggu tanpa celah/tumpang tindih", () => {
    expect(plan.sprints.length).toBeGreaterThanOrEqual(1);
    plan.sprints.forEach((s, i) => {
      expect(s.number).toBe(i + 1);
      expect(new Date(`${s.start}T00:00:00Z`).getUTCDay()).toBe(1);
      expect(new Date(`${s.end}T00:00:00Z`).getUTCDay()).toBe(0);
      expect(s.items.length).toBeGreaterThan(0);
      if (i > 0) {
        const prevEnd = new Date(`${plan.sprints[i - 1].end}T00:00:00Z`).getTime();
        expect(new Date(`${s.start}T00:00:00Z`).getTime() - prevEnd).toBe(86_400_000);
      }
    });
  });

  it("Sprint 1 memuat #364 dengan rujukan issue & keputusan owner", () => {
    const item = plan.sprints[0].items.find((i) => i.issueRefs.includes("#364"));
    expect(item).toBeDefined();
    expect(item?.decision).not.toBeNull();
  });

  it("riwayat fokus lama di <details> tidak ikut terparse; backlog terbaca", () => {
    expect(plan.backlogTitle).toMatch(/^Backlog/);
    expect(plan.backlog.length).toBeGreaterThan(0);
  });
});

describe("parseSprintPlan — fixture", () => {
  it("status emoji → kunci, '—' → decision null, backlog tanpa nomor", () => {
    const plan = parseSprintPlan(
      doc(
        [
          "#### Sprint 1 · 2026-09-28 → 2026-10-04 — Uji",
          "",
          table([
            "| 1 | **#10** A | Keamanan | S | t | ✅ Selesai | — |",
            "| 2 | **#11** · **#12** B | Rilis | M | t | 🟡 Dikerjakan | Pilih X |",
            "| 3 | C | Data | L | t | ⚖️ Menunggu keputusan | Y |",
            "| 4 | D | Fitur | M | t | ⏭️ Digeser | — |",
            "| 5 | E | Keamanan | M | t | 🔲 Todo | — |",
          ]),
          "",
          "#### Backlog terurut",
          "",
          "1. **#20** satu",
          "2. dua",
        ].join("\n")
      )
    );
    const [s] = plan.sprints;
    expect(plan.sprints).toHaveLength(1);
    expect(s.items.map((i) => i.status)).toEqual(["done", "progress", "decision", "moved", "todo"]);
    expect(s.items[0].decision).toBeNull();
    expect(s.items[1].issueRefs).toEqual(["#11", "#12"]);
    expect(plan.backlog).toEqual(["**#20** satu", "dua"]);
    expect(s.items.map((i) => i.points)).toEqual([1, 3, 5, 3, 3]);
    // Digeser tidak dihitung ke total, baik butir maupun poin.
    expect(sprintProgress(s)).toEqual({ done: 1, total: 4, donePoints: 1, totalPoints: 12 });
    expect(sprintComposition(s)).toEqual([
      { category: "Keamanan", points: 4 },
      { category: "Rilis", points: 3 },
      { category: "Performa", points: 0 },
      { category: "Data", points: 5 },
      { category: "Fitur", points: 0 },
      { category: "Kerapian", points: 0 },
    ]);
  });

  it("format rusak melempar (build gagal, bukan salah render diam-diam)", () => {
    const sprint = (rows: string[]) => doc(["#### Sprint 1 · 2026-09-28 → 2026-10-04 — Uji", "", table(rows)].join("\n"));
    expect(() => parseSprintPlan(sprint(["| 1 | A | Rilis | S | t | Selesai | — |"]))).toThrow(/status tak dikenal/);
    expect(() => parseSprintPlan(sprint(["| 1 | A | Rilis | S | t | ✅ Selesai |"]))).toThrow(/7 kolom/);
    expect(() => parseSprintPlan(sprint(["| 1 | A | Lainnya | S | t | ✅ Selesai | — |"]))).toThrow(/kategori tak dikenal/);
    expect(() => parseSprintPlan(sprint(["| 1 | A | Rilis | XL | t | ✅ Selesai | — |"]))).toThrow(/poin tak dikenal/);
    expect(() => parseSprintPlan(sprint([]))).toThrow(/tanpa baris/);
    expect(() => parseSprintPlan(doc("#### Sprint 1 — tanpa tanggal"))).toThrow(/heading tak dikenal/);
    expect(() => parseSprintPlan("# kosong")).toThrow(/Sprint Focus/);
    expect(() => parseSprintPlan(sprint(["| 1 | A | Rilis | S | t | 🔲 Todo | — |", "| 1 | B | Rilis | S | t | 🔲 Todo | — |"]))).toThrow(/dobel/);
    const dup = ["#### Sprint 1 · 2026-09-28 → 2026-10-04 — A", "", table(["| 1 | A | Rilis | S | t | 🔲 Todo | — |"]), ""];
    expect(() => parseSprintPlan(doc([...dup, ...dup].join("\n")))).toThrow(/dua kali/);
  });

  it("blok <details> di tengah section DILEWATI, bukan menghentikan parse sprint berikutnya", () => {
    const plan = parseSprintPlan(
      doc(
        [
          "#### Sprint 1 · 2026-09-28 → 2026-10-04 — A",
          "",
          table(["| 1 | A | Rilis | S | t | 🔲 Todo | — |"]),
          "",
          "<details>",
          "<summary>catatan</summary>",
          "| 9 | X | Rilis | S | t | 🔲 Todo | — |",
          "</details>",
          "",
          "#### Sprint 2 · 2026-10-05 → 2026-10-11 — B",
          "",
          table(["| 1 | B | Data | M | t | 🔲 Todo | — |"]),
        ].join("\n")
      )
    );
    expect(plan.sprints.map((s) => [s.number, s.items.length])).toEqual([[1, 1], [2, 1]]);
  });

  it.each([
    ["satu baris", ["<details><summary>catatan</summary>isi</details>"]],
    ["tag tutup setelah teks", ["<details>", "<summary>catatan</summary>", "| 9 | X | Rilis | S | t | 🔲 Todo | — |", "isi terakhir </details>"]],
  ])("blok <details> %s tidak menelan sprint berikutnya (review wrap-up #378)", (_, block) => {
    const plan = parseSprintPlan(
      doc(
        [
          "#### Sprint 1 · 2026-09-28 → 2026-10-04 — A",
          "",
          table(["| 1 | A | Rilis | S | t | 🔲 Todo | — |"]),
          "",
          ...block,
          "",
          "#### Sprint 2 · 2026-10-05 → 2026-10-11 — B",
          "",
          table(["| 1 | B | Data | M | t | 🔲 Todo | — |"]),
          "",
          "#### Backlog (urut prioritas)",
          "",
          "1. Z",
        ].join("\n")
      )
    );
    expect(plan.sprints.map((s) => [s.number, s.items.length])).toEqual([[1, 1], [2, 1]]);
    expect(plan.backlog).toEqual(["Z"]);
  });

  it("pipa ter-escape `\\|` di dalam sel (GFM) tidak memecah kolom", () => {
    expect(splitRow("| 1 | a | `BATAS_LAHAN\\|NKT` x | d |")).toEqual(["1", "a", "`BATAS_LAHAN|NKT` x", "d"]);
    const plan = parseSprintPlan(
      doc(["#### Sprint 1 · 2026-09-28 → 2026-10-04 — A", "", table(["| 1 | #345 | Fitur | L | kolom `purpose BATAS_LAHAN\\|NKT` | 🔲 Todo | — |"])].join("\n"))
    );
    expect(plan.sprints[0].items[0].target).toBe("kolom `purpose BATAS_LAHAN|NKT`");
  });
});

describe("sprintPhase — batas inklusif", () => {
  const s = { start: "2026-09-28", end: "2026-10-04" };
  it.each([
    ["2026-09-27", "upcoming"],
    ["2026-09-28", "active"],
    ["2026-10-04", "active"],
    ["2026-10-05", "past"],
  ])("%s → %s", (today, phase) => {
    expect(sprintPhase(s, today)).toBe(phase);
  });
});

describe("analisa sprint", () => {
  const plan = parseSprintPlan(
    doc(
      [
        "#### Sprint 1 · 2026-09-28 → 2026-10-04 — Satu",
        "",
        table([
          "| 1 | **#10** A | Keamanan | M | t | ✅ Selesai | — |",
          "| 2 | **#11** B | Rilis | L | t | ⏭️ Digeser | — |",
          "| 3 | **#12** C | Data | S | t | ⚖️ Menunggu keputusan | X |",
        ]),
        "",
        "#### Sprint 2 · 2026-10-05 → 2026-10-11 — Dua",
        "",
        table([
          "| 1 | **#11** B | Rilis | L | t | ⏭️ Digeser | — |",
          "| 2 | **#13** D | Fitur | M | t | ⚖️ Menunggu keputusan | Y |",
        ]),
        "",
        "#### Sprint 3 · 2026-10-12 → 2026-10-18 — Tiga",
        "",
        table(["| 1 | **#11** B | Rilis | L | t | 🔲 Todo | — |"]),
      ].join("\n")
    )
  );

  it("velocity: komitmen awal TERMASUK butir yang kemudian digeser (selisih terlihat); rata-rata dari sprint lewat", () => {
    const v = sprintVelocity(plan, "2026-10-06");
    expect(v.rows).toEqual([
      { number: 1, phase: "past", planned: 9, moved: 5, done: 3 },
      { number: 2, phase: "active", planned: 8, moved: 5, done: 0 },
      { number: 3, phase: "upcoming", planned: 5, moved: 0, done: 0 },
    ]);
    expect(v.average).toBe(3);
    expect(sprintVelocity(plan, "2026-09-28").average).toBeNull();
  });

  it("poin per status: tumpukan kolom Analisa = komitmen awal velocity (termasuk digeser)", () => {
    expect(sprintStatusPoints(plan.sprints[0])).toEqual({ done: 3, progress: 0, decision: 1, todo: 0, moved: 5 });
    const v = sprintVelocity(plan, "2026-10-06");
    plan.sprints.forEach((s, i) => {
      const pts = sprintStatusPoints(s);
      expect(SPRINT_STACK_ORDER.reduce((t, k) => t + pts[k], 0)).toBe(v.rows[i].planned);
    });
  });

  it("urutan tumpukan memuat setiap status tepat sekali, berlabel sama dengan UI", () => {
    expect([...SPRINT_STACK_ORDER].sort()).toEqual(Object.keys(SPRINT_STATUS_LABEL).sort());
    expect(SPRINT_STATUS_LABEL.todo).toBe("Belum dimulai");
  });

  it("total rencana: butir digeser TIDAK dihitung dua kali; porsi tertahan keputusan", () => {
    // S1 = 3 + 1 (tanpa B digeser), S2 = 3 (tanpa B digeser), S3 = 5 (B mendarat).
    expect(planTotals(plan)).toEqual({ sprints: 3, points: 12, pendingPoints: 4, pendingShare: 4 / 12, end: "2026-10-18" });
    expect(planTotals({ sprints: [] })).toEqual({ sprints: 0, points: 0, pendingPoints: 0, pendingShare: 0, end: null });
  });

  it("keputusan tertunda: butir ⚖️ sprint yang sudah lewat TIDAK hilang, ditandai terlambat", () => {
    expect(pendingDecisions(plan, "2026-10-06").map((d) => [d.sprint, d.phase, d.item.issueRefs[0]])).toEqual([
      [1, "past", "#12"],
      [2, "active", "#13"],
    ]);
  });

  it("carry-over: berapa kali digeser + sprint tujuan terakhir", () => {
    expect(carryOvers(plan)).toEqual([{ issue: "**#11** B", movedFrom: [1, 2], destination: 3 }]);
  });

  it("carry-over dikunci per baris Issue: satu baris ber-2 issue = 1 butir; digeser tanpa tujuan = belum dijadwalkan", () => {
    const p = parseSprintPlan(
      doc(
        [
          "#### Sprint 1 · 2026-09-28 → 2026-10-04 — Satu",
          "",
          table([
            "| 1 | **#253** · **#320** | Performa | M | t | ⏭️ Digeser | — |",
            "| 2 | **#286 butir 2** | Keamanan | S | t | ⏭️ Digeser | — |",
            "| 3 | **#286 butir 1 & 3** | Keamanan | M | t | 🔲 Todo | — |",
          ]),
          "",
          "#### Sprint 2 · 2026-10-05 → 2026-10-11 — Dua",
          "",
          table(["| 1 | **#286 butir 1 & 3** | Keamanan | M | t | 🔲 Todo | — |"]),
        ].join("\n")
      )
    );
    expect(carryOvers(p)).toEqual([
      { issue: "**#253** · **#320**", movedFrom: [1], destination: null },
      { issue: "**#286 butir 2**", movedFrom: [1], destination: null },
    ]);
  });

  it("hari ke-n dalam sprint aktif; null di luar rentang", () => {
    const s = plan.sprints[0];
    expect(sprintDay(s, "2026-09-28")).toBe(1);
    expect(sprintDay(s, "2026-10-04")).toBe(7);
    expect(sprintDay(s, "2026-10-05")).toBeNull();
  });
});
