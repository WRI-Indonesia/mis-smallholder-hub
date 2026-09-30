/**
 * Parser rencana sprint mingguan (#378 — menu Data Analyst › Sprint Mingguan).
 * Sumber tunggal: `docs/project/sprint.md` §Sprint Focus (di-bundle
 * `asset/source`), hanya baris `Terakhir diperbarui: …`, heading `#### Sprint …`
 * beserta tabelnya, dan tabel `#### Backlog …`. Riwayat fokus lama di blok
 * `<details>` tidak diparse.
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

export type BacklogItem = {
  /** Urutan kelompok pengerjaan (boleh berulang: beberapa issue satu kelompok). */
  order: number;
  /** Isi kolom Issue apa adanya (markdown inline). */
  issue: string;
  issueRefs: string[];
  status: SprintItemStatus;
  /** Kolom Catatan; null bila "—"/kosong. */
  note: string | null;
};

export type SprintPlan = {
  /** "YYYY-MM-DD" dari baris `Terakhir diperbarui:` — halaman ini statis (dibaca saat build). */
  updatedAt: string;
  sprints: Sprint[];
  /** Baris tabel backlog, urut dokumen. */
  backlog: BacklogItem[];
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
  todo: "Belum dimulai",
  progress: "Dikerjakan",
  decision: "Menunggu keputusan",
  done: "Selesai",
  moved: "Digeser",
};

const SPRINT_HEADING = /^#### Sprint (\d+) · (\d{4}-\d{2}-\d{2}) → (\d{4}-\d{2}-\d{2}) — (.+)$/;
const BACKLOG_HEADING = /^#### (Backlog.*)$/;
const UPDATED = /^Terakhir diperbarui:\s*(\d{4}-\d{2}-\d{2})\s*$/;
const ROW = /^\|\s*(\d+)\s*\|/;
const ISSUE_REF = /#(\d+)/g;
const EMPTY_CELL = /^(—|-|)$/;

function parseStatus(cell: string, where: string): SprintItemStatus {
  const hit = STATUS_PREFIX.find(([prefix]) => cell.startsWith(prefix));
  if (!hit) throw new Error(`sprint.md: status tak dikenal "${cell}" (${where})`);
  return hit[1];
}

/**
 * Pecah baris tabel GFM pada `|` yang TIDAK di-escape. `\|` (wajib di GFM untuk
 * pipa di dalam sel, termasuk di dalam `kode`) dikembalikan menjadi `|`.
 */
