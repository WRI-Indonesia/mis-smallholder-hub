/**
 * Parser rencana sprint mingguan (#378 — menu Data Analyst › Sprint Mingguan).
 * Sumber tunggal: `docs/project/sprint.md` §Sprint Focus (di-bundle
 * `asset/source`), hanya heading `#### Sprint …` beserta tabelnya dan daftar
 * `#### Backlog …`. Riwayat fokus lama di blok `<details>` tidak diparse.
 *
 * Format rusak melempar — build/boot gagal, bukan salah render diam-diam
 * (pola `tech-debt.ts` / `release-metrics.ts`).
 */

export type SprintItemStatus = "todo" | "progress" | "decision" | "done" | "moved";

/** Kategori fokus — urutan ini = urutan prioritas "risiko prod dulu" & urutan warna. */
export const SPRINT_CATEGORIES = ["Keamanan", "Rilis", "Performa", "Data", "Fitur", "Kerapian"] as const;
export type SprintCategory = (typeof SPRINT_CATEGORIES)[number];

/** Ukuran butir → poin: S ≤ ½ hari, M 1–2 hari, L 3+ hari (sebaiknya dipecah). */
export const SPRINT_SIZE_POINTS = { S: 1, M: 3, L: 5 } as const;
export type SprintSize = keyof typeof SPRINT_SIZE_POINTS;

export type SprintItem = {
  /** Nomor baris di tabel sprint. */
  no: number;
  /** Isi kolom Issue apa adanya (markdown inline). */
  issue: string;
  /** Rujukan issue `#nnn` yang disebut di kolom Issue, urut kemunculan. */
  issueRefs: string[];
  category: SprintCategory;
  size: SprintSize;
  points: number;
  target: string;
  status: SprintItemStatus;
  /** Kolom Keputusan owner; null bila "—"/kosong. */
  decision: string | null;
};

export type Sprint = {
  number: number;
  /** "YYYY-MM-DD" (Senin). */
  start: string;
  /** "YYYY-MM-DD" (Minggu). */
  end: string;
  title: string;
  items: SprintItem[];
};

export type SprintPlan = {
  sprints: Sprint[];
  /** Judul heading backlog, mis. "Backlog terurut (setelah Sprint 4)"; null bila tidak ada. */
  backlogTitle: string | null;
  /** Butir daftar bernomor backlog (markdown inline, tanpa nomor). */
  backlog: string[];
};

export type SprintPhase = "past" | "active" | "upcoming";

/** Awalan emoji kolom Status → kunci status. */
const STATUS_PREFIX: [string, SprintItemStatus][] = [
  ["🔲", "todo"],
  ["🟡", "progress"],
  ["⚖️", "decision"],
  ["✅", "done"],
  ["⏭️", "moved"],
];

export const SPRINT_STATUS_LABEL: Record<SprintItemStatus, string> = {
  todo: "Todo",
  progress: "Dikerjakan",
  decision: "Menunggu keputusan",
  done: "Selesai",
  moved: "Digeser",
};

const SPRINT_HEADING = /^#### Sprint (\d+) · (\d{4}-\d{2}-\d{2}) → (\d{4}-\d{2}-\d{2}) — (.+)$/;
const BACKLOG_HEADING = /^#### (Backlog.*)$/;
const ROW = /^\|\s*(\d+)\s*\|/;
const LIST_ITEM = /^\d+\.\s+(.+)$/;
const EMPTY_CELL = /^(—|-|)$/;

