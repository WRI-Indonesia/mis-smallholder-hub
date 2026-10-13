import { isoWeekStart } from "@/lib/release-metrics";

/**
 * Daftar Issue GitHub (#429) — fungsi murni: normalisasi respons REST GitHub,
 * filter, kalender harian, tren mingguan, kolom kanban, dan baris Excel.
 * Pengambilan datanya di `src/server/actions/github-issues.ts`; modul ini tanpa
 * I/O supaya bisa diuji langsung dan dipakai di client.
 *
 * Semua tanggal = tanggal kalender WIB (UTC+7, tanpa DST) sebagai `YYYY-MM-DD`.
 */

/** Item mentah `GET /repos/{owner}/{repo}/issues` — hanya field yang dipakai. */
export interface GithubIssueRaw {
  number: number;
  title: string;
  state: string;
  state_reason?: string | null;
  labels?: ({ name?: string } | string)[];
  created_at: string;
  closed_at?: string | null;
  html_url: string;
  /** Ada = pull request (endpoint issues ikut mengembalikan PR). */
  pull_request?: unknown;
}

export type IssueStatus = "open" | "closed" | "not_planned" | "duplicate";

export interface GithubIssue {
  number: number;
  title: string;
  status: IssueStatus;
  labels: string[];
  /** Tanggal WIB `YYYY-MM-DD`. */
  createdDate: string;
  /** Tanggal WIB `YYYY-MM-DD`; `null` bila masih open. */
  closedDate: string | null;
  url: string;
}

export const ISSUE_STATUS_ORDER: IssueStatus[] = ["open", "closed", "not_planned", "duplicate"];

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  open: "Terbuka",
  closed: "Selesai",
  not_planned: "Tidak dikerjakan",
  duplicate: "Duplikat",
};

/** Istilah GitHub untuk kolom Status Excel — sama dengan laporan manual di REPORTING/. */
const EXPORT_STATUS_LABEL: Record<IssueStatus, string> = {
  open: "Open",
  closed: "Closed",
  not_planned: "Closed (Not planned)",
  duplicate: "Closed (Duplicate)",
};

const WIB_OFFSET_MS = 7 * 3600_000;

