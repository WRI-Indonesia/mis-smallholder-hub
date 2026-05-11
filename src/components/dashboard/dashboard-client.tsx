"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardHeader } from "./dashboard-header";
import { BasicDataCardGrid } from "./basic-data-card-grid";
import { BasicDataMap } from "./basic-data-map";
import { BasicDataDetailPanel } from "./basic-data-detail-panel";

function normalizeSearchText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function makeAcronym(text: string) {
  const stop = new Set(["dan", "di", "ke", "dari", "the", "of", "for", "pt", "cv", "koperasi", "kelompok", "tani"]);
  const words = normalizeSearchText(text).split(/\s+/).filter(Boolean);
  const significant = words.filter((w) => w.length > 1 && !stop.has(w));
  const base = (significant.length > 0 ? significant : words).slice(0, 6);
  return base.map((w) => w[0]).join("");
}

interface StatItem {
  icon: string;
  label: string;
  value: string;
}

interface FarmerGroupData {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  totalPetani: number;
  maleFarmers: number;
  femaleFarmers: number;
  totalParcels: number;
  totalArea: string;
  trainingPackage1: number;
  trainingPackage2MK: number;
  trainingPackage2HSE: number;
  trainingPackage34: number;
}

interface District {
  id: string;
  name: string;
}

interface Batch {
  id: string;
  name: string;
}

interface DashboardClientProps {
  initialStats: StatItem[];
  initialGroups: FarmerGroupData[];
  districts: District[];
  batches: Batch[];
  currentFilters: {
    districtId?: string;
    batchId?: string;
  };
}

export function DashboardClient({
  initialStats,
  initialGroups,
  districts,
  batches,
  currentFilters,
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedGroup, setSelectedGroup] = useState<FarmerGroupData | null>(null);
  const [mapSearch, setMapSearch] = useState("");

  // Get current filter values from URL or defaults
  const program = currentFilters.batchId || "All";
  const distrik = currentFilters.districtId || "All";

  // Filter groups based on current district filter and map search
  const filteredGroups = useMemo(() =>
    initialGroups.filter(g => {
      const matchDistrik = distrik === "All" || 
        (distrik !== "All" && districts.find(d => d.id === distrik)?.name === g.region);
      const q = normalizeSearchText(mapSearch);
      const nameNorm = normalizeSearchText(g.name);
      const acronym = makeAcronym(g.name);
      const matchSearch =
        !q ||
        nameNorm.includes(q) ||
        acronym.startsWith(q.replace(/\s+/g, "")) ||
        // allow matching multiple tokens in any order
        q.split(/\s+/).every((t) => nameNorm.includes(t));
      return matchDistrik && matchSearch;
    }),
    [initialGroups, distrik, districts, mapSearch]
  );

  // Handle filter changes by updating URL
  const setProgram = (newProgram: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newProgram === "All") {
      params.delete("batchId");
    } else {
      params.set("batchId", newProgram);
    }
    router.push(`?${params.toString()}`);
  };

  const setDistrik = (newDistrik: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newDistrik === "All") {
      params.delete("districtId");
    } else {
      params.set("districtId", newDistrik);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="-m-6 flex flex-col bg-muted/30" style={{ height: "calc(100vh - 56px)" }}>
      <DashboardHeader 
        program={program}
        distrik={distrik}
        setProgram={setProgram}
        setDistrik={setDistrik}
        districts={districts}
        batches={batches}
      />

      <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
        <BasicDataCardGrid stats={initialStats} />

        <div className="flex-1 flex rounded-lg border overflow-hidden bg-background min-h-0">
          <BasicDataMap 
            groups={filteredGroups}
            distrik={distrik}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            mapSearch={mapSearch}
            setMapSearch={setMapSearch}
          />
          <BasicDataDetailPanel 
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
          />
        </div>
      </div>
    </div>
  );
}
