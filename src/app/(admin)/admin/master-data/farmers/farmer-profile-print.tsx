"use client";

// Unduh PDF "Profil Petani" (#343) — dipakai tombol header Detail Petani dan
// aksi baris Daftar Petani: satu hook untuk toast progres, loading per petani,
// dan dialog konfirmasi "Lengkap / Ringkasan saja" bila lahan > 10 (keputusan
// owner 2026-09-18 — petani 40 lahan ≈ 80+ halaman).

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFarmerProfilePassport } from "@/server/actions/farmer";
import { formatNumber } from "@/lib/format";

/** Di atas ambang ini muncul dialog Lengkap / Ringkasan saja. */
export const PROFILE_APPENDIX_CONFIRM_THRESHOLD = 10;

/** Perkiraan halaman: Bagian A ≈ 2 + ≈ 2 per lahan (lampiran Profil Lahan 2 halaman). */
export const estimateProfilePages = (parcelCount: number) => 2 + 2 * parcelCount;

export type FarmerPrintTarget = { id: string; name: string; parcelCount: number };

export function useFarmerProfilePrint() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pending, setPending] = useState<FarmerPrintTarget | null>(null);

  const run = async (target: FarmerPrintTarget, includeParcels: boolean) => {
    setLoadingId(target.id);
    const toastId = toast.loading(
      includeParcels && target.parcelCount > 0
        ? `Menyiapkan Profil Petani — ${formatNumber(target.parcelCount)} lahan…`
        : "Menyiapkan Profil Petani…",
    );
    try {
      const res = await getFarmerProfilePassport(target.id, { includeParcels });
      if (!res.success || !res.data) {
        toast.error(res.success ? "Data tidak ditemukan" : res.error, { id: toastId });
        return;
      }
      const { generateFarmerProfilePdf } = await import("@/lib/farmer-profile-pdf");
      generateFarmerProfilePdf(res.data);
      toast.success("Profil Petani siap diunduh", { id: toastId });
    } catch {
      toast.error("Gagal membuat PDF Profil Petani", { id: toastId });
    } finally {
      setLoadingId(null);
    }
  };

  /** Mulai cetak; lahan > ambang → tanya dulu Lengkap / Ringkasan saja. Satu per satu — baris lain tetap bisa diklik tapi diberi tahu (review #343). */
  const print = (target: FarmerPrintTarget) => {
    if (loadingId) {
      toast.info("Profil Petani lain sedang disiapkan — tunggu sampai selesai.");
      return;
    }
    if (target.parcelCount > PROFILE_APPENDIX_CONFIRM_THRESHOLD) setPending(target);
    else void run(target, true);
  };

  const choose = (includeParcels: boolean) => {
    const target = pending;
    setPending(null);
    if (target) void run(target, includeParcels);
  };

  const dialog = (
    <Dialog open={pending != null} onOpenChange={(open) => !open && setPending(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cetak Profil Petani</DialogTitle>
          <DialogDescription>
            {pending && (
              <>
                Dokumen <span className="font-medium">{pending.name}</span> akan berisi ±
                {formatNumber(estimateProfilePages(pending.parcelCount))} halaman (
                {formatNumber(pending.parcelCount)} lahan). Cetak lengkap dengan lampiran Profil Lahan
                tiap lahan, atau ringkasan saja?
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => choose(false)}>
            Ringkasan saja
          </Button>
          <Button onClick={() => choose(true)}>Lengkap</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { print, loadingId, dialog };
}
