"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { 
  Upload, Download, Trash2, FileText, ExternalLink, 
  Clock, AlertCircle, CheckCircle2, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { 
  uploadTrainingPDF, 
  getTrainingPDFs, 
  generatePDFLink, 
  deleteTrainingPDF,
  type TrainingPDFInfo 
} from "@/server/actions/training-pdf";
import { formatFileSize, isURLExpired } from "@/lib/pdf-utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PDFManagerProps {
  activityId: string;
  initialPDFs?: TrainingPDFInfo[];
  readonly?: boolean;
}

// ─── Upload Modal ────────────────────────────────────────────────────────────

function PDFUploadModal({ 
  activityId, 
  onUploadSuccess 
}: { 
  activityId: string; 
  onUploadSuccess: () => void; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Pilih file PDF terlebih dahulu.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("activityId", activityId);
    formData.append("description", description || file.name);

    const result = await uploadTrainingPDF(formData);
    setIsUploading(false);

    if (result.success && result.data) {
      toast.success("PDF berhasil diupload.");
      setIsOpen(false);
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploadSuccess();
    } else {
      toast.error("error" in result ? result.error : "Gagal upload PDF.");
    }
  }

  return (
    <>
      <Button size="sm" className="gap-2" onClick={() => setIsOpen(true)}>
        <Upload className="h-4 w-4" />
        Upload PDF
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload PDF Evidence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-file">File PDF *</Label>
              <Input
                id="pdf-file"
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Maksimal 15 MB. Hanya file PDF yang diizinkan.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Textarea
                id="description"
                placeholder="Deskripsi atau catatan untuk file ini..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUploading}>
              Batal
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── PDF Item Component ──────────────────────────────────────────────────────

function PDFItem({ 
  pdf, 
  onDelete, 
  readonly = false 
}: { 
  pdf: TrainingPDFInfo; 
  onDelete: () => void; 
  readonly?: boolean; 
}) {
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(pdf.presignedUrl);
  const [urlExpiry, setUrlExpiry] = useState<Date | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isExpired = currentUrl ? isURLExpired(currentUrl) : false;

  async function handleGenerateNewLink() {
    setIsGeneratingLink(true);
    const result = await generatePDFLink(pdf.id, 24); // 24 hours
    setIsGeneratingLink(false);

    if (result.success && result.data) {
      setCurrentUrl(result.data.presignedUrl);
      setUrlExpiry(result.data.expiresAt);
      toast.success("Link baru berhasil dibuat (valid 24 jam).");
    } else {
      toast.error("error" in result ? result.error : "Gagal generate link baru.");
    }
  }

  async function handleDelete() {
    const result = await deleteTrainingPDF(pdf.id);
    if (result.success) {
      toast.success("PDF berhasil dihapus.");
      setShowDeleteDialog(false);
      onDelete();
    } else {
      toast.error("error" in result ? result.error : "Gagal menghapus PDF.");
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 mt-1">
              <FileText className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate" title={pdf.name}>
                {pdf.name}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{new Date(pdf.uploadedAt).toLocaleDateString("id-ID")}</span>
                {pdf.size && (
                  <>
                    <span>•</span>
                    <span>{formatFileSize(pdf.size)}</span>
                  </>
                )}
              </div>
              
              {/* URL Status */}
              <div className="flex items-center gap-2 mt-2">
                {isExpired ? (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Link Expired
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Link Active
                  </Badge>
                )}
                {urlExpiry && (
                  <span className="text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Expires: {urlExpiry.toLocaleString("id-ID")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* View/Download */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => window.open(currentUrl, "_blank")}
              disabled={isExpired}
              title="Lihat PDF"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>

            {/* Download */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => window.open(pdf.downloadUrl, "_blank")}
              disabled={isExpired}
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </Button>

            {/* Generate New Link */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={handleGenerateNewLink}
              disabled={isGeneratingLink}
              title="Generate Link Baru"
            >
              {isGeneratingLink ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
            </Button>

            {/* Delete */}
            {!readonly && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
                title="Hapus PDF"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Delete Dialog */}
        <DeleteDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Hapus PDF Evidence"
          description={`Apakah Anda yakin ingin menghapus "${pdf.name}"? File akan dihapus permanen dari storage dan tidak dapat dikembalikan.`}
        />
      </CardContent>
    </Card>
  );
}

// ─── Main PDF Manager Component ──────────────────────────────────────────────

export function PDFManager({ activityId, initialPDFs = [], readonly = false }: PDFManagerProps) {
  const [pdfs, setPdfs] = useState<TrainingPDFInfo[]>(initialPDFs);
  const [isLoading, setIsLoading] = useState(false);

  async function refreshPDFs() {
    setIsLoading(true);
    const result = await getTrainingPDFs(activityId);
    setIsLoading(false);

    if (result.success && result.data) {
      setPdfs(result.data);
    } else {
      toast.error("error" in result ? result.error : "Gagal memuat PDF.");
    }
  }

  function handleUploadSuccess() {
    refreshPDFs();
  }

  function handleDeleteSuccess() {
    refreshPDFs();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">PDF Evidence</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {pdfs.length} file{pdfs.length !== 1 ? "s" : ""}
            </Badge>
            {!readonly && (
              <PDFUploadModal 
                activityId={activityId} 
                onUploadSuccess={handleUploadSuccess} 
              />
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={refreshPDFs}
              disabled={isLoading}
              title="Refresh"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {pdfs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Belum ada PDF evidence yang diupload.</p>
            {!readonly && (
              <p className="text-sm mt-1">Klik "Upload PDF" untuk menambahkan evidence.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {pdfs.map((pdf) => (
              <PDFItem
                key={pdf.id}
                pdf={pdf}
                onDelete={handleDeleteSuccess}
                readonly={readonly}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}