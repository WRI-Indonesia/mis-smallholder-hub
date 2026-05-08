"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, ExternalLink, Users, CalendarDays,
  MapPin, BookOpen, UserPlus, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { AddParticipantsModal } from "./add-participants-modal";
import {
  removeParticipant,
  type TrainingActivityDetail,
  type FarmerForParticipant,
} from "@/server/actions/training";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrainingDetailClientProps {
  activity: TrainingActivityDetail;
  availableFarmers: FarmerForParticipant[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TrainingDetailClient({
  activity,
  availableFarmers,
}: TrainingDetailClientProps) {
  const router = useRouter();
  const evidence = activity.evidences[0] ?? null;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removeParticipantId, setRemoveParticipantId] = useState<string | null>(null);

  // Set of farmerIds already registered — passed to modal to exclude them
  const existingParticipantFarmerIds = useMemo(
    () => new Set(activity.participants.map((p) => p.farmer.id)),
    [activity.participants]
  );

  // ─── Remove handler ────────────────────────────────────────────────────

  async function handleRemove() {
    if (!removeParticipantId) return;
    const result = await removeParticipant(removeParticipantId, activity.id);
    if (result.success) {
      toast.success("Peserta berhasil dihapus.");
      setRemoveParticipantId(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
          onClick={() => router.push("/admin/master-data/training")}
          title="Kembali ke Daftar Training"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Detail Training</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activity.farmerGroup?.name ?? "—"} &bull; {formatDate(activity.trainingDate)}
          </p>
        </div>
      </div>

      {/* Section 1: Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Informasi Training
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kelompok Tani
              </dt>
              <dd className="font-medium">
                {activity.farmerGroup ? (
                  <div className="flex flex-col gap-0.5">
                    <span>{activity.farmerGroup.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {activity.farmerGroup.district.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>

            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Paket Training
              </dt>
              <dd>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{activity.package.name}</span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {activity.package.code}
                  </span>
                </div>
              </dd>
            </div>

            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Tanggal Training
              </dt>
              <dd className="font-medium">{formatDate(activity.trainingDate)}</dd>
            </div>

            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Lokasi
              </dt>
              <dd className="font-medium">
                {activity.location || <span className="text-muted-foreground">—</span>}
              </dd>
            </div>

            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                Jumlah Peserta
              </dt>
              <dd>
                <Badge variant="outline" className="tabular-nums">
                  {activity._count.participants} peserta
                </Badge>
              </dd>
            </div>

            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Evidence
              </dt>
              <dd>
                {evidence ? (
                  <a
                    href={evidence.presignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {evidence.name}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Section 2: Daftar Peserta */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-muted-foreground" />
              Daftar Peserta
            </CardTitle>
            <CardDescription className="mt-1">
              Petani yang mengikuti kegiatan training ini.
            </CardDescription>
          </div>
          {/* Only show button if there's a farmer group */}
          {activity.farmerGroupId && (
            <Button
              size="sm"
              onClick={() => setAddModalOpen(true)}
              className="shrink-0"
            >
              <UserPlus className="mr-2 h-3.5 w-3.5" />
              Tambah Peserta
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {activity.participants.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 gap-2 text-sm text-muted-foreground px-6">
              <span>Belum ada peserta terdaftar untuk kegiatan training ini.</span>
              {activity.farmerGroupId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddModalOpen(true)}
                >
                  <UserPlus className="mr-2 h-3.5 w-3.5" />
                  Tambah Peserta Sekarang
                </Button>
              )}
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
                      Nama Petani
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      ID Petani
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      NIK
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Jenis Kelamin
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.participants.map((p, index) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {p.farmer.name}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {p.farmer.wriFarmerId || "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {p.farmer.nik
                          ? `${p.farmer.nik.slice(0, 4)}****${p.farmer.nik.slice(-4)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.farmer.gender === "L"
                          ? "Laki-laki"
                          : p.farmer.gender === "P"
                          ? "Perempuan"
                          : (p.farmer.gender ?? "—")}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          title="Hapus peserta"
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950"
                          onClick={() => setRemoveParticipantId(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Hapus</span>
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Participants Modal */}
      {addModalOpen && (
        <AddParticipantsModal
          isOpen={addModalOpen}
          onClose={() => {
            setAddModalOpen(false);
            router.refresh();
          }}
          activityId={activity.id}
          availableFarmers={availableFarmers}
          existingParticipantFarmerIds={existingParticipantFarmerIds}
        />
      )}

      {/* Remove Participant Confirm */}
      <DeleteDialog
        open={!!removeParticipantId}
        onClose={() => setRemoveParticipantId(null)}
        onConfirm={handleRemove}
        title="Hapus Peserta"
        description="Apakah Anda yakin ingin menghapus petani ini dari daftar peserta training?"
      />
    </div>
  );
}
