import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  KANBAN_COLUMNS,
  PLAN_STACK_ORDER,
  PLAN_STATUS_LABEL,
  allIssues,
  carryOvers,
  daysBetween,
  issueDescription,
  parseReleasePlan,
  pendingDecisions,
  planTotals,
  releaseComposition,
  releaseKanban,
  releasePhase,
  releaseProgress,
  releaseState,
  releaseStatusPoints,
  releaseTimeline,
  releaseVelocity,
  sortIssueRows,
  splitRow,
} from "@/lib/release-plan";

// Vitest tidak memuat `.md` (itu rule webpack), jadi test membaca file nyata
// + memanggil parser murninya — pola roadmap.test.ts.
const sprintMd = readFileSync(join(__dirname, "../../docs/project/sprint.md"), "utf-8");

const doc = (body: string) =>
  ["# Rencana", "", "### Rencana Rilis", "", "Terakhir diperbarui: 2026-09-30", "", body, "", "<details>", "#### Rilis lama tak berformat", "</details>"].join("\n");
const heading = (v: string, start: string, end: string, title = "Uji") => `#### Rilis ${v} · ${start} → ${end} — ${title}`;
const backlogTable = (rows: string[]) => ["| # | Issue | Status | Catatan |", "| - | - | - | - |", ...rows].join("\n");
const table = (rows: string[]) =>
  ["| # | Issue | Kategori | Poin | Target | Status | ⚖️ Keputusan owner |", "| - | - | - | - | - | - | - |", ...rows].join("\n");
const one = (rows: string[], v = "v1.0.0") => doc([heading(v, "2026-09-28", "2026-10-04"), "", table(rows)].join("\n"));
const TODAY_WIB = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

