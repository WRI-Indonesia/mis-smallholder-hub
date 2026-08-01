"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportToExcel } from "@/lib/xlsx";
import { getUntrainedFarmers } from "@/server/actions/dashboard-training";
import { TRAINING_PACKAGE_LABELS } from "@/lib/training-dashboard-aggregation";
import type { TrainingPackageCode, UntrainedFarmer } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);

export interface UntrainedTarget {
  groupId: string;
  groupName: string;
  packageCode: TrainingPackageCode | "ANY";
  year: number | null;
}

/**
 * Isi modal. Sengaja komponen terpisah dan di-*mount ulang* per target (lewat
 * `key` di pemanggil) — dengan begitu state awal sudah benar dan effect tidak
 * perlu me-reset state secara sinkron (dilarang: memicu cascading render).
 */
function UntrainedList({ target, onClose }: { target: UntrainedTarget; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UntrainedFarmer[]>([]);
  // Saring ke petani yang BELUM PERNAH mengikuti paket ini di tahun mana pun
  // (#202) — daftar undangan bersih tanpa yang sudah terlatih tahun lain.
  const [onlyNever, setOnlyNever] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getUntrainedFarmers(target.groupId, target.packageCode, target.year)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : "Gagal memuat daftar petani");
        onClose();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [target, onClose]);

  const packageLabel =
    target.packageCode === "ANY"
      ? "belum mengikuti pelatihan apa pun"
      : `belum mengikuti ${TRAINING_PACKAGE_LABELS[target.packageCode]}`;

  const yearLabel = target.year == null ? "semua tahun" : String(target.year);

  // Petani yang pernah dilatih paket ini di tahun LAIN (#202) — tetap masuk
  // daftar irisan tahun, tapi ditandai agar tidak terundang seolah belum pernah.
  const showOtherYear = target.year != null;
  const otherYearCount = rows.filter((r) => r.lastTrainedOtherYear != null).length;
  const visibleRows = onlyNever ? rows.filter((r) => r.lastTrainedOtherYear == null) : rows;

  const handleCopy = async () => {
    const text = visibleRows
      .map((r) =>
        [
          r.farmerId,
          r.name,
          r.gender,
          ...(showOtherYear ? [r.lastTrainedOtherYear ?? "-"] : []),
        ].join("\t"),
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${formatNumber(visibleRows.length)} baris disalin`);
    } catch {
      toast.error("Gagal menyalin — izin clipboard ditolak browser");
    }
  };

  const handleExport = async () => {
    const slug = target.packageCode === "ANY" ? "belum-dilatih" : target.packageCode.toLowerCase();
    // Ekstensi TIDAK ditulis di sini — `exportToExcel` sudah menambahkan `.xlsx`
    // sendiri (lib/xlsx.ts), jadi menuliskannya menghasilkan `...xlsx.xlsx`.
    // Nama Lembaga dibersihkan: karakter seperti "/" merusak nama unduhan.
    const groupSlug =
      target.groupName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "lembaga";
    try {
      await exportToExcel({
        filename: `petani-${slug}-${groupSlug}`,
        sheetName: "Belum Dilatih",
        columns: [
          { header: "ID Petani", key: "farmerId", width: 18 },
          { header: "Nama Petani", key: "name", width: 32 },
          { header: "L/P", key: "gender", width: 8 },
          ...(showOtherYear
            ? [{ header: "Dilatih Tahun Lain", key: "otherYear", width: 18 }]
            : []),
        ],
        data: visibleRows.map((r) => ({
          farmerId: r.farmerId,
          name: r.name,
          gender: r.gender === "F" ? "P" : "L",
          ...(showOtherYear ? { otherYear: r.lastTrainedOtherYear ?? "-" } : {}),
        })),
      });
      toast.success("Excel diunduh");
    } catch {
      toast.error("Gagal membuat file Excel");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base">
          {target.groupName}
          <span className="block text-xs font-normal text-muted-foreground mt-1">
            Petani {packageLabel} — {yearLabel}
          </span>
        </DialogTitle>
      </DialogHeader>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat daftar petani...
        </div>
      ) : rows.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
          Semua petani aktif di Lembaga ini sudah mengikuti pelatihan tersebut.
        </div>
      ) : (
        <>
          {showOtherYear && otherYearCount > 0 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <Checkbox checked={onlyNever} onCheckedChange={(v) => setOnlyNever(!!v)} />
              Hanya yang belum pernah sama sekali mengikuti paket ini
            </label>
          )}
          <div className="max-h-[50vh] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-3 py-2">ID Petani</th>
                  <th className="text-left px-3 py-2">Nama</th>
                  <th className="text-center px-3 py-2">L/P</th>
                  {showOtherYear && <th className="text-right px-3 py-2">Tahun Lain</th>}
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={showOtherYear ? 4 : 3}
                      className="px-3 py-6 text-center text-sm text-muted-foreground"
                    >
                      Semua petani pada daftar ini pernah dilatih di tahun lain.
                    </td>
                  </tr>
                )}
                {visibleRows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">
                      {r.farmerId}
                    </td>
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 text-center">{r.gender === "F" ? "P" : "L"}</td>
                    {showOtherYear && (
                      <td className="px-3 py-1.5 text-right">
                        {r.lastTrainedOtherYear != null ? (
                          <Badge
                            variant="secondary"
                            title={`Pernah dilatih paket ini pada ${r.lastTrainedOtherYear} — bukan "belum pernah dilatih"`}
                          >
                            Dilatih {r.lastTrainedOtherYear}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {formatNumber(visibleRows.length)} petani
              {onlyNever ? (
                <> · dari {formatNumber(rows.length)} baris irisan tahun ini</>
              ) : (
                showOtherYear &&
                otherYearCount > 0 && (
                  <> · {formatNumber(otherYearCount)} pernah dilatih di tahun lain</>
                )
              )}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1.5" /> Salin
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1.5" /> Excel
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function TrainingUntrainedModal({
  target,
  onClose,
}: {
  target: UntrainedTarget | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={target != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        {target && (
          <UntrainedList
            key={`${target.groupId}-${target.packageCode}-${target.year ?? "all"}`}
            target={target}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
