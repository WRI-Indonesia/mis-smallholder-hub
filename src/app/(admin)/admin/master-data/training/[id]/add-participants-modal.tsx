"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, X, UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  addParticipants,
  type FarmerForParticipant,
} from "@/server/actions/training";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AddParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
  /** All farmers in the kelompok tani */
  availableFarmers: FarmerForParticipant[];
  /** IDs of farmers already registered as participants */
  existingParticipantFarmerIds: Set<string>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AddParticipantsModal({
  isOpen,
  onClose,
  activityId,
  availableFarmers,
  existingParticipantFarmerIds,
}: AddParticipantsModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, setIsPending] = useState(false);

  // ─── Farmers not yet registered ────────────────────────────────────────

  const candidates = useMemo(
    () => availableFarmers.filter((f) => !existingParticipantFarmerIds.has(f.id)),
    [availableFarmers, existingParticipantFarmerIds]
  );

  // ─── Filtered by search ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.nik.includes(q) ||
        (f.wriFarmerId?.toLowerCase().includes(q) ?? false)
    );
  }, [candidates, search]);

  // ─── Selected farmer objects ────────────────────────────────────────────

  const selectedFarmers = useMemo(
    () => candidates.filter((f) => selected.has(f.id)),
    [candidates, selected]
  );

  // ─── Handlers ──────────────────────────────────────────────────────────

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleSave() {
    if (selected.size === 0) {
      toast.info("Pilih minimal satu petani.");
      return;
    }
    setIsPending(true);
    const result = await addParticipants(activityId, Array.from(selected));
    setIsPending(false);

    if (result.success) {
      toast.success(
        `${result.data!.added} peserta berhasil ditambahkan.`
      );
      onClose();
    } else {
      toast.error(result.error);
    }
  }

  function handleClose() {
    setSearch("");
    setSelected(new Set());
    onClose();
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Tambah Peserta Training
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 min-h-0">
          {/* ── Left panel: candidate farmers ── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Petani Kelompok Tani
              </p>
              <span className="text-xs text-muted-foreground">
                {candidates.length} tersedia
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau NIK..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {/* List */}
            <ScrollArea className="h-64 rounded-md border">
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
                  {candidates.length === 0
                    ? "Semua petani sudah terdaftar sebagai peserta."
                    : "Petani tidak ditemukan."}
                </div>
              ) : (
                <div className="p-1">
                  {filtered.map((f) => {
                    const isSelected = selected.has(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggle(f.id)}
                        className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                          isSelected ? "bg-primary/10" : ""
                        }`}
                      >
                        {/* Checkbox indicator */}
                        <span
                          className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="font-medium truncate block">
                            {f.name}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {f.wriFarmerId ?? f.nik}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* ── Right panel: selected ── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Peserta Dipilih</p>
              <Badge variant="secondary" className="tabular-nums">
                {selected.size} dipilih
              </Badge>
            </div>

            {/* Spacer to align with search input */}
            <div className="h-8" />

            <ScrollArea className="h-64 rounded-md border">
              {selectedFarmers.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
                  Pilih petani dari panel kiri.
                </div>
              ) : (
                <div className="p-1">
                  {selectedFarmers.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent group"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="font-medium truncate block">
                          {f.name}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {f.wriFarmerId ?? f.nik}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSelected(f.id)}
                        className="h-5 w-5 shrink-0 rounded flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                        title="Hapus dari pilihan"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || selected.size === 0}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Menyimpan...
              </span>
            ) : (
              `Simpan ${selected.size > 0 ? `(${selected.size})` : ""} Peserta`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