/** ISO timestamp (UTC) → tanggal kalender WIB `YYYY-MM-DD`. */
export function toWibDate(iso: string): string {
  return new Date(new Date(iso).getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Tanggal ISO + n hari (boleh negatif). */
export function addDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function issueStatus(raw: GithubIssueRaw): IssueStatus {
  if (raw.state === "open") return "open";
  if (raw.state_reason === "not_planned") return "not_planned";
  if (raw.state_reason === "duplicate") return "duplicate";
  return "closed";
}

/**
 * Buang pull request, ratakan label, tanggal ke WIB; urut nomor menurun.
 * Dedup per nomor: paginasi `page=` atas daftar yang berubah selama diambil
 * bisa mengembalikan item yang sama di dua halaman (review #429).
 */
export function normalizeIssues(raw: GithubIssueRaw[]): GithubIssue[] {
  const seen = new Set<number>();
  return raw
    .filter((r) => r.pull_request == null && !seen.has(r.number) && seen.add(r.number))
    .map((r) => ({
      number: r.number,
      title: r.title,
      status: issueStatus(r),
      labels: (r.labels ?? [])
        .map((l) => (typeof l === "string" ? l : (l.name ?? "")))
        .filter(Boolean),
      createdDate: toWibDate(r.created_at),
      closedDate: r.state === "open" || !r.closed_at ? null : toWibDate(r.closed_at),
      url: r.html_url,
    }))
    .sort((a, b) => b.number - a.number);
}

export interface IssueFilter {
  /** Kata-kata (spasi) yang semuanya harus cocok dengan nomor/judul/label. */
  query?: string;
  status?: IssueStatus | null;
  label?: string | null;
  /** Rentang aktivitas: issue DIBUAT atau DITUTUP di dalam [from, to] (inklusif). */
  from?: string | null;
  to?: string | null;
}

export function filterIssues(issues: GithubIssue[], f: IssueFilter): GithubIssue[] {
  const words = (f.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const from = f.from || "0000-00-00";
  const to = f.to || "9999-99-99";
  const inRange = (d: string | null) => d != null && d >= from && d <= to;
  return issues.filter((i) => {
    if (f.status && i.status !== f.status) return false;
    if (f.label && !i.labels.includes(f.label)) return false;
    if ((f.from || f.to) && !inRange(i.createdDate) && !inRange(i.closedDate)) return false;
    if (words.length === 0) return true;
    const hay = `#${i.number} ${i.title} ${i.labels.join(" ")}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** Label unik + jumlah issue, urut nama. */
export function labelCounts(issues: GithubIssue[]): { name: string; count: number }[] {
  const m = new Map<string, number>();
  for (const i of issues) for (const l of i.labels) m.set(l, (m.get(l) ?? 0) + 1);
  return [...m].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

export interface DayActivity {
  created: GithubIssue[];
  closed: GithubIssue[];
}

/** Kalender: tanggal WIB → issue yang dibuat & ditutup pada tanggal itu. */
export function dailyActivity(issues: GithubIssue[]): Map<string, DayActivity> {
  const m = new Map<string, DayActivity>();
  const slot = (d: string) => {
    let a = m.get(d);
    if (!a) m.set(d, (a = { created: [], closed: [] }));
    return a;
  };
  for (const i of issues) {
    slot(i.createdDate).created.push(i);
    if (i.closedDate) slot(i.closedDate).closed.push(i);
  }
  return m;
}

/** Sel kalender bulanan (Senin di kolom pertama); `null` = sel kosong pengisi. */
export function monthGrid(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 0; d < days; d++) cells.push(addDays(first, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Bulan `YYYY-MM` ± n. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

export interface WeekBucket {
  /** Senin minggu itu, `YYYY-MM-DD`. */
  week: string;
  created: number;
  closed: number;
  /** Issue yang masih terbuka di akhir minggu (Minggu) — atau hari ini untuk minggu berjalan. */
  openAtEnd: number;
  /** Kumulatif issue yang sudah ditutup s.d. akhir minggu; `closedTotal + openAtEnd` = kumulatif dibuat. */
  closedTotal: number;
}

/**
 * Tren mingguan dari minggu issue pertama sampai minggu `today`. Minggu tanpa
 * aktivitas tetap muncul (sumbu waktu tidak melompat).
 */
export function weeklyTrend(issues: GithubIssue[], today: string): WeekBucket[] {
  if (issues.length === 0) return [];
  const created = new Map<string, number>();
  const closed = new Map<string, number>();
  let start = isoWeekStart(today);
  for (const i of issues) {
    const w = isoWeekStart(i.createdDate);
    created.set(w, (created.get(w) ?? 0) + 1);
    if (w < start) start = w;
    if (i.closedDate) {
      const cw = isoWeekStart(i.closedDate);
      closed.set(cw, (closed.get(cw) ?? 0) + 1);
    }
  }
  const out: WeekBucket[] = [];
  const last = isoWeekStart(today);
  let open = 0;
  let closedTotal = 0;
  for (let w = start; w <= last; w = addDays(w, 7)) {
    const c = created.get(w) ?? 0;
    const x = closed.get(w) ?? 0;
    open += c - x;
    closedTotal += x;
    out.push({ week: w, created: c, closed: x, openAtEnd: open, closedTotal });
  }
  return out;
}

/**
 * Potong tren ke rentang aktivitas: minggu yang beririsan dengan [from, to].
 * Tren SELALU dihitung dari daftar tanpa filter Status & Aktivitas (hanya
 * cari + label) lalu dipotong di sini — menghitungnya dari daftar yang sudah
 * disaring rentang membuang issue yang terbuka sepanjang rentang, sehingga
 * angka "masih terbuka" dan kumulatifnya salah (review #429).
 */
export function clipWeeks(weeks: WeekBucket[], from?: string | null, to?: string | null): WeekBucket[] {
  return weeks.filter((b) => (!from || addDays(b.week, 6) >= from) && (!to || b.week <= to));
}

export type IssueSortKey = "number" | "created" | "closed";
export interface IssueSort {
  key: IssueSortKey;
  dir: "asc" | "desc";
}
export const DEFAULT_ISSUE_SORT: IssueSort = { key: "number", dir: "desc" };

/**
 * Urutan tab List — dipakai juga Unduh Excel supaya berkas = tampilan.
 * Issue tanpa tanggal tutup selalu di bawah saat diurut menurut Ditutup;
 * nilai sama → nomor menurun.
 */
export function sortIssues(issues: GithubIssue[], sort: IssueSort): GithubIssue[] {
  const val = (i: GithubIssue): number | string =>
    sort.key === "number" ? i.number : sort.key === "created" ? i.createdDate : (i.closedDate ?? "");
  return [...issues].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (sort.key === "closed" && (va === "" || vb === "")) return va === vb ? b.number - a.number : va === "" ? 1 : -1;
    if (va === vb) return b.number - a.number;
    const c = va < vb ? -1 : 1;
    return sort.dir === "asc" ? c : -c;
  });
}

export type KanbanColumn = "unplanned" | "todo" | "in_progress" | "decision" | "closed";

export const KANBAN_COLUMNS: KanbanColumn[] = ["unplanned", "todo", "in_progress", "decision", "closed"];

export const KANBAN_LABEL: Record<KanbanColumn, string> = {
  unplanned: "Belum direncanakan",
  todo: "Todo",
  in_progress: "Dikerjakan",
  decision: "Menunggu keputusan",
  closed: "Closed (30 hari)",
};

/** Label status di GitHub — disinkronkan dari `sprint.md` oleh `/pagi` Tahap 4. */
export const STATUS_LABELS = {
  todo: "status:todo",
  in_progress: "status:in-progress",
  decision: "status:decision",
} as const;

/** Jendela kolom Closed: issue ditutup ≤ 30 hari sebelum `today`. */
export const KANBAN_CLOSED_DAYS = 30;

/**
 * Kolom kanban satu issue; `null` = tidak tampil (closed lebih lama dari
 * jendela). Bila sebuah issue tak sengaja punya beberapa label `status:*`,
 * tahap paling lanjut yang menang (keputusan > dikerjakan > todo).
 */
export function kanbanColumn(issue: GithubIssue, today: string): KanbanColumn | null {
  if (issue.status !== "open") {
    return issue.closedDate && issue.closedDate >= addDays(today, -KANBAN_CLOSED_DAYS) ? "closed" : null;
  }
  if (issue.labels.includes(STATUS_LABELS.decision)) return "decision";
  if (issue.labels.includes(STATUS_LABELS.in_progress)) return "in_progress";
  if (issue.labels.includes(STATUS_LABELS.todo)) return "todo";
  return "unplanned";
}

export function kanbanBoard(issues: GithubIssue[], today: string): Record<KanbanColumn, GithubIssue[]> {
  const board = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c, [] as GithubIssue[]])) as Record<KanbanColumn, GithubIssue[]>;
  for (const i of issues) {
    const col = kanbanColumn(i, today);
    if (col) board[col].push(i);
  }
  // Closed: yang terbaru ditutup di atas.
  board.closed.sort((a, b) => (b.closedDate ?? "").localeCompare(a.closedDate ?? "") || b.number - a.number);
  return board;
}

/** `YYYY-MM-DD` → Date UTC tengah malam (sel tanggal Excel tanpa jam). */
const excelDate = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`) : null);

export const EXPORT_COLUMNS = [
  { header: "Date Solved (Close)", key: "closed", width: 20 },
  { header: "No Issue", key: "number", width: 10 },
  { header: "Simple Desc", key: "title", width: 90 },
  { header: "Date Created", key: "created", width: 16 },
  { header: "Status", key: "status", width: 22 },
];

/** Baris Excel — kolom sama dengan laporan manual `REPORTING/issue-list-*.xlsx`. */
export function issueExportRows(issues: GithubIssue[]) {
  return issues.map((i) => ({
    closed: excelDate(i.closedDate),
    number: i.number,
    title: i.title,
    created: excelDate(i.createdDate),
    status: EXPORT_STATUS_LABEL[i.status],
  }));
}
