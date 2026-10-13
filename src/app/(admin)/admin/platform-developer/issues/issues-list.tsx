"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { sortIssues, type GithubIssue, type IssueSort, type IssueSortKey } from "@/lib/github-issues";
import { IssueNumberLink, IssueStatusBadge, fmtDay } from "./issues-shared";

/** Tab List: tabel issue tersaring; urutan dipegang induk supaya Unduh Excel ikut (review #429). */
export function IssuesList({
  issues,
  sort,
  onSort: setSort,
}: {
  issues: GithubIssue[];
  sort: IssueSort;
  onSort: (sort: IssueSort) => void;
}) {
  const shown = sortIssues(issues, sort);

  // Klik kolom yang sama membalik arah; kolom lain mulai dari yang terbaru.
  const sortHead = (key: IssueSortKey, label: string, className: string) => {
    const on = sort.key === key;
    const Icon = !on ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead className={className} aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          onClick={() => setSort(on ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" })}
          className="inline-flex items-center gap-1 font-medium hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {label}
          <Icon className={cn("h-3.5 w-3.5", !on && "opacity-40")} aria-hidden />
        </button>
      </TableHead>
    );
  };

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="pt-5">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {sortHead("number", "No.", "w-20 whitespace-nowrap")}
                <TableHead className="min-w-[16rem]">Judul</TableHead>
                <TableHead className="hidden w-64 lg:table-cell">Label</TableHead>
                {sortHead("created", "Dibuat", "w-32 whitespace-nowrap")}
                {sortHead("closed", "Ditutup", "w-32 whitespace-nowrap")}
                <TableHead className="w-36">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    Tidak ada issue untuk filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                shown.map((i) => (
                  <TableRow key={i.number}>
                    <TableCell className="whitespace-nowrap">
                      <IssueNumberLink issue={i} />
                    </TableCell>
                    <TableCell className="whitespace-normal text-sm [overflow-wrap:anywhere]">{i.title}</TableCell>
                    <TableCell className="hidden whitespace-normal lg:table-cell">
                      <span className="flex flex-wrap gap-1">
                        {i.labels.map((l) => (
                          <span key={l} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {l}
                          </span>
                        ))}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">{fmtDay(i.createdDate)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">{fmtDay(i.closedDate)}</TableCell>
                    <TableCell>
                      <IssueStatusBadge status={i.status} />
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
