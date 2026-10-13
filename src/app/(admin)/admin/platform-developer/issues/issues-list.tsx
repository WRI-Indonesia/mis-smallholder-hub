"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { GithubIssue } from "@/lib/github-issues";
import { IssueNumberLink, IssueStatusBadge, fmtDay } from "./issues-shared";

type SortKey = "number" | "created" | "closed";

const sortValue = (i: GithubIssue, key: SortKey): number | string =>
  key === "number" ? i.number : key === "created" ? i.createdDate : (i.closedDate ?? "");

/** Tab List: tabel issue tersaring; urutan bawaan nomor menurun (terbaru di atas). */
export function IssuesList({ issues }: { issues: GithubIssue[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "number", dir: "desc" });
  const shown = [...issues].sort((a, b) => {
    const va = sortValue(a, sort.key);
    const vb = sortValue(b, sort.key);
    // Issue tanpa tanggal tutup selalu di bawah, apa pun arahnya.
    if (sort.key === "closed" && (va === "" || vb === "")) return va === vb ? b.number - a.number : va === "" ? 1 : -1;
    const c = va < vb ? -1 : va > vb ? 1 : b.number - a.number;
    return sort.dir === "asc" ? c : -c;
  });

  // Klik kolom yang sama membalik arah; kolom lain mulai dari yang terbaru.
  const sortHead = (key: SortKey, label: string, className: string) => {
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
