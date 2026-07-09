"use client";

import { useRef, useState } from "react";
import { ChevronDown, Plus, Trash2, Loader2, Globe, FileArchive, Braces } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  CUSTOM_LAYER_COLORS,
  buildWmsTileUrl,
  toFeatureCollection,
  type CustomLayer,
} from "./map-overlays";

type Mode = "wms" | "shapefile" | "geojson";

const MODES: { key: Mode; label: string; icon: typeof Globe }[] = [
  { key: "wms", label: "WMS URL", icon: Globe },
  { key: "shapefile", label: "Shapefile", icon: FileArchive },
  { key: "geojson", label: "GeoJSON", icon: Braces },
];

interface Props {
  layers: CustomLayer[];
  onAdd: (layer: CustomLayer) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string, visible: boolean) => void;
}

export function CustomGisSection({ layers, onAdd, onRemove, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("wms");

  const nextColor = () => CUSTOM_LAYER_COLORS[layers.length % CUSTOM_LAYER_COLORS.length];
  const newId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={
            <button className="flex w-full items-center justify-between px-4 py-3 text-left">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" />
                Tambah Data GIS Lain
                {layers.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
                    {layers.length}
                  </span>
                )}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
            </button>
          }
        />
        <CollapsibleContent>
          <div className="px-4 pb-4">
            {/* Mode selector */}
            <div className="mb-3 flex gap-1 rounded-md bg-muted p-1">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                    mode === m.key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <m.icon className="h-3 w-3" />
                  {m.label}
                </button>
              ))}
            </div>

            {mode === "wms" && (
              <WmsForm color={nextColor()} makeId={newId} onAdd={onAdd} />
            )}
            {mode === "shapefile" && (
              <FileForm
                kind="shapefile"
                color={nextColor()}
                makeId={newId}
                onAdd={onAdd}
              />
            )}
            {mode === "geojson" && (
              <FileForm kind="geojson" color={nextColor()} makeId={newId} onAdd={onAdd} />
            )}

            {/* Added layers list */}
            {layers.length > 0 && (
              <ul className="mt-3 space-y-0.5 border-t pt-3">
                {layers.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 py-0.5">
                    <Checkbox
                      checked={l.visible}
                      onCheckedChange={(v) => onToggle(l.id, !!v)}
                    />
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-sm border-2"
                      style={{ backgroundColor: `${l.color}33`, borderColor: l.color }}
                    />
                    <span className="flex-1 truncate text-sm" title={l.name}>
                      {l.name}
                    </span>
                    <span className="shrink-0 text-[10px] font-medium uppercase text-muted-foreground">
                      {l.kind === "wms" ? "WMS" : "VEC"}
                    </span>
                    <button
                      onClick={() => onRemove(l.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Hapus ${l.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

function WmsForm({
  color,
  makeId,
  onAdd,
}: {
  color: string;
  makeId: () => string;
  onAdd: (l: CustomLayer) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [wmsLayers, setWmsLayers] = useState("");

  const isTemplate = /\{(z|bbox)/i.test(url);

  const handleAdd = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("URL WMS wajib diisi");
      return;
    }
    if (!isTemplate && !wmsLayers.trim()) {
      toast.error("Nama layer WMS wajib diisi (atau tempel URL template XYZ/bbox)");
      return;
    }
    onAdd({
      id: makeId(),
      name: name.trim() || wmsLayers.trim() || "WMS Layer",
      color,
      visible: true,
      kind: "wms",
      tileUrl: buildWmsTileUrl(trimmed, wmsLayers.trim()),
    });
    setName("");
    setUrl("");
    setWmsLayers("");
    toast.success("Layer WMS ditambahkan");
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Nama layer (opsional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 text-sm"
      />
      <Input
        placeholder="URL WMS / template tile"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="h-8 text-sm"
      />
      <Input
        placeholder="Nama layer WMS (mis. 0, kawasan_hutan)"
        value={wmsLayers}
        onChange={(e) => setWmsLayers(e.target.value)}
        disabled={isTemplate}
        className="h-8 text-sm"
      />
      <p className="text-[10px] leading-snug text-muted-foreground">
        Tempel URL endpoint WMS + nama layer, atau URL template XYZ/bbox langsung. Server WMS
        harus mengizinkan CORS.
      </p>
      <Button size="sm" className="h-8 w-full gap-1.5" onClick={handleAdd}>
        <Plus className="h-3.5 w-3.5" />
        Tambah Layer
      </Button>
    </div>
  );
}

function FileForm({
  kind,
  color,
  makeId,
  onAdd,
}: {
  kind: "shapefile" | "geojson";
  color: string;
  makeId: () => string;
  onAdd: (l: CustomLayer) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const baseName = file.name.replace(/\.[^.]+$/, "");
      let data;
      if (kind === "shapefile") {
        const shp = (await import("shpjs")).default;
        const parsed = await shp(await file.arrayBuffer());
        const features = Array.isArray(parsed)
          ? parsed.flatMap((fc) => fc.features)
          : parsed.features;
        if (!features.length) throw new Error("Shapefile tidak berisi fitur");
        data = { type: "FeatureCollection" as const, features };
      } else {
        data = toFeatureCollection(JSON.parse(await file.text()));
        if (!data.features.length) throw new Error("GeoJSON tidak berisi fitur");
      }
      onAdd({
        id: makeId(),
        name: baseName,
        color,
        visible: true,
        kind: "vector",
        data,
      });
      toast.success(`Layer "${baseName}" ditambahkan`);
    } catch (err) {
      toast.error(
        err instanceof Error ? `Gagal memuat: ${err.message}` : "Gagal memuat berkas"
      );
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={kind === "shapefile" ? ".zip" : ".geojson,.json"}
        onChange={handleFile}
        className="hidden"
      />
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-full gap-1.5"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : kind === "shapefile" ? (
          <FileArchive className="h-3.5 w-3.5" />
        ) : (
          <Braces className="h-3.5 w-3.5" />
        )}
        {loading
          ? "Memproses..."
          : kind === "shapefile"
            ? "Pilih file ZIP Shapefile"
            : "Pilih file GeoJSON"}
      </Button>
      <p className="text-[10px] leading-snug text-muted-foreground">
        {kind === "shapefile"
          ? "ZIP berisi .shp/.dbf/.prj. Diproses di browser, tidak diunggah ke server."
          : "File .geojson / .json (FeatureCollection). Diproses di browser."}
      </p>
    </div>
  );
}
