"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BMPScoreCards } from "./bmp-score-cards";
import { BMPProductionChart } from "./bmp-production-chart";
import { BMPMonevCards } from "./bmp-monev-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout, BarChart3, Award } from "lucide-react";

import type { BMPScoreData, BMPMonthlyProduction, BMPMonevData, BMPKelompokTani } from "@/lib/static-data/admin/dashboard/bmp";

interface BMPDashboardClientProps {
  scoreData: BMPScoreData;
  productionData: BMPMonthlyProduction[];
  monevData: BMPMonevData;
  districts: string[];
  kelompokTaniList: BMPKelompokTani[];
  currentDistrik: string;
  currentKT: string;
}

export function BMPDashboardClient({
  scoreData,
  productionData,
  monevData,
  districts,
  kelompokTaniList,
  currentDistrik,
  currentKT,
}: BMPDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [distrik, setDistrikLocal] = useState(currentDistrik);
  const [kt, setKTLocal] = useState(currentKT);

  // Filter KT list by selected distrik
  const filteredKTList = useMemo(() => {
    if (distrik === "All") return kelompokTaniList;
    return kelompokTaniList.filter((k) => k.distrik === distrik);
  }, [distrik, kelompokTaniList]);

  const updateURL = (newDistrik: string, newKT: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newDistrik === "All") params.delete("districtId"); else params.set("districtId", newDistrik);
    if (newKT === "All") params.delete("kt"); else params.set("kt", newKT);
    router.push(`?${params.toString()}`);
  };

  const handleDistrikChange = (value: string | null) => {
    const newDistrik = value ?? "All";
    setDistrikLocal(newDistrik);
    setKTLocal("All"); // reset KT when distrik changes
    updateURL(newDistrik, "All");
  };

  const handleKTChange = (value: string | null) => {
    const newKT = value ?? "All";
    setKTLocal(newKT);
    updateURL(distrik, newKT);
  };

  return (
    <div className="-m-6 flex flex-col bg-muted/30" style={{ height: "calc(100vh - 56px)" }}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 h-14 bg-background border-b shrink-0">
        <div className="flex items-center gap-2.5">
          <Sprout className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">BMP Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={distrik} onValueChange={handleDistrikChange}>
            <SelectTrigger className="w-[160px] h-8 text-sm bg-background">
              <SelectValue>
                {distrik === "All" ? "Semua Distrik" : distrik}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Semua Distrik</SelectItem>
              {districts.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={kt} onValueChange={handleKTChange}>
            <SelectTrigger className="w-[200px] h-8 text-sm bg-background">
              <SelectValue>
                {kt === "All" ? "Semua Kelompok Tani" : kt}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Semua Kelompok Tani</SelectItem>
              {filteredKTList.map((k) => (
                <SelectItem key={k.name} value={k.name}>{k.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
        {/* Score Cards — 5 cards full width */}
        <BMPScoreCards data={scoreData} />

        {/* Bottom row: 3/4 chart + 1/4 monev — fills remaining viewport */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Chart — 3/4 width */}
          <Card className="flex-[3] flex flex-col min-h-0">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                Tren Produksi &amp; Produktivitas Bulanan
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pb-4">
              <BMPProductionChart data={productionData} />
            </CardContent>
          </Card>

          {/* Monev — 1/4 width */}
          <Card className="flex-[1] flex flex-col min-h-0">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-5 w-5 text-muted-foreground" />
                Monev BMP
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pb-4">
              <BMPMonevCards data={monevData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
