import { describe, expect, it } from "vitest";
import {
  addDays,
  clipWeeks,
  dailyActivity,
  filterIssues,
  issueExportRows,
  kanbanBoard,
  kanbanColumn,
  labelCounts,
  monthGrid,
  normalizeIssues,
  shiftMonth,
  sortIssues,
  toWibDate,
  weeklyTrend,
  type GithubIssue,
  type GithubIssueRaw,
} from "@/lib/github-issues";
import { buildIssuesWorkbook } from "@/lib/github-issues-xlsx";

/** Daftar Issue GitHub (#429) — fungsi murni + workbook Excel. */

const raw = (o: Partial<GithubIssueRaw> & { number: number }): GithubIssueRaw => ({
  title: `Issue ${o.number}`,
  state: "open",
  created_at: "2026-10-01T03:00:00Z",
  html_url: `https://github.com/x/y/issues/${o.number}`,
  ...o,
});

const issue = (o: Partial<GithubIssue> & { number: number }): GithubIssue => ({
  title: `Issue ${o.number}`,
  status: "open",
  labels: [],
  createdDate: "2026-10-01",
  closedDate: null,
  url: "",
  ...o,
});

describe("toWibDate", () => {
  it("UTC 17:00 ke atas sudah tanggal berikutnya di WIB", () => {
    expect(toWibDate("2026-10-12T16:59:59Z")).toBe("2026-10-12");
    expect(toWibDate("2026-10-12T17:00:00Z")).toBe("2026-10-13");
  });
});

describe("normalizeIssues", () => {
  const out = normalizeIssues([
    raw({ number: 1, state: "closed", state_reason: "completed", closed_at: "2026-10-02T18:00:00Z", labels: [{ name: "bug" }, "status:todo"] }),
    raw({ number: 3, pull_request: { url: "x" } }),
    raw({ number: 2, state: "closed", state_reason: "not_planned", closed_at: "2026-10-03T00:00:00Z" }),
    raw({ number: 4, state: "closed", state_reason: "duplicate", closed_at: "2026-10-03T00:00:00Z" }),
    raw({ number: 5 }),
  ]);

  it("membuang pull request dan mengurutkan nomor menurun", () => {
    expect(out.map((i) => i.number)).toEqual([5, 4, 2, 1]);
  });

  it("dedup per nomor — paginasi atas daftar yang berubah bisa mengulang item (review #429)", () => {
    expect(normalizeIssues([raw({ number: 7 }), raw({ number: 7 }), raw({ number: 6 })]).map((i) => i.number)).toEqual([7, 6]);
  });

  it("status dari state + state_reason; label objek & string diratakan; tanggal WIB", () => {
    const byNo = Object.fromEntries(out.map((i) => [i.number, i]));
    expect(byNo[1]).toMatchObject({ status: "closed", labels: ["bug", "status:todo"], closedDate: "2026-10-03", createdDate: "2026-10-01" });
    expect(byNo[2].status).toBe("not_planned");
    expect(byNo[4].status).toBe("duplicate");
    expect(byNo[5]).toMatchObject({ status: "open", closedDate: null });
  });
});

describe("filterIssues", () => {
  const list = [
    issue({ number: 10, title: "Peta lahan lambat", labels: ["bug", "phase:MAP-01"], createdDate: "2026-09-01", closedDate: "2026-10-05", status: "closed" }),
    issue({ number: 11, title: "Tambah menu baru", labels: ["enhancement"], createdDate: "2026-10-10" }),
    issue({ number: 12, title: "Peta BMP", labels: ["enhancement"], createdDate: "2026-08-01" }),
  ];

  it("cari: semua kata harus cocok, termasuk nomor #nnn dan label", () => {
    expect(filterIssues(list, { query: "peta lambat" }).map((i) => i.number)).toEqual([10]);
    expect(filterIssues(list, { query: "#11" }).map((i) => i.number)).toEqual([11]);
    expect(filterIssues(list, { query: "map-01" }).map((i) => i.number)).toEqual([10]);
  });

  it("status & label", () => {
    expect(filterIssues(list, { status: "open" }).map((i) => i.number)).toEqual([11, 12]);
    expect(filterIssues(list, { label: "enhancement" }).map((i) => i.number)).toEqual([11, 12]);
  });

  it("rentang aktivitas = dibuat ATAU ditutup di dalam rentang (inklusif)", () => {
    // #10 dibuat September tapi DITUTUP 5 Okt → ikut; #12 tak beraktivitas di Oktober.
    expect(filterIssues(list, { from: "2026-10-01", to: "2026-10-31" }).map((i) => i.number)).toEqual([10, 11]);
    expect(filterIssues(list, { from: "2026-10-10" }).map((i) => i.number)).toEqual([11]);
    expect(filterIssues(list, { to: "2026-08-01" }).map((i) => i.number)).toEqual([12]);
  });

  it("labelCounts: unik, terurut, berjumlah", () => {
    expect(labelCounts(list)).toEqual([
      { name: "bug", count: 1 },
      { name: "enhancement", count: 2 },
      { name: "phase:MAP-01", count: 1 },
    ]);
  });
});

