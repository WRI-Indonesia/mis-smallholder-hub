"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Source, Layer } from "react-map-gl/maplibre";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  MAP_OVERLAYS,
  MAP_OVERLAYS_DRAW_ORDER,
  OVERLAY_GROUP_LABELS,
  overlayLayerId,
  overlayTileUrl,
  type OverlayDef,
  type OverlayGroup,
  type OverlayState,
} from "@/lib/map-overlays";

// "Peta Lainnya" (#433): daftar overlay referensi berkelompok + sumber raster
// MapLibre-nya, dipakai bersama Peta Lahan dan Peta Supply Chain.

const GROUPS = Object.keys(OVERLAY_GROUP_LABELS) as OverlayGroup[];

function OverlayRow({
  def,
  checked,
  onToggle,
}: {
  def: OverlayDef;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div className="py-1.5">
      <label className="flex items-start gap-2.5 cursor-pointer">
        <Checkbox checked={checked} onCheckedChange={(v) => onToggle(!!v)} className="mt-0.5" />
        <span
          className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-sm border-2"
          style={{ backgroundColor: `${def.color}33`, borderColor: def.color }}
        />
        <span className="min-w-0">
          <span className="block text-sm leading-tight">{def.label}</span>
          <span className="block text-[11px] leading-snug text-muted-foreground">{def.description}</span>
        </span>
      </label>
      {checked && (
        <div className="ml-[42px] mt-1.5 space-y-1">
          {def.legend.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] border border-border"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[11px] leading-tight text-muted-foreground">{item.label}</span>
            </div>
          ))}
          {def.note && <p className="text-[11px] leading-snug text-amber-700 dark:text-amber-400">{def.note}</p>}
          <p className="text-[10px] leading-snug text-muted-foreground/80">Sumber: {def.source}.</p>
        </div>
      )}
    </div>
  );
}

function OverlayGroupSection({
  group,
  overlays,
  onChange,
}: {
  group: OverlayGroup;
  overlays: OverlayState;
  onChange: (overlays: OverlayState) => void;
}) {
  const defs = MAP_OVERLAYS.filter((o) => o.group === group);
  const activeCount = defs.filter((o) => overlays.visible[o.key]).length;
  // Terlipat bawaan agar panel tetap pendek; grup yang sudah punya layer aktif dibuka.
  const [open, setOpen] = useState(activeCount > 0);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <button className="flex w-full items-center gap-1.5 py-1.5 text-left text-xs font-semibold text-muted-foreground hover:text-foreground">
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", !open && "-rotate-90")} />
            {OVERLAY_GROUP_LABELS[group]}
            {activeCount > 0 && (
              <span className="ml-auto rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                {activeCount} aktif
              </span>
            )}
          </button>
        }
      />
      <CollapsibleContent>
        <div className="pl-1">
          {defs.map((o) => (
            <OverlayRow
              key={o.key}
              def={o}
              checked={!!overlays.visible[o.key]}
              onToggle={(v) => onChange({ ...overlays, visible: { ...overlays.visible, [o.key]: v } })}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Isi bagian "Peta Lainnya": dua kelompok lipat + slider transparansi bersama. */
export function MapOverlayPicker({
  overlays,
  onChange,
}: {
  overlays: OverlayState;
  onChange: (overlays: OverlayState) => void;
}) {
  const anyOverlayOn = Object.values(overlays.visible).some(Boolean);
  return (
    <div>
      {GROUPS.map((g) => (
        <OverlayGroupSection key={g} group={g} overlays={overlays} onChange={onChange} />
      ))}
      {anyOverlayOn && (
        <div className="mt-3 flex items-center gap-2">
          <span className="shrink-0 text-xs text-muted-foreground">Transparansi</span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.1}
            value={overlays.opacity}
            onChange={(e) => onChange({ ...overlays, opacity: Number(e.target.value) })}
            className="h-1 flex-1 cursor-pointer accent-primary"
            aria-label="Transparansi overlay"
          />
          <span className="w-8 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {Math.round(overlays.opacity * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Sumber + layer raster semua overlay, dipasang di dalam `<Map>` sebelum
 * layer data agar tergambar di bawahnya. Dirender terbalik dari urutan gambar
 * sehingga entri pertama `MAP_OVERLAYS_DRAW_ORDER` berada paling atas. Layer
 * selalu terpasang (hanya visibility yang berganti) — MapLibre tak menarik
 * tile untuk layer yang tersembunyi.
 */
export function MapOverlaySources({ overlays }: { overlays: OverlayState }) {
  return (
    <>
      {[...MAP_OVERLAYS_DRAW_ORDER].reverse().map((o) => (
        <Source key={o.key} id={`overlay-${o.key}`} type="raster" tiles={[overlayTileUrl(o)]} tileSize={256} attribution={o.source}>
          <Layer
            id={overlayLayerId(o.key)}
            type="raster"
            layout={{ visibility: overlays.visible[o.key] ? "visible" : "none" }}
            paint={{ "raster-opacity": overlays.opacity }}
          />
        </Source>
      ))}
    </>
  );
}
