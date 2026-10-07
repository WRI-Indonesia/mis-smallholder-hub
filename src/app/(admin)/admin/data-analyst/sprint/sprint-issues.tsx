"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { cn } from "@/lib/utils";
import { issueUrl } from "@/lib/repo-links";
import {
  KANBAN_COLUMNS,
  PLAN_STATUS_LABEL,
  allIssues,
  releaseState,
  sortIssueRows,
  type IssuePlace,
  type IssueSortKey,
  type PlanItemStatus,
  type ReleasePlan,
} from "@/lib/release-plan";
import { CategoryLabel, Inline, STATUS_STYLE, SearchBox, matchesQuery } from "./sprint-shared";

function placeLabel(p: IssuePlace): string {
  return p.kind === "release" ? p.version : `Backlog (urutan ${p.order})`;
}

/**
 * Tab Semua Issue: satu baris per issue (atau per bagian issue) dari tabel
 * Rilis + Backlog `sprint.md` — bukan dari GitHub. Filter di URL: `?di=<versi>|backlog`
 * (rilis), `?status=`, dan `?q=` (cari). Backlog hanya tampil di sini. Filter rilis
 * berupa combobox ber-cari, bukan chip — jumlah rilis terus tumbuh.
 *
 * `get`/`setMany` WAJIB dari `useUrlFilters` induk: hook itu membaca URL sekali
 * saat mount, jadi instance kedua di sini memulai dari URL lama (tanpa
 * `tab=issue`) dan menimpanya saat chip diklik (review 4505de9).
 */
