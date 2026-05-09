"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Mail, Briefcase, UserCheck, Users, MapPin,
  Building2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { StaffDetail } from "@/server/actions/staff";
import type { StaffActivityRow } from "@/server/actions/staff-activity";
import { ActivitySection } from "./activity-section";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StaffDetailClientProps {
  staff: StaffDetail;
  initialActivities: StaffActivityRow[];
  initialYear: number;
  initialMonth: number;
}

// ─── Collapsible Section wrapper ─────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  description,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader className="py-3 px-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="flex items-center gap-2 text-base">
                {icon}
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="text-xs">{description}</CardDescription>
              )}
            </div>
            <CollapsibleTrigger
              render={
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" />
              }
            >
              {open ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="sr-only">{open ? "Sembunyikan" : "Tampilkan"}</span>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          {children}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StaffDetailClient({
  staff,
  initialActivities,
  initialYear,
  initialMonth,
}: StaffDetailClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
          onClick={() => router.push("/admin/master-data/staff")}
          title="Kembali ke Daftar Staff"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Detail Staff WRI</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {staff.staffCode} &bull; {staff.jobDesk.name}
          </p>
        </div>
      </div>

      {/* Section 1: Profil — open by default */}
      <CollapsibleSection
        title="Profil Staff"
        icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
        defaultOpen={true}
      >
        <CardContent className="pt-0 pb-5">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kode Staff
              </dt>
              <dd className="font-mono font-medium">{staff.staffCode}</dd>
            </div>

            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nama
              </dt>
              <dd className="font-medium">{staff.name}</dd>
            </div>

            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                Job Desk
              </dt>
              <dd>
                <Badge variant="secondary">{staff.jobDesk.name}</Badge>
              </dd>
            </div>

            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email WRI
              </dt>
              <dd>
                {staff.emailWri ? (
                  <a href={`mailto:${staff.emailWri}`} className="text-primary hover:underline">
                    {staff.emailWri}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>

            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                Line Manager
              </dt>
              <dd>
                {staff.lineManager ? (
                  <button
                    onClick={() => router.push(`/admin/master-data/staff/${staff.lineManager!.id}`)}
                    className="text-primary hover:underline text-left"
                  >
                    {staff.lineManager.name}
                    <span className="ml-2 text-xs font-mono text-muted-foreground">
                      {staff.lineManager.staffCode}
                    </span>
                  </button>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>

            {staff.directReports.length > 0 && (
              <div className="space-y-1 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Direct Reports ({staff.directReports.length})
                </dt>
                <dd className="flex flex-wrap gap-1.5">
                  {staff.directReports.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => router.push(`/admin/master-data/staff/${r.id}`)}
                      className="inline-flex items-center gap-1"
                    >
                      <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                        {r.name}
                        <span className="ml-1 text-xs text-muted-foreground">
                          · {r.jobDesk.name}
                        </span>
                      </Badge>
                    </button>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </CollapsibleSection>

      {/* Section 2: Distrik Penugasan — collapsed by default */}
      <CollapsibleSection
        title="Distrik Penugasan"
        icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
        description="Kabupaten/kota yang menjadi area kerja staff ini. Kosong = semua distrik."
        defaultOpen={false}
      >
        <CardContent className="p-0">
          {staff.districts.length === 0 ? (
            <div className="flex items-center gap-2 h-14 px-6 text-sm">
              <Badge variant="secondary">Semua Distrik</Badge>
              <span className="text-muted-foreground">— staff ini bertugas di seluruh distrik</span>
            </div>
          ) : (
            <div className="rounded-b-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/70 hover:bg-muted/70 border-b-2 border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">No</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Distrik</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provinsi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.districts.map((sd, i) => (
                    <TableRow key={sd.id}>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{sd.district.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{sd.district.province.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </CollapsibleSection>

      {/* Section 3: Kelompok Tani Penugasan — collapsed by default */}
      <CollapsibleSection
        title="Kelompok Tani Penugasan"
        icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
        description="Kelompok tani yang menjadi tanggung jawab staff ini. Kosong = semua kelompok tani."
        defaultOpen={false}
      >
        <CardContent className="p-0">
          {staff.farmerGroups.length === 0 ? (
            <div className="flex items-center gap-2 h-14 px-6 text-sm">
              <Badge variant="secondary">Semua Kelompok Tani</Badge>
              <span className="text-muted-foreground">— staff ini bertugas di seluruh kelompok tani</span>
            </div>
          ) : (
            <div className="rounded-b-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/70 hover:bg-muted/70 border-b-2 border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">No</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama KT</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kode</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distrik</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.farmerGroups.map((sfg, i) => (
                    <TableRow key={sfg.id}>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{sfg.farmerGroup.name}</TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">{sfg.farmerGroup.code || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{sfg.farmerGroup.district.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </CollapsibleSection>

      {/* Section 4: Aktivitas Harian — open by default */}
      <ActivitySection
        staffId={staff.id}
        staffName={staff.name}
        staffTitle={staff.jobDesk.name}
        lineManagerId={staff.lineManagerId}
        lineManagerName={staff.lineManager?.name ?? ""}
        lineManagerTitle={staff.lineManager ? "Line Manager" : ""}
        initialActivities={initialActivities}
        initialYear={initialYear}
        initialMonth={initialMonth}
      />
    </div>
  );
}
