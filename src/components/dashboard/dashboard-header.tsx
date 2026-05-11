import { Target } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface District {
  id: string;
  name: string;
}

interface Batch {
  id: string;
  name: string;
}

interface DashboardHeaderProps {
  program: string
  distrik: string
  setProgram: (v: string) => void
  setDistrik: (v: string) => void
  districts: District[]
  batches: Batch[]
}

export function DashboardHeader({ program, distrik, setProgram, setDistrik, districts, batches }: DashboardHeaderProps) {

  return (
    <div className="flex items-center justify-between px-6 h-14 bg-background border-b shrink-0">
      <div className="flex items-center gap-2.5">
        <Target className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">Basic Data</h1>
      </div>
      <div className="flex items-center gap-2">
        <Select value={program} onValueChange={(v) => setProgram(v ?? "All")}>
          <SelectTrigger className="w-[140px] h-8 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Semua Program</SelectItem>
            {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={distrik} onValueChange={(v) => setDistrik(v ?? "All")}>
          <SelectTrigger className="w-[150px] h-8 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Semua Distrik</SelectItem>
            {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
