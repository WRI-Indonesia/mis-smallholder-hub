"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Edit2, Trash2, Send, CheckCircle2, XCircle, Image, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { ActivityStatusBadge } from "./activity-status-badge";
import { ActivityFormModal } from "./activity-form-modal";
import { ActivityApprovalModal } from "./activity-approval-modal";
import {
  submitStaffActivity,
  deleteStaffActivity,
  type StaffActivityRow,
} from "@/server/actions/staff-activity";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivityListViewProps {
  staffId: string;
  staffName: string;
  lineManagerId: string | null;
  activities: StaffActivityRow[];
  year: number;
  month: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function isWeekend(date: Date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ActivityListView({
  staffId,
  lineManagerId,
  activities,
  year,
  month,
}: ActivityListViewProps) {
  const [formModal, setFormModal] = useState<{
    open: boolean;
    activity: StaffActivityRow | null;
    defaultDate?: string;
  }>({ open: false, activity: null });

  const [approvalModal, setApprovalModal] = useState<{
    open: boolean;
    mode: "approve" | "reject";
    activity: StaffActivityRow | null;
  }>({ open: false, mode: "approve", activity: null });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Build map for quick lookup
  const activityMap = new Map(
    activities.map((a) => [
      new Date(a.activityDate).getDate(),
      a,
    ])
  );

  const daysInMonth = new Date(year, month, 0).getDate();

  async function handleSubmit(activityId: string) {
    const result = await submitStaffActivity(activityId, staffId);
    if (result.success) {
      toast.success("Aktivitas berhasil disubmit untuk approval.");
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const result = await deleteStaffActivity(deleteId, staffId);
    if (result.success) {
      toast.success("Aktivitas berhasil dihapus.");
      setDeleteId(null);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/70 hover:bg-muted/70 border-b-2 border-border">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">No</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16">Hari</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Tanggal</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Planning</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Realisasi</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Documentation/Links</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-36">Status</TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const date = new Date(year, month - 1, day);
              const weekend = isWeekend(date);
              const a = activityMap.get(day);
              const isExpanded = expandedId === (a?.id ?? `day-${day}`);

              return (
                <TableRow
                  key={day}
                  className={weekend ? "bg-red-50/30 dark:bg-red-950/10" : ""}
                >
                  <TableCell className={`text-sm tabular-nums ${weekend ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}>
                    {day}
                  </TableCell>
                  <TableCell className={`text-sm ${weekend ? "text-red-500 dark:text-red-400 font-medium" : "text-muted-foreground"}`}>
                    {DAYS_ID[date.getDay()]}
                  </TableCell>
                  <TableCell className={`text-sm ${weekend ? "text-red-500 dark:text-red-400" : ""}`}>
                    {day} {MONTHS_ID[month - 1].slice(0, 3)} {year}
                  </TableCell>
                  <TableCell className="text-sm">
                    {a ? (
                      <div>
                        <p className={`${isExpanded ? "" : "line-clamp-2"} text-sm`}>
                          {a.planning}
                        </p>
                        {a.planning.length > 80 && (
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : a.id)}
                            className="text-xs text-primary hover:underline mt-0.5 flex items-center gap-0.5"
                          >
                            {isExpanded ? (
                              <><ChevronUp className="h-3 w-3" /> Sembunyikan</>
                            ) : (
                              <><ChevronDown className="h-3 w-3" /> Selengkapnya</>
                            )}
                          </button>
                        )}
                        {a.rejectionNote && (
                          <p className="text-xs text-red-500 mt-1 italic">
                            Catatan: {a.rejectionNote}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a?.realization ? (
                      <p className="line-clamp-2">{a.realization}</p>
                    ) : (
                      <span>—</span>
                    )}
                  </TableCell>
                  <TableCell className="w-20 p-1">
                    {a?.photos.length ? (
                      <div className="w-full max-w-[72px]">
                        <div className="grid grid-cols-2 gap-0.5">
                          {a.photos.slice(0, 4).map((photo, idx) => (
                            <div key={photo.id} className="relative">
                              {photo.presignedUrl.match(/\.(jpg|jpeg|png)(\?|$)/i) ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={photo.presignedUrl}
                                  alt={photo.filename}
                                  className="w-8 h-6 object-cover rounded-sm border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => window.open(photo.presignedUrl, '_blank')}
                                  title={photo.filename}
                                />
                              ) : (
                                <div 
                                  className="w-8 h-6 bg-muted rounded-sm border flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                                  onClick={() => window.open(photo.presignedUrl, '_blank')}
                                  title={photo.filename}
                                >
                                  <Image className="h-2.5 w-2.5 text-muted-foreground" />
                                </div>
                              )}
                              {idx === 3 && a.photos.length > 4 && (
                                <div className="absolute inset-0 bg-black/50 rounded-sm flex items-center justify-center">
                                  <span className="text-xs text-white font-medium">
                                    +{a.photos.length - 4}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {a ? (
                      <ActivityStatusBadge status={a.status} />
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-0.5 justify-end">
                      {!a ? (
                        /* No activity — add button */
                        !weekend && (
                          <button
                            title="Tambah Aktivitas"
                            className="h-7 px-2 text-xs inline-flex items-center gap-1 rounded-md border border-dashed border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            onClick={() =>
                              setFormModal({
                                open: true,
                                activity: null,
                                defaultDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                              })
                            }
                          >
                            + Tambah
                          </button>
                        )
                      ) : (
                        <>
                          {/* Edit — only DRAFT or REJECTED */}
                          {(a.status === "DRAFT" || a.status === "REJECTED") && (
                            <button
                              title="Edit"
                              className="h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent"
                              onClick={() => setFormModal({ open: true, activity: a })}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Submit — only DRAFT or REJECTED */}
                          {(a.status === "DRAFT" || a.status === "REJECTED") && (
                            <button
                              title="Submit untuk Approval"
                              className="h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent text-yellow-600"
                              onClick={() => handleSubmit(a.id)}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Approve — only PENDING, by line manager */}
                          {a.status === "PENDING_APPROVAL" && lineManagerId && (
                            <button
                              title="Setujui"
                              className="h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent text-green-600"
                              onClick={() =>
                                setApprovalModal({ open: true, mode: "approve", activity: a })
                              }
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Reject — only PENDING, by line manager */}
                          {a.status === "PENDING_APPROVAL" && lineManagerId && (
                            <button
                              title="Tolak"
                              className="h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent text-red-600"
                              onClick={() =>
                                setApprovalModal({ open: true, mode: "reject", activity: a })
                              }
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Delete — not APPROVED */}
                          {a.status !== "APPROVED" && (
                            <button
                              title="Hapus"
                              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-100 dark:hover:bg-red-950"
                              onClick={() => setDeleteId(a.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      {formModal.open && (
        <ActivityFormModal
          isOpen={formModal.open}
          onClose={() => setFormModal({ open: false, activity: null })}
          staffId={staffId}
          activity={formModal.activity}
          defaultDate={formModal.defaultDate}
        />
      )}

      {approvalModal.open && approvalModal.activity && (
        <ActivityApprovalModal
          isOpen={approvalModal.open}
          onClose={() => setApprovalModal({ open: false, mode: "approve", activity: null })}
          mode={approvalModal.mode}
          activity={approvalModal.activity}
          staffId={staffId}
          approverId={lineManagerId ?? ""}
        />
      )}

      <DeleteDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Aktivitas"
        description="Apakah Anda yakin ingin menghapus aktivitas ini? Semua foto terkait juga akan dihapus."
      />
    </div>
  );
}
