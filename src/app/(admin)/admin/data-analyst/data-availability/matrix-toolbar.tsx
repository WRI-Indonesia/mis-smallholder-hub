"use client";

import { ArrowDownAZ, ArrowUpZA, Info, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/format";
import { BAND_THRESHOLDS } from "@/lib/data-availability-aggregation";
import { isSearching, LOWEST_N } from "./matrix-rows";

/** Tampilan matriks: radar = bawaan (owner, #352 putaran 4; dipertahankan #417 K2), heatmap & modul lewat `?tampilan=`. */
export type MatrixView = "radar" | "heatmap" | "modul";

const VIEW_META: Record<MatrixView, { label: string; sub: string; help: string }> = {
  radar: {
    label: "Radar",
    sub: "sidik jari",
    help: "Satu pentagon per Lembaga — penuh = lengkap, gepeng ke satu sisi = domain itu kosong. Klik grafik atau tombol Perbesar untuk jendela besar; klik nama Lembaga untuk daftar kerjanya.",
  },
  heatmap: {
    label: "Heatmap",
    sub: "tabel warna",
    help: "Lembaga × domain, warna sel mengikuti skor (merah → hijau). Klik judul kolom untuk mengurutkan; pola satu kolom merah di banyak baris = masalah sistemik.",
  },
  modul: {
    label: "Cakupan modul",
    sub: "di luar Index",
    help: "Informatif — tidak masuk Index. % entitas (lahan/petani) yang sudah mengisi modul; modul tingkat Lembaga = ✓/✗. Sel bergaris = modul belum dimulai di Lembaga itu.",
  },
};

export interface MatrixSortOption {
  value: string;
  label: string;
}

/**
 * Satu toolbar untuk ketiga tampilan matriks (#417 B, T3/T5): status singkat +
 * ⓘ cara pakai · tab tampilan · Urut · arah · Cari. Lengket di atas kartu saat
 * digulir supaya kontrol tak hilang di grid 32 Lembaga.
 */
export function MatrixToolbar({
  view,
  onViewChange,
  status,
  sortOptions,
  sortValue,
  sortAsc,
  onSortChange,
  onDirectionToggle,
  query,
  onQueryChange,
}: {
  view: MatrixView;
  onViewChange: (v: MatrixView) => void;
  status: string;
  sortOptions: MatrixSortOption[];
  sortValue: string;
  sortAsc: boolean;
  onSortChange: (value: string) => void;
  onDirectionToggle: () => void;
  query: string;
  onQueryChange: (v: string) => void;
}) {
  const DirIcon = sortAsc ? ArrowDownAZ : ArrowUpZA;
  const meta = VIEW_META[view];
  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center gap-2 rounded-t-xl border-b bg-card/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mr-auto flex min-w-0 items-center gap-1.5 text-sm">
        <span className="truncate font-medium" data-testid="matrix-status">
          {status}
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <button type="button" className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Cara membaca tampilan ${meta.label}`} />
            }
          >
            <Info className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{meta.help}</TooltipContent>
        </Tooltip>
      </div>
      <Tabs value={view} onValueChange={(v) => onViewChange(v as MatrixView)}>
        <TabsList className="h-9">
          {(Object.keys(VIEW_META) as MatrixView[]).map((v) => (
            <TabsTrigger key={v} value={v} className="flex-col gap-0 px-2.5 py-0.5 text-xs leading-tight">
              <span>{VIEW_META[v].label}</span>
              <span className="text-[10px] font-normal text-muted-foreground">{VIEW_META[v].sub}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Select value={sortValue} onValueChange={(v) => onSortChange(v as string)} items={sortOptions.map((o) => ({ value: o.value, label: `Urut: ${o.label}` }))}>
        <SelectTrigger className="h-8 w-[170px] text-xs" aria-label="Urutkan menurut">
          <SelectValue placeholder="Urutkan" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              Urut: {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={onDirectionToggle}
        title={sortAsc ? "Menaik — klik untuk menurun" : "Menurun — klik untuk menaik"}
        aria-label={sortAsc ? "Arah urutan menaik — klik untuk menurun" : "Arah urutan menurun — klik untuk menaik"}
      >
        <DirIcon className="h-4 w-4" />
      </Button>
      <MatrixSearch value={query} onChange={onQueryChange} />
    </div>
  );
}

/** Kotak cari Lembaga / kode / distrik — satu untuk ketiga tampilan. */
export function MatrixSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Cari Lembaga / kode / distrik" className="h-8 w-[200px] pl-8 text-xs" aria-label="Cari Lembaga" />
    </div>
  );
}

/** Tombol di bawah grid/tabel: "Tampilkan n lagi" (bawaan Ringkas 10, #417 K2) / "Ringkas — 10 … terendah". */
export function MatrixLimitToggle({ showAll, onToggle, hiddenCount, unit }: { showAll: boolean; onToggle: () => void; hiddenCount: number; unit: "baris" | "kartu" }) {
  return (
    <Button variant={showAll ? "ghost" : "outline"} size="sm" className="h-8" onClick={onToggle}>
      {showAll ? `Ringkas — ${LOWEST_N} ${unit} pertama saja` : `Tampilkan ${formatNumber(hiddenCount)} lagi`}
    </Button>
  );
}

/** Keadaan kosong bersama (spasi saja = bukan pencarian, selaras `isSearching`). */
export const emptyRowsMessage = (query: string) =>
  isSearching(query) ? `Tidak ada Lembaga yang cocok dengan "${query.trim()}".` : "Tidak ada Lembaga Petani pada pilihan filter ini.";

/** Status toolbar: "{n} Lembaga · {k} kritis (<50)" — satu baris (#417 B). */
export const rowsSummary = (total: number, critical: number, shown?: number) =>
  `${formatNumber(total)} Lembaga${critical > 0 ? ` · ${formatNumber(critical)} kritis (<${BAND_THRESHOLDS.warn})` : ""}${shown != null && shown < total ? ` · ${formatNumber(shown)} tampil` : ""}`;
