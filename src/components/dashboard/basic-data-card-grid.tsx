import { Users, UsersRound, UserCheck, MapPinned, LandPlot, GraduationCap } from "lucide-react"

const iconMap: Record<string, React.ReactNode> = {
  UsersRound: <UsersRound className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  UserCheck: <UserCheck className="h-5 w-5" />,
  MapPinned: <MapPinned className="h-5 w-5" />,
  LandPlot: <LandPlot className="h-5 w-5" />,
  GraduationCap: <GraduationCap className="h-5 w-5" />,
}

interface StatItem {
  icon: string
  label: string
  value: string
}

interface BasicDataCardGridProps {
  stats: StatItem[]
}

export function BasicDataCardGrid({ stats }: BasicDataCardGridProps) {
  return (
    <div className="grid grid-cols-5 grid-rows-2 gap-3 shrink-0">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-background border rounded-lg px-4 py-3 flex flex-col justify-between min-h-[88px]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[14px] font-bold text-muted-foreground uppercase tracking-widest leading-tight max-w-[80%]">{stat.label}</p>
            <div className="p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">
              {iconMap[stat.icon]}
            </div>
          </div>
          <p className="text-4xl font-black tracking-tight text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
