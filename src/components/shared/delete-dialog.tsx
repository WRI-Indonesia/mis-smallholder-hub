"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Props for the DeleteDialog component */
export interface DeleteDialogProps {
  /** Whether the dialog is currently open */
  open: boolean;
  /** Callback when the dialog should close */
  onClose: () => void;
  /** Async callback when user confirms deletion */
  onConfirm: () => Promise<void>;
  /** Dialog title (defaults to "Konfirmasi Hapus") */
  title?: string;
  /** Dialog description (defaults to a generic warning) */
  description?: string;
}

/**
 * Reusable delete confirmation dialog.
 * Handles loading state and disables buttons during deletion.
 */
export function DeleteDialog({
  open,
  onClose,
  onConfirm,
  title = "Konfirmasi Hapus",
  description = "Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.",
}: DeleteDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
