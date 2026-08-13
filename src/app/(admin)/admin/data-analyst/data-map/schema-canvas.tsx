"use client";

import { useCallback, useMemo, useState } from "react";
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
 * Tata letak deterministik: satu kolom per domain (nama berkas `.prisma`),
 * entitas ditumpuk di dalamnya. Bukan layout otomatis, supaya posisi entitas
 * tidak berpindah-pindah tiap halaman dibuka.
 */

const COLUMN_WIDTH = 300;
const ROW_HEIGHT = 116;

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

  const domains = useMemo(
    () => [...new Set(schema.entities.map((e) => e.domain))].sort(),
    [schema.entities]
  );

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
    const perDomain = new Map<string, number>();
    return schema.entities.map((entity) => {
      const column = domains.indexOf(entity.domain);
      const row = perDomain.get(entity.domain) ?? 0;
      perDomain.set(entity.domain, row + 1);
      return {
        id: entity.name,
        type: "entity",
        position: { x: column * COLUMN_WIDTH, y: row * ROW_HEIGHT },
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
  }, [schema.entities, domains, neighbours, selected]);

  const edges: Edge[] = useMemo(
    () =>
      schema.relations.map((relation) => {
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
      }),
    [schema.relations, neighbours]
  );

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setSelected((current) => (current === node.id ? null : node.id));
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Klik entitas untuk menyorot tetangganya; klik lagi untuk melepas. Kolom = domain (berkas
          <code className="mx-1">prisma/schema/*.prisma</code>).
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

      <div className="h-[560px] overflow-hidden rounded-lg border border-border/60">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelected(null)}
          colorMode={dark ? "dark" : "light"}
          fitView
          minZoom={0.15}
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

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {domains.map((domain) => (
          <span key={domain}>
            {domain} ({schema.entities.filter((e) => e.domain === domain).length})
          </span>
        ))}
      </div>
    </div>
  );
}