export function splitRow(line: string): string[] {
  const body = line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  return body.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

export function parseSprintPlan(markdown: string): SprintPlan {
  const start = markdown.indexOf("### Sprint Focus");
  if (start === -1) throw new Error("sprint.md: section 'Sprint Focus' tidak ditemukan");
  const rest = markdown.slice(start);
  // Section berakhir di heading ### berikutnya. Blok <details> di dalamnya
  // (riwayat fokus lama, catatan) DILEWATI, bukan jadi titik berhenti — kalau
  // berhenti, catatan terlipat di bawah Sprint 2 diam-diam membuang Sprint 3+.
  const end = rest.indexOf("\n### ", 1);
  const section = end === -1 ? rest : rest.slice(0, end);

  const sprints: Sprint[] = [];
  const backlog: BacklogItem[] = [];
  let updatedAt: string | null = null;
  let current: Sprint | null = null;
  let inBacklog = false;

  let detailsDepth = 0;

  for (const raw of section.split("\n")) {
    const line = raw.trim();
    // Hitung per baris, bukan "baris diawali tag": `<details>…</details>` satu
    // baris atau `teks </details>` dulu membuat kedalaman tak pernah kembali 0 →
    // sisa section (Sprint berikutnya, Backlog) terbuang diam-diam.
    const opens = line.match(/<details\b/g)?.length ?? 0;
    const closes = line.match(/<\/details>/g)?.length ?? 0;
    const inDetails = detailsDepth > 0 || opens > 0;
    detailsDepth = Math.max(0, detailsDepth + opens - closes);
    if (inDetails) continue;
    const updated = line.match(UPDATED);
    if (updated) {
      updatedAt = updated[1];
      continue;
    }
    const heading = line.match(SPRINT_HEADING);
    if (heading) {
      current = { number: Number(heading[1]), start: heading[2], end: heading[3], title: heading[4].trim(), items: [] };
      sprints.push(current);
      inBacklog = false;
      continue;
    }
    const backlogHeading = line.match(BACKLOG_HEADING);
    if (backlogHeading) {
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
        issueRefs: [...issue.matchAll(ISSUE_REF)].map((m) => `#${m[1]}`),
        category: category as SprintCategory,
        size: size as SprintSize,
        points: SPRINT_SIZE_POINTS[size as SprintSize],
        target,
        status: parseStatus(status, where),
        decision: EMPTY_CELL.test(decision) ? null : decision,
      });
      continue;
    }
    if (inBacklog && ROW.test(line)) {
      const cells = splitRow(line);
      const where = `Backlog baris "${cells[1] ?? ""}"`;
      if (cells.length !== 4) throw new Error(`sprint.md: ${where} harus 4 kolom (# · Issue · Status · Catatan), ditemukan ${cells.length}`);
      const [order, issue, status, note] = cells;
      backlog.push({
        order: Number(order),
        issue,
        issueRefs: [...issue.matchAll(ISSUE_REF)].map((m) => `#${m[1]}`),
        status: parseStatus(status, where),
        note: EMPTY_CELL.test(note) ? null : note,
      });
    }
  }

  if (!updatedAt) throw new Error("sprint.md: baris 'Terakhir diperbarui: YYYY-MM-DD' tidak ditemukan di Sprint Focus");

  if (sprints.length === 0) throw new Error("sprint.md: tidak ada sprint terparse — format heading berubah?");
  const seen = new Set<number>();
  for (const s of sprints) {
    if (seen.has(s.number)) throw new Error(`sprint.md: Sprint ${s.number} muncul dua kali`);
    seen.add(s.number);
    const rows = new Set<number>();
    for (const i of s.items) {
      if (rows.has(i.no)) throw new Error(`sprint.md: Sprint ${s.number} baris ${i.no} dobel`);
      rows.add(i.no);
    }
    if (s.items.length === 0) throw new Error(`sprint.md: Sprint ${s.number} tanpa baris tabel`);
    if (s.start > s.end) throw new Error(`sprint.md: Sprint ${s.number} tanggal mulai sesudah selesai`);
  }
  return { updatedAt, sprints, backlog };
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

export type SprintVelocity = { number: number; phase: SprintPhase; planned: number; moved: number; done: number };

/**
 * Velocity per sprint: poin KOMITMEN (termasuk butir yang kemudian Digeser —
 * justru itu yang harus terlihat sebagai selisih rencana vs selesai) vs selesai.
 * Berbeda dengan `sprintProgress`, yang menghitung sisa kerja sprint itu sendiri.
 * `average` hanya dari sprint yang sudah lewat — sprint berjalan belum selesai
 * dan akan menarik rata-rata ke bawah. null bila belum ada sprint lewat.
 */
export function sprintVelocity(plan: Pick<SprintPlan, "sprints">, today: string) {
  const rows: SprintVelocity[] = plan.sprints.map((s) => {
    const p = sprintProgress(s);
    const moved = s.items.filter((i) => i.status === "moved").reduce((t, i) => t + i.points, 0);
    return { number: s.number, phase: sprintPhase(s, today), planned: p.totalPoints + moved, moved, done: p.donePoints };
  });
  const past = rows.filter((r) => r.phase === "past");
  const average = past.length === 0 ? null : past.reduce((s, r) => s + r.done, 0) / past.length;
  return { rows, average };
}

export type PendingDecision = { sprint: number; phase: SprintPhase; item: SprintItem };

/**
 * Semua butir ⚖️ di sprint mana pun. Butir ⚖️ di sprint yang sudah LEWAT tetap
 * masuk (fase "past" = terlambat): keputusan yang belum diambil tidak boleh
 * hilang dari antrean hanya karena minggunya berganti. Yang sudah dipindah
 * berstatus ⏭️, jadi tidak ikut.
 */
export function pendingDecisions(plan: Pick<SprintPlan, "sprints">, today: string): PendingDecision[] {
  return plan.sprints.flatMap((s) =>
    s.items.filter((i) => i.status === "decision").map((item) => ({ sprint: s.number, phase: sprintPhase(s, today), item }))
  );
}

