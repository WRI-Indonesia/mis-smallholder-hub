"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  List, CalendarDays, Download, Plus, ChevronLeft, ChevronRight, Loader2,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ActivityListView } from "./activity-list-view";
import { ActivityCalendarView } from "./activity-calendar-view";
import { ActivityFormModal } from "./activity-form-modal";
import { exportActivitiesToExcel } from "@/server/actions/staff-activity-export";
import type { StaffActivityRow } from "@/server/actions/staff-activity";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivitySectionProps {
  staffId: string;
  staffName: string;
  staffTitle: string;
  lineManagerId: string | null;
  lineManagerName: string;
  lineManagerTitle: string;
  initialActivities: StaffActivityRow[];
  initialYear: number;
  initialMonth: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// ─── Component ───────────────────────────────────────────────────────────────

export function ActivitySection({
  staffId,
  staffName,
  staffTitle,
  lineManagerId,
  lineManagerName,
  lineManagerTitle,
  initialActivities,
  initialYear,
  initialMonth,
}: ActivitySectionProps) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(initialYear);
  const [isExporting, startExport] = useTransition();

  const now = new Date();
  const maxYear = now.getFullYear();
  const minYear = maxYear - 5;

  // Navigate months
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    const now = new Date();
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)) return;
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  function isFutureMonth(m: number, y: number) {
    return y > maxYear || (y === maxYear && m > now.getMonth() + 1);
  }

  function selectMonth(m: number) {
    if (isFutureMonth(m, pickerYear)) return;
    setMonth(m);
    setYear(pickerYear);
    setPickerOpen(false);
  }

  // Export
  function handleExport() {
    startExport(async () => {
      const result = await exportActivitiesToExcel(
        staffId, staffName, staffTitle,
        lineManagerName, lineManagerTitle,
        year, month
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      // Trigger download in browser
      const { buffer, filename } = result.data!;
      const blob = new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export berhasil.");
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Aktivitas Harian
          </CardTitle>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month navigator */}
            <div className="flex items-center gap-1 border rounded-md px-2 py-1">
              <button
                type="button"
                onClick={prevMonth}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {/* Clickable month-year picker */}
              <Popover open={pickerOpen} onOpenChange={(o) => {
                setPickerOpen(o);
                if (o) setPickerYear(year);
              }}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="text-sm font-medium min-w-[130px] text-center px-1 rounded hover:bg-accent transition-colors"
                    />
                  }
                >
                  {MONTHS_ID[month - 1]} {year}
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="center">
                  {/* Year selector */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => Math.max(minYear, y - 1))}
                      disabled={pickerYear <= minYear}
                      className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm font-semibold">{pickerYear}</span>
                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => Math.min(maxYear, y + 1))}
                      disabled={pickerYear >= maxYear}
                      className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent disabled:opacity-40"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Month grid */}
                  <div className="grid grid-cols-3 gap-1">
                    {MONTHS_ID.map((m, i) => {
                      const mNum = i + 1;
                      const isSelected = mNum === month && pickerYear === year;
                      const isFuture = isFutureMonth(mNum, pickerYear);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => selectMonth(mNum)}
                          disabled={isFuture}
                          className={cn(
                            "h-8 rounded-md text-xs font-medium transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : isFuture
                              ? "opacity-30 cursor-not-allowed"
                              : "hover:bg-accent"
                          )}
                        >
                          {m.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <button
                type="button"
                onClick={nextMonth}
                disabled={isCurrentMonth}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* View toggle */}
            <div className="flex items-center border rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`h-8 px-3 flex items-center gap-1.5 text-xs transition-colors ${
                  view === "list"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
              <button
                type="button"
                onClick={() => setView("calendar")}
                className={`h-8 px-3 flex items-center gap-1.5 text-xs transition-colors ${
                  view === "calendar"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Kalender
              </button>
            </div>

            {/* Export */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1" />
              )}
              Export Excel
            </Button>

            {/* Add activity */}
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Tambah Aktivitas
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {view === "list" ? (
          <ActivityListView
            staffId={staffId}
            staffName={staffName}
            lineManagerId={lineManagerId}
            activities={initialActivities}
            year={year}
            month={month}
          />
        ) : (
          <ActivityCalendarView
            staffId={staffId}
            lineManagerId={lineManagerId}
            activities={initialActivities}
            year={year}
            month={month}
          />
        )}
      </CardContent>

      {addModalOpen && (
        <ActivityFormModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          staffId={staffId}
        />
      )}
    </Card>
  );
}
