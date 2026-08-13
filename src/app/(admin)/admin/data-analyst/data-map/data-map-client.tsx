"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import type { DataLineage, LineageAccess, UnmappedRoute } from "@/types/data-lineage";
import type { EntityFill, MenuLabel } from "@/types/data-map";
import type { CanvasSchema } from "@/types/data-schema";
import type { RoadmapPhase } from "@/types/roadmap";
import { FillRatesPanel } from "./fill-rates-panel";
import { LineageMatrix } from "./lineage-matrix";

/**
 * Peta Data & Skema (DA-07, #256). Tiga tab menjawab tiga pertanyaan berbeda:
 * bentuknya seperti apa (ERD), isinya seberapa terisi (Keterisian), dan siapa
 * memakainya (Jalur data).
 *
 * Kanvas ERD di-load dinamis tanpa SSR: React Flow hanya dibutuhkan tab pertama,
 * jadi bundle-nya tidak ikut membebani rute lain — dan halaman ini satu-satunya
 * pemakainya.
 */

const SchemaCanvas = dynamic(() => import("./schema-canvas").then((m) => m.SchemaCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] items-center justify-center rounded-lg border border-border/60 text-sm text-muted-foreground">
      Menyiapkan kanvas ERD…
    </div>
  ),
});

export function DataMapClient({
  schema,
  fills,
  lineage,
  infraModels,
  unmapped,
  menus,
  planned,
}: {
  schema: CanvasSchema;
  fills: EntityFill[];
  lineage: DataLineage;
  infraModels: Record<string, LineageAccess>;
  unmapped: UnmappedRoute[];
  menus: MenuLabel[];
  planned: RoadmapPhase[];
}) {
  const { resolvedTheme } = useTheme();

  return (
    <Tabs defaultValue="erd" className="w-full">
      <TabsList className="mb-4 grid w-full max-w-[520px] grid-cols-3">
        <TabsTrigger value="erd">ERD</TabsTrigger>
        <TabsTrigger value="keterisian">Keterisian</TabsTrigger>
        <TabsTrigger value="jalur">Jalur data</TabsTrigger>
      </TabsList>

      <TabsContent value="erd">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4">
            <SchemaCanvas schema={schema} dark={resolvedTheme === "dark"} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="keterisian">
        <FillRatesPanel fills={fills} planned={planned} />
      </TabsContent>

      <TabsContent value="jalur">
        <LineageMatrix lineage={lineage} menus={menus} infraModels={infraModels} unmapped={unmapped} />
      </TabsContent>
    </Tabs>
  );
}
