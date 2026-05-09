"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ActivityStatusBadge } from "./activity-status-badge";
import { ActivityFormModal } from "./activity-form-modal";
import { ActivityApprovalModal } from "./activity-approval-modal";
import type { StaffActivityRow } from "@/server/actions/staff-activity";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivityCalendarViewProps {
  staffId: string;
  lineManagerId: string | null;
  activities: StaffActivityRow[];
  year: number;
  month: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_HEADERS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const STATUS_DOT: Record<string, string> = {
  DRAFT: "bg-muted-foreground/50",
  PENDING_APPROVAL: "bg-yellow-500",
  APPROVED: "bg-green-500",
  REJECTED: "bg-red-500",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ActivityCalendarView({
  staffId,
  lineManagerId,
  activities,
  year,
  month,
}: ActivityCalendarViewProps) {
  const [selectedActivity, setSelectedActivity] = useState<StaffActivityRow | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formModal, setFormModal] = useState(false);
  const [approvalModal, setApprovalModal] = useState<{
    open: boolean;
    mode: "approve" | "reject";
  }>({ open: false, mode: "approve" });

  const activityMap = new Map(
    activities.map((a) => [new Date(a.activityDate).getDate(), a])
  );

  // Calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  function handleCellClick(day: number) {
    const a = activityMap.get(day);
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedActivity(a ?? null);
    setSelectedDate(dateStr);
    setFormModal(true);
  }

  return (
    <div className="space-y-4">
      {/* Calendar grid */}
      <div className="rounded-md border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {DAY_HEADERS.map((d, i) => (
            <div
              key={d}
              className={cn(
                "py-2 text-center text-xs font-semibold uppercase tracking-wider",
                i === 0 || i === 6
                  ? "text-red-500 dark:text-red-400"
                  : "text-muted-foreground"
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: totalCells }, (_, i) => {
            const day = i - firstDay + 1;
            const isValid = day >= 1 && day <= daysInMonth;
            const date = isValid ? new Date(year, month - 1, day) : null;
            const isWeekend = date && (date.getDay() === 0 || date.getDay() === 6);
            const a = isValid ? activityMap.get(day) : undefined;
            const isToday =
              isValid &&
              new Date().getFullYear() === year &&
              new Date().getMonth() + 1 === month &&
              new Date().getDate() === day;

            return (
              <div
                key={i}
                onClick={() => isValid && handleCellClick(day)}
                className={cn(
                  "min-h-[80px] p-1.5 border-b border-r text-xs",
                  isValid ? "cursor-pointer hover:bg-accent/50 transition-colors" : "bg-muted/20",
                  isWeekend && isValid ? "bg-red-50/30 dark:bg-red-950/10" : "",
                  !isValid ? "opacity-40" : ""
                )}
              >
                {isValid && (
                  <>
                    {/* Day number */}
                    <div
                      className={cn(
                        "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : isWeekend
                          ? "text-red-500 dark:text-red-400"
                          : "text-foreground"
                      )}
                    >
                      {day}
                    </div>

                    {/* Activity indicator */}
                    {a && (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              STATUS_DOT[a.status]
                            )}
                          />
                          <span className="truncate text-[10px] text-muted-foreground leading-tight">
                            {a.planning.slice(0, 30)}
                            {a.planning.length > 30 ? "…" : ""}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="font-medium">Status:</span>
        {Object.entries(STATUS_DOT).map(([status, dotClass]) => (
          <span key={status} className="flex items-center gap-1">
            <span className={cn("h-2.5 w-2.5 rounded-full", dotClass)} />
            <ActivityStatusBadge
              status={status as any}
              showIcon={false}
            />
          </span>
        ))}
      </div>

      {/* Form modal — opens when clicking a date */}
      {formModal && (
        <ActivityFormModal
          isOpen={formModal}
          onClose={() => {
            setFormModal(false);
            setSelectedActivity(null);
            setSelectedDate(null);
          }}
          staffId={staffId}
          activity={selectedActivity}
          defaultDate={selectedDate ?? undefined}
        />
      )}

      {/* Approval modal */}
      {approvalModal.open && selectedActivity && (
        <ActivityApprovalModal
          isOpen={approvalModal.open}
          onClose={() => setApprovalModal({ open: false, mode: "approve" })}
          mode={approvalModal.mode}
          activity={selectedActivity}
          staffId={staffId}
          approverId={lineManagerId ?? ""}
        />
      )}
    </div>
  );
}
