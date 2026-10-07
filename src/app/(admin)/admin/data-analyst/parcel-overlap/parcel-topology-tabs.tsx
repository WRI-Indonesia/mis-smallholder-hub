"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/format";
import { parseTopologyTab, type AreaMismatchRow, type OutsideBoundaryRow, type TopologyTab } from "@/lib/parcel-boundary-area";
import type { ParcelOverlapRow } from "@/lib/parcel-overlap";
import { ParcelOverlapClient } from "./parcel-overlap-client";
import { OutsideBoundaryTab } from "./outside-boundary-tab";
import { AreaMismatchTab } from "./area-mismatch-tab";

interface Props {
  overlaps: ParcelOverlapRow[];
  /** `null` = tab gagal dimuat (galat ditampilkan di tab itu saja). */
  outside: OutsideBoundaryRow[] | null;
  areaMismatch: AreaMismatchRow[] | null;
  canExport: boolean;
}

function TabError() {
  return (
    <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
      Tab ini gagal dihitung (galat geometri di server). Tab lain tetap bisa dipakai — muat ulang halaman, dan bila
      berulang, laporkan ke admin aplikasi.
    </div>
  );
}

/**
 * Tiga kelas temuan topology (#317): Tumpang Tindih · Luar Boundary · Selisih Luas.
 * Tab aktif di `?tab=` (bisa dibagikan). Sengaja TIDAK memakai `useUrlFilters`: hook
 * itu menyimpan query di state per-instance, sehingga dua instance (pembungkus + isi
 * tab) saling menimpa. Pindah tab menulis URL berisi `tab` saja (filter tiap tab
 * berbeda), dan isi tab hanya dirender untuk tab aktif sehingga instance filternya
 * dibuat baru dari URL terkini.
 */
export function ParcelTopologyTabs({ overlaps, outside, areaMismatch, canExport }: Props) {
  const searchParams = useSearchParams();
  const tab = parseTopologyTab(searchParams.get("tab"));
  const outsideFull = outside?.filter((r) => r.kind === "FULL").length;

  const changeTab = (next: TopologyTab) => {
    const qs = next === "tumpang-tindih" ? "" : `?tab=${next}`;
    window.history.replaceState(null, "", `${window.location.pathname}${qs}`);
  };

  return (
    <Tabs value={tab} onValueChange={(v) => changeTab(parseTopologyTab(String(v)))} className="w-full">
      <TabsList className="mb-2 h-auto flex-wrap">
        <TabsTrigger value="tumpang-tindih">
          Tumpang Tindih <span className="ml-1 tabular-nums text-muted-foreground">{formatNumber(overlaps.length)}</span>
        </TabsTrigger>
        <TabsTrigger value="luar-boundary">
          Luar Boundary <span className="ml-1 tabular-nums text-muted-foreground">{outsideFull == null ? "!" : formatNumber(outsideFull)}</span>
        </TabsTrigger>
        <TabsTrigger value="selisih-luas">
          Selisih Luas <span className="ml-1 tabular-nums text-muted-foreground">{areaMismatch == null ? "!" : formatNumber(areaMismatch.length)}</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="tumpang-tindih">{tab === "tumpang-tindih" && <ParcelOverlapClient rows={overlaps} canExport={canExport} />}</TabsContent>
      <TabsContent value="luar-boundary">{tab === "luar-boundary" && (outside ? <OutsideBoundaryTab rows={outside} canExport={canExport} /> : <TabError />)}</TabsContent>
      <TabsContent value="selisih-luas">{tab === "selisih-luas" && (areaMismatch ? <AreaMismatchTab rows={areaMismatch} canExport={canExport} /> : <TabError />)}</TabsContent>
    </Tabs>
  );
}
