"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import type { SchemaMap } from "@/types/data-schema";

/**
 * Kanvas ERD (DA-07, #256) — satu-satunya tempat React Flow dipakai di aplikasi
 * ini, dan sengaja begitu: 22 entitas dengan 28 relasi ber-arah adalah graf
 * padat yang memang butuh pan/zoom dan sorot tetangga. Struktur berhierarki
 * (mis. pohon menu Bantuan) tidak dipasang di sini — bentuk pohon lebih baik
 * dirender sebagai pohon.
 *
 * Tata letak deterministik (bukan layout otomatis, supaya posisi entitas tidak
 * berpindah-pindah tiap halaman dibuka): entitas dikelompokkan per domain, dan
 * domain-domainnya disusun sebagai grid — lihat catatan di bawah.
 */

/**
 * Tata letak: domain dibungkus jadi GRID, bukan satu pita horizontal.
 * Versi pertama menaruh 12 domain berdampingan dalam satu baris; hasilnya kanvas
 * sangat lebar dan pendek, sehingga `fitView` memperkecil sampai nama entitas
 * tak terbaca — cacat yang baru kelihatan saat halaman benar-benar dibuka.
 */
const DOMAINS_PER_ROW = 4;
const COLUMN_WIDTH = 260;
const ROW_HEIGHT = 104;
const BAND_GAP = 56;

/**
 * Batas bawah fitView: lebih baik grafnya melebihi layar dan digeser daripada
 * muat seluruhnya tapi nama entitasnya tak terbaca.
 */
const FIT_VIEW = { padding: 0.12, minZoom: 0.55, maxZoom: 1 } as const;

type EntityNodeData = {
  name: string;
  tableName: string | null;
  domain: string;
  scalarCount: number;
  relationCount: number;
  /** Diredupkan saat entitas lain dipilih dan ia bukan tetangganya. */
  dimmed: boolean;
  active: boolean;
};