describe("parseReleasePlan — file sprint.md nyata", () => {
  const plan = parseReleasePlan(sprintMd);

  it("memparse rilis berurutan: versi unik, mulai ≤ target, tidak tumpang tindih", () => {
    expect(plan.releases.length).toBeGreaterThanOrEqual(1);
    plan.releases.forEach((r, i) => {
      expect(r.version).toMatch(/^v\d+\.\d+\.\d+$/);
      expect(r.start <= r.end).toBe(true);
      expect(r.items.length).toBeGreaterThan(0);
      if (i > 0) expect(r.start > plan.releases[i - 1].end).toBe(true);
    });
  });

  it("v1.2.0 memuat #364 dengan rujukan issue & keputusan owner", () => {
    const item = plan.releases.find((r) => r.version === "v1.2.0")?.items.find((i) => i.issueRefs.includes("#364"));
    expect(item).toBeDefined();
    expect(item?.decision).not.toBeNull();
  });

  it("riwayat lama di <details> tidak ikut terparse; backlog terbaca", () => {
    expect(plan.backlog.length).toBeGreaterThan(0);
  });

  it("kolom Issue rilis & backlog memuat paling banyak satu #nnn (tab Semua Issue = satu baris per issue)", () => {
    const rows = [...plan.releases.flatMap((r) => r.items.map((i) => i.issue)), ...plan.backlog.map((b) => b.issue)];
    expect(rows.filter((issue) => (issue.match(/#\d+/g)?.length ?? 0) > 1)).toEqual([]);
    expect(allIssues(plan).filter((r) => r.description === "")).toEqual([]);
  });

  it("'Terakhir diperbarui' tidak lebih lama dari tanggal terbaru di baris ✅ Selesai", () => {
    // Halaman statis: tanggal ini satu-satunya petunjuk kesegaran bagi pembaca.
    // Hanya baris SELESAI (tanggal penyelesaian = masa lalu menurut definisinya) —
    // tenggat masa depan di baris Todo tidak boleh membuat test merah begitu harinya
    // tiba (review 4505de9). Batas "hari ini" memakai WIB, sama dengan halaman.
    const focus = sprintMd.indexOf("### Rencana Rilis");
    const section = sprintMd.slice(focus, sprintMd.indexOf("\n### ", focus + 1));
    const dates = section
      .split("\n")
      .filter((l) => l.startsWith("|"))
      .map(splitRow)
      .filter((cells) => cells.length === 7 && cells[5].startsWith("✅"))
      .flatMap((cells) => cells.join(" ").match(/\d{4}-\d{2}-\d{2}/g) ?? [])
      .filter((d) => d <= TODAY_WIB);
    const latest = dates.sort().at(-1);
    expect(latest && plan.updatedAt >= latest ? "ok" : `Terakhir diperbarui ${plan.updatedAt} < ${latest}`).toBe("ok");
  });
});

describe("parseReleasePlan — fixture", () => {
  it("status emoji → kunci, '—' → decision null, backlog tabel", () => {
    const plan = parseReleasePlan(
      doc(
        [
          heading("v1.0.0", "2026-09-28", "2026-10-04"),
          "",
          table([
            "| 1 | **#10** A | Keamanan | S | t | ✅ Selesai | — |",
            "| 2 | **#11** B | Rilis | M | t | 🟡 Dikerjakan | Pilih X |",
            "| 3 | C | Data | L | t | ⚖️ Menunggu keputusan | Y |",
            "| 4 | D | Fitur | M | t | ⏭️ Digeser | — |",
            "| 5 | E | Keamanan | M | t | 🔲 Todo | — |",
          ]),
          "",
          "#### Backlog terurut",
          "",
          backlogTable(["| 1 | **#20** satu | 🔲 Todo | — |", "| 2 | dua | ⚖️ Menunggu keputusan | tanya owner |"]),
        ].join("\n")
      )
    );
    const [r] = plan.releases;
    expect(plan.updatedAt).toBe("2026-09-30");
    expect(r.version).toBe("v1.0.0");
    expect(r.items.map((i) => i.status)).toEqual(["done", "progress", "decision", "moved", "todo"]);
    expect(r.items[0].decision).toBeNull();
    expect(plan.backlog).toEqual([
      { order: 1, issue: "**#20** satu", issueRefs: ["#20"], status: "todo", note: null },
      { order: 2, issue: "dua", issueRefs: [], status: "decision", note: "tanya owner" },
    ]);
    expect(r.items.map((i) => i.points)).toEqual([1, 3, 5, 3, 3]);
    // Digeser tidak dihitung ke total, baik butir maupun poin.
    expect(releaseProgress(r)).toEqual({ done: 1, total: 4, donePoints: 1, totalPoints: 12 });
    expect(releaseComposition(r)).toEqual([
      { category: "Keamanan", points: 4 },
      { category: "Rilis", points: 3 },
      { category: "Performa", points: 0 },
      { category: "Data", points: 5 },
      { category: "Fitur", points: 0 },
      { category: "Kerapian", points: 0 },
    ]);
  });

  it("format rusak melempar (build gagal, bukan salah render diam-diam)", () => {
    expect(() => parseReleasePlan(one(["| 1 | A | Rilis | S | t | Selesai | — |"]))).toThrow(/status tak dikenal/);
    expect(() => parseReleasePlan(one(["| 1 | A | Rilis | S | t | ✅ Selesai |"]))).toThrow(/7 kolom/);
    expect(() => parseReleasePlan(one(["| 1 | A | Lainnya | S | t | ✅ Selesai | — |"]))).toThrow(/kategori tak dikenal/);
    expect(() => parseReleasePlan(one(["| 1 | A | Rilis | XL | t | ✅ Selesai | — |"]))).toThrow(/poin tak dikenal/);
    expect(() => parseReleasePlan(one([]))).toThrow(/tanpa baris/);
    expect(() => parseReleasePlan(doc("#### Sprint 1 · 2026-09-28 → 2026-10-04 — format lama"))).toThrow(/heading tak dikenal/);
    expect(() => parseReleasePlan(doc("#### Rilis 1.3 · 2026-09-28 → 2026-10-04 — tanpa v"))).toThrow(/heading tak dikenal/);
    expect(() => parseReleasePlan("# kosong")).toThrow(/Rencana Rilis/);
    expect(() => parseReleasePlan(one(["| 1 | A | Rilis | S | t | 🔲 Todo | — |"]).replace(/Terakhir diperbarui: .*\n/, ""))).toThrow(/Terakhir diperbarui/);
    expect(() => parseReleasePlan(one(["| 1 | A | Rilis | S | t | 🔲 Todo | — |", "| 1 | B | Rilis | S | t | 🔲 Todo | — |"]))).toThrow(/dobel/);
    const block = (v: string, start: string, end: string) => [heading(v, start, end), "", table(["| 1 | A | Rilis | S | t | 🔲 Todo | — |"]), ""];
    expect(() => parseReleasePlan(doc([...block("v1.0.0", "2026-09-28", "2026-10-04"), ...block("v1.0.0", "2026-10-05", "2026-10-10")].join("\n")))).toThrow(/dua kali/);
    expect(() => parseReleasePlan(doc(block("v1.0.0", "2026-10-04", "2026-09-28").join("\n")))).toThrow(/mulai sesudah target/);
    expect(() => parseReleasePlan(doc([...block("v1.0.0", "2026-09-28", "2026-10-04"), ...block("v1.1.0", "2026-10-04", "2026-10-10")].join("\n")))).toThrow(/tumpang tindih/);
    const withBacklog = (row: string) => one(["| 1 | A | Rilis | S | t | 🔲 Todo | — |"]) + "\n\n#### Backlog\n\n" + backlogTable([row]);
    expect(() => parseReleasePlan(withBacklog("| 1 | A | 🔲 Todo |"))).toThrow(/4 kolom/);
    expect(() => parseReleasePlan(withBacklog("| 1 | A | Todo | — |"))).toThrow(/status tak dikenal/);
  });

  it("blok <details> di tengah section DILEWATI, bukan menghentikan parse rilis berikutnya", () => {
    const plan = parseReleasePlan(
      doc(
        [
          heading("v1.0.0", "2026-09-28", "2026-10-04"),
          "",
          table(["| 1 | A | Rilis | S | t | 🔲 Todo | — |"]),
          "",
          "<details>",
          "<summary>catatan</summary>",
          "| 9 | X | Rilis | S | t | 🔲 Todo | — |",
          "</details>",
          "",
          heading("v1.1.0", "2026-10-05", "2026-10-11"),
          "",
          table(["| 1 | B | Data | M | t | 🔲 Todo | — |"]),
        ].join("\n")
      )
    );
    expect(plan.releases.map((r) => [r.version, r.items.length])).toEqual([["v1.0.0", 1], ["v1.1.0", 1]]);
  });

  it.each([
    ["satu baris", ["<details><summary>catatan</summary>isi</details>"]],
    ["tag tutup setelah teks", ["<details>", "<summary>catatan</summary>", "| 9 | X | Rilis | S | t | 🔲 Todo | — |", "isi terakhir </details>"]],
  ])("blok <details> %s tidak menelan rilis berikutnya (review wrap-up #378)", (_, block) => {
    const plan = parseReleasePlan(
      doc(
        [
          heading("v1.0.0", "2026-09-28", "2026-10-04"),
          "",
          table(["| 1 | A | Rilis | S | t | 🔲 Todo | — |"]),
          "",
          ...block,
          "",
          heading("v1.1.0", "2026-10-05", "2026-10-11"),
          "",
          table(["| 1 | B | Data | M | t | 🔲 Todo | — |"]),
          "",
          "#### Backlog (urut prioritas)",
          "",
          backlogTable(["| 1 | Z | 🔲 Todo | — |"]),
        ].join("\n")
      )
    );
    expect(plan.releases.map((r) => [r.version, r.items.length])).toEqual([["v1.0.0", 1], ["v1.1.0", 1]]);
    expect(plan.backlog.map((b) => b.issue)).toEqual(["Z"]);
  });

  it("pipa ter-escape `\\|` di dalam sel (GFM) tidak memecah kolom", () => {
    expect(splitRow("| 1 | a | `BATAS_LAHAN\\|NKT` x | d |")).toEqual(["1", "a", "`BATAS_LAHAN|NKT` x", "d"]);
    const plan = parseReleasePlan(one(["| 1 | #345 | Fitur | L | kolom `purpose BATAS_LAHAN\\|NKT` | 🔲 Todo | — |"]));
    expect(plan.releases[0].items[0].target).toBe("kolom `purpose BATAS_LAHAN|NKT`");
  });
});

describe("fase, linimasa & keadaan rilis", () => {
  const r = { start: "2026-09-28", end: "2026-10-04" };
  it.each([
    ["2026-09-27", "upcoming"],
    ["2026-09-28", "active"],
    ["2026-10-04", "active"],
    ["2026-10-05", "past"],
  ])("%s → %s (batas inklusif)", (today, phase) => {
    expect(releasePhase(r, today)).toBe(phase);
  });

  it("linimasa: panjang inklusif, hari ke-n & sisa hari hanya saat berjalan", () => {
    expect(releaseTimeline(r, "2026-09-28")).toEqual({ days: 7, day: 1, daysLeft: 6 });
    expect(releaseTimeline(r, "2026-10-04")).toEqual({ days: 7, day: 7, daysLeft: 0 });
    expect(releaseTimeline(r, "2026-10-05")).toEqual({ days: 7, day: null, daysLeft: null });
  });

  it("keadaan: lewat target + semua selesai = dirilis; lewat target + sisa = terlambat (tetap tampil di depan)", () => {
    const base = { version: "v1", title: "t", ...r };
    const done = { no: 1, issue: "a", issueRefs: [], category: "Rilis" as const, size: "S" as const, points: 1, target: "", status: "done" as const, decision: null };
    const moved = { ...done, no: 2, status: "moved" as const };
    const todo = { ...done, no: 3, status: "todo" as const };
    expect(releaseState({ ...base, items: [done, moved] }, "2026-10-05")).toBe("released");
    expect(releaseState({ ...base, items: [done, todo] }, "2026-10-05")).toBe("late");
    expect(releaseState({ ...base, items: [done, todo] }, "2026-09-30")).toBe("active");
    expect(releaseState({ ...base, items: [todo] }, "2026-09-01")).toBe("upcoming");
  });

  it("daysBetween: selisih hari kalender (umur dokumen di strip header)", () => {
    expect(daysBetween("2026-09-30", "2026-09-30")).toBe(0);
    expect(daysBetween("2026-09-28", "2026-10-05")).toBe(7);
    expect(daysBetween("2026-10-05", "2026-09-28")).toBe(-7);
  });
});

describe("analisa rilis", () => {
  const plan = parseReleasePlan(
    doc(
      [
        heading("v1.0.0", "2026-09-28", "2026-10-04", "Satu"),
        "",
        table([
          "| 1 | **#10** A | Keamanan | M | t | ✅ Selesai | — |",
          "| 2 | **#11** B | Rilis | L | t | ⏭️ Digeser | — |",
          "| 3 | **#12** C | Data | S | t | ⚖️ Menunggu keputusan | X |",
        ]),
        "",
        heading("v1.1.0", "2026-10-05", "2026-10-18", "Dua"),
        "",
        table(["| 1 | **#11** B | Rilis | L | t | ⏭️ Digeser | — |", "| 2 | **#13** D | Fitur | M | t | ⚖️ Menunggu keputusan | Y |"]),
        "",
        heading("v1.2.0", "2026-10-19", "2026-10-25", "Tiga"),
        "",
        table(["| 1 | **#11** B | Rilis | L | t | 🔲 Todo | — |"]),
      ].join("\n")
    )
  );

  it("velocity: komitmen awal TERMASUK butir digeser; rata-rata = Σ selesai ÷ Σ minggu rilis yang lewat", () => {
    const v = releaseVelocity(plan, "2026-10-06");
    expect(v.rows).toEqual([
      { version: "v1.0.0", phase: "past", planned: 9, moved: 5, done: 3, weeks: 1 },
      { version: "v1.1.0", phase: "active", planned: 8, moved: 5, done: 0, weeks: 2 },
      { version: "v1.2.0", phase: "upcoming", planned: 5, moved: 0, done: 0, weeks: 1 },
    ]);
    expect(v.average).toBe(3);
    expect(v.sample).toEqual({ releases: 1, weeks: 1 });
    expect(releaseVelocity(plan, "2026-09-28").average).toBeNull();
    // Rilis panjang tidak menggelembungkan rata-rata: 3 poin dalam (1 + 2) minggu = 1/minggu.
    expect(releaseVelocity(plan, "2026-10-20").average).toBe(1);
  });

  it("poin per status: tumpukan kolom Analisa = komitmen awal velocity (termasuk digeser)", () => {
    expect(releaseStatusPoints(plan.releases[0])).toEqual({ done: 3, progress: 0, decision: 1, todo: 0, moved: 5 });
    const v = releaseVelocity(plan, "2026-10-06");
    plan.releases.forEach((r, i) => {
      const pts = releaseStatusPoints(r);
      expect(PLAN_STACK_ORDER.reduce((t, k) => t + pts[k], 0)).toBe(v.rows[i].planned);
    });
  });

  it("kanban (#389): 4 kolom urut alur, butir ⚖️ hanya di kolom keputusan, digeser di lajur terpisah", () => {
    const { columns, moved } = releaseKanban(plan.releases[0]);
    expect(columns.map((c) => c.status)).toEqual(["todo", "progress", "decision", "done"]);
    expect(columns.map((c) => [c.items.map((i) => i.issueRefs[0]), c.points])).toEqual([
      [[], 0],
      [[], 0],
      [["#12"], 1],
      [["#10"], 3],
    ]);
    expect(moved.map((i) => i.issueRefs[0])).toEqual(["#11"]);
    expect(columns.reduce((t, c) => t + c.items.length, 0) + moved.length).toBe(plan.releases[0].items.length);
    expect(columns.reduce((t, c) => t + c.points, 0)).toBe(releaseProgress(plan.releases[0]).totalPoints);
    expect(KANBAN_COLUMNS).not.toContain("moved");
  });

  it("urutan tumpukan memuat setiap status tepat sekali, berlabel sama dengan UI", () => {
    expect([...PLAN_STACK_ORDER].sort()).toEqual(Object.keys(PLAN_STATUS_LABEL).sort());
    expect(PLAN_STATUS_LABEL.todo).toBe("Belum dimulai");
  });

  it("total rencana: butir digeser TIDAK dihitung dua kali; porsi tertahan keputusan", () => {
    expect(planTotals(plan)).toEqual({ releases: 3, points: 12, pendingPoints: 4, pendingShare: 4 / 12, end: "2026-10-25" });
    expect(planTotals({ releases: [] })).toEqual({ releases: 0, points: 0, pendingPoints: 0, pendingShare: 0, end: null });
  });

  it("keputusan tertunda: butir ⚖️ rilis yang sudah lewat TIDAK hilang, ditandai terlambat", () => {
    expect(pendingDecisions(plan, "2026-10-06").map((d) => [d.release, d.phase, d.item.issueRefs[0]])).toEqual([
      ["v1.0.0", "past", "#12"],
      ["v1.1.0", "active", "#13"],
    ]);
  });

  it("carry-over: berapa kali digeser + rilis tujuan terakhir", () => {
    expect(carryOvers(plan)).toEqual([{ issue: "**#11** B", movedFrom: ["v1.0.0", "v1.1.0"], destination: "v1.2.0" }]);
  });

  it("carry-over dikunci per baris Issue: bagian berbeda = butir berbeda; digeser tanpa tujuan = belum dijadwalkan", () => {
    const p = parseReleasePlan(
      doc(
        [
          heading("v1.0.0", "2026-09-28", "2026-10-04"),
          "",
          table(["| 1 | **#286 butir 2** | Keamanan | S | t | ⏭️ Digeser | — |", "| 2 | **#286 butir 1 & 3** | Keamanan | M | t | 🔲 Todo | — |"]),
          "",
          heading("v1.1.0", "2026-10-05", "2026-10-11"),
          "",
          table(["| 1 | **#286 butir 1 & 3** | Keamanan | M | t | 🔲 Todo | — |"]),
        ].join("\n")
      )
    );
    expect(carryOvers(p)).toEqual([{ issue: "**#286 butir 2**", movedFrom: ["v1.0.0"], destination: null }]);
  });
});

describe("allIssues — tab Semua Issue", () => {
  const plan = parseReleasePlan(
    doc(
      [
        heading("v1.0.0", "2026-09-28", "2026-10-04"),
        "",
        table([
          "| 1 | **#30** Tiga puluh | Keamanan | S | t | ✅ Selesai | — |",
          "| 2 | **#286 butir 2** Key FIRMS | Keamanan | S | t | ⚖️ Menunggu keputusan | X |",
          "| 3 | **#40** Digeser | Rilis | M | t | ⏭️ Digeser | — |",
          "| 4 | **Rilis v1.0.0** | Rilis | M | t | 🔲 Todo | — |",
        ]),
        "",
        heading("v1.1.0", "2026-10-05", "2026-10-11"),
        "",
        table(["| 1 | **#40** Digeser | Rilis | M | t | 🔲 Todo | — |"]),
        "",
        "#### Backlog",
        "",
        backlogTable(["| 1 | **#286 butir 1 & 3** Cache FIRMS | 🔲 Todo | target 2027 |", "| 2 | **TD-049** Auto-fit | 🔲 Todo | — |"]),
      ].join("\n")
    )
  );
  const where = (r: ReturnType<typeof allIssues>[number]) => (r.place.kind === "release" ? r.place.version : `B${r.place.order}`);

  it("satu baris per #nnn, urut nomor lalu rilis → backlog; digeser & baris RILIS tanpa #nnn tidak ikut", () => {
    expect(allIssues(plan).map((r) => [r.ref, r.isIssue, where(r), r.status, r.category, r.description, r.note])).toEqual([
      ["#30", true, "v1.0.0", "done", "Keamanan", "Tiga puluh", null],
      ["#40", true, "v1.1.0", "todo", "Rilis", "Digeser", null],
      ["#286", true, "v1.0.0", "decision", "Keamanan", "butir 2 Key FIRMS", null],
      ["#286", true, "B1", "todo", null, "butir 1 & 3 Cache FIRMS", "target 2027"],
      // Butir backlog tanpa issue (TD-xxx) tetap tampil — backlog hanya ada di tab ini (review 4505de9).
      ["TD-049", false, "B2", "todo", null, "Auto-fit", null],
    ]);
  });

  it("urutkan per issue / rilis: kunci utama ikut arah, kunci kedua selalu menaik", () => {
    const rows = allIssues(plan);
    const key = (r: (typeof rows)[number]) => `${r.ref}@${where(r)}`;
    expect(sortIssueRows(rows, "issue", "desc").map(key)).toEqual(["TD-049@B2", "#286@v1.0.0", "#286@B1", "#40@v1.1.0", "#30@v1.0.0"]);
    expect(sortIssueRows(rows, "release", "asc").map(key)).toEqual(["#30@v1.0.0", "#286@v1.0.0", "#40@v1.1.0", "#286@B1", "TD-049@B2"]);
    expect(sortIssueRows(rows, "release", "desc").map(key)).toEqual(["TD-049@B2", "#286@B1", "#40@v1.1.0", "#30@v1.0.0", "#286@v1.0.0"]);
    expect(rows.map(key)).toEqual(["#30@v1.0.0", "#40@v1.1.0", "#286@v1.0.0", "#286@B1", "TD-049@B2"]); // input tidak dimutasi
  });

  it("deskripsi: tebal & rujukan dibuang, kode dipertahankan, #nnn awalan lain tidak ikut terhapus", () => {
    expect(issueDescription("**#253** Agregat `getFarmerSummary` ke SQL", "#253")).toBe("Agregat `getFarmerSummary` ke SQL");
    expect(issueDescription("**#25** lihat #253", "#25")).toBe("lihat #253");
    expect(issueDescription("**TD-049** Auto-fit kolom", "TD-049")).toBe("Auto-fit kolom");
  });
});

describe("helper tampilan (sprint-shared)", () => {
  it("plainInline: markdown inline → teks tanpa tautan (label aksesibel & teks terpotong)", async () => {
    const { plainInline } = await import("@/app/(admin)/admin/data-analyst/sprint/sprint-shared");
    expect(plainInline("**#12** ganti `data-analyst-sprint` lihat [docs](https://x.test)")).toBe("#12 ganti data-analyst-sprint lihat docs");
  });

  it("matchesQuery: semua kata harus ada (lintas kolom), tanpa beda huruf, abaikan markdown & null", async () => {
    const { matchesQuery } = await import("@/app/(admin)/admin/data-analyst/sprint/sprint-shared");
    const parts = ["#286", "Backlog (urutan 1)", "Belum dimulai", "butir 1 & 3 **Cache** `FIRMS`", null];
    expect(matchesQuery("", parts)).toBe(true);
    expect(matchesQuery("  firms   backlog ", parts)).toBe(true);
    expect(matchesQuery("286", parts)).toBe(true);
    expect(matchesQuery("firms selesai", parts)).toBe(false);
  });
});
