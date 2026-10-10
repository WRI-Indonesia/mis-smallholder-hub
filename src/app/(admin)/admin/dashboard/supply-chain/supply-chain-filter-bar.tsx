"use client";

import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { GROUP_CATEGORY_LABEL, UL_FILTER_LABEL, type GroupCategory, type UlFilter } from "@/lib/supply-chain-flow";
import type { SupplyChainFilterState } from "./use-supply-chain-filters";

/** Bingkai penanda filter aktif — pilihan yang sedang mengiris data terlihat sekilas. */
function Active({ on, children, className }: { on: boolean; children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-md transition-shadow", on && "ring-2 ring-primary/50", className)}>{children}</div>;
}

/**
 * Bar filter Rantai Pasok, dipakai Dashboard (mendatar) dan panel Peta (menurun).
 * Dua kelompok: **Lingkup** (atribut Lembaga & program) dan **Rantai** yang
 * disusun mengikuti arah aliran TBS — Lembaga → Agen → RAMP → Mill — sama
 * dengan urutan kolom Sankey dan garis peta.
 */
export function SupplyChainFilterBar({
  f,
  vertical = false,
  years,
  showReset = true,
}: {
  f: SupplyChainFilterState;
  vertical?: boolean;
  years: number[];
  /** Dashboard memakai chip filter global (Hapus semua) di bawah bar, jadi tombol Reset di sini disembunyikan. */
  showReset?: boolean;
}) {
  const w = vertical ? "w-full" : undefined;
  const Arrow = vertical ? ChevronDown : ChevronRight;
  const chain = [
    { key: "lembaga" as const, value: f.filter.groupCode, options: f.options.groupCode, all: "Semua Lembaga", search: "Cari Lembaga…", empty: "Lembaga tidak ditemukan" },
    { key: "agen" as const, value: f.filter.collectorId, options: f.options.collectorId, all: "Semua Agen · KT/Koperasi", search: "Cari agen / kode…", empty: "Agen tidak ditemukan" },
    { key: "ramp" as const, value: f.filter.rampId, options: f.options.rampId, all: "Semua RAMP", search: "Cari RAMP / kode…", empty: "RAMP tidak ditemukan" },
    { key: "mill" as const, value: f.filter.millId, options: f.options.millId, all: "Semua Mill", search: "Cari Mill / perusahaan…", empty: "Mill tidak ditemukan" },
  ];

  return (
    <div className={cn("space-y-2", !vertical && "rounded-lg border bg-card/60 p-3")}>
      <div className={cn("flex gap-2", vertical ? "flex-col" : "flex-wrap items-center")}>
        <span className={cn("text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", !vertical && "w-16 shrink-0")}>Lingkup</span>
        <div className={cn("gap-2", vertical ? "grid grid-cols-2" : "flex flex-wrap items-center")}>
          <Active on={!!f.district} className={vertical ? "col-span-2" : undefined}>
            <FilterCombobox
              options={f.districtOptions}
              value={f.district}
              onSelect={(v) => f.update({ distrik: v })}
              allLabel="Semua Distrik"
              searchPlaceholder="Cari distrik…"
              emptyLabel="Distrik tidak ditemukan"
              widthClass={w ?? "w-[160px]"}
            />
          </Active>
          <Active on={!!f.category}>
            <Select value={f.category ?? "ALL"} onValueChange={(v) => f.update({ kategori: v === "ALL" ? null : v })}>
              <SelectTrigger className={w ?? "w-[150px]"}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kategori</SelectItem>
                {(Object.keys(GROUP_CATEGORY_LABEL) as GroupCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>{GROUP_CATEGORY_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Active>
          <Active on={!!f.filter.ul}>
            <Select value={f.filter.ul ?? "ALL"} onValueChange={(v) => f.update({ ul: v === "ALL" ? null : v })}>
              <SelectTrigger className={w ?? "w-[165px]"}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">UL &amp; Non-UL</SelectItem>
                {(Object.keys(UL_FILTER_LABEL) as UlFilter[]).map((u) => (
                  <SelectItem key={u} value={u}>{UL_FILTER_LABEL[u]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Active>
          {years.length > 1 && (
            <Select value={f.year == null ? "" : String(f.year)} onValueChange={(v) => f.update({ tahun: v || null })}>
              <SelectTrigger className={w ?? "w-[100px]"}><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {years.length === 1 && !vertical && <span className="text-xs text-muted-foreground">Tahun survei {years[0]}</span>}
        </div>
      </div>

      <div className={cn("flex gap-2", vertical ? "flex-col" : "flex-wrap items-center")}>
        <span className={cn("text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", !vertical && "w-16 shrink-0")}>Rantai</span>
        <div className={cn("flex gap-1.5", vertical ? "flex-col" : "flex-wrap items-center")}>
          {chain.map((c, i) => (
            <div key={c.key} className={cn("flex items-center gap-1.5", vertical && "flex-col items-stretch")}>
              {i > 0 && <Arrow className={cn("h-4 w-4 shrink-0 text-muted-foreground", vertical && "mx-auto -my-1")} aria-hidden />}
              <Active on={!!c.value}>
                <FilterCombobox
                  options={c.options}
                  value={c.value}
                  onSelect={(v) => f.update({ [c.key]: v })}
                  allLabel={c.all}
                  searchPlaceholder={c.search}
                  emptyLabel={c.empty}
                  widthClass={w ?? "w-[200px]"}
                />
              </Active>
            </div>
          ))}
          {showReset && f.hasFilter && (
            <Button variant="ghost" size="sm" onClick={f.reset} className={cn("text-muted-foreground", vertical && "self-start")}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