function EntityNode({ data }: NodeProps) {
  const d = data as unknown as EntityNodeData;
  return (
    <div
      className={cn(
        "min-w-[210px] rounded-lg border bg-card px-3 py-2 shadow-sm transition-opacity",
        d.active ? "border-primary ring-2 ring-primary/40" : "border-border/70",
        d.dimmed && "opacity-25"
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-muted-foreground" />
      <p className="text-sm leading-tight font-medium">{d.name}</p>
      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{d.tableName ?? "—"}</p>
      <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
        {d.scalarCount} kolom · {d.relationCount} relasi
      </p>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-muted-foreground" />
    </div>
  );
}

const nodeTypes = { entity: EntityNode };

export function SchemaCanvas({ schema, dark }: { schema: SchemaMap; dark: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  const domains = useMemo(
    () => [...new Set(schema.entities.map((e) => e.domain))].sort(),
    [schema.entities]
  );

  /**
   * Saring ke satu domain beserta tetangga langsungnya. Dua puluh dua entitas
   * sekaligus tidak mungkin terbaca dalam satu layar tanpa zoom; menyaring lebih
   * jujur daripada memperkecil sampai tulisannya hilang.
   */
  const visible = useMemo(() => {
    if (!focus) return schema.entities;
    const inDomain = new Set(schema.entities.filter((e) => e.domain === focus).map((e) => e.name));
    const withNeighbours = new Set(inDomain);
    for (const r of schema.relations) {
      if (inDomain.has(r.from)) withNeighbours.add(r.to);
      if (inDomain.has(r.to)) withNeighbours.add(r.from);
    }
    return schema.entities.filter((e) => withNeighbours.has(e.name));
  }, [focus, schema.entities, schema.relations]);

  /** Tetangga langsung entitas terpilih — dasar peredupan. */
  const neighbours = useMemo(() => {
    if (!selected) return null;
    const set = new Set<string>([selected]);
    for (const r of schema.relations) {
      if (r.from === selected) set.add(r.to);
      if (r.to === selected) set.add(r.from);
    }
    return set;
  }, [selected, schema.relations]);

  const nodes: Node[] = useMemo(() => {
    // Domain yang benar-benar tampil, dibungkus jadi grid DOMAINS_PER_ROW kolom.
    const shown = [...new Set(visible.map((e) => e.domain))].sort();
    const countByDomain = new Map<string, number>();
    for (const e of visible) countByDomain.set(e.domain, (countByDomain.get(e.domain) ?? 0) + 1);

    // Tinggi tiap pita = domain terbanyak di pita itu, supaya tak bertabrakan.
    const bandOffset: number[] = [];
    let offset = 0;
    for (let band = 0; band * DOMAINS_PER_ROW < shown.length; band++) {
      bandOffset[band] = offset;
      const tallest = shown
        .slice(band * DOMAINS_PER_ROW, (band + 1) * DOMAINS_PER_ROW)
        .reduce((max, d) => Math.max(max, countByDomain.get(d) ?? 0), 0);
      offset += tallest * ROW_HEIGHT + BAND_GAP;
    }

    const perDomain = new Map<string, number>();
    return visible.map((entity) => {
      const domainIndex = shown.indexOf(entity.domain);
      const column = domainIndex % DOMAINS_PER_ROW;
      const band = Math.floor(domainIndex / DOMAINS_PER_ROW);
      const row = perDomain.get(entity.domain) ?? 0;
      perDomain.set(entity.domain, row + 1);
      return {
        id: entity.name,
        type: "entity",
        position: { x: column * COLUMN_WIDTH, y: bandOffset[band] + row * ROW_HEIGHT },
        data: {
          name: entity.name,
          tableName: entity.tableName,
          domain: entity.domain,
          scalarCount: entity.scalarCount,
          relationCount: entity.fields.length - entity.scalarCount,
          dimmed: neighbours ? !neighbours.has(entity.name) : false,
          active: selected === entity.name,
        } satisfies EntityNodeData,
      };
    });
  }, [visible, neighbours, selected]);

  const edges: Edge[] = useMemo(() => {
    const shownNames = new Set(visible.map((e) => e.name));
    return schema.relations
      .filter((r) => shownNames.has(r.from) && shownNames.has(r.to))
      .map((relation) => {
        const involved = !neighbours || (neighbours.has(relation.from) && neighbours.has(relation.to));
        return {
          id: relation.key,
          source: relation.from,
          target: relation.to,
          label: relation.kind,
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 3,
          style: { opacity: involved ? 1 : 0.12 },
          labelStyle: { fontSize: 10, opacity: involved ? 0.85 : 0.12 },
        };
      });
  }, [schema.relations, neighbours, visible]);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setSelected((current) => (current === node.id ? null : node.id));
  }, []);

  // `fitView` sebagai prop hanya berlaku saat inisialisasi; tanpa ini, mengganti
  // saringan domain menyisakan viewport lama — node menumpuk di atas dengan
  // ruang kosong di bawahnya.
  const instance = useRef<ReactFlowInstance | null>(null);
  useEffect(() => {
    instance.current?.fitView(FIT_VIEW);
  }, [focus]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">Domain:</span>
        <button
          type="button"
          onClick={() => setFocus(null)}
          aria-pressed={focus === null}
          className={cn(
            "rounded px-2 py-0.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            focus === null ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          semua ({schema.entities.length})
        </button>
        {domains.map((domain) => (
          <button
            key={domain}
            type="button"
            onClick={() => setFocus(focus === domain ? null : domain)}
            aria-pressed={focus === domain}
            className={cn(
              "rounded px-2 py-0.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              focus === domain ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {domain} ({schema.entities.filter((e) => e.domain === domain).length})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {focus
            ? `Menampilkan domain ${focus} beserta tetangga langsungnya (${visible.length} entitas).`
            : "Klik entitas untuk menyorot tetangganya; pilih domain di atas untuk mempersempit."}
        </span>
        {selected && (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-blue-600 underline-offset-2 hover:underline dark:text-amber-400"
          >
            lepas sorotan {selected}
          </button>
        )}
      </div>

      <div className="h-[620px] overflow-hidden rounded-lg border border-border/60">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelected(null)}
          colorMode={dark ? "dark" : "light"}
          fitView
          fitViewOptions={FIT_VIEW}
          onInit={(inst) => {
            instance.current = inst;
          }}
          minZoom={0.3}
          proOptions={{ hideAttribution: false }}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="!bg-muted" />
        </ReactFlow>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Entitas dikelompokkan per domain — nama berkas <code>prisma/schema/*.prisma</code> asalnya. Label
        pada garis = kardinalitas; arah panah dari induk ke anak.
      </p>
    </div>
  );
}