function parseStatus(cell: string, where: string): SprintItemStatus {
  const hit = STATUS_PREFIX.find(([prefix]) => cell.startsWith(prefix));
  if (!hit) throw new Error(`sprint.md: status tak dikenal "${cell}" (${where})`);
  return hit[1];
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

export function parseSprintPlan(markdown: string): SprintPlan {
  const start = markdown.indexOf("### Sprint Focus");
  if (start === -1) throw new Error("sprint.md: section 'Sprint Focus' tidak ditemukan");
  const rest = markdown.slice(start);
  // Berhenti di riwayat fokus lama (<details>) atau section ### berikutnya.
  const stops = [rest.indexOf("\n<details>"), rest.indexOf("\n### ", 1)].filter((i) => i !== -1);
  const section = stops.length > 0 ? rest.slice(0, Math.min(...stops)) : rest;

  const sprints: Sprint[] = [];
  const backlog: string[] = [];
  let backlogTitle: string | null = null;
  let current: Sprint | null = null;
  let inBacklog = false;

  for (const raw of section.split("\n")) {
    const line = raw.trim();
    const heading = line.match(SPRINT_HEADING);
    if (heading) {
      current = { number: Number(heading[1]), start: heading[2], end: heading[3], title: heading[4].trim(), items: [] };
      sprints.push(current);
      inBacklog = false;
      continue;
    }
    const backlogHeading = line.match(BACKLOG_HEADING);
    if (backlogHeading) {
      backlogTitle = backlogHeading[1].trim();
      current = null;
      inBacklog = true;
      continue;
    }
    if (line.startsWith("#### ")) {
      throw new Error(`sprint.md: heading tak dikenal "${line}" — pakai "#### Sprint <n> · <mulai> → <selesai> — <judul>"`);
    }
    if (current && ROW.test(line)) {
      const cells = splitRow(line);
      const where = `Sprint ${current.number} baris ${cells[0]}`;
      if (cells.length !== 7) throw new Error(`sprint.md: ${where} harus 7 kolom, ditemukan ${cells.length}`);
      const [no, issue, category, size, target, status, decision] = cells;
      if (!(SPRINT_CATEGORIES as readonly string[]).includes(category)) {
        throw new Error(`sprint.md: kategori tak dikenal "${category}" (${where}) — pakai ${SPRINT_CATEGORIES.join("/")}`);
      }
      if (!(size in SPRINT_SIZE_POINTS)) throw new Error(`sprint.md: poin tak dikenal "${size}" (${where}) — pakai S/M/L`);
      current.items.push({
        no: Number(no),
        issue,
        issueRefs: [...issue.matchAll(/#(\d+)/g)].map((m) => `#${m[1]}`),
        category: category as SprintCategory,
        size: size as SprintSize,
        points: SPRINT_SIZE_POINTS[size as SprintSize],
        target,
        status: parseStatus(status, where),
        decision: EMPTY_CELL.test(decision) ? null : decision,
      });
      continue;
    }
    if (inBacklog) {
      const item = line.match(LIST_ITEM);
      if (item) backlog.push(item[1].trim());
    }
  }

  if (sprints.length === 0) throw new Error("sprint.md: tidak ada sprint terparse — format heading berubah?");
  for (const s of sprints) {
    if (s.items.length === 0) throw new Error(`sprint.md: Sprint ${s.number} tanpa baris tabel`);
    if (s.start > s.end) throw new Error(`sprint.md: Sprint ${s.number} tanggal mulai sesudah selesai`);
  }
  return { sprints, backlogTitle, backlog };
}

/** Posisi sprint terhadap `today` ("YYYY-MM-DD", WIB) — batas inklusif. */
export function sprintPhase(sprint: Pick<Sprint, "start" | "end">, today: string): SprintPhase {
  if (today < sprint.start) return "upcoming";
  if (today > sprint.end) return "past";
  return "active";
}

/** Hari ke-n (1–7) dalam sprint untuk `today`; null bila di luar rentang. */
export function sprintDay(sprint: Pick<Sprint, "start" | "end">, today: string): number | null {
  if (sprintPhase(sprint, today) !== "active") return null;
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${sprint.start}T00:00:00Z`)) / 86_400_000) + 1;
}

/**
 * Kemajuan sprint dalam butir dan poin. Butir "Digeser" tidak dihitung ke
 * total: ia sudah ditulis ulang di sprint tujuannya, jadi menghitungnya di dua
 * tempat membuat kemajuan tampak lebih rendah dari sebenarnya.
 */
export function sprintProgress(sprint: Pick<Sprint, "items">) {
  const counted = sprint.items.filter((i) => i.status !== "moved");
  const done = counted.filter((i) => i.status === "done");
  return {
    done: done.length,
    total: counted.length,
    donePoints: done.reduce((s, i) => s + i.points, 0),
    totalPoints: counted.reduce((s, i) => s + i.points, 0),
  };
}

export type SprintVelocity = { number: number; phase: SprintPhase; planned: number; done: number };

/**
 * Velocity per sprint: poin direncanakan (tanpa butir Digeser) vs selesai.
 * `average` hanya dari sprint yang sudah lewat — sprint berjalan belum selesai
 * dan akan menarik rata-rata ke bawah. null bila belum ada sprint lewat.
 */
export function sprintVelocity(plan: Pick<SprintPlan, "sprints">, today: string) {
  const rows: SprintVelocity[] = plan.sprints.map((s) => {
    const p = sprintProgress(s);
    return { number: s.number, phase: sprintPhase(s, today), planned: p.totalPoints, done: p.donePoints };
  });
  const past = rows.filter((r) => r.phase === "past");
  const average = past.length === 0 ? null : past.reduce((s, r) => s + r.done, 0) / past.length;
  return { rows, average };
}

export type PendingDecision = { sprint: number; item: SprintItem };

/** Butir ⚖️ di sprint aktif & mendatang — sprint lewat adalah riwayat, bukan antrean. */
export function pendingDecisions(plan: Pick<SprintPlan, "sprints">, today: string): PendingDecision[] {
  return plan.sprints
    .filter((s) => sprintPhase(s, today) !== "past")
    .flatMap((s) => s.items.filter((i) => i.status === "decision").map((item) => ({ sprint: s.number, item })));
}

export type CarryOver = { ref: string; issue: string; movedFrom: number[]; latestSprint: number };

/**
 * Carry-over: rujukan issue yang ber-status Digeser di satu atau lebih sprint.
 * Satu butir tanpa `#nnn` (mis. "Rilis v1.2.0") dikenali dari teks kolom Issue.
 */
export function carryOvers(plan: Pick<SprintPlan, "sprints">): CarryOver[] {
  const byKey = new Map<string, CarryOver>();
  for (const s of plan.sprints) {
    for (const item of s.items) {
      const keys = item.issueRefs.length > 0 ? item.issueRefs : [item.issue];
      for (const key of keys) {
        const entry = byKey.get(key);
        if (item.status === "moved") {
          if (entry) entry.movedFrom.push(s.number);
          else byKey.set(key, { ref: key, issue: item.issue, movedFrom: [s.number], latestSprint: s.number });
        }
        const e = byKey.get(key);
        if (e) e.latestSprint = Math.max(e.latestSprint, s.number);
      }
    }
  }
  return [...byKey.values()].sort((a, b) => b.movedFrom.length - a.movedFrom.length || a.movedFrom[0] - b.movedFrom[0]);
}

/** Poin per kategori (tanpa butir Digeser), urut `SPRINT_CATEGORIES`, kategori nol ikut (0). */
export function sprintComposition(sprint: Pick<Sprint, "items">): { category: SprintCategory; points: number }[] {
  return SPRINT_CATEGORIES.map((category) => ({
    category,
    points: sprint.items.filter((i) => i.status !== "moved" && i.category === category).reduce((s, i) => s + i.points, 0),
  }));
}
