"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const handleCopy = async () => {
    const text = rows.map((r) => `${r.farmerId}\t${r.name}\t${r.gender}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${formatNumber(rows.length)} baris disalin`);
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
        ],
        data: rows.map((r) => ({
          farmerId: r.farmerId,
          name: r.name,
          gender: r.gender === "F" ? "P" : "L",
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
          <div className="max-h-[50vh] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-3 py-2">ID Petani</th>
                  <th className="text-left px-3 py-2">Nama</th>
                  <th className="text-center px-3 py-2">L/P</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">
                      {r.farmerId}
                    </td>
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 text-center">{r.gender === "F" ? "P" : "L"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {formatNumber(rows.length)} petani
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
