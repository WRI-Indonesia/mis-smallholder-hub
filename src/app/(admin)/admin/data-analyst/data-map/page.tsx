import { requirePermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { dataSchema } from "@/lib/data-schema";
import { DATA_LINEAGE, INFRA_MODELS, UNMAPPED_ROUTES } from "@/lib/data-lineage.generated";
import { roadmapSummary } from "@/lib/release-metrics-data";
import { getEntityFillRates, getMenuLabels } from "@/server/actions/data-map";
import { DataMapClient } from "./data-map-client";

/**
 * Peta Data & Skema (DA-07, #256). Empat sumber, tak satu pun ditulis khusus
 * untuk halaman ini: struktur dari `prisma/schema` (artefak `build:schema`),
 * keterisian dari kueri agregat runtime, jalur data dari pindai kode (artefak
 * `build:lineage`), dan rencana modul dari tabel Phase Status `roadmap.md`.
 */
export default async function DataMapPage() {
  await requirePermission("data-analyst-data-map");

  const [fills, menus] = await Promise.all([getEntityFillRates(), getMenuLabels()]);

  // "Butuh tambah apa" tidak bisa diturunkan dari skema — skema tidak tahu apa
  // yang BELUM ada. Sumbernya stream MD pada roadmap yang belum ✅.
  const planned = roadmapSummary.phases.filter((p) => p.stream === "MD" && p.status !== "Done");

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Peta Data &amp; Skema</h1>
            <HelpHint menuKey="data-analyst-data-map" />
          </div>
          <p className="text-muted-foreground">
            Data apa saja yang ada di sistem, seberapa terisi, dan menu mana yang memakainya
          </p>
        </div>
      </div>

      <DataMapClient
        schema={dataSchema}
        fills={fills}
        lineage={DATA_LINEAGE}
        infraModels={INFRA_MODELS}
        unmapped={UNMAPPED_ROUTES}
        menus={menus}
        planned={planned}
      />
    </div>
  );
}
