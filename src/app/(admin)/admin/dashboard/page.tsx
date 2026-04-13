"use client"

import { useState, useMemo } from "react"
import { getBasicDataStats, farmerGroupData, type FarmerGroupData } from "@/lib/static-data/admin/dashboard"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { BasicDataCardGrid } from "@/components/dashboard/basic-data-card-grid"
import { BasicDataMap } from "@/components/dashboard/basic-data-map"
import { BasicDataDetailPanel } from "@/components/dashboard/basic-data-detail-panel"

export default function BasicDataDashboardPage() {
  const [program, setProgram] = useState("All")
  const [distrik, setDistrik] = useState("All")
  const [selectedGroup, setSelectedGroup] = useState<FarmerGroupData | null>(null)
  const [mapSearch, setMapSearch] = useState("")

  const filteredGroups = useMemo(() =>
    farmerGroupData.filter(g => {
      const matchDistrik = distrik === "All" || g.region === distrik
      const matchSearch = !mapSearch || g.name.toLowerCase().includes(mapSearch.toLowerCase())
      return matchDistrik && matchSearch
    }),
    [distrik, mapSearch])

  const allStats = useMemo(() => getBasicDataStats(program, distrik), [program, distrik])

  return (
    <div className="-m-6 flex flex-col bg-muted/30" style={{ height: "calc(100vh - 56px)" }}>
      <DashboardHeader 
        program={program}
        distrik={distrik}
        setProgram={setProgram}
        setDistrik={setDistrik}
      />

      <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
        <BasicDataCardGrid stats={allStats} />

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
  )
}