export type CarryOver = {
  issue: string;
  movedFrom: number[];
  /** Sprint tempat butir ini ditulis ulang sesudah pergeseran terakhir; null = belum dijadwalkan (mis. ke backlog). */
  destination: number | null;
};

/**
 * Carry-over dikunci pada **teks kolom Issue** (satu baris = satu butir), bukan
 * per `#nnn`: baris "**#253** · **#320**" adalah satu butir, sedangkan
 * "#286 butir 2" dan "#286 butir 1 & 3" adalah dua butir berbeda. Konsekuensinya
 * butir yang digeser harus ditulis ulang dengan teks Issue yang sama persis.
 */
export function carryOvers(plan: Pick<SprintPlan, "sprints">): CarryOver[] {
  const byIssue = new Map<string, CarryOver>();
  for (const s of plan.sprints) {
    for (const item of s.items) {
      const entry = byIssue.get(item.issue);
      if (item.status === "moved") {
        if (entry) {
          entry.movedFrom.push(s.number);
          entry.destination = null;
        } else byIssue.set(item.issue, { issue: item.issue, movedFrom: [s.number], destination: null });
      } else if (entry) {
        entry.destination = s.number;
      }
    }
  }
  return [...byIssue.values()].sort((a, b) => b.movedFrom.length - a.movedFrom.length || a.movedFrom[0] - b.movedFrom[0]);
}

/** Poin per kategori (tanpa butir Digeser), urut `SPRINT_CATEGORIES`, kategori nol ikut (0). */
export function sprintComposition(sprint: Pick<Sprint, "items">): { category: SprintCategory; points: number }[] {
  return SPRINT_CATEGORIES.map((category) => ({
    category,
    points: sprint.items.filter((i) => i.status !== "moved" && i.category === category).reduce((s, i) => s + i.points, 0),
  }));
}

/**
 * Poin per status satu sprint, urutan tumpukan kolom Analisa (bawah → atas):
 * selesai, dikerjakan, menunggu keputusan, belum dimulai, lalu digeser. Butir
 * digeser ikut agar tinggi kolom = komitmen awal (sama dengan `sprintVelocity`).
 */
export const SPRINT_STACK_ORDER: SprintItemStatus[] = ["done", "progress", "decision", "todo", "moved"];

export function sprintStatusPoints(sprint: Pick<Sprint, "items">): Record<SprintItemStatus, number> {
  const out: Record<SprintItemStatus, number> = { done: 0, progress: 0, decision: 0, todo: 0, moved: 0 };
  for (const i of sprint.items) out[i.status] += i.points;
  return out;
}

/**
 * Ringkasan seluruh rencana untuk kartu Analisa. `points` tanpa butir digeser
 * (sudah ditulis ulang di sprint tujuannya — menghitungnya dua kali menggelembungkan
 * rencana); `pendingShare` = porsi poin rencana yang tertahan keputusan owner.
 */
export function planTotals(plan: Pick<SprintPlan, "sprints">) {
  const points = plan.sprints.reduce((t, s) => t + sprintProgress(s).totalPoints, 0);
  const pending = plan.sprints.reduce((t, s) => t + sprintStatusPoints(s).decision, 0);
  return {
    sprints: plan.sprints.length,
    points,
    pendingPoints: pending,
    pendingShare: points === 0 ? 0 : pending / points,
    end: plan.sprints.length === 0 ? null : plan.sprints[plan.sprints.length - 1].end,
  };
}

/**
 * Kolom kanban tab Sprint (#389), urut alur penyelesaian: belum dimulai →
 * dikerjakan → menunggu keputusan → selesai. Butir digeser TIDAK masuk kolom
 * (sisa kerja sprint tujuan) — dikembalikan terpisah untuk lajur terlipat.
 * Urutan butir dalam kolom = urutan baris di `sprint.md`.
 */
export const KANBAN_COLUMNS: Exclude<SprintItemStatus, "moved">[] = ["todo", "progress", "decision", "done"];

export function sprintKanban(sprint: Pick<Sprint, "items">): {
  columns: { status: Exclude<SprintItemStatus, "moved">; items: SprintItem[]; points: number }[];
  moved: SprintItem[];
} {
  return {
    columns: KANBAN_COLUMNS.map((status) => {
      const items = sprint.items.filter((i) => i.status === status);
      return { status, items, points: items.reduce((t, i) => t + i.points, 0) };
    }),
    moved: sprint.items.filter((i) => i.status === "moved"),
  };
}


