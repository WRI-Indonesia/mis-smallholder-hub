"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import { loadSupplyChainTables, supplyChainTablesLocation, type SupplyChainTables } from "@/lib/supply-chain-tables";
import type { ScGroup, ScParcelPoint, SupplyChainMapView, SupplyChainView } from "@/lib/supply-chain-flow";

/**
 * Prototipe Supply Chain (#379): data dari folder tabel CSV (bukan DB), tetapi
 * tetap melewati tiga lapis keamanan — izin menu, scope Lembaga user
 * (record difilter per `farmer_group_code`), dan hanya Lembaga aktif.
 * Master Mill/offtaker global (K6), dikirim sebatas yang dirujuk record terlihat.
 */
async function scopedView(tables: SupplyChainTables | null): Promise<{ view: SupplyChainView; groups: ScGroup[] }> {
  const tablesDir = supplyChainTablesLocation();
  const access = await getAccessContext();
  const rows = await prisma.farmerGroup.findMany({
    where: { isActive: true, ...farmerGroupAccessFilter(access) },
    select: { code: true, name: true, abrv: true, category: true, locationLat: true, locationLong: true, district: { select: { name: true } } },
  });
  const groups: ScGroup[] = rows
    .filter((g): g is typeof g & { code: string } => !!g.code)
    .map((g) => ({ code: g.code, name: g.name, abrv: g.abrv ?? g.name, category: g.category, districtName: g.district.name, lat: g.locationLat, lon: g.locationLong }));

  if (!tables) {
    return { view: { available: false, tablesDir, data: { groups: [], mills: [], offtakers: [], records: [] }, years: [] }, groups };
  }
  const allowed = new Set(groups.map((g) => g.code));
  const records = tables.records.filter((r) => allowed.has(r.groupCode));
  const usedGroups = new Set(records.map((r) => r.groupCode));
  const usedOff = new Set(records.flatMap((r) => [r.offtakerId, r.nextOfftakerId]).filter((x): x is string => !!x));
  const usedMill = new Set(records.map((r) => r.millId).filter((x): x is string => !!x));
  return {
    view: {
      available: true,
      tablesDir,
      data: {
        groups: groups.filter((g) => usedGroups.has(g.code)).sort((a, b) => a.districtName.localeCompare(b.districtName) || a.abrv.localeCompare(b.abrv)),
        mills: tables.mills.filter((m) => usedMill.has(m.id)),
        offtakers: tables.offtakers.filter((o) => usedOff.has(o.id)),
        records,
      },
      years: [...new Set(records.map((r) => r.year))].sort((a, b) => b - a),
    },
    groups,
  };
}

export async function getSupplyChainDashboardView(): Promise<SupplyChainView> {
  if (!(await hasPermission("dashboard-supply-chain", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses dashboard Rantai Pasok");
  }
  return (await scopedView(await loadSupplyChainTables())).view;
}

export async function getSupplyChainMapView(): Promise<SupplyChainMapView> {
  if (!(await hasPermission("map-supply-chain", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses Peta Rantai Pasok");
  }
  const tables = await loadSupplyChainTables();
  const { view } = await scopedView(tables);
  if (!tables || !view.available) return { ...view, parcels: [] };

  // Titik lahan: ST_PointOnSurface poligon MIS (K8 — bukan ST_Centroid yang bisa
  // jatuh di luar poligon L), cadangan koordinat survei.
  const allowed = new Set(view.data.groups.map((g) => g.code));
  const surveys = tables.surveys.filter((s) => allowed.has(s.groupCode));
  const parcelIds = [...new Set(surveys.map((s) => s.parcelId).filter((x): x is string => !!x))];
  const groupCodes = [...allowed];
  const points =
    parcelIds.length === 0
      ? []
      : await prisma.$queryRaw<{ parcel_id: string; group_code: string; farmer_id: string; farmer_name: string; lat: number; lon: number }[]>`
          SELECT lp.parcel_id, fg.code AS group_code, f.farmer_id, f.name AS farmer_name,
                 ST_Y(ST_PointOnSurface(lp.geom)) AS lat, ST_X(ST_PointOnSurface(lp.geom)) AS lon
            FROM tbl_land_parcel lp
            JOIN tbl_farmer f ON f.id = lp.farmer_id
            JOIN tbl_farmer_group fg ON fg.id = f.farmer_group_id
           WHERE lp.is_active AND f.is_active AND lp.geom IS NOT NULL
             AND lp.parcel_id = ANY(${parcelIds}::text[])
             AND fg.code = ANY(${groupCodes}::text[])`;
  // Parcel ID unik PER PETANI (bukan per Lembaga): satu Lembaga bisa punya beberapa
  // petani ber-Parcel ID sama, jadi kunci wajib menyertakan Farmer ID.
  const parcelKey = (group: string, farmer: string | null, parcel: string) => `${group}|${farmer ?? ""}|${parcel}`;
  const pointByParcel = new Map(points.map((p) => [parcelKey(p.group_code, p.farmer_id, p.parcel_id), p]));

  const flowsBySurvey = new Map<string, ScParcelPoint["flows"]>();
  for (const r of view.data.records) {
    if (!r.surveyId) continue;
    const list = flowsBySurvey.get(r.surveyId) ?? [];
    list.push({ millId: r.millId, offtakerId: r.offtakerId, ton: r.supplyTon });
    flowsBySurvey.set(r.surveyId, list);
  }

  const parcels: ScParcelPoint[] = [];
  for (const s of surveys) {
    const flows = flowsBySurvey.get(s.id);
    if (!flows) continue;
    const p = s.parcelId ? pointByParcel.get(parcelKey(s.groupCode, s.farmerId, s.parcelId)) : undefined;
    const lat = p?.lat ?? s.lat;
    const lon = p?.lon ?? s.lon;
    if (lat == null || lon == null) continue;
    parcels.push({
      surveyId: s.id, groupCode: s.groupCode, parcelId: s.parcelId ?? s.parcelIdFile, farmerName: p?.farmer_name ?? null,
      lat, lon, pointSource: p ? "POLIGON" : "SURVEI", ffbTon: s.ffbTon, flows,
    });
  }
  return { ...view, parcels };
}
