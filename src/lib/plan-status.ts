/**
 * Ringkasan rencana rilis untuk briefing `/pagi` (`.claude/commands/pagi.md`,
 * dipanggil lewat `scripts/plan-status.ts`). Memakai parser yang sama dengan
 * menu Rencana Pengembangan, jadi poin, velocity, dan keputusan tertunda di
 * briefing selalu sama dengan angka di UI — bukan hasil grep `#nnn` yang ikut
 * menangkap rujukan di dalam baris lain dan blok `<details>` arsip.
 */
import {
  allIssues,
  daysBetween,
  issueDescription,
  pendingDecisions,
  releaseProgress,
  releaseState,
  releaseStatusPoints,
  releaseVelocity,
  type PlanItem,
  type ReleasePlan,
} from "@/lib/release-plan";

const itemRef = (i: PlanItem) => i.issueRefs[0] ?? null;
const itemLabel = (i: PlanItem) => {
  const ref = itemRef(i);
  return { ref, description: ref ? issueDescription(i.issue, ref) : i.issue.replace(/\*\*/g, "") };
};

export function planStatus(plan: ReleasePlan, today: string) {
  // Rilis berjalan = rilis pertama yang belum bertanda dirilis — termasuk yang
  // sudah lewat target (terlambat) dan yang belum mulai.
  const current = plan.releases.find((r) => releaseState(r, today) !== "released") ?? null;
  const velocity = releaseVelocity(plan, today);

  let active = null;
  if (current) {
    const progress = releaseProgress(current);
    const remaining = progress.totalPoints - progress.donePoints;
    // Minggu kalender tersisa termasuk hari ini — definisi sama dengan velocity.
    const weeksLeft = today > current.end ? 0 : (daysBetween(today < current.start ? current.start : today, current.end) + 1) / 7;
    active = {
      version: current.version,
      title: current.title,
      start: current.start,
      end: current.end,
      state: releaseState(current, today),
      daysLeft: today > current.end ? 0 : daysBetween(today, current.end),
      points: { total: progress.totalPoints, done: progress.donePoints, remaining, byStatus: releaseStatusPoints(current) },
      neededPerWeek: weeksLeft === 0 ? null : remaining / weeksLeft,
      inProgress: current.items.filter((i) => i.status === "progress").map(itemLabel),
      todo: current.items.filter((i) => i.status === "todo").map((i) => ({ ...itemLabel(i), category: i.category, size: i.size })),
    };
  }

  const issues = allIssues(plan);
  return {
    today,
    updatedAt: plan.updatedAt,
    active,
    velocity: { average: velocity.average, releases: velocity.sample.releases, weeks: velocity.sample.weeks },
    decisions: pendingDecisions(plan, today).map((d) => ({ release: d.release, ...itemLabel(d.item), decision: d.item.decision })),
    backlogDecisions: plan.backlog.filter((b) => b.status === "decision").map((b) => ({ ref: b.issueRefs[0] ?? null, note: b.note })),
    // Nomor issue GitHub unik di rencana (rilis + backlog) — pembanding `gh issue list`.
    issueNumbers: [...new Set(issues.filter((r) => r.isIssue).map((r) => r.number))].sort((a, b) => a - b),
    issues: issues.map((r) => ({
      ref: r.ref,
      place: r.place.kind === "release" ? r.place.version : `backlog ${r.place.order}`,
      status: r.status,
    })),
  };
}
