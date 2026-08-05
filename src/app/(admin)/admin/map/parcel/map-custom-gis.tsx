"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2, Loader2, Globe, FileArchive, Braces, Crosshair } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  CUSTOM_LAYER_COLORS,
  buildWmsTileUrl,
  symbologyCandidates,
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
  /** Zoom peta ke extent layer (hanya layer vector — WMS tak punya bounds di klien). */
  onZoomTo: (id: string) => void;
  /** Pilih atribut symbology unique-value layer vector; null = warna tunggal. */
  onSymbologyChange: (id: string, attribute: string | null) => void;
}

/** Nilai sentinel Select untuk mode warna tunggal (SelectItem tak boleh string kosong). */
const SINGLE_COLOR = "__single__";

export function CustomGisSection({ layers, onAdd, onRemove, onToggle, onZoomTo, onSymbologyChange }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("wms");

  // Semua atribut yang tersedia sebagai pilihan symbology per layer vector.
  const candidatesByLayer = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const l of layers) {
      if (l.kind === "vector") map.set(l.id, symbologyCandidates(l.data));
    }
    return map;
  }, [layers]);

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
                  <li key={l.id} className="py-0.5">
                    <div className="flex items-center gap-2">
                    <Checkbox
                      checked={l.visible}
                      onCheckedChange={(v) => onToggle(l.id, !!v)}
                    />
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-sm border-2"
                      style={{ backgroundColor: `${l.color}33`, borderColor: l.color }}
                    />
                    {l.kind === "vector" ? (
                      <button
                        onClick={() => onZoomTo(l.id)}
                        className="flex-1 truncate text-left text-sm hover:underline"
                        title={`Zoom ke ${l.name}`}
                      >
                        {l.name}
                      </button>
                    ) : (
                      <span className="flex-1 truncate text-sm" title={l.name}>
                        {l.name}
                      </span>
                    )}
                    <span className="shrink-0 text-[10px] font-medium uppercase text-muted-foreground">
                      {l.kind === "wms" ? "WMS" : "VEC"}
                    </span>
                    {l.kind === "vector" && (
                      <button
                        onClick={() => onZoomTo(l.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title={`Zoom ke ${l.name}`}
                        aria-label={`Zoom ke ${l.name}`}
                      >
                        <Crosshair className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onRemove(l.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Hapus ${l.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    </div>
                    {l.kind === "vector" && (candidatesByLayer.get(l.id)?.length ?? 0) > 0 && (
                      <div className="mt-1 ml-6 flex flex-col gap-1.5">
                        <Select
                          value={l.symbology?.attribute ?? SINGLE_COLOR}
                          onValueChange={(v) =>
                            onSymbologyChange(l.id, v === SINGLE_COLOR ? null : v)
                          }
                        >
                          <SelectTrigger
                            className="h-7 w-full text-xs"
                            aria-label={`Pewarnaan ${l.name}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SINGLE_COLOR}>Warna tunggal</SelectItem>
                            {(candidatesByLayer.get(l.id) ?? []).map((attr) => (
                              <SelectItem key={attr} value={attr}>
                                Warna per {attr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {l.symbology && (
                          <>
                            <ul className="max-h-36 space-y-0.5 overflow-y-auto pr-1">
                              {Object.entries(l.symbology.mapping).map(([value, color]) => (
                                <li key={value} className="flex items-center gap-1.5 text-[11px]">
                                  <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="truncate" title={value}>
                                    {value}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            {l.symbology.totalValues > Object.keys(l.symbology.mapping).length && (
                              <p className="text-[10px] leading-snug text-muted-foreground">
                                {Object.keys(l.symbology.mapping).length} dari {l.symbology.totalValues}{" "}
                                nilai diberi warna; sisanya memakai warna dasar layer.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
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

type Proj4ProjectionEntry = {
  names: string[];
  init?: (this: Record<string, unknown>) => void;
  [key: string]: unknown;
};

/**
 * Parser WKT proj4 tidak mengenal alias PROJECTION dari ESRI
 * "Cylindrical_Equal_Area" (dipakai shapefile RSPO "World_Cylindrical_Equal_Area"
 * / ESRI:54034) padahal implementasi proyeksinya (`cea`) ada. Selain nama,
 * parameternya juga beda: hasil parse WKT mengisi `lat1` sedangkan `cea` membaca
 * `lat_ts` — tanpa pemetaan ini seluruh koordinat menjadi NaN. Daftarkan varian
 * bernama ESRI sebelum shpjs mereproyeksi.
 */
function registerEsriProjections(proj4: unknown) {
  const registry = (
    proj4 as {
      Proj: {
        projections: {
          get: (name: string) => Proj4ProjectionEntry | undefined;
          add: (proj: Proj4ProjectionEntry) => void;
        };
      };
    }
  ).Proj.projections;
  if (registry.get("Cylindrical_Equal_Area")) return;
  const cea = registry.get("cea");
  if (!cea) return;
  registry.add({
    ...cea,
    names: ["Cylindrical_Equal_Area"],
    init(this: Record<string, unknown>) {
      if (this.lat_ts == null) this.lat_ts = this.lat1 ?? 0;
      cea.init?.call(this);
    },
  });
}

/** Parse ZIP shapefile via shpjs (bisa berisi lebih dari satu .shp). */
async function parseZipShapefile(buffer: ArrayBuffer): Promise<Feature[]> {
  const [{ default: shp }, { default: proj4 }] = await Promise.all([
    import("shpjs"),
    import("proj4"),
  ]);
  registerEsriProjections(proj4);
  const parsed = await shp(buffer);
  return Array.isArray(parsed) ? parsed.flatMap((fc) => fc.features) : parsed.features;
}

/**
 * Named exports runtime shpjs (parseShp/parseDbf/combine) — @types/shpjs lama
 * hanya mengetik default export, jadi dipetakan manual di sini.
 */
type ShpNamedExports = {
  parseShp: (shp: ArrayBuffer, prj?: string) => Geometry[];
  parseDbf: (dbf: ArrayBuffer, cpg?: string) => Record<string, unknown>[];
  combine: (pair: [Geometry[], Record<string, unknown>[]?]) => FeatureCollection;
};

/**
 * Parse RAR shapefile: ekstrak arsip di browser (node-unrar-js, WASM lazy-load)
 * lalu rakit tiap pasangan .shp/.dbf/.prj/.cpg lewat named exports shpjs —
 * shpjs sendiri hanya menerima ZIP.
 */
async function parseRarShapefile(buffer: ArrayBuffer): Promise<Feature[]> {
  const [{ createExtractorFromData }, shpModule, { default: proj4 }, wasmAsset] =
    await Promise.all([
      import("node-unrar-js/esm/index.esm"),
      import("shpjs"),
      import("proj4"),
      import("node-unrar-js/esm/js/unrar.wasm"),
    ]);
  registerEsriProjections(proj4);
  const { parseShp, parseDbf, combine } = shpModule as unknown as ShpNamedExports;
  const wasmBinary = await (await fetch(wasmAsset.default)).arrayBuffer();
  const extractor = await createExtractorFromData({ data: buffer, wasmBinary });

  // Kunci lowercase agar pencarian pasangan .shp/.dbf/.prj tak peka kapitalisasi.
  const entries = new Map<string, Uint8Array>();
  for (const f of extractor.extract().files) {
    if (!f.fileHeader.flags.directory && f.extraction) {
      entries.set(f.fileHeader.name.toLowerCase(), f.extraction);
    }
  }

  const toBuffer = (u: Uint8Array) =>
    u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
  const decoder = new TextDecoder();
  const features: Feature[] = [];
  for (const [name, shpData] of entries) {
    if (!name.endsWith(".shp")) continue;
    const base = name.slice(0, -4);
    const prjData = entries.get(`${base}.prj`);
    const prj = prjData ? decoder.decode(prjData) : undefined;
    // parseShp menelan kegagalan proj4 secara diam (fitur tampil di lokasi salah);
    // validasi eksplisit di sini agar proyeksi tak dikenal tetap melempar error.
    if (prj) proj4(prj);
    const dbfData = entries.get(`${base}.dbf`);
    const cpgData = entries.get(`${base}.cpg`);
    const fc = combine([
      parseShp(toBuffer(shpData), prj),
      dbfData
        ? parseDbf(toBuffer(dbfData), cpgData ? decoder.decode(cpgData) : undefined)
        : undefined,
    ]);
    features.push(...fc.features);
  }
  if (features.length === 0) throw new Error("Arsip RAR tidak berisi shapefile (.shp)");
  return features;
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
        const buffer = await file.arrayBuffer();
        const features = /\.rar$/i.test(file.name)
          ? await parseRarShapefile(buffer)
          : await parseZipShapefile(buffer);
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
      // proj4/shpjs melempar string mentah (bukan Error) saat proyeksi .prj
      // tidak dikenal — tetap tampilkan detailnya agar user tahu penyebabnya.
      const detail =
        err instanceof Error ? err.message : typeof err === "string" ? err : null;
      toast.error(
        detail && /projection name/i.test(detail)
          ? "Proyeksi shapefile ini tidak didukung. Simpan ulang ke WGS84 (EPSG:4326) lalu coba lagi."
          : detail
            ? `Gagal memuat: ${detail}`
            : "Gagal memuat berkas"
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
        accept={kind === "shapefile" ? ".zip,.rar" : ".geojson,.json"}
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
            ? "Pilih file Shapefile (ZIP/RAR)"
            : "Pilih file GeoJSON"}
      </Button>
      <p className="text-[10px] leading-snug text-muted-foreground">
        {kind === "shapefile"
          ? "ZIP atau RAR berisi .shp/.dbf/.prj. Diproses di browser, tidak diunggah ke server."
          : "File .geojson / .json (FeatureCollection). Diproses di browser."}
      </p>
    </div>
  );
}