export function SprintIssues({
  plan,
  today,
  get,
  setMany,
}: {
  plan: ReleasePlan;
  today: string;
  get: (key: string) => string | null;
  setMany: (values: Record<string, string | null>) => void;
}) {
  // Pencarian ikut di URL (`?q=`): bisa dibagikan, dan tombol strip header bisa
  // mengosongkannya — kalau state lokal, sisa kueri lama menyembunyikan hasil tujuan.
  const query = get("q") ?? "";
  const setQuery = (v: string) => setMany({ q: v });
  const all = useMemo(() => allIssues(plan), [plan]);
  const whereParam = get("di");
  const where =
    whereParam === "backlog" || plan.releases.some((r) => r.version === whereParam)
      ? whereParam
      : null;
  // Backlog dibaca menurut urutan prioritas — setiap kali filter BERPINDAH ke Backlog,
  // dari chip, tautan `?di=backlog`, maupun strip header (penyesuaian state saat render,
  // bukan efek; teks pencarian tetap).
  const backlogSort = { key: "release", dir: "asc" } as const;
  const [sort, setSort] = useState<{ key: IssueSortKey; dir: "asc" | "desc" }>(() =>
    where === "backlog" ? backlogSort : { key: "issue", dir: "asc" },
  );
  const [prevWhere, setPrevWhere] = useState(where);
  if (where !== prevWhere) {
    setPrevWhere(where);
    if (where === "backlog") setSort(backlogSort);
  }
  const whereKey = (p: IssuePlace) => (p.kind === "backlog" ? "backlog" : p.version);
  const inWhere = (p: IssuePlace) => where === null || whereKey(p) === where;
  const searched = all.filter((r) =>
    matchesQuery(query, [
      r.ref,
      placeLabel(r.place),
      PLAN_STATUS_LABEL[r.status],
      r.category,
      r.description,
      r.note,
    ]),
  );
  const rows = searched.filter((r) => inWhere(r.place));
  const param = get("status");
  const filter = (KANBAN_COLUMNS as string[]).includes(param ?? "")
    ? (param as PlanItemStatus)
    : null;
  // Jumlah per chip dalam satu lintasan (bukan satu filter per chip).
  const whereCount = new Map<string, number>();
  for (const r of searched)
    whereCount.set(whereKey(r.place), (whereCount.get(whereKey(r.place)) ?? 0) + 1);
  const statusCount = new Map<PlanItemStatus, number>();
  for (const r of rows) statusCount.set(r.status, (statusCount.get(r.status) ?? 0) + 1);
  const shown = sortIssueRows(
    filter ? rows.filter((r) => r.status === filter) : rows,
    sort.key,
    sort.dir,
  );
  const uniqueIssues = new Set(all.filter((r) => r.isIssue).map((r) => r.ref)).size;

  // Klik kolom yang sama membalik arah; kolom lain mulai menaik.
  const sortHead = (key: IssueSortKey, label: string, className: string) => {
    const on = sort.key === key;
    const Icon = !on ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead
        className={className}
        aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <button
          type="button"
          onClick={() =>
            setSort(on ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" })
          }
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
        on ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted/50",
      )}
    >
      {label} <span className="tabular-nums text-muted-foreground">{count}</span>
    </button>
  );
  // Opsi combobox: rilis yang belum tuntas dulu (berjalan ditandai), lalu Backlog, lalu riwayat terbaru → lama.
  const states = plan.releases.map((r) => releaseState(r, today));
  const opt = (id: string, name: string) => ({ id, name: `${name} (${whereCount.get(id) ?? 0})` });
  const whereOptions = [
    ...plan.releases.flatMap((r, i) =>
      states[i] === "released" ? [] : [opt(r.version, `${r.version}${states[i] === "active" ? " · berjalan" : states[i] === "late" ? " · terlambat" : ""}`)],
    ),
    opt("backlog", "Backlog"),
    ...plan.releases.flatMap((r, i) => (states[i] === "released" ? [opt(r.version, `${r.version} · dirilis`)] : [])).reverse(),
  ];

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="space-y-3 pt-5">
        <p className="text-sm text-muted-foreground">
          {uniqueIssues} issue dalam rencana ({all.length} baris — issue yang dipecah per bagian
          tampil per bagiannya; butir backlog tanpa issue, mis. TD-xxx, ikut tampil).
        </p>
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Cari nomor, rilis, status, atau deskripsi…"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 text-xs text-muted-foreground">Rilis</span>
          <FilterCombobox
            options={whereOptions}
            value={where}
            onSelect={(v) => setMany({ di: v })}
            allLabel={`Semua rilis & backlog (${searched.length})`}
            searchPlaceholder="Cari versi…"
            emptyLabel="Tidak ada rilis."
            widthClass="w-[260px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter status">
          <span className="w-14 text-xs text-muted-foreground">Status</span>
          {chip(filter === null, () => setMany({ status: null }), "Semua", rows.length)}
          {KANBAN_COLUMNS.map((s) =>
            chip(
              filter === s,
              () => setMany({ status: s }),
              PLAN_STATUS_LABEL[s],
              statusCount.get(s) ?? 0,
            ),
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {sortHead("issue", "No. Issue", "w-24 whitespace-nowrap")}
                {sortHead("release", "Rilis", "w-36 whitespace-nowrap")}
                <TableHead className="hidden w-28 md:table-cell">Kategori</TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead className="min-w-[14rem]">Deskripsi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    {query
                      ? "Tidak ada issue yang cocok dengan pencarian."
                      : "Tidak ada issue untuk filter ini."}
                  </TableCell>
                </TableRow>
              ) : (
                shown.map((r, i) => (
                  <TableRow key={`${r.ref}-${placeLabel(r.place)}-${i}`}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {r.isIssue ? (
                        <a
                          href={issueUrl(r.ref)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {r.ref}
                        </a>
                      ) : (
                        <span
                          className="text-muted-foreground"
                          title="Butir backlog tanpa issue GitHub"
                        >
                          {r.ref}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap text-sm",
                        r.place.kind === "backlog" && "text-muted-foreground",
                      )}
                    >
                      {placeLabel(r.place)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {r.category ? (
                        <CategoryLabel category={r.category} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLE[r.status]}>
                        {PLAN_STATUS_LABEL[r.status]}
                      </Badge>
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
