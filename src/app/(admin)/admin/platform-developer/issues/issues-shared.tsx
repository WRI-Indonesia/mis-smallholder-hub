import { Badge } from "@/components/ui/badge";
import { MONTH_SHORT_ID } from "@/lib/format";
import { ISSUE_STATUS_LABEL, type GithubIssue, type IssueStatus } from "@/lib/github-issues";

export const ISSUE_STATUS_STYLE: Record<IssueStatus, string> = {
  open: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  closed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  not_planned: "border-border text-muted-foreground",
  duplicate: "border-border text-muted-foreground",
};

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return (
    <Badge variant="outline" className={ISSUE_STATUS_STYLE[status]}>
      {ISSUE_STATUS_LABEL[status]}
    </Badge>
  );
}

/** `YYYY-MM-DD` → "13 Okt 2026". */
export function fmtDay(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  return `${day} ${MONTH_SHORT_ID[m - 1]} ${y}`;
}

export function IssueNumberLink({ issue }: { issue: GithubIssue }) {
  return (
    <a href={issue.url} target="_blank" rel="noopener noreferrer" className="tabular-nums text-primary hover:underline">
      #{issue.number}
    </a>
  );
}

/** Satu baris ringkas issue (kalender, kanban): nomor + judul. */
export function IssueLine({ issue }: { issue: GithubIssue }) {
  return (
    <span className="text-sm [overflow-wrap:anywhere]">
      <IssueNumberLink issue={issue} /> {issue.title}
    </span>
  );
}
