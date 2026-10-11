"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext } from "@/lib/access-context";
import { farmerGroupAccessFilter, rawFarmerGroupScope } from "@/lib/access-scope";
import { currentPeriod } from "@/lib/data-completeness";
import type {
  ProductionAvailabilityFarmerRow,
  ProductionAvailabilityGroupParcelRow,
  ProductionAvailabilityGroupRow,
  ProductionAvailabilityParcelsResult,
  ProductionAvailabilityView,
  ProductionCellStats,
  ProductionParcelCell,
} from "@/types/production-availability";

const MENU_KEY = "data-analyst-availability-production";

/** Baris agregat SQL satu (pemilik, periode). COUNT dicast `::int` — tanpa cast Postgres mengirim bigint. */
interface CellRow {
  owner_id: string;
  period: string;
  parcels_reporting: number;
  records: number;
  linked_records: number;
  kg: number;
  zero_records: number;
  estimate_records: number;
  no_parcel_records: number;
}

const toCell = (r: CellRow): ProductionCellStats => ({
  period: r.period,
  parcelsReporting: r.parcels_reporting,
  records: r.records,
  linkedRecords: r.linked_records,
  kg: r.kg,
  zeroRecords: r.zero_records,
  estimateRecords: r.estimate_records,
  noParcelRecords: r.no_parcel_records,
});

/**
 * Agregat per (pemilik, periode) yang sama untuk tingkat Lembaga dan petani.
 * `parcels_reporting` = lahan AKTIF non-PSR berbeda yang ditunjuk record
 * (LEFT JOIN: record ke lahan nonaktif/hilang tidak dihitung lahan melapor,
 * tetapi tetap masuk `records`/`kg`). Label Estimasi = `notes` memuat "estimasi"
 * (definisi `loadEstimateRecordIds`, DA-02).
 */
const CELL_AGGREGATES = Prisma.sql`
  COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_psr = false)::int AS parcels_reporting,
  COUNT(*)::int AS records,
  COUNT(pr.parcel_id)::int AS linked_records,
  COALESCE(SUM(pr.yield_kg), 0)::float8 AS kg,
  COUNT(*) FILTER (WHERE pr.yield_kg = 0)::int AS zero_records,
  COUNT(*) FILTER (WHERE pr.notes ILIKE '%estimasi%')::int AS estimate_records,
  COUNT(*) FILTER (WHERE pr.parcel_id IS NULL)::int AS no_parcel_records`;

/** Rentang periode satu tahun sebagai klausa — memakai indeks `period`. */
const yearRange = (year: number) => Prisma.sql`pr.period >= ${`${year}-01`} AND pr.period <= ${`${year}-12`}`;

/**
 * Kalender cakupan produksi semua Lembaga dalam scope (K2, K3, K7): satu baris
 * per Lembaga dengan sel SEMUA periode (rentang penuh — tahun dipilih di client,
 * ringkasan kolom kanan butuh rentang penuh) + penyebut lahan non-PSR.
 * Dua kueri agregat + satu daftar Lembaga; ukuran hasil ≈ Lembaga × periode
 * (puluhan × puluhan), tidak ikut tumbuh dengan jumlah record.
 */