export type IssuePlace = { kind: "sprint"; sprint: number } | { kind: "backlog"; order: number };

export type IssueRow = {
  /** "#nnn", atau kode lain (mis. "TD-049") untuk butir backlog tanpa issue GitHub. */
  ref: string;
  /** true bila `ref` = issue GitHub (bisa ditautkan). */
  isIssue: boolean;
  /** Nomor issue; butir tanpa issue diurutkan di akhir. */
  number: number;
  place: IssuePlace;
  status: SprintItemStatus;
  /** Kategori butir sprint; null untuk backlog (belum dikategorikan). */
  category: SprintCategory | null;
  /** Kolom Issue tanpa rujukan `#nnn` dan tanpa tebal (markdown inline sisanya). */
  description: string;
  /** Catatan baris backlog; null untuk baris sprint. */
  note: string | null;
};

/** "**#286 butir 2** Key FIRMS …" → "butir 2 Key FIRMS …". */
export function issueDescription(issue: string, ref: string): string {
  return issue
    .replace(/\*\*/g, "")
    .replace(new RegExp(`${ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\d)`), "")
    .replace(/^[\s·:—-]+/, "")
    .trim();
}

/**
 * Tab Semua Issue: satu baris per rujukan `#nnn` di kolom Issue sprint + backlog,
 * urut nomor issue lalu posisi (sprint sebelum backlog). Satu issue bisa muncul
 * beberapa kali bila dipecah per bagian ("#380 bagian 1", "#286 butir 2") —
 * status melekat pada bagiannya, bukan pada issue. Butir sprint "Digeser" tidak
 * ikut: ia sudah ditulis ulang di sprint tujuan atau backlog. Baris SPRINT tanpa
 * `#nnn` (rilis) tidak ikut; baris BACKLOG tanpa `#nnn` (TD-xxx) tetap ikut
 * dengan kode awal kolom Issue sebagai rujukan — backlog hanya tampil di sini.
 */
export function allIssues(plan: Pick<SprintPlan, "sprints" | "backlog">): IssueRow[] {
  const rows: IssueRow[] = [];
  for (const s of plan.sprints) {
    for (const item of s.items) {
      if (item.status === "moved") continue;
      for (const ref of item.issueRefs) {
        rows.push({ ref, isIssue: true, number: Number(ref.slice(1)), place: { kind: "sprint", sprint: s.number }, status: item.status, category: item.category, description: issueDescription(item.issue, ref), note: null });
      }
    }
  }
  for (const item of plan.backlog) {
    if (item.issueRefs.length === 0) {
      const ref = item.issue.replace(/\*\*/g, "").trim().split(/\s+/)[0] ?? "—";
      const base = { status: item.status, category: null, description: issueDescription(item.issue, ref), note: item.note };
      rows.push({ ref, isIssue: false, number: Number.MAX_SAFE_INTEGER, place: { kind: "backlog", order: item.order }, ...base });
      continue;
    }
    for (const ref of item.issueRefs) {
      rows.push({ ref, isIssue: true, number: Number(ref.slice(1)), place: { kind: "backlog", order: item.order }, status: item.status, category: null, description: issueDescription(item.issue, ref), note: item.note });
    }
  }
  return sortIssueRows(rows, "issue", "asc");
}

/** Sprint 1…n lalu Backlog urutan 1…n. */
const placeRank = (p: IssuePlace) => (p.kind === "sprint" ? p.sprint : 1000 + p.order);

export type IssueSortKey = "issue" | "sprint";

/**
 * Urutan tab Semua Issue. Kunci utama dibalik oleh `dir`; kunci kedua (sprint
 * untuk "issue", nomor issue untuk "sprint") selalu menaik agar baris sekelompok
 * tetap mudah dibaca.
 */
export function sortIssueRows(rows: IssueRow[], key: IssueSortKey, dir: "asc" | "desc"): IssueRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) =>
    key === "issue"
      ? sign * (a.number - b.number) || a.ref.localeCompare(b.ref) || placeRank(a.place) - placeRank(b.place)
      : sign * (placeRank(a.place) - placeRank(b.place)) || a.number - b.number || a.ref.localeCompare(b.ref)
  );
}

/** Selisih hari kalender `from` → `to` ("YYYY-MM-DD"); negatif bila `to` lebih awal. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
