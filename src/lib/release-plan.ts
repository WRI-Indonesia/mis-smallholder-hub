/**
 * Parser rencana pengembangan per RILIS (menu Data Analyst › Rencana
 * Pengembangan, route `data-analyst-sprint`; #378 → dirombak 2026-09-30 dari
 * sprint mingguan ke rilis). Sumber tunggal: `docs/project/sprint.md`
 * §Rencana Rilis (di-bundle `asset/source`): baris `Terakhir diperbarui: …`,
 * heading `#### Rilis …` beserta tabelnya, dan tabel `#### Backlog …`. Blok
 * `<details>` di dalam section tidak diparse.
 *
 * Kenapa rilis, bukan minggu: pengembangan dikerjakan satu orang di sela
 * cleaning data & kunjungan distrik — ada minggu padat, ada minggu tanpa coding.
 * Rilis punya tanggal mulai & target bebas; velocity = poin per minggu kalender.
 *
 * Format rusak melempar — build/boot gagal, bukan salah render diam-diam
 * (pola `tech-debt.ts` / `release-metrics.ts`).
 */

export type PlanItemStatus = "todo" | "progress" | "decision" | "done" | "moved";

/** Kategori fokus — urutan ini = urutan prioritas "risiko prod dulu" & urutan warna. */
export const PLAN_CATEGORIES = ["Keamanan", "Rilis", "Performa", "Data", "Fitur", "Kerapian"] as const;
export type PlanCategory = (typeof PLAN_CATEGORIES)[number];

/** Ukuran butir → poin: S ≤ ½ hari kerja, M 1–2 hari, L 3+ hari (sebaiknya dipecah). */
export const PLAN_SIZE_POINTS = { S: 1, M: 3, L: 5 } as const;
export type PlanSize = keyof typeof PLAN_SIZE_POINTS;

export type PlanItem = {
  /** Nomor baris di tabel rilis. */
  no: number;
  /** Isi kolom Issue apa adanya (markdown inline). */
  issue: string;
  /** Rujukan issue `#nnn` yang disebut di kolom Issue, urut kemunculan. */
  issueRefs: string[];
  category: PlanCategory;
  size: PlanSize;
  points: number;
  target: string;
  status: PlanItemStatus;
  /** Kolom Keputusan owner; null bila "—"/kosong. */
  decision: string | null;
};

export type Release = {
  /** "v1.3.0". */
  version: string;
  /** "YYYY-MM-DD". */
  start: string;
  /** Target rilis, "YYYY-MM-DD". */
  end: string;
  /** Tanggal benar-benar dirilis (penanda `(dirilis YYYY-MM-DD)` di akhir heading); null = belum. */
  releasedAt: string | null;
  title: string;
  items: PlanItem[];
};

export type BacklogItem = {
  /** Urutan kelompok pengerjaan (boleh berulang: beberapa issue satu kelompok). */
  order: number;
  /** Isi kolom Issue apa adanya (markdown inline). */
  issue: string;
  issueRefs: string[];
  status: PlanItemStatus;
  /** Kolom Catatan; null bila "—"/kosong. */
  note: string | null;
};

export type ReleasePlan = {
  /** "YYYY-MM-DD" dari baris `Terakhir diperbarui:` — halaman ini statis (dibaca saat build). */
  updatedAt: string;
  releases: Release[];
  /** Baris tabel backlog, urut dokumen. */
  backlog: BacklogItem[];
};

export type ReleasePhase = "past" | "active" | "upcoming";

/** Awalan emoji kolom Status → kunci status. */
const STATUS_PREFIX: [string, PlanItemStatus][] = [
  ["🔲", "todo"],
  ["🟡", "progress"],
  ["⚖️", "decision"],
  ["✅", "done"],
  ["⏭️", "moved"],
];

export const PLAN_STATUS_LABEL: Record<PlanItemStatus, string> = {
  todo: "Belum dimulai",
  progress: "Dikerjakan",
  decision: "Menunggu keputusan",
  done: "Selesai",
  moved: "Digeser",
};

