"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { cn } from "@/lib/utils";
import { issueUrl } from "@/lib/repo-links";
import {
  KANBAN_COLUMNS,
  SPRINT_STATUS_LABEL,
  allIssues,
  sortIssueRows,
  type IssuePlace,
  type IssueSortKey,
  type SprintItemStatus,
  type SprintPlan,
} from "@/lib/sprint-plan";
import { CategoryLabel, Inline, STATUS_STYLE, SearchBox, matchesQuery } from "./sprint-shared";

function placeLabel(p: IssuePlace): string {
  return p.kind === "sprint" ? `Sprint ${p.sprint}` : `Backlog (urutan ${p.order})`;
}

/**
 * Tab Semua Issue: satu baris per issue (atau per bagian issue) dari tabel
 * Sprint + Backlog `sprint.md` — bukan dari GitHub. Filter di URL: `?di=<n>|backlog`
 * (sprint) dan `?status=`. Backlog hanya tampil di sini (dulu juga tombol di tab Sprint).
 */
export function SprintIssues({ plan }: { plan: SprintPlan }) {
  const { get, setMany } = useUrlFilters();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: IssueSortKey; dir: "asc" | "desc" }>({ key: "issue", dir: "asc" });
  const all = allIssues(plan);
  const whereParam = get("di");
  const where = whereParam === "backlog" || plan.sprints.some((s) => String(s.number) === whereParam) ? whereParam : null;
  const inWhere = (p: IssuePlace) => where === null || (where === "backlog" ? p.kind === "backlog" : p.kind === "sprint" && String(p.sprint) === where);
  const searched = all.filter((r) => matchesQuery(query, [r.ref, placeLabel(r.place), SPRINT_STATUS_LABEL[r.status], r.category, r.description, r.note]));
  const rows = searched.filter((r) => inWhere(r.place));
  const param = get("status");
  const filter = (KANBAN_COLUMNS as string[]).includes(param ?? "") ? (param as SprintItemStatus) : null;
  const shown = sortIssueRows(filter ? rows.filter((r) => r.status === filter) : rows, sort.key, sort.dir);
  const uniqueIssues = new Set(all.map((r) => r.ref)).size;

  // Klik kolom yang sama membalik arah; kolom lain mulai menaik.
  const sortHead = (key: IssueSortKey, label: string, className: string) => {
    const on = sort.key === key;
    const Icon = !on ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead className={className} aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          onClick={() => setSort(on ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" })}
          className="inline-flex items-center gap-1 font-medium hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {label}
          <Icon className={cn("h-3.5 w-3.5", !on && "opacity-40")} aria-hidden />
        </button>
      </TableHead>
    );
  };

  const chip = (on: boolean, onClick: () => void, label: string, count: number) => (
    <button
      key={label}
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring",
        on ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted/50"
      )}
    >
      {label} <span className="tabular-nums text-muted-foreground">{count}</span>
    </button>
  );
  const whereChip = (value: string | null, label: string) =>
    chip(
      where === value,
      () => {
        setMany({ di: value });
        // Backlog dibaca menurut urutan prioritas, bukan nomor issue.
        if (value === "backlog") setSort({ key: "sprint", dir: "asc" });
      },
      label, searched.filter((r) => value === null || (value === "backlog" ? r.place.kind === "backlog" : r.place.kind === "sprint" && String(r.place.sprint) === value)).length);

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="space-y-3 pt-5">
        <p className="text-sm text-muted-foreground">
          {uniqueIssues} issue dalam rencana ({all.length} baris — issue yang dipecah per bagian tampil per bagiannya).
        </p>
        <SearchBox value={query} onChange={setQuery} placeholder="Cari nomor, sprint, status, atau deskripsi…" />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter sprint">
          <span className="w-14 text-xs text-muted-foreground">Sprint</span>
          {whereChip(null, "Semua")}
          {plan.sprints.map((s) => whereChip(String(s.number), `S${s.number}`))}
          {whereChip("backlog", "Backlog")}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter status">
          <span className="w-14 text-xs text-muted-foreground">Status</span>
          {chip(filter === null, () => setMany({ status: null }), "Semua", rows.length)}
          {KANBAN_COLUMNS.map((s) => chip(filter === s, () => setMany({ status: s }), SPRINT_STATUS_LABEL[s], rows.filter((r) => r.status === s).length))}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {sortHead("issue", "No. Issue", "w-24 whitespace-nowrap")}
                {sortHead("sprint", "Sprint", "w-36 whitespace-nowrap")}
                <TableHead className="hidden w-28 md:table-cell">Kategori</TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead className="min-w-[14rem]">Deskripsi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    {query ? "Tidak ada issue yang cocok dengan pencarian." : "Tidak ada issue untuk filter ini."}
                  </TableCell>
                </TableRow>
              ) : (
                shown.map((r, i) => (
                  <TableRow key={`${r.ref}-${placeLabel(r.place)}-${i}`}>
                    <TableCell className="tabular-nums">
                      <a href={issueUrl(r.ref)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {r.ref}
                      </a>
                    </TableCell>
                    <TableCell className={cn("whitespace-nowrap text-sm", r.place.kind === "backlog" && "text-muted-foreground")}>{placeLabel(r.place)}</TableCell>
                    <TableCell className="hidden md:table-cell">{r.category ? <CategoryLabel category={r.category} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLE[r.status]}>{SPRINT_STATUS_LABEL[r.status]}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal text-sm [overflow-wrap:anywhere]">
                      <Inline text={r.description} />
                      {r.note && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          <Inline text={r.note} />
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
