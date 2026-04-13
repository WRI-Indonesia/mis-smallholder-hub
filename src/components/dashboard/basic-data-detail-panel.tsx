import { X, Users, UserCheck, MapPinned, LandPlot, GraduationCap, MapPin } from "lucide-react"
import { FarmerGroupData } from "@/lib/static-data/admin/dashboard"

interface BasicDataDetailPanelProps {
  selectedGroup: FarmerGroupData | null
  setSelectedGroup: (group: FarmerGroupData | null) => void
}

export function BasicDataDetailPanel({ selectedGroup, setSelectedGroup }: BasicDataDetailPanelProps) {
  return (
    <div className="w-[40%] border-l overflow-y-auto">
      {selectedGroup ? (
        <div className="p-4">
          {/* Title */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[12px] font-bold text-primary uppercase tracking-widest mb-0.5">{selectedGroup.region}</p>
              <h3 className="text-lg font-extrabold text-foreground leading-tight">{selectedGroup.name}</h3>
            </div>
            <button onClick={() => setSelectedGroup(null)} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Stats */}
          <div className="space-y-3">
            <DetailSection title="Petani" rows={[
              { icon: <Users className="h-4 w-4" />, label: "Total", value: selectedGroup.totalPetani, highlight: true },
              { icon: <UserCheck className="h-4 w-4" />, label: "Laki-Laki", value: selectedGroup.maleFarmers },
              { icon: <UserCheck className="h-4 w-4" />, label: "Perempuan", value: selectedGroup.femaleFarmers },
            ]} />
            <DetailSection title="Lahan" rows={[
              { icon: <MapPinned className="h-4 w-4" />, label: "Persil", value: selectedGroup.totalParcels, highlight: true },
              { icon: <LandPlot className="h-4 w-4" />, label: "Luasan", value: selectedGroup.totalArea },
            ]} />
            <DetailSection title="Training" rows={[
              { icon: <GraduationCap className="h-4 w-4" />, label: "Paket 1", value: selectedGroup.trainingPackage1 },
              { icon: <GraduationCap className="h-4 w-4" />, label: "Paket 2 — MK", value: selectedGroup.trainingPackage2MK },
              { icon: <GraduationCap className="h-4 w-4" />, label: "Paket 2 — HSE", value: selectedGroup.trainingPackage2HSE },
              { icon: <GraduationCap className="h-4 w-4" />, label: "Paket 3 & 4", value: selectedGroup.trainingPackage34 },
            ]} />
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center px-4">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-2">
            <MapPin className="w-4 h-4 text-muted-foreground/40" />
          </div>
          <p className="text-xs font-bold text-foreground mb-0.5">Detail Kelompok Tani</p>
          <p className="text-[11px] text-muted-foreground max-w-[160px] leading-relaxed">
            Klik titik pada peta untuk melihat detail.
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Sub-components ── */

type DetailRowData = { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean };

function DetailSection({ title, rows }: { title: string; rows: DetailRowData[] }) {
  return (
    <div className="flex flex-col">
      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 pb-2 border-b">{title}</h4>
      <div className="space-y-2.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              {row.icon}
              <span className="text-md font-medium">{row.label}</span>
            </div>
            <span className={`font-black text-foreground ${row.highlight ? "text-2xl" : "text-md"}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
