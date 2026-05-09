"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  rejectActivitySchema,
  type RejectActivityFormValues,
} from "@/validations/staff-activity.schema";
import {
  approveStaffActivity,
  rejectStaffActivity,
  type StaffActivityRow,
} from "@/server/actions/staff-activity";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivityApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "approve" | "reject";
  activity: StaffActivityRow;
  staffId: string;
  /** ID of the staff member performing the approval (line manager) */
  approverId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ActivityApprovalModal({
  isOpen,
  onClose,
  mode,
  activity,
  staffId,
  approverId,
}: ActivityApprovalModalProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<RejectActivityFormValues>({
    resolver: zodResolver(rejectActivitySchema as any),
    defaultValues: { rejectionNote: "" },
  });

  const activityDateLabel = new Date(activity.activityDate).toLocaleDateString(
    "id-ID",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  async function handleApprove() {
    setIsPending(true);
    const result = await approveStaffActivity(activity.id, staffId, approverId);
    setIsPending(false);
    if (result.success) {
      toast.success("Aktivitas berhasil disetujui.");
      onClose();
    } else {
      toast.error(result.error);
    }
  }

  async function handleReject(data: RejectActivityFormValues) {
    setIsPending(true);
    const result = await rejectStaffActivity(
      activity.id,
      staffId,
      data.rejectionNote
    );
    setIsPending(false);
    if (result.success) {
      toast.success("Aktivitas dikembalikan untuk revisi.");
      onClose();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "approve" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Setujui Aktivitas
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500" />
                Tolak Aktivitas
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {activityDateLabel}
          </DialogDescription>
        </DialogHeader>

        {/* Activity preview */}
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            Aktivitas
          </p>
          <p className="line-clamp-3">{activity.planning}</p>
        </div>

        {mode === "approve" ? (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Batal
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isPending ? "Menyetujui..." : "Setujui"}
            </Button>
          </DialogFooter>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleReject)} className="space-y-4">
              <FormField
                control={form.control}
                name="rejectionNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catatan Penolakan *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Jelaskan alasan penolakan atau perbaikan yang diperlukan..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isPending}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isPending}
                >
                  {isPending ? "Menolak..." : "Tolak & Minta Revisi"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