describe("kalender", () => {
  it("dailyActivity: issue dihitung di tanggal dibuat dan tanggal ditutup", () => {
    const m = dailyActivity([
      issue({ number: 1, createdDate: "2026-10-01", closedDate: "2026-10-03", status: "closed" }),
      issue({ number: 2, createdDate: "2026-10-03" }),
    ]);
    expect(m.get("2026-10-01")!.created.map((i) => i.number)).toEqual([1]);
    expect(m.get("2026-10-03")!.created.map((i) => i.number)).toEqual([2]);
    expect(m.get("2026-10-03")!.closed.map((i) => i.number)).toEqual([1]);
  });

  it("dailyActivity dengan rentang Aktivitas: kejadian di luar rentang tidak diplot (owner 2026-10-13)", () => {
    const m = dailyActivity(
      [
        issue({ number: 1, createdDate: "2026-10-03", closedDate: "2026-10-20", status: "closed" }),
        issue({ number: 2, createdDate: "2026-09-28", closedDate: "2026-10-04", status: "closed" }),
      ],
      { from: "2026-10-01", to: "2026-10-05" },
    );
    expect(m.get("2026-10-03")!.created.map((i) => i.number)).toEqual([1]);
    expect(m.get("2026-10-04")!.closed.map((i) => i.number)).toEqual([2]);
    expect(m.has("2026-10-20")).toBe(false); // ditutup sesudah rentang
    expect(m.has("2026-09-28")).toBe(false); // dibuat sebelum rentang
    // Hanya satu sisi rentang yang terisi tetap membatasi sisi itu saja.
    expect(dailyActivity([issue({ number: 3, createdDate: "2026-10-03", closedDate: "2026-10-20", status: "closed" })], { from: "2026-10-10" }).has("2026-10-03")).toBe(false);
  });

  it("monthGrid: Senin di kolom pertama, kelipatan 7", () => {
    // 1 Oktober 2026 = Kamis → 3 sel kosong (Sen–Rab).
    const cells = monthGrid("2026-10");
    expect(cells.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
    expect(cells.filter(Boolean)).toHaveLength(31);
    expect(cells.length % 7).toBe(0);
  });

  it("shiftMonth & addDays melintasi batas tahun", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
});

describe("weeklyTrend", () => {
  it("minggu Senin–Minggu tanpa lompatan; jumlah terbuka di akhir minggu", () => {
    const weeks = weeklyTrend(
      [
        issue({ number: 1, createdDate: "2026-09-28", closedDate: "2026-10-06", status: "closed" }), // Senin
        issue({ number: 2, createdDate: "2026-10-04" }), // Minggu, masih minggu 28 Sep
      ],
      "2026-10-13",
    );
    expect(weeks).toEqual([
      { week: "2026-09-28", created: 2, closed: 0, openAtEnd: 2, closedTotal: 0 },
      { week: "2026-10-05", created: 0, closed: 1, openAtEnd: 1, closedTotal: 1 },
      { week: "2026-10-12", created: 0, closed: 0, openAtEnd: 1, closedTotal: 1 },
    ]);
    // Akumulasi bertumpuk: ditutup + terbuka = kumulatif dibuat.
    for (const w of weeks) expect(w.closedTotal + w.openAtEnd).toBe(2);
  });

  it("clipWeeks: minggu yang beririsan rentang; angka terbuka tetap dari riwayat penuh", () => {
    // #1 terbuka sejak Juni tanpa aktivitas di Oktober — tetap terhitung terbuka.
    const all = weeklyTrend(
      [issue({ number: 1, createdDate: "2026-06-01" }), issue({ number: 2, createdDate: "2026-10-07" })],
      "2026-10-13",
    );
    const clipped = clipWeeks(all, "2026-10-01", "2026-10-13");
    expect(clipped.map((w) => w.week)).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
    expect(clipped.map((w) => w.openAtEnd)).toEqual([1, 2, 2]);
    expect(clipWeeks(all, null, null)).toHaveLength(all.length);
  });

  it("kosong → []", () => {
    expect(weeklyTrend([], "2026-10-13")).toEqual([]);
  });
});

describe("kanban", () => {
  const today = "2026-10-13";
  it("kolom dari label status; tanpa label = belum direncanakan; label ganda → tahap paling lanjut", () => {
    expect(kanbanColumn(issue({ number: 1 }), today)).toBe("unplanned");
    expect(kanbanColumn(issue({ number: 1, labels: ["status:todo"] }), today)).toBe("todo");
    expect(kanbanColumn(issue({ number: 1, labels: ["status:in-progress"] }), today)).toBe("in_progress");
    expect(kanbanColumn(issue({ number: 1, labels: ["status:todo", "status:decision"] }), today)).toBe("decision");
  });

  it("closed hanya ≤ 30 hari terakhir (batas inklusif), apa pun labelnya", () => {
    const closed = (closedDate: string) => issue({ number: 1, status: "closed", closedDate, labels: ["status:todo"] });
    expect(kanbanColumn(closed("2026-09-13"), today)).toBe("closed");
    expect(kanbanColumn(closed("2026-09-12"), today)).toBeNull();
    expect(kanbanColumn({ ...closed("2026-10-01"), status: "not_planned" }, today)).toBe("closed");
  });

  it("kanbanBoard: kolom Closed terbaru ditutup di atas", () => {
    const board = kanbanBoard(
      [
        issue({ number: 1, status: "closed", closedDate: "2026-10-01" }),
        issue({ number: 2, status: "closed", closedDate: "2026-10-10" }),
        issue({ number: 3 }),
      ],
      today,
    );
    expect(board.closed.map((i) => i.number)).toEqual([2, 1]);
    expect(board.unplanned.map((i) => i.number)).toEqual([3]);
  });
});

describe("sortIssues (List & Excel)", () => {
  const list = [
    issue({ number: 1, createdDate: "2026-10-02", closedDate: "2026-10-05", status: "closed" }),
    issue({ number: 2, createdDate: "2026-10-01" }),
    issue({ number: 3, createdDate: "2026-10-02", closedDate: "2026-10-03", status: "closed" }),
  ];
  it("bawaan nomor menurun; tanggal sama → nomor menurun apa pun arahnya", () => {
    expect(sortIssues(list, { key: "number", dir: "desc" }).map((i) => i.number)).toEqual([3, 2, 1]);
    expect(sortIssues(list, { key: "created", dir: "asc" }).map((i) => i.number)).toEqual([2, 3, 1]);
    expect(sortIssues(list, { key: "created", dir: "desc" }).map((i) => i.number)).toEqual([3, 1, 2]);
  });
  it("Ditutup: issue terbuka selalu di bawah", () => {
    expect(sortIssues(list, { key: "closed", dir: "asc" }).map((i) => i.number)).toEqual([3, 1, 2]);
    expect(sortIssues(list, { key: "closed", dir: "desc" }).map((i) => i.number)).toEqual([1, 3, 2]);
  });
});

describe("Excel", () => {
  const list = [
    issue({ number: 2, title: "Satu", status: "closed", createdDate: "2026-10-01", closedDate: "2026-10-03" }),
    issue({ number: 1, title: "Dua", status: "not_planned", closedDate: "2026-10-02" }),
    issue({ number: 3, title: "Tiga" }),
  ];

  it("baris: tanggal sebagai Date UTC, status istilah GitHub, open tanpa tanggal tutup", () => {
    const rows = issueExportRows(list);
    expect(rows[0]).toEqual({ closed: new Date("2026-10-03T00:00:00Z"), number: 2, title: "Satu", created: new Date("2026-10-01T00:00:00Z"), status: "Closed" });
    expect(rows[1].status).toBe("Closed (Not planned)");
    expect(rows[2]).toMatchObject({ closed: null, status: "Open" });
  });

  it("workbook: kolom laporan REPORTING, format tanggal, freeze & autofilter", () => {
    const ws = buildIssuesWorkbook(list).getWorksheet("Issue List")!;
    expect(ws.getRow(1).values).toEqual([undefined, "Date Solved (Close)", "No Issue", "Simple Desc", "Date Created", "Status"]);
    expect(ws.rowCount).toBe(4);
    expect(ws.getColumn("closed").numFmt).toBe("dd/mm/yyyy");
    expect(ws.getColumn("created").numFmt).toBe("dd/mm/yyyy");
    expect(ws.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(ws.autoFilter).toBeTruthy();
  });
});
