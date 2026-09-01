"use client";

import { ChevronDown, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ParcelExportFormat } from "@/lib/parcel-export-data";

const FORMAT_ITEMS: { format: ParcelExportFormat; label: string }[] = [
  { format: "shp", label: "Shapefile (ZIP)" },
  { format: "geojson", label: "GeoJSON" },
  { format: "kml", label: "KML" },
];

interface Props {
  /** Nonaktif (mis. filter belum dipilih); `disabledReason` tampil sebagai tooltip. */
  disabled?: boolean;
  disabledReason?: string;
  /** Ekspor sedang berjalan — trigger menampilkan spinner dan nonaktif. */
  exporting?: boolean;
  onExport: (format: ParcelExportFormat) => void;
  className?: string;
}

/**
 * Dropdown "Unduh Lahan" (SHP ZIP / GeoJSON / KML) — dipakai Peta Lahan dan
 * Master Data → Lahan (#313). Gate permission EXPORT dilakukan pemanggil.
 */
export function ParcelExportMenu({ disabled, disabledReason, exporting, onExport, className }: Props) {
  const isDisabled = disabled || exporting;
  return (
    // Tooltip di span pembungkus — elemen disabled tidak memunculkan `title`.
    <span
      title={disabled ? disabledReason : "Unduh data lahan sesuai filter"}
      className={cn("inline-flex", className)}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isDisabled}
          className="flex w-full items-center justify-center gap-2 px-3 h-9 text-sm font-medium border rounded-md bg-background hover:bg-accent hover:text-accent-foreground outline-none transition-colors disabled:pointer-events-none disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Unduh Lahan
          <ChevronDown className="h-4 w-4 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {FORMAT_ITEMS.map((item) => (
            <DropdownMenuItem key={item.format} onClick={() => onExport(item.format)}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}