const SECTION_HEADING = "### Rencana Rilis";
const RELEASE_HEADING = /^#### Rilis (v\d+\.\d+\.\d+) · (\d{4}-\d{2}-\d{2}) → (\d{4}-\d{2}-\d{2}) — (.+)$/;
const RELEASED_SUFFIX = /\s*\(dirilis (\d{4}-\d{2}-\d{2})\)$/;
const BACKLOG_HEADING = /^#### Backlog\b/;
const UPDATED = /^Terakhir diperbarui:\s*(\d{4}-\d{2}-\d{2})\s*$/;
const ROW = /^\|\s*(\d+)\s*\|/;
const ISSUE_REF = /#(\d+)/g;
const EMPTY_CELL = /^(—|-|)$/;

function parseStatus(cell: string, where: string): PlanItemStatus {
  const hit = STATUS_PREFIX.find(([prefix]) => cell.startsWith(prefix));
  if (!hit) throw new Error(`sprint.md: status tak dikenal "${cell}" (${where})`);
  return hit[1];
}

const refsOf = (issue: string) => [...issue.matchAll(ISSUE_REF)].map((m) => `#${m[1]}`);

/**
 * Pecah baris tabel GFM pada `|` yang TIDAK di-escape. `\|` (wajib di GFM untuk
 * pipa di dalam sel, termasuk di dalam `kode`) dikembalikan menjadi `|`.
 */
