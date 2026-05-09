"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft, Mail, Briefcase, UserCheck, Users, MapPin, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { StaffDetail } from "@/server/actions/staff";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StaffDetailClientProps {
  staff: StaffDetail;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StaffDetailClient({ staff }: StaffDetailClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-5xl">
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

      {/* Section 1: Profil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            Profil Staff
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  <a
                    href={`mailto:${staff.emailWri}`}
                    className="text-primary hover:underline"
                  >
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
                    onClick={() =>
                      router.push(`/admin/master-data/staff/${staff.lineManager!.id}`)
                    }
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
                      onClick={() =>
                        router.push(`/admin/master-data/staff/${r.id}`)
                      }
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
      </Card>

      {/* Section 2: Distrik Penugasan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Distrik Penugasan
          </CardTitle>
          <CardDescription>
            Kabupaten/kota yang menjadi area kerja staff ini. Kosong = semua distrik.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {staff.districts.length === 0 ? (
            <div className="flex items-center gap-2 h-16 px-6 text-sm">
              <Badge variant="secondary">Semua Distrik</Badge>
              <span className="text-muted-foreground">
                — staff ini bertugas di seluruh distrik
              </span>
            </div>
          ) : (
            <div className="rounded-b-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/70 hover:bg-muted/70 border-b-2 border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">
                      No
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nama Distrik
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Provinsi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.districts.map((sd, i) => (
                    <TableRow key={sd.id}>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {sd.district.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sd.district.province.name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Kelompok Tani Penugasan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Kelompok Tani Penugasan
          </CardTitle>
          <CardDescription>
            Kelompok tani yang menjadi tanggung jawab staff ini. Kosong = semua kelompok tani.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {staff.farmerGroups.length === 0 ? (
            <div className="flex items-center gap-2 h-16 px-6 text-sm">
              <Badge variant="secondary">Semua Kelompok Tani</Badge>
              <span className="text-muted-foreground">
                — staff ini bertugas di seluruh kelompok tani
              </span>
            </div>
          ) : (
            <div className="rounded-b-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/70 hover:bg-muted/70 border-b-2 border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">
                      No
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nama KT
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Kode
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Distrik
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.farmerGroups.map((sfg, i) => (
                    <TableRow key={sfg.id}>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {sfg.farmerGroup.name}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {sfg.farmerGroup.code || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sfg.farmerGroup.district.name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