export async function getProductionAvailabilityView(): Promise<ProductionAvailabilityView> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses ketersediaan data produksi");
  }
  const access = await getAccessContext();
  const groupWhere = { isActive: true, ...farmerGroupAccessFilter(access) };
  const scope = rawFarmerGroupScope(access);
  const groupIds = scope.groupIds ?? null;
  const districtIds = scope.districtIds ?? null;
  // Cermin `farmerGroupAccessFilter` untuk SQL mentah (pola data-completeness-query).
  const rawScope = Prisma.sql`g.is_active
    AND (${groupIds}::text[] IS NULL OR g.id = ANY(${groupIds}::text[]))
    AND (${districtIds}::text[] IS NULL OR g.district_id = ANY(${districtIds}::text[]))`;

  const [groups, denominators, cells] = await Promise.all([
    prisma.farmerGroup.findMany({
      where: groupWhere,
      select: {
        id: true,
        name: true,
        code: true,
        abrv: true,
        category: true,
        districtId: true,
        district: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.$queryRaw<{ group_id: string; total_farmers: number; total_parcels: number; non_psr_parcels: number }[]>(Prisma.sql`
      SELECT g.id AS group_id,
        COUNT(DISTINCT f.id)::int AS total_farmers,
        COUNT(lp.id)::int AS total_parcels,
        COUNT(lp.id) FILTER (WHERE lp.is_psr = false)::int AS non_psr_parcels
      FROM tbl_farmer_group g
      JOIN tbl_farmer f ON f.farmer_group_id = g.id AND f.is_active
      LEFT JOIN tbl_land_parcel lp ON lp.farmer_id = f.id AND lp.is_active
      WHERE ${rawScope}
      GROUP BY g.id`),
    prisma.$queryRaw<CellRow[]>(Prisma.sql`
      SELECT g.id AS owner_id, pr.period, ${CELL_AGGREGATES}
      FROM tbl_production_record pr
      JOIN tbl_farmer f ON f.id = pr.farmer_id AND f.is_active
      JOIN tbl_farmer_group g ON g.id = f.farmer_group_id
      LEFT JOIN tbl_land_parcel lp ON lp.id = pr.parcel_id AND lp.is_active
      WHERE pr.is_active AND ${rawScope}
      GROUP BY g.id, pr.period`),
  ]);

  const denomById = new Map(denominators.map((d) => [d.group_id, d]));
  const cellsById = new Map<string, ProductionCellStats[]>();
  for (const r of cells) {
    const list = cellsById.get(r.owner_id) ?? [];
    list.push(toCell(r));
    cellsById.set(r.owner_id, list);
  }

  const rows: ProductionAvailabilityGroupRow[] = groups.map((g) => {
    const d = denomById.get(g.id);
    return {
      id: g.id,
      name: g.name,
      code: g.code,
      abrv: g.abrv,
      category: g.category,
      districtId: g.districtId,
      districtName: g.district.name,
      totalFarmers: d?.total_farmers ?? 0,
      totalParcels: d?.total_parcels ?? 0,
      nonPsrParcels: d?.non_psr_parcels ?? 0,
      cells: (cellsById.get(g.id) ?? []).sort((a, b) => a.period.localeCompare(b.period)),
    };
  });

  return { generatedAt: new Date().toISOString(), referencePeriod: currentPeriod(), groups: rows };
}

/**
 * Baris petani satu Lembaga untuk satu tahun (anak Lembaga, dimuat saat dibuka —
 * K2). Semua petani aktif ikut, termasuk yang tanpa record (bolongnya justru
 * yang dicari). Lembaga di luar scope → daftar kosong, bukan error.
 */
export async function getProductionAvailabilityFarmers(groupId: string, year: number): Promise<ProductionAvailabilityFarmerRow[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses ketersediaan data produksi");
  }
  if (!Number.isInteger(year)) return [];
  const access = await getAccessContext();
  const group = await prisma.farmerGroup.findFirst({
    where: { id: groupId, isActive: true, ...farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!group) return [];

  const [farmers, cells] = await Promise.all([
    prisma.farmer.findMany({
      where: { farmerGroupId: groupId, isActive: true },
      select: {
        id: true,
        name: true,
        farmerId: true,
        landParcels: { where: { isActive: true }, select: { isPsr: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.$queryRaw<CellRow[]>(Prisma.sql`
      SELECT f.id AS owner_id, pr.period, ${CELL_AGGREGATES}
      FROM tbl_production_record pr
      JOIN tbl_farmer f ON f.id = pr.farmer_id AND f.is_active
      LEFT JOIN tbl_land_parcel lp ON lp.id = pr.parcel_id AND lp.is_active
      WHERE pr.is_active AND f.farmer_group_id = ${groupId} AND ${yearRange(year)}
      GROUP BY f.id, pr.period`),
  ]);

  const cellsById = new Map<string, ProductionCellStats[]>();
  for (const r of cells) {
    const list = cellsById.get(r.owner_id) ?? [];
    list.push(toCell(r));
    cellsById.set(r.owner_id, list);
  }
  return farmers.map((f) => ({
    id: f.id,
    name: f.name,
    farmerCode: f.farmerId,
    totalParcels: f.landParcels.length,
    nonPsrParcels: f.landParcels.filter((p) => !p.isPsr).length,
    cells: (cellsById.get(f.id) ?? []).sort((a, b) => a.period.localeCompare(b.period)),
  }));
}

/**
 * Semua lahan aktif satu Lembaga × bulan satu tahun — hanya untuk Sheet 2 ekspor
 * Excel (K6), bukan untuk layar (layar memuat per petani saat dibuka). Record
 * tanpa persil tidak ikut (ada di Sheet 1 sebagai angka per Lembaga).
 */
export async function getProductionAvailabilityGroupParcels(groupId: string, year: number): Promise<ProductionAvailabilityGroupParcelRow[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses ketersediaan data produksi");
  }
  if (!Number.isInteger(year)) return [];
  const access = await getAccessContext();
  const group = await prisma.farmerGroup.findFirst({
    where: { id: groupId, isActive: true, ...farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!group) return [];

  const [parcels, cells] = await Promise.all([
    prisma.landParcel.findMany({
      where: { isActive: true, farmer: { isActive: true, farmerGroupId: groupId } },
      select: { id: true, parcelId: true, isPsr: true, area: true, farmer: { select: { name: true, farmerId: true } } },
      orderBy: [{ farmer: { name: "asc" } }, { parcelId: "asc" }],
    }),
    prisma.$queryRaw<{ parcel_id: string; period: string; records: number; kg: number; zero_records: number; estimate_records: number }[]>(Prisma.sql`
      SELECT pr.parcel_id, pr.period,
        COUNT(*)::int AS records,
        COALESCE(SUM(pr.yield_kg), 0)::float8 AS kg,
        COUNT(*) FILTER (WHERE pr.yield_kg = 0)::int AS zero_records,
        COUNT(*) FILTER (WHERE pr.notes ILIKE '%estimasi%')::int AS estimate_records
      FROM tbl_production_record pr
      JOIN tbl_land_parcel lp ON lp.id = pr.parcel_id AND lp.is_active
      JOIN tbl_farmer f ON f.id = lp.farmer_id AND f.is_active
      WHERE pr.is_active AND f.farmer_group_id = ${groupId} AND ${yearRange(year)}
      GROUP BY pr.parcel_id, pr.period`),
  ]);
  const byParcel = new Map<string, ProductionParcelCell[]>();
  for (const r of cells) {
    const list = byParcel.get(r.parcel_id) ?? [];
    list.push({ period: r.period, records: r.records, kg: r.kg, zeroRecords: r.zero_records, estimateRecords: r.estimate_records });
    byParcel.set(r.parcel_id, list);
  }
  return parcels.map((p) => ({
    id: p.id,
    parcelCode: p.parcelId,
    isPsr: p.isPsr,
    area: p.area,
    isOwn: true,
    farmerName: p.farmer.name,
    farmerCode: p.farmer.farmerId,
    cells: (byParcel.get(p.id) ?? []).sort((a, b) => a.period.localeCompare(b.period)),
  }));
}

/**
 * Baris lahan satu petani untuk satu tahun (anak petani). Populasi record =
 * record petani ini + record di lahan-lahannya yang tercatat atas nama pemilik
 * lain (definisi `fetchFarmerDataMonths`). Record tanpa ID Lahan dikembalikan
 * terpisah (`noParcel`) untuk baris semu "Tanpa persil" (K5-c).
 */
export async function getProductionAvailabilityParcels(farmerId: string, year: number): Promise<ProductionAvailabilityParcelsResult> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses ketersediaan data produksi");
  }
  const empty: ProductionAvailabilityParcelsResult = { parcels: [], noParcel: [] };
  if (!Number.isInteger(year)) return empty;
  const access = await getAccessContext();
  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, isActive: true, farmerGroup: { isActive: true, ...farmerGroupAccessFilter(access) } },
    select: {
      id: true,
      landParcels: {
        where: { isActive: true },
        select: { id: true, parcelId: true, isPsr: true, area: true },
        orderBy: { parcelId: "asc" },
      },
    },
  });
  if (!farmer) return empty;

  const records = await prisma.productionRecord.findMany({
    where: {
      isActive: true,
      period: { gte: `${year}-01`, lte: `${year}-12` },
      OR: [{ farmerId }, { parcel: { farmerId } }],
    },
    select: {
      parcelId: true,
      period: true,
      yieldKg: true,
      notes: true,
      parcel: { select: { id: true, parcelId: true, isPsr: true, area: true, isActive: true, farmerId: true } },
    },
  });

  type Acc = Map<string, ProductionParcelCell>;
  const byParcel = new Map<string, Acc>();
  const noParcel: Acc = new Map();
  const bump = (acc: Acc, r: { period: string; yieldKg: number; notes: string | null }) => {
    const c = acc.get(r.period) ?? { period: r.period, records: 0, kg: 0, zeroRecords: 0, estimateRecords: 0 };
    c.records += 1;
    c.kg += r.yieldKg;
    if (r.yieldKg === 0) c.zeroRecords += 1;
    if (r.notes && /estimasi/i.test(r.notes)) c.estimateRecords += 1;
    acc.set(r.period, c);
  };
  // Lahan "lain": ditunjuk record petani ini tetapi bukan lahan aktifnya (milik
  // petani lain, atau revisi lama) — tetap ditampilkan agar record-nya tidak hilang.
  const extraParcels = new Map<string, { id: string; parcelCode: string; isPsr: boolean; area: number | null; isOwn: boolean }>();
  for (const r of records) {
    if (!r.parcelId) {
      bump(noParcel, r);
      continue;
    }
    const acc = byParcel.get(r.parcelId) ?? new Map();
    bump(acc, r);
    byParcel.set(r.parcelId, acc);
    if (r.parcel && !farmer.landParcels.some((p) => p.id === r.parcelId) && !extraParcels.has(r.parcelId)) {
      extraParcels.set(r.parcelId, {
        id: r.parcel.id,
        parcelCode: r.parcel.isActive ? r.parcel.parcelId : `${r.parcel.parcelId} (nonaktif)`,
        isPsr: r.parcel.isPsr,
        area: r.parcel.area,
        isOwn: false,
      });
    }
  }
  const sortCells = (acc: Acc) => [...acc.values()].sort((a, b) => a.period.localeCompare(b.period));
  return {
    parcels: [
      ...farmer.landParcels.map((p) => ({ id: p.id, parcelCode: p.parcelId, isPsr: p.isPsr, area: p.area, isOwn: true, cells: sortCells(byParcel.get(p.id) ?? new Map()) })),
      ...[...extraParcels.values()].map((p) => ({ ...p, cells: sortCells(byParcel.get(p.id) ?? new Map()) })),
    ],
    noParcel: sortCells(noParcel),
  };
}
