"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { ResetFiltersButton } from "@/components/shared/reset-filters-button";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { clearedUrlKeys, hasActiveFilters } from "@/lib/filter-reset";
import { formatGeneratedAt, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DEFAULT_ISSUE_SORT,
  ISSUE_STATUS_LABEL,
  ISSUE_STATUS_ORDER,
  filterIssues,
  labelCounts,
  sortIssues,
  type IssueSort,
  type IssueStatus,
} from "@/lib/github-issues";
import type { GithubIssuesData } from "@/server/actions/github-issues";
import { SearchBox } from "@/app/(admin)/admin/data-analyst/sprint/sprint-shared";
import { IssuesList } from "./issues-list";
import { IssuesCalendar } from "./issues-calendar";
import { IssuesTrend } from "./issues-trend";
import { IssuesKanban } from "./issues-kanban";

const TABS = ["list", "kalender", "tren", "kanban"] as const;
type Tab = (typeof TABS)[number];

/** Filter bawaan = semua kosong; Reset mengembalikan ke sini (#427). Tab, bulan & tanggal kalender bukan filter. */
const FILTER_DEFAULTS = { q: null, status: null, label: null, dari: null, sampai: null };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Daftar Issue (#429). Filter (cari, status, label, rentang aktivitas) di URL
 * dan berlaku untuk List, Kalender, Kanban, serta isi Unduh Excel (dengan
 * urutan List) — "apa yang terlihat = apa yang diunduh". Tren memakai cari +
 * label saja lalu dipotong ke rentang aktivitas (lihat `clipWeeks`).
 */
export function IssuesViewClient({ data, today }: { data: GithubIssuesData; today: string }) {
  const { get, setMany } = useUrlFilters();
  const [exporting, setExporting] = useState(false);
  const [sort, setSort] = useState<IssueSort>(DEFAULT_ISSUE_SORT);

  const tabParam = get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as Tab) : "list";
  const query = get("q") ?? "";
  const statusParam = get("status");
  const status = (ISSUE_STATUS_ORDER as string[]).includes(statusParam ?? "") ? (statusParam as IssueStatus) : null;
  const labels = useMemo(() => labelCounts(data.issues), [data.issues]);
  const labelParam = get("label");
  const label = labels.some((l) => l.name === labelParam) ? labelParam : null;
  const from = DATE_RE.test(get("dari") ?? "") ? get("dari") : null;
  const to = DATE_RE.test(get("sampai") ?? "") ? get("sampai") : null;

  // Dasar Tren: cari + label saja (status & rentang aktivitas merusak angka kumulatif).
  const trendBase = useMemo(() => filterIssues(data.issues, { query, label }), [data.issues, query, label]);
  // Jumlah per chip status dihitung tanpa filter status itu sendiri.
  const withoutStatus = useMemo(
    () => filterIssues(data.issues, { query, label, from, to }),
    [data.issues, query, label, from, to],
  );
  const filtered = useMemo(
    () => (status ? withoutStatus.filter((i) => i.status === status) : withoutStatus),
    [withoutStatus, status],
  );
  const statusCount = new Map<IssueStatus, number>();
  for (const i of withoutStatus) statusCount.set(i.status, (statusCount.get(i.status) ?? 0) + 1);

  const active = hasActiveFilters({ q: query, status, label, dari: from, sampai: to }, FILTER_DEFAULTS);
  const openTotal = data.issues.filter((i) => i.status === "open").length;

  const onExport = async () => {
    setExporting(true);
    try {
      const { exportIssuesToExcel } = await import("@/lib/github-issues-xlsx");
      await exportIssuesToExcel(sortIssues(filtered, sort), `daftar-issue-${today}`);
    } catch (e) {
      console.error(e);
      toast.error("Gagal membuat berkas Excel.");
    } finally {
      setExporting(false);
    }
  };

  const chip = (on: boolean, onClick: () => void, text: string, count: number) => (
    <button
      key={text}
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring",
        on ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted/50",
      )}
    >
      {text} <span className="tabular-nums text-muted-foreground">{count}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {data.truncated && (
        <p className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          Daftar tidak lengkap: jumlah issue melebihi batas pengambilan halaman ini. Issue paling lama tidak ikut tampil.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {formatNumber(data.issues.length)} issue · {formatNumber(openTotal)} terbuka · data GitHub per{" "}
        <span className="tabular-nums">{formatGeneratedAt(data.fetchedAt)}</span>
      </p>

      <div className="space-y-3 rounded-lg border border-border/60 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={query} onChange={(v) => setMany({ q: v })} placeholder="Cari nomor, judul, atau label…" />
          <FilterCombobox
            options={labels.map((l) => ({ id: l.name, name: `${l.name} (${l.count})` }))}
            value={label}
            onSelect={(v) => setMany({ label: v })}
            allLabel="Semua label"
            searchPlaceholder="Cari label…"
            emptyLabel="Tidak ada label."
            widthClass="w-[220px]"
          />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <label htmlFor="issue-from">Aktivitas</label>
            <Input
              id="issue-from"
              type="date"
              value={from ?? ""}
              max={to ?? undefined}
              onChange={(e) => setMany({ dari: e.target.value })}
              className="h-9 w-[150px]"
              aria-label="Aktivitas dari tanggal"
            />
            <span>–</span>
            <Input
              type="date"
              value={to ?? ""}
              min={from ?? undefined}
              onChange={(e) => setMany({ sampai: e.target.value })}
              className="h-9 w-[150px]"
              aria-label="Aktivitas sampai tanggal"
            />
          </div>
          <ResetFiltersButton active={active} onReset={() => setMany(clearedUrlKeys(FILTER_DEFAULTS))} />
          <Button type="button" variant="outline" className="ml-auto h-9" onClick={onExport} disabled={exporting || filtered.length === 0}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Unduh Excel
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter status">
          <span className="w-14 text-xs text-muted-foreground">Status</span>
          {chip(status === null, () => setMany({ status: null }), "Semua", withoutStatus.length)}
          {ISSUE_STATUS_ORDER.map((s) =>
            chip(status === s, () => setMany({ status: s }), ISSUE_STATUS_LABEL[s], statusCount.get(s) ?? 0),
          )}
        </div>
        {(from || to) && (
          <p className="text-xs text-muted-foreground">
            Rentang aktivitas: issue yang <strong>dibuat atau ditutup</strong> di antara kedua tanggal (WIB).
          </p>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setMany({ tab: v === "list" ? null : v })} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="kalender">Kalender</TabsTrigger>
          <TabsTrigger value="tren">Tren mingguan</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <IssuesList issues={filtered} sort={sort} onSort={setSort} />
        </TabsContent>
        <TabsContent value="kalender">
          <IssuesCalendar issues={filtered} today={today} get={get} setMany={setMany} />
        </TabsContent>
        <TabsContent value="tren">
          <IssuesTrend issues={trendBase} today={today} from={from} to={to} />
        </TabsContent>
        <TabsContent value="kanban">
          <IssuesKanban issues={filtered} today={today} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