export function splitRow(line: string): string[] {
  const body = line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  return body.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

export function parseReleasePlan(markdown: string): ReleasePlan {
  const start = markdown.indexOf(SECTION_HEADING);
  if (start === -1) throw new Error(`sprint.md: section '${SECTION_HEADING.slice(4)}' tidak ditemukan`);
  const rest = markdown.slice(start);
  // Section berakhir di heading ### berikutnya. Blok <details> di dalamnya
  // DILEWATI, bukan jadi titik berhenti.
  const end = rest.indexOf("\n### ", 1);
  const section = end === -1 ? rest : rest.slice(0, end);

  const releases: Release[] = [];
  const backlog: BacklogItem[] = [];
  let updatedAt: string | null = null;
  let current: Release | null = null;
  let inBacklog = false;
  let detailsDepth = 0;

  for (const raw of section.split("\n")) {
    const line = raw.trim();
    // Hitung per baris, bukan "baris diawali tag": `<details>…</details>` satu
    // baris atau `teks </details>` dulu membuat kedalaman tak pernah kembali 0.
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
    const heading = line.match(RELEASE_HEADING);
    if (heading) {
      const released = heading[4].match(RELEASED_SUFFIX);
      current = {
        version: heading[1],
        start: heading[2],
        end: heading[3],
        releasedAt: released?.[1] ?? null,
        title: heading[4].replace(RELEASED_SUFFIX, "").trim(),
        items: [],
      };
      releases.push(current);
      inBacklog = false;
      continue;
    }
    if (BACKLOG_HEADING.test(line)) {
      current = null;
      inBacklog = true;
      continue;
    }
    if (line.startsWith("#### ")) {
      throw new Error(`sprint.md: heading tak dikenal "${line}" — pakai "#### Rilis v<x.y.z> · <mulai> → <target> — <judul>"`);
    }
    if (current && ROW.test(line)) {
      const cells = splitRow(line);
      const where = `Rilis ${current.version} baris ${cells[0]}`;
      if (cells.length !== 7) throw new Error(`sprint.md: ${where} harus 7 kolom, ditemukan ${cells.length}`);
      const [no, issue, category, size, target, status, decision] = cells;
      if (!(PLAN_CATEGORIES as readonly string[]).includes(category)) {
        throw new Error(`sprint.md: kategori tak dikenal "${category}" (${where}) — pakai ${PLAN_CATEGORIES.join("/")}`);
      }
      if (!(size in PLAN_SIZE_POINTS)) throw new Error(`sprint.md: poin tak dikenal "${size}" (${where}) — pakai S/M/L`);
      current.items.push({
        no: Number(no),
        issue,
        issueRefs: refsOf(issue),
        category: category as PlanCategory,
        size: size as PlanSize,
        points: PLAN_SIZE_POINTS[size as PlanSize],
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
        issueRefs: refsOf(issue),
        status: parseStatus(status, where),
        note: EMPTY_CELL.test(note) ? null : note,
      });
    }
  }

  if (!updatedAt) throw new Error("sprint.md: baris 'Terakhir diperbarui: YYYY-MM-DD' tidak ditemukan di Rencana Rilis");
  if (releases.length === 0) throw new Error("sprint.md: tidak ada rilis terparse — format heading berubah?");
  const seen = new Set<string>();
  releases.forEach((r, i) => {
    if (seen.has(r.version)) throw new Error(`sprint.md: Rilis ${r.version} muncul dua kali`);
    seen.add(r.version);
    const rows = new Set<number>();
    for (const item of r.items) {
      if (rows.has(item.no)) throw new Error(`sprint.md: Rilis ${r.version} baris ${item.no} dobel`);
      rows.add(item.no);
    }
    if (r.items.length === 0) throw new Error(`sprint.md: Rilis ${r.version} tanpa baris tabel`);
    if (r.start > r.end) throw new Error(`sprint.md: Rilis ${r.version} tanggal mulai sesudah target`);
    if (r.releasedAt) {
      if (r.releasedAt < r.start) throw new Error(`sprint.md: Rilis ${r.version} dirilis sebelum tanggal mulai`);
      // Rilis yang sudah keluar tidak boleh menyisakan butir terbuka: yang tidak ikut ditandai ⏭️ dan
      // ditulis ulang di rilis tujuan — kalau tidak, slip hilang dari carry-over & velocity.
      const open = r.items.filter((it) => it.status !== "done" && it.status !== "moved");
      if (open.length > 0) {
        throw new Error(`sprint.md: Rilis ${r.version} sudah dirilis tapi baris ${open.map((it) => it.no).join(", ")} belum ✅/⏭️ — tandai ⏭️ Digeser dan tulis ulang di rilis tujuan`);
      }
    }
    // Rilis berikutnya boleh mulai sesudah rilis sebelumnya benar-benar keluar (bisa lebih awal dari targetnya).
    const prevEnd = i > 0 ? (releases[i - 1].releasedAt ?? releases[i - 1].end) : null;
    if (prevEnd !== null && r.start <= prevEnd) {
      throw new Error(`sprint.md: Rilis ${r.version} mulai sebelum ${releases[i - 1].version} berakhir (${prevEnd}) — urutkan & jangan tumpang tindih`);
    }
  });
  return { updatedAt, releases, backlog };
}

/** Selisih hari kalender `from` → `to` ("YYYY-MM-DD"); negatif bila `to` lebih awal. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Posisi rilis terhadap `today` ("YYYY-MM-DD", WIB) — batas inklusif. */
export function releasePhase(release: Pick<Release, "start" | "end">, today: string): ReleasePhase {
  if (today < release.start) return "upcoming";
  if (today > release.end) return "past";
  return "active";
}

/** Panjang rilis (hari, inklusif), hari ke-n & sisa hari bila sedang berjalan. */
export function releaseTimeline(release: Pick<Release, "start" | "end">, today: string) {
  const days = daysBetween(release.start, release.end) + 1;
  const active = releasePhase(release, today) === "active";
  return { days, day: active ? daysBetween(release.start, today) + 1 : null, daysLeft: active ? daysBetween(today, release.end) : null };
}

/**
 * Kemajuan rilis dalam butir dan poin. Butir "Digeser" tidak dihitung ke
 * total: ia sudah ditulis ulang di rilis tujuan, jadi menghitungnya di dua
 * tempat membuat kemajuan tampak lebih rendah dari sebenarnya.
 */
export function releaseProgress(release: Pick<Release, "items">) {
  const counted = release.items.filter((i) => i.status !== "moved");
  const done = counted.filter((i) => i.status === "done");
  return {
    done: done.length,
    total: counted.length,
    donePoints: done.reduce((s, i) => s + i.points, 0),
    totalPoints: counted.reduce((s, i) => s + i.points, 0),
  };
}

export type ReleaseState = "upcoming" | "active" | "released" | "late";

/**
 * Keadaan rilis untuk pemilih & label. **Dirilis** hanya bila heading bertanda
 * `(dirilis YYYY-MM-DD)` — tanggal kalender saja tidak cukup: rilis bisa keluar
 * sebelum target, dan rilis yang semua butirnya digeser bukan rilis. Tanpa
 * penanda: sebelum mulai = mendatang, dalam rentang = berjalan, lewat target =
 * **terlambat** (tetap tampil di depan sampai ditandai dirilis).
 */
export function releaseState(release: Pick<Release, "start" | "end" | "releasedAt">, today: string): ReleaseState {
  if (release.releasedAt && release.releasedAt <= today) return "released";
  const phase = releasePhase(release, today);
  return phase === "past" ? "late" : phase;
}

export type ReleaseVelocity = { version: string; phase: ReleasePhase; state: ReleaseState; planned: number; moved: number; done: number; weeks: number };

/**
 * Velocity per rilis: poin KOMITMEN (termasuk butir yang kemudian Digeser —
 * selisih rencana vs selesai harus terlihat) vs selesai. `average` = poin
 * selesai per MINGGU KALENDER, hanya dari rilis yang sudah **dirilis**, dengan
 * durasi SEBENARNYA (mulai → tanggal dirilis): rilis berjalan atau terlambat
 * belum selesai dan akan menarik rata-rata ke bawah; target yang meleset tak
 * boleh membuat velocity tampak lebih cepat. Per minggu, bukan per rilis,
 * karena panjang rilis berbeda-beda. `weeks` di baris = durasi rencana (untuk
 * kapasitas). null bila belum ada rilis yang dirilis.
 */
export function releaseVelocity(plan: Pick<ReleasePlan, "releases">, today: string) {
  const rows: ReleaseVelocity[] = plan.releases.map((r) => {
    const p = releaseProgress(r);
    const moved = r.items.filter((i) => i.status === "moved").reduce((t, i) => t + i.points, 0);
    return { version: r.version, phase: releasePhase(r, today), state: releaseState(r, today), planned: p.totalPoints + moved, moved, done: p.donePoints, weeks: (daysBetween(r.start, r.end) + 1) / 7 };
  });
  const shipped = plan.releases.filter((r) => releaseState(r, today) === "released");
  const weeks = shipped.reduce((s, r) => s + (daysBetween(r.start, r.releasedAt!) + 1) / 7, 0);
  const done = shipped.reduce((s, r) => s + releaseProgress(r).donePoints, 0);
  const average = shipped.length === 0 ? null : done / weeks;
  // Ukuran sampel ikut dikembalikan: velocity dari satu rilis pendek mudah menyesatkan,
  // jadi UI menuliskannya di samping angka.
  return { rows, average, sample: { releases: shipped.length, weeks } };
}

export type PendingDecision = { release: string; phase: ReleasePhase; item: PlanItem };

/**
 * Semua butir ⚖️ di rilis mana pun. Butir ⚖️ di rilis yang sudah LEWAT tetap
 * masuk (fase "past" = terlambat): keputusan yang belum diambil tidak boleh
 * hilang dari antrean hanya karena targetnya lewat. Butir backlog ⚖️ tidak
 * berpoin dan tidak ikut di sini — strip header menautkannya terpisah.
 */
export function pendingDecisions(plan: Pick<ReleasePlan, "releases">, today: string): PendingDecision[] {
  return plan.releases.flatMap((r) =>
    r.items.filter((i) => i.status === "decision").map((item) => ({ release: r.version, phase: releasePhase(r, today), item }))
  );
}

export type CarryOver = {
  issue: string;
  movedFrom: string[];
  /** Rilis tempat butir ini ditulis ulang sesudah pergeseran terakhir; null = belum dijadwalkan (mis. ke backlog). */
  destination: string | null;
};

/**
 * Carry-over dikunci pada **teks kolom Issue** (satu baris = satu butir), bukan
 * per `#nnn`: "#286 butir 2" dan "#286 butir 1 & 3" adalah dua butir berbeda.
 * Konsekuensinya butir yang digeser harus ditulis ulang dengan teks Issue yang sama persis.
 */
export function carryOvers(plan: Pick<ReleasePlan, "releases">): CarryOver[] {
  const byIssue = new Map<string, CarryOver>();
  for (const r of plan.releases) {
    for (const item of r.items) {
      const entry = byIssue.get(item.issue);
      if (item.status === "moved") {
        if (entry) {
          entry.movedFrom.push(r.version);
          entry.destination = null;
        } else byIssue.set(item.issue, { issue: item.issue, movedFrom: [r.version], destination: null });
      } else if (entry) {
        entry.destination = r.version;
      }
    }
  }
  const order = new Map(plan.releases.map((r, i) => [r.version, i]));
  return [...byIssue.values()].sort(
    (a, b) => b.movedFrom.length - a.movedFrom.length || (order.get(a.movedFrom[0]) ?? 0) - (order.get(b.movedFrom[0]) ?? 0)
  );
}

/** Poin per kategori (tanpa butir Digeser), urut `PLAN_CATEGORIES`, kategori nol ikut (0). */
export function releaseComposition(release: Pick<Release, "items">): { category: PlanCategory; points: number }[] {
  return PLAN_CATEGORIES.map((category) => ({
    category,
    points: release.items.filter((i) => i.status !== "moved" && i.category === category).reduce((s, i) => s + i.points, 0),
  }));
}

/**
 * Poin per status satu rilis, urutan tumpukan kolom Analisa (bawah → atas):
 * selesai, dikerjakan, menunggu keputusan, belum dimulai, lalu digeser. Butir
 * digeser ikut agar tinggi kolom = komitmen awal (sama dengan `releaseVelocity`).
 */
export const PLAN_STACK_ORDER: PlanItemStatus[] = ["done", "progress", "decision", "todo", "moved"];

export function releaseStatusPoints(release: Pick<Release, "items">): Record<PlanItemStatus, number> {
  const out: Record<PlanItemStatus, number> = { done: 0, progress: 0, decision: 0, todo: 0, moved: 0 };
  for (const i of release.items) out[i.status] += i.points;
  return out;
}

/**
 * Ringkasan seluruh rencana untuk kartu Analisa. `points` tanpa butir digeser
 * (sudah ditulis ulang di rilis tujuan); `pendingShare` = porsi poin rencana
 * yang tertahan keputusan owner.
 */
export function planTotals(plan: Pick<ReleasePlan, "releases">) {
  const points = plan.releases.reduce((t, r) => t + releaseProgress(r).totalPoints, 0);
  const pending = plan.releases.reduce((t, r) => t + releaseStatusPoints(r).decision, 0);
  return {
    releases: plan.releases.length,
    points,
    pendingPoints: pending,
    pendingShare: points === 0 ? 0 : pending / points,
    end: plan.releases.length === 0 ? null : plan.releases[plan.releases.length - 1].end,
  };
}

/**
 * Kolom kanban (#389), urut alur penyelesaian: belum dimulai → dikerjakan →
 * menunggu keputusan → selesai. Butir digeser TIDAK masuk kolom — dikembalikan
 * terpisah untuk lajur terlipat. Urutan butir dalam kolom = urutan baris.
 */
export const KANBAN_COLUMNS: Exclude<PlanItemStatus, "moved">[] = ["todo", "progress", "decision", "done"];

export function releaseKanban(release: Pick<Release, "items">): {
  columns: { status: Exclude<PlanItemStatus, "moved">; items: PlanItem[]; points: number }[];
  moved: PlanItem[];
} {
  return {
    columns: KANBAN_COLUMNS.map((status) => {
      const items = release.items.filter((i) => i.status === status);
      return { status, items, points: items.reduce((t, i) => t + i.points, 0) };
    }),
    moved: release.items.filter((i) => i.status === "moved"),
  };
}

/** Posisi baris di tab Semua Issue. `index` = urutan rilis di dokumen (untuk mengurutkan). */
export type IssuePlace = { kind: "release"; version: string; index: number } | { kind: "backlog"; order: number };

export type IssueRow = {
  /** "#nnn", atau kode lain (mis. "TD-049") untuk butir backlog tanpa issue GitHub. */
  ref: string;
  /** true bila `ref` = issue GitHub (bisa ditautkan). */
  isIssue: boolean;
  /** Nomor issue; butir tanpa issue diurutkan di akhir. */
  number: number;
  place: IssuePlace;
  status: PlanItemStatus;
  /** Kategori butir rilis; null untuk backlog (belum dikategorikan). */
  category: PlanCategory | null;
  /** Kolom Issue tanpa rujukan dan tanpa tebal (markdown inline sisanya). */
  description: string;
  /** Catatan baris backlog; null untuk baris rilis. */
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
 * Tab Semua Issue: satu baris per rujukan `#nnn` di kolom Issue rilis + backlog,
 * urut nomor issue lalu posisi (rilis sebelum backlog). Satu issue bisa muncul
 * beberapa kali bila dipecah per bagian ("#380 bagian 1", "#286 butir 2") —
 * status melekat pada bagiannya. Butir "Digeser" tidak ikut (sudah ditulis ulang
 * di rilis tujuan). Baris RILIS tanpa `#nnn` (butir rilis itu sendiri) tidak ikut;
 * baris BACKLOG tanpa `#nnn` (TD-xxx) tetap ikut dengan kode awal kolom Issue.
 */
export function allIssues(plan: Pick<ReleasePlan, "releases" | "backlog">): IssueRow[] {
  const rows: IssueRow[] = [];
  plan.releases.forEach((r, index) => {
    for (const item of r.items) {
      if (item.status === "moved") continue;
      for (const ref of item.issueRefs) {
        rows.push({
          ref,
          isIssue: true,
          number: Number(ref.slice(1)),
          place: { kind: "release", version: r.version, index },
          status: item.status,
          category: item.category,
          description: issueDescription(item.issue, ref),
          note: null,
        });
      }
    }
  });
  for (const item of plan.backlog) {
    const place = { kind: "backlog", order: item.order } as const;
    if (item.issueRefs.length === 0) {
      const ref = item.issue.replace(/\*\*/g, "").trim().split(/\s+/)[0] ?? "—";
      rows.push({ ref, isIssue: false, number: Number.MAX_SAFE_INTEGER, place, status: item.status, category: null, description: issueDescription(item.issue, ref), note: item.note });
      continue;
    }
    for (const ref of item.issueRefs) {
      rows.push({ ref, isIssue: true, number: Number(ref.slice(1)), place, status: item.status, category: null, description: issueDescription(item.issue, ref), note: item.note });
    }
  }
  return sortIssueRows(rows, "issue", "asc");
}

/** Rilis urut dokumen, lalu Backlog urutan 1…n. */
const placeRank = (p: IssuePlace) => (p.kind === "release" ? p.index : 100_000 + p.order);

export type IssueSortKey = "issue" | "release";

/**
 * Urutan tab Semua Issue. Kunci utama dibalik oleh `dir`; kunci kedua (rilis
 * untuk "issue", nomor issue untuk "release") selalu menaik agar baris
 * sekelompok tetap mudah dibaca.
 */
export function sortIssueRows(rows: IssueRow[], key: IssueSortKey, dir: "asc" | "desc"): IssueRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) =>
    key === "issue"
      ? sign * (a.number - b.number) || a.ref.localeCompare(b.ref) || placeRank(a.place) - placeRank(b.place)
      : sign * (placeRank(a.place) - placeRank(b.place)) || a.number - b.number || a.ref.localeCompare(b.ref)
  );
}
