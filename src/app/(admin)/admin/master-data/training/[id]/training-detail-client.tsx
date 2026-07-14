"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { removeParticipant, updateParticipantScores, removeParticipants } from "@/server/actions/training";
import { toast } from "sonner";
import { TRAINING_CATEGORY_LABELS } from "../training-list-client";
import { AddParticipantsModal } from "./add-participants-modal";
import { Input } from "@/components/ui/input";

interface Farmer {
  id: string;
  name: string;
  farmerId: string;
  nik: string | null;
  gender: string;
}

interface Participant {
  id: string;
  farmer: Farmer;
  preTestScore: number | null;
  postTestScore: number | null;
}

interface TrainingActivity {
  id: string;
  package: {
    id: string;
    code: string;
    name: string;
  };
  farmerGroupId: string;
  farmerGroup: {
    id: string;
    name: string;
    district: {
      name: string;
    };
  };
  location: string | null;
  trainingDate: Date | string;
  evidenceName: string | null;
  evidenceUrl: string | null;
  participants: Participant[];
}

interface Props {
  activity: TrainingActivity;
  permissions: string[];
}

export function TrainingDetailClient({ activity, permissions }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const router = useRouter();

  const formatDate = (d: Date | string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "—";
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const month = months[date.getMonth()];
    return `${day}/${month}/${date.getFullYear()}`;
  };

  async function handleDeleteParticipant(participantId: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus peserta ini dari pelatihan?")) return;
    setIsDeletingId(participantId);
    const result = await removeParticipant(participantId);
    setIsDeletingId(null);

    if (result.success) {
      toast.success("Peserta berhasil dihapus");
      setSelectedParticipantIds((prev) => prev.filter((id) => id !== participantId));
      router.refresh();
    } else {
      toast.error(result.error || "Gagal menghapus peserta");
    }
  }

  async function handleBulkDelete() {
    if (selectedParticipantIds.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedParticipantIds.length} peserta terpilih dari pelatihan?`)) return;

    setIsBulkDeleting(true);
    const result = await removeParticipants(selectedParticipantIds);
    setIsBulkDeleting(false);

    if (result.success) {
      toast.success(`${selectedParticipantIds.length} peserta berhasil dihapus`);
      setSelectedParticipantIds([]);
      router.refresh();
    } else {
      toast.error(result.error || "Gagal menghapus peserta");
    }
  }

  const allSelected = activity.participants.length > 0 && selectedParticipantIds.length === activity.participants.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedParticipantIds([]);
    } else {
      setSelectedParticipantIds(activity.participants.map((p) => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canEdit = permissions.includes("EDIT");

  async function handleScoreBlur(
    participant: Participant,
    field: "preTestScore" | "postTestScore",
    rawValue: string
  ) {
    const val = rawValue === "" ? null : parseInt(rawValue, 10);
    if (val !== null && (isNaN(val) || val < 0 || val > 100)) {
      toast.error("Nilai harus antara 0 - 100");
      return;
    }
    if (val !== participant[field]) {
      const res = await updateParticipantScores(participant.id, {
        preTestScore: field === "preTestScore" ? val : participant.preTestScore,
        postTestScore: field === "postTestScore" ? val : participant.postTestScore,
      });
      if (res.success) {
        toast.success(`Nilai ${field === "preTestScore" ? "Pre" : "Post"}-Test berhasil disimpan`);
        router.refresh();
      } else {
        toast.error(res.error || "Gagal menyimpan nilai");
      }
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/master-data/training">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Detail Pelatihan</h1>
          <p className="text-muted-foreground text-sm">
            {TRAINING_CATEGORY_LABELS[activity.package.code] || activity.package.name}
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lembaga Tani</p>
            <p className="text-sm font-medium mt-1">{activity.farmerGroup.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distrik</p>
            <p className="text-sm font-medium mt-1">{activity.farmerGroup.district.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Pelatihan</p>
            <p className="text-sm font-medium mt-1">{formatDate(activity.trainingDate)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lokasi</p>
            <p className="text-sm font-medium mt-1">{activity.location ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Peserta</p>
            <p className="text-sm font-medium mt-1">{activity.participants.length} orang</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evidence (Notulen)</p>
            {activity.evidenceUrl ? (
              <a
                href={activity.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline block mt-1 truncate max-w-xs"
                title={activity.evidenceName ?? "Download PDF"}
              >
                {activity.evidenceName ?? "Lihat Dokumen (PDF)"}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">—</p>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Peserta Pelatihan</h2>
          <div className="flex items-center gap-2">
            {canEdit && selectedParticipantIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                disabled={isBulkDeleting}
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus Terpilih ({selectedParticipantIds.length})
              </Button>
            )}
            {canEdit && (
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Peserta
              </Button>
            )}
          </div>
        </div>

        <Card className="overflow-hidden border">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-muted/70 border-b-2">
                   {canEdit && (
                     <th className="p-3 w-10 text-center">
                       <input
                         type="checkbox"
                         checked={allSelected}
                         onChange={toggleSelectAll}
                         className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                       />
                     </th>
                   )}
                   <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-12 text-center">No</th>
                   <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama</th>
                   <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID Petani</th>
                   <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">NIK</th>
                   <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">L/P</th>
                   <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center w-24">Pre-Test</th>
                   <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center w-24">Post-Test</th>
                   {canEdit && (
                     <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[1%] whitespace-nowrap text-center">Aksi</th>
                   )}
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {activity.participants.length === 0 ? (
                   <tr>
                     <td colSpan={canEdit ? 9 : 7} className="p-8 text-center text-sm text-muted-foreground">
                       Belum ada peserta terdaftar untuk pelatihan ini.
                     </td>
                   </tr>
                 ) : (
                   activity.participants.map((p, idx) => (
                     <tr key={p.id} className="hover:bg-muted/30">
                       {canEdit && (
                         <td className="p-3 text-center">
                           <input
                             type="checkbox"
                             checked={selectedParticipantIds.includes(p.id)}
                             onChange={() => toggleSelect(p.id)}
                             className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                           />
                         </td>
                       )}
                       <td className="p-3 text-sm text-center text-muted-foreground tabular-nums">{idx + 1}</td>
                      <td className="p-3 text-sm font-medium">{p.farmer.name}</td>
                      <td className="p-3 text-sm font-mono text-muted-foreground">{p.farmer.farmerId}</td>
                      <td className="p-3 text-sm font-mono text-muted-foreground">{p.farmer.nik ?? "—"}</td>
                      <td className="p-3 text-sm">
                        <Badge variant="secondary">
                          {p.farmer.gender === "M" ? "Laki-laki" : "Perempuan"}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {canEdit ? (
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="w-16 h-8 text-xs text-center font-medium mx-auto"
                            defaultValue={p.preTestScore ?? ""}
                            onBlur={(e) => handleScoreBlur(p, "preTestScore", e.target.value)}
                          />
                        ) : (
                          <span className="text-sm font-medium tabular-nums">{p.preTestScore ?? "—"}</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {canEdit ? (
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="w-16 h-8 text-xs text-center font-medium mx-auto"
                            defaultValue={p.postTestScore ?? ""}
                            onBlur={(e) => handleScoreBlur(p, "postTestScore", e.target.value)}
                          />
                        ) : (
                          <span className="text-sm font-medium tabular-nums">{p.postTestScore ?? "—"}</span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Hapus Peserta"
                            disabled={isDeletingId === p.id}
                            onClick={() => handleDeleteParticipant(p.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {showAddModal && (
        <AddParticipantsModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          activityId={activity.id}
          packageId={activity.package.id}
          farmerGroupId={activity.farmerGroupId}
          currentParticipantFarmerIds={activity.participants.map((p) => p.farmer.id)}
        />
      )}
    </div>
  );
}
