import Link from "next/link";
import { AlertTriangle, FileWarning, MapPinOff, UserX, ClipboardX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrainingQualityStats } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const pct = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 1000) / 10}%` : "—";

export function TrainingQualityPanel({ stats }: { stats: TrainingQualityStats }) {
  const items = [
    {
      label: "Kegiatan tanpa bukti",
      value: stats.activitiesWithoutEvidence,
      of: stats.totalActivities,
      icon: FileWarning,
    },
    {
      label: "Kegiatan tanpa lokasi",
      value: stats.activitiesWithoutLocation,
      of: stats.totalActivities,
      icon: MapPinOff,
    },
    {
      label: "Kegiatan tanpa peserta",
      value: stats.activitiesWithoutParticipants,
      of: stats.totalActivities,
      icon: UserX,
    },
    {
      label: "Peserta tanpa skor lengkap",
      value: stats.participantsWithoutScores,
      of: stats.totalAttendance,
      icon: ClipboardX,
    },
  ];

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Kualitas Data
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Kelengkapan pengisian pada irisan yang sedang tampil.
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;
            const clean = item.value === 0;
            return (
              <div
                key={item.label}
                className={`rounded-lg border p-3 ${
                  clean
                    ? "border-border/60"
                    : "border-amber-300/70 bg-amber-50/50 dark:bg-amber-950/20"
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon
                    className={`h-3.5 w-3.5 ${clean ? "text-muted-foreground" : "text-amber-600"}`}
                  />
                  {item.label}
                </div>
                <div className="mt-1.5 text-xl font-bold tabular-nums">
                  {formatNumber(item.value)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {pct(item.value, item.of)} dari {formatNumber(item.of)}
                </div>
              </div>
            );
          })}
        </div>

        <Link
          href="/admin/master-data/training"
          className="inline-block mt-4 text-xs font-medium text-primary hover:underline"
        >
          Buka Master Data Pelatihan untuk melengkapi →
        </Link>
      </CardContent>
    </Card>
  );
}
